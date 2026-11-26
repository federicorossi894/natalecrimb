-- Il Natale che fa bene / CRI Comitato di Monza — catalogo e giacenze, 26/11/2026.
-- Dati dalle comunicazioni di Michela: pezzi = unità vendibili (non cartoni).
-- 96 tisane metallo e ~100 biscotti sono stime provvisorie; tazze CRI ~20.
-- La tisana etica in cartone è un conteggio ATTUALE di 5 pezzi (su indicazione
-- "4-5; metti 5"), non un'inesistente apertura precedente al 21 novembre.
-- La vendita storica del riso 1 kg rimane al nome registrato all'epoca.
DO $catalog$
BEGIN
 IF EXISTS(SELECT 1 FROM public.casetta_products WHERE id IN
   ('tisana_metallo','tazza_cri','biscotti')
   AND (price_cents<>CASE id
     WHEN 'tisana_metallo' THEN 800
     WHEN 'tazza_cri' THEN 1000 ELSE 500 END))
 THEN RAISE EXCEPTION 'Prezzo catalogo esistente difforme, intervenire manualmente';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.casetta_products
    WHERE id='riso_1000' AND price_cents=800
      AND label IN ('Riso 1 kg','Riso sacchetto (1 kg)'))
 THEN RAISE EXCEPTION 'Riso 1 kg attuale non riconosciuto';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.casetta_products
    WHERE id='tisane_etiche' AND price_cents=500
      AND label IN ('Tisane etiche','Tisana etica (cartone)'))
 THEN RAISE EXCEPTION 'Tisana etica attuale non riconosciuta';END IF;
END $catalog$;

UPDATE public.casetta_products SET label='Riso sacchetto (1 kg)'
 WHERE id='riso_1000' AND label='Riso 1 kg' AND price_cents=800;
UPDATE public.casetta_products SET label='Tisana etica (cartone)'
 WHERE id='tisane_etiche' AND label='Tisane etiche' AND price_cents=500;

INSERT INTO public.casetta_products(id,label,price_cents,sort_order,active)
VALUES
 ('tisana_metallo','Tisana metallo',800,45,true),
 ('tazza_cri','Tazza CRI',1000,95,true),
 ('biscotti','Biscotti',500,100,true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.casetta_inventory_config
 (product_id,opening_qty,low_stock_threshold,initialized_at,updated_at)
VALUES
 ('tisana_metallo',96,10,now(),now()),
 ('tazza_cri',20,5,now(),now()),
 ('biscotti',100,15,now(),now())
ON CONFLICT(product_id) DO NOTHING;

DO $audit$
BEGIN
 IF (SELECT count(*) FROM public.casetta_products
    WHERE (id='tisana_metallo' AND label='Tisana metallo' AND price_cents=800 AND active)
       OR (id='tazza_cri' AND label='Tazza CRI' AND price_cents=1000 AND active)
       OR (id='biscotti' AND label='Biscotti' AND price_cents=500 AND active))<>3
 THEN RAISE EXCEPTION 'Prodotti introdotti non coerenti';END IF;
 IF EXISTS(SELECT 1 FROM (VALUES
   ('tisana_metallo',96),('tazza_cri',20),('biscotti',100)
 ) t(id,stock)
 LEFT JOIN public.casetta_inventory_config c ON c.product_id=t.id
 WHERE c.opening_qty IS DISTINCT FROM t.stock)
 THEN RAISE EXCEPTION 'Giacenze nuove difformi: stop';END IF;
END $audit$;

-- A current physical count is not the same as the opening balance in 2026-11-21.
-- Store the actual count with its timestamp, then carry forward LIVE sales
-- and manual stock adjustments after the count. This avoids inventing an opening
-- quantity or double-subtracting historical 21/23/possibly-22 November sales.
CREATE TABLE IF NOT EXISTS public.casetta_inventory_physical_counts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 counted_qty integer NOT NULL CHECK(counted_qty BETWEEN 0 AND 100000),
 counted_at timestamptz NOT NULL DEFAULT now(),
 source_note text NOT NULL CHECK(length(trim(source_note)) BETWEEN 5 AND 350),
 external_ref text NOT NULL UNIQUE CHECK(length(external_ref) BETWEEN 8 AND 120)
);
CREATE INDEX IF NOT EXISTS casetta_inventory_physical_counts_idx
 ON public.casetta_inventory_physical_counts(product_id,counted_at DESC);
