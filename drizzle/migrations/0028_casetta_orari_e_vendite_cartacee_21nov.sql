-- Casetta CRI Monza: apertura 09:00–19:00 (Europe/Rome).
-- Il report gestionale resta alle 20:00; DEMO rimane DEMO.
-- Registri cartacei 21/11: conteggi aggregati, senza inventare nomi o POS/contanti.
-- Il prezzo del te' NON e' confermato: NULL nel registro cartaceo.
-- Il magazzino NON viene scalato: conteggi iniziali di Michela da riconciliare.
BEGIN;

DO $hours$
DECLARE v_sql text;
BEGIN
 SELECT pg_get_functiondef('public.casetta_catalog()'::regprocedure) INTO v_sql;
 IF position('time ''08:00''' IN v_sql)>0 AND position('time ''20:00''' IN v_sql)>0 THEN
  v_sql:=replace(v_sql,'time ''08:00''','time ''09:00''');
  v_sql:=replace(v_sql,'time ''20:00''','time ''19:00''');
  EXECUTE v_sql;
 ELSIF position('time ''09:00''' IN v_sql)=0 OR position('time ''19:00''' IN v_sql)=0 THEN
  RAISE EXCEPTION 'Unexpected casetta_catalog time gate; abort';
 END IF;

 SELECT pg_get_functiondef('public.casetta_record_sale(uuid,text,jsonb,text,text,text,text)'::regprocedure) INTO v_sql;
 IF position('time ''08:00''' IN v_sql)>0 AND position('time ''19:59:59.999999''' IN v_sql)>0 THEN
  v_sql:=replace(v_sql,'time ''08:00''','time ''09:00''');
  v_sql:=replace(v_sql,'time ''19:59:59.999999''','time ''18:59:59.999999''');
  v_sql:=replace(v_sql,'Cassa chiusa dalle 20 alle 08','Cassa chiusa dalle 19 alle 09');
  EXECUTE v_sql;
 ELSIF position('time ''09:00''' IN v_sql)=0 OR position('time ''18:59:59.999999''' IN v_sql)=0 THEN
  RAISE EXCEPTION 'Unexpected casetta_record_sale time gate; abort';
 END IF;
END $hours$;

UPDATE public.casetta_products SET price_cents=1000
 WHERE id='cioccolatini' AND price_cents=800;

CREATE TABLE IF NOT EXISTS public.casetta_paper_sales (
 sale_day date NOT NULL,
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 quantity integer NOT NULL CHECK(quantity>0 AND quantity<=10000),
 unit_price_cents integer CHECK(unit_price_cents IS NULL OR unit_price_cents>0),
 source_note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(sale_day,product_id)
);
ALTER TABLE public.casetta_paper_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.casetta_paper_sales FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.casetta_paper_sales TO service_role;

INSERT INTO public.casetta_paper_sales(sale_day,product_id,quantity,unit_price_cents,source_note)
VALUES
 ('2026-11-21','latta_panettone_pandoro',11,1600,'Fogli cartacei turni 10-14 e 14-18; totale ricontato dall utente 22/11'),
 ('2026-11-21','cioccolatini',3,1000,'Fogli cartacei 21/11; prezzo 10 euro indicato a penna'),
 ('2026-11-21','riso_500',20,500,'Fogli cartacei 21/11; totale ricontato'),
 ('2026-11-21','riso_1000',4,800,'Fogli cartacei 21/11; totale ricontato'),
 ('2026-11-21','tisane_etiche',24,500,'Fogli cartacei 21/11; totale ricontato'),
 ('2026-11-21','the_verde_rosso',6,NULL,'Fogli cartacei 21/11; prezzo NON confermato; tipologia te non distinta'),
 ('2026-11-21','panettone_cartone',1,1400,'Fogli cartacei 21/11; totale ricontato'),
 ('2026-11-21','bastoncino_zucchero',8,300,'Fogli cartacei 21/11; totale ricontato')
ON CONFLICT(sale_day,product_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.casetta_paper_sales_summary()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $fn$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'date',s.sale_day,'id',s.product_id,'label',p.label,
  'quantity',s.quantity,'unitPriceCents',s.unit_price_cents,
  'totalCents',CASE WHEN s.unit_price_cents IS NULL THEN NULL ELSE s.quantity*s.unit_price_cents END
 ) ORDER BY s.sale_day,p.sort_order,p.id),'[]'::jsonb)
 FROM public.casetta_paper_sales s JOIN public.casetta_products p ON p.id=s.product_id;
$fn$;
REVOKE ALL ON FUNCTION public.casetta_paper_sales_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.casetta_paper_sales_summary() TO service_role;
COMMIT;
