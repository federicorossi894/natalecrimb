-- Casetta stock ledger. All quantities are in SELLABLE UNITS (packaging/SKU),
-- never kilograms. Rice 500 g and rice 1 kg remain separate products.
-- Inventory is UNKNOWN until a physical opening count is provided.
-- Only live sales reduce stock; demo sales are excluded.
CREATE TABLE IF NOT EXISTS public.casetta_inventory_config (
 product_id text PRIMARY KEY REFERENCES public.casetta_products(id),
 opening_qty integer CHECK (opening_qty IS NULL OR opening_qty >= 0),
 low_stock_threshold integer NOT NULL DEFAULT 5 CHECK(low_stock_threshold BETWEEN 0 AND 10000),
 initialized_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((opening_qty IS NULL AND initialized_at IS NULL)
     OR (opening_qty IS NOT NULL AND initialized_at IS NOT NULL))
);
INSERT INTO public.casetta_inventory_config(product_id)
 SELECT id FROM public.casetta_products ON CONFLICT(product_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.casetta_inventory_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 kind text NOT NULL CHECK(kind IN ('restock','correction')),
 delta_qty integer NOT NULL CHECK(delta_qty BETWEEN -100000 AND 100000 AND delta_qty <> 0),
 note text NOT NULL CHECK(length(trim(note)) BETWEEN 3 AND 300),
 external_ref text NOT NULL UNIQUE CHECK(length(external_ref) BETWEEN 8 AND 120),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(kind <> 'restock' OR delta_qty > 0)
);
CREATE INDEX IF NOT EXISTS casetta_inventory_movements_product_time_idx
 ON public.casetta_inventory_movements(product_id,created_at);

ALTER TABLE public.casetta_inventory_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casetta_inventory_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.casetta_inventory_config,public.casetta_inventory_movements
 FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.casetta_inventory_config,public.casetta_inventory_movements TO service_role;

-- Inventory snapshot as of 20:00 Europe/Rome on the requested day.
-- Before 20:00 today, show the current stock. No test sale is ever subtracted.
CREATE OR REPLACE FUNCTION public.casetta_inventory_snapshot(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_cutoff timestamptz; v_start timestamptz; v_result jsonb;
BEGIN
 IF _day IS NULL OR _day > (now() AT TIME ZONE 'Europe/Rome')::date
 THEN RAISE EXCEPTION 'Data inventario non valida'; END IF;
 v_start := (_day::timestamp AT TIME ZONE 'Europe/Rome');
 v_cutoff := LEAST(now(), ((_day::timestamp + interval '20 hours') AT TIME ZONE 'Europe/Rome'));
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'label',p.label,
   'openingQty',c.opening_qty,
   'receivedToday',m.received_today,
   'soldToday',s.sold_today,
   'availableQty',CASE WHEN c.opening_qty IS NULL THEN NULL
     ELSE c.opening_qty+m.total_delta-s.sold_all END,
   'thresholdQty',coalesce(c.low_stock_threshold,5),
   'status',CASE
     WHEN c.opening_qty IS NULL THEN 'unknown'
     WHEN c.opening_qty+m.total_delta-s.sold_all <= 0 THEN 'out'
     WHEN c.opening_qty+m.total_delta-s.sold_all <= coalesce(c.low_stock_threshold,5) THEN 'low'
     ELSE 'ok' END
 ) ORDER BY p.sort_order,p.id),'[]'::jsonb) INTO v_result
 FROM public.casetta_products p
 LEFT JOIN public.casetta_inventory_config c ON c.product_id=p.id
 LEFT JOIN LATERAL (
   SELECT coalesce(sum(mv.delta_qty) FILTER(WHERE mv.created_at<v_cutoff),0)::integer AS total_delta,
          coalesce(sum(mv.delta_qty) FILTER(WHERE mv.kind='restock'
            AND mv.created_at>=v_start AND mv.created_at<v_cutoff),0)::integer AS received_today
   FROM public.casetta_inventory_movements mv WHERE mv.product_id=p.id
 ) m ON true
 LEFT JOIN LATERAL (
   SELECT coalesce(sum(i.quantity) FILTER(WHERE sa.created_at<v_cutoff),0)::integer AS sold_all,
          coalesce(sum(i.quantity) FILTER(WHERE sa.created_at>=v_start
            AND sa.created_at<v_cutoff),0)::integer AS sold_today
   FROM public.casetta_sale_items i
   JOIN public.casetta_sales sa ON sa.id=i.sale_id
   WHERE i.product_id=p.id AND sa.mode='live'
 ) s ON true
 WHERE p.active;
 RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION public.casetta_inventory_snapshot(date)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_inventory_snapshot(date) TO service_role;

-- Operator procedure (SQL only, no volunteer UI):
-- 1. One-time opening count:
-- UPDATE public.casetta_inventory_config
--   SET opening_qty=20, initialized_at=now(),updated_at=now(),low_stock_threshold=5
--   WHERE product_id='panettone_cartone' AND opening_qty IS NULL;
-- 2. A replenishment, with a unique external_ref for retry safety:
-- INSERT INTO public.casetta_inventory_movements(product_id,kind,delta_qty,note,external_ref)
-- VALUES('panettone_cartone','restock',10,'Consegna comunicata da Michela',
--        'consegna-2026-11-23-001-panettone_cartone')
-- ON CONFLICT(external_ref) DO NOTHING;
-- 3. Correction only after explicit confirmation of a physical recount.