ALTER TABLE public.casetta_inventory_physical_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.casetta_inventory_physical_counts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.casetta_inventory_physical_counts TO service_role;

INSERT INTO public.casetta_inventory_physical_counts
 (product_id,counted_qty,source_note,external_ref)
VALUES(
 'tisane_etiche',5,
 'Michela 26/11/2026: circa quattro o cinque tisane etiche in cartone; fissare cinque come disponibilità corrente.',
 'michela-2026-11-26-tisana-etica-5'
) ON CONFLICT(external_ref) DO NOTHING;

DO $count_check$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.casetta_inventory_physical_counts
  WHERE external_ref='michela-2026-11-26-tisana-etica-5'
    AND product_id='tisane_etiche' AND counted_qty=5)
 THEN RAISE EXCEPTION 'Conteggio corrente tisane non registrato';END IF;
END $count_check$;

-- Historical paper sale quantities were already reflected in the newly
-- communicated current count, but must remain in the revenue and sales history.
UPDATE public.casetta_preuse_sales SET stock_reconciliation='already_in_count'
WHERE product_id='tisane_etiche' AND sale_day<=DATE '2026-11-26'
  AND stock_reconciliation='pending';

-- Keep the original snapshot as-is and overlay *only* products with a dated
-- physical count. Historic daily reports before the count remain unchanged.
DO $rename$
BEGIN
 IF to_regprocedure('public.casetta_inventory_snapshot_before_counts(date)') IS NULL
 THEN
   ALTER FUNCTION public.casetta_inventory_snapshot(date)
    RENAME TO casetta_inventory_snapshot_before_counts;
 END IF;
END $rename$;

CREATE OR REPLACE FUNCTION public.casetta_inventory_snapshot(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $inventory$
DECLARE before_count jsonb;result jsonb;cutoff timestamptz;
BEGIN
 before_count:=public.casetta_inventory_snapshot_before_counts(_day);
 cutoff:=LEAST(now(),
   ((_day::timestamp + interval '19 hours') AT TIME ZONE 'Europe/Rome'));
 SELECT coalesce(jsonb_agg(CASE WHEN phys.counted_at IS NULL THEN item.value
   ELSE item.value||jsonb_build_object(
    'availableQty',phys.counted_qty+coalesce(movement.delta,0)-coalesce(sold.qty,0),
    'physicalCountQty',phys.counted_qty,'physicalCountAt',phys.counted_at,
    'status',CASE
      WHEN phys.counted_qty+coalesce(movement.delta,0)-coalesce(sold.qty,0)<=0 THEN 'out'
      WHEN phys.counted_qty+coalesce(movement.delta,0)-coalesce(sold.qty,0)
         <=coalesce((item.value->>'thresholdQty')::int,5) THEN 'low'
      ELSE 'ok' END)
   END ORDER BY item.ord),'[]'::jsonb)
 INTO result
 FROM jsonb_array_elements(before_count) WITH ORDINALITY AS item(value,ord)
 LEFT JOIN LATERAL (
   SELECT c.counted_at,c.counted_qty
   FROM public.casetta_inventory_physical_counts c
   WHERE c.product_id=item.value->>'id' AND c.counted_at<=cutoff
   ORDER BY c.counted_at DESC,c.id DESC LIMIT 1
 ) phys ON true
 LEFT JOIN LATERAL (
   SELECT coalesce(sum(mv.delta_qty),0)::int AS delta
   FROM public.casetta_inventory_movements mv
   WHERE mv.product_id=item.value->>'id' AND mv.created_at>phys.counted_at
     AND mv.created_at<cutoff
 ) movement ON true
 LEFT JOIN LATERAL (
   SELECT coalesce(sum(i.quantity),0)::int AS qty
   FROM public.casetta_sale_items i
   JOIN public.casetta_sales sa ON sa.id=i.sale_id
   WHERE i.product_id=item.value->>'id' AND sa.mode='live'
     AND sa.created_at>phys.counted_at AND sa.created_at<cutoff
 ) sold ON true;
 RETURN result;
END $inventory$;

REVOKE ALL ON FUNCTION public.casetta_inventory_snapshot(date)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_inventory_snapshot(date)
 TO service_role;
