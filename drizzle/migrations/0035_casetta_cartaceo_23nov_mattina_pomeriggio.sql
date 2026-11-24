-- CRI Monza: import photographed paper sales of MONDAY 23 NOVEMBER 2026.
-- Source 1: morning tabular sheet, €90, payment methods UNKNOWN.
-- Source 2: afternoon handwritten list, €90, €20 CASH + €70 POS.
-- Day total: €180, 34 units. Do not invent buyer names or exact times.
-- Historic chocolate price €10 on both sheets. Current catalog stays €7.
-- All paper sales are non-DEMO historical, never overwrite 24/11 LIVE sales.

CREATE TABLE IF NOT EXISTS public.casetta_paper_sale_lines (
 sale_day date NOT NULL,
 shift text NOT NULL CHECK(shift IN ('mattina','pomeriggio')),
 line_no integer NOT NULL CHECK(line_no BETWEEN 1 AND 1000),
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 999),
 unit_price_cents integer NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 100000),
 total_cents integer GENERATED ALWAYS AS(quantity*unit_price_cents) STORED,
 payment_method text NOT NULL CHECK(payment_method IN ('unknown','cash','pos')),
 source_note text NOT NULL DEFAULT 'Registri cartacei 23/11/2026',
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(sale_day,shift,line_no)
);
ALTER TABLE public.casetta_paper_sale_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.casetta_paper_sale_lines FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.casetta_paper_sale_lines TO service_role;

INSERT INTO public.casetta_paper_sale_lines
 (sale_day,shift,line_no,product_id,quantity,unit_price_cents,payment_method,source_note)
VALUES
 ('2026-11-23','mattina',1,'cioccolatini',1,1000,'unknown','Tabella vendite mattina, foto 1'),
 ('2026-11-23','mattina',2,'riso_500',12,500,'unknown','Tabella mattina: 2 + 10 confezioni, 60 euro'),
 ('2026-11-23','mattina',3,'tisane_etiche',3,500,'unknown','Tabella vendite mattina, foto 1'),
 ('2026-11-23','mattina',4,'the_verde_rosso',1,500,'unknown','Tabella vendite mattina, foto 1'),
 ('2026-11-23','pomeriggio',1,'tisane_etiche',3,500,'cash','Elenco pomeriggio: tre tisane, 15 euro contanti'),
 ('2026-11-23','pomeriggio',2,'riso_500',2,500,'pos','Elenco pomeriggio: due riso, 10 euro carta'),
 ('2026-11-23','pomeriggio',3,'the_verde_rosso',1,500,'pos','Elenco pomeriggio: tè, 5 euro carta'),
 ('2026-11-23','pomeriggio',4,'cioccolatini',1,1000,'pos','Elenco pomeriggio: cioccolato, 10 euro carta'),
 ('2026-11-23','pomeriggio',5,'riso_500',1,500,'pos','Elenco pomeriggio: riso, 5 euro carta'),
 ('2026-11-23','pomeriggio',6,'riso_500',1,500,'cash','Elenco pomeriggio: riso, 5 euro contanti'),
 ('2026-11-23','pomeriggio',7,'riso_500',8,500,'pos','Elenco pomeriggio: otto riso, 40 euro carta')
ON CONFLICT(sale_day,shift,line_no) DO NOTHING;

DO $audit$
DECLARE c integer;amt integer;pieces integer;pos_amount integer;cash_amount integer;unknown_amount integer;
BEGIN
 SELECT count(*),coalesce(sum(total_cents),0),coalesce(sum(quantity),0),
  coalesce(sum(total_cents) FILTER(WHERE payment_method='pos'),0),
  coalesce(sum(total_cents) FILTER(WHERE payment_method='cash'),0),
  coalesce(sum(total_cents) FILTER(WHERE payment_method='unknown'),0)
 INTO c,amt,pieces,pos_amount,cash_amount,unknown_amount
 FROM public.casetta_paper_sale_lines WHERE sale_day='2026-11-23';
 IF c<>11 OR amt<>18000 OR pieces<>34 OR pos_amount<>7000 OR cash_amount<>2000
    OR unknown_amount<>9000
 THEN RAISE EXCEPTION 'Registro cartaceo 23/11 non coerente: %,%,%,%,%,%',
  c,amt,pieces,pos_amount,cash_amount,unknown_amount;END IF;
 IF EXISTS (
  SELECT 1 FROM public.casetta_paper_sale_lines
  WHERE sale_day='2026-11-23'
  GROUP BY sale_day,shift,line_no HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'Duplicate paper line';END IF;
END $audit$;

INSERT INTO public.casetta_preuse_sales
 (sale_day,product_id,quantity,unit_price_cents,stock_reconciliation,source_note)
SELECT sale_day,product_id,sum(quantity)::integer,
 min(unit_price_cents),
 CASE WHEN product_id IN ('cioccolatini','riso_500')
 THEN 'apply_to_opening' ELSE 'pending' END,
 '23/11/2026: tabella mattina + elenco pomeriggio; dettagli in casetta_paper_sale_lines'
FROM public.casetta_paper_sale_lines WHERE sale_day='2026-11-23'
GROUP BY sale_day,product_id
HAVING min(unit_price_cents)=max(unit_price_cents)
ON CONFLICT(sale_day,product_id) DO NOTHING;

DO $reconcile$
DECLARE r record;
BEGIN
 FOR r IN SELECT product_id,sum(quantity)::integer qty,
   sum(total_cents)::integer cents, min(unit_price_cents) unit
 FROM public.casetta_paper_sale_lines WHERE sale_day='2026-11-23'
 GROUP BY product_id LOOP
  IF NOT EXISTS (
    SELECT 1 FROM public.casetta_preuse_sales
    WHERE sale_day='2026-11-23' AND product_id=r.product_id
      AND quantity=r.qty AND total_cents=r.cents AND unit_price_cents=r.unit
      AND stock_reconciliation=
       CASE WHEN r.product_id IN ('cioccolatini','riso_500')
        THEN 'apply_to_opening' ELSE 'pending' END
  ) THEN RAISE EXCEPTION 'Mismatched preuse product % for 23/11',r.product_id;END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.casetta_preuse_sales WHERE sale_day='2026-11-23')<>4
 THEN RAISE EXCEPTION 'Unexpected aggregate count on 23/11';END IF;
 IF EXISTS(SELECT 1 FROM public.casetta_sales WHERE mode='live'
  AND (created_at AT TIME ZONE 'Europe/Rome')::date='2026-11-23')
 THEN RAISE EXCEPTION '23/11 has LIVE sales; abort to avoid double count';END IF;
END $reconcile$;

-- Extend live+historical financial report with the KNOWN portions of the
-- paper payment split. Unattributed payments remain separate (never guessed).
CREATE OR REPLACE FUNCTION public.casetta_daily_report(_day date)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $report$
DECLARE b jsonb;pre_amount bigint;pre_units integer;pre_groups integer;
 new_stock jsonb;new_daily jsonb;v_extra bigint;v_cumulative_extra bigint;
 v_paper_cash bigint;v_paper_pos bigint;
BEGIN
 b:=public.casetta_daily_report_base(_day);
 SELECT coalesce(sum(total_cents),0),coalesce(sum(quantity),0)::integer,count(*)::integer
 INTO pre_amount,pre_units,pre_groups
 FROM public.casetta_preuse_sales WHERE sale_day=_day;
 SELECT coalesce(sum(extra_donation_cents),0) INTO v_extra
 FROM public.casetta_sales WHERE mode='live'
   AND (created_at AT TIME ZONE 'Europe/Rome')::date=_day;
 SELECT coalesce(sum(extra_donation_cents),0) INTO v_cumulative_extra
 FROM public.casetta_sales WHERE mode='live'
   AND (created_at AT TIME ZONE 'Europe/Rome')::date<=_day;
 SELECT coalesce(sum(total_cents) FILTER(WHERE payment_method='cash'),0),
   coalesce(sum(total_cents) FILTER(WHERE payment_method='pos'),0)
 INTO v_paper_cash,v_paper_pos FROM public.casetta_paper_sale_lines WHERE sale_day=_day;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',id,'label',label,'quantity',qty,'totalCents',amount) ORDER BY label),'[]'::jsonb)
 INTO new_stock FROM (
  SELECT id,label,sum(quantity)::integer qty,sum(amount)::integer amount FROM (
   SELECT id,label,quantity,"totalCents" amount
   FROM jsonb_to_recordset(b->'stock')
    AS r(id text,label text,quantity integer,"totalCents" integer)
   UNION ALL
   SELECT h.product_id,p.label,h.quantity,h.total_cents
   FROM public.casetta_preuse_sales h JOIN public.casetta_products p ON p.id=h.product_id
   WHERE h.sale_day=_day
  ) all_products GROUP BY id,label
 ) totals;
 SELECT coalesce(jsonb_agg(
   jsonb_set(d.value,'{date}',to_jsonb(left(d.value->>'date',10)))
   || jsonb_build_object('totalCents',(d.value->>'totalCents')::bigint+
    coalesce((SELECT sum(h.total_cents) FROM public.casetta_preuse_sales h
       WHERE h.sale_day=(d.value->>'date')::date),0))
   ORDER BY d.value->>'date'),'[]'::jsonb)
 INTO new_daily FROM jsonb_array_elements(b->'daily') d(value);
 RETURN b||jsonb_build_object(
  'finance',(b->'finance')||jsonb_build_object(
   'totalCents',(b->'finance'->>'totalCents')::bigint+pre_amount,
   'productsCents',(b->'finance'->>'totalCents')::bigint+pre_amount-v_extra,
   'extraDonationCents',v_extra,
   'cashCents',(b->'finance'->>'cashCents')::bigint+v_paper_cash,
   'posCents',(b->'finance'->>'posCents')::bigint+v_paper_pos,
   'preUseCents',pre_amount,
   'unallocatedCents',pre_amount-v_paper_cash-v_paper_pos,
   'preUseUnits',pre_units,'preUseGroups',pre_groups),
  'cumulativeExtraDonationCents',v_cumulative_extra,
  'cumulativeCents',(b->>'cumulativeCents')::bigint+
    (SELECT coalesce(sum(total_cents),0) FROM public.casetta_preuse_sales
     WHERE sale_day<=_day),
  'stock',new_stock,'daily',new_daily);
 -- Historic paper sheets contain no real timestamps: do not invent hours.
END $report$;

-- Preserve all rows of paper sheets in private Excel. For 23/11 use
-- individual photographed lines rather than re-exporting the same 4 aggregates.
CREATE OR REPLACE FUNCTION public.casetta_export_sales(_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $export$
DECLARE b jsonb;d date;paper_rows jsonb;
BEGIN
 b:=public.casetta_export_sales_base(_token_hash);
 IF b IS NULL THEN RETURN NULL;END IF;
 d:=(b->>'date')::date;
 SELECT coalesce(jsonb_agg(row_data ORDER BY sale_day,shift_order,line_no),'[]'::jsonb)
 INTO paper_rows
 FROM (
  SELECT h.sale_day,0::integer shift_order,p.sort_order::integer line_no,
   jsonb_build_object(
    'date',to_char(h.sale_day,'DD/MM/YYYY'),'firstName','','lastName','',
    'amountCents',h.total_cents,'productsCents',h.total_cents,
    'extraDonationCents',0,'method','unknown','source','Pre-utilizzo cassa',
    'quantities',jsonb_build_object(h.product_id,h.quantity)
   ) row_data
  FROM public.casetta_preuse_sales h
  JOIN public.casetta_products p ON p.id=h.product_id
  WHERE h.sale_day<=d AND NOT EXISTS (
   SELECT 1 FROM public.casetta_paper_sale_lines x WHERE x.sale_day=h.sale_day
  )
  UNION ALL
  SELECT m.sale_day,CASE WHEN m.shift='mattina' THEN 1 ELSE 2 END,m.line_no,
   jsonb_build_object(
    'date',to_char(m.sale_day,'DD/MM/YYYY')||
     CASE WHEN m.shift='mattina' THEN ' (mattina)' ELSE ' (pomeriggio)' END,
    'firstName','','lastName','',
    'amountCents',m.total_cents,'productsCents',m.total_cents,
    'extraDonationCents',0,
    'method',m.payment_method,
    'source','Pre-utilizzo cassa · '||m.shift,
    'quantities',jsonb_build_object(m.product_id,m.quantity)
   )
  FROM public.casetta_paper_sale_lines m WHERE m.sale_day<=d
 ) all_paper;
 RETURN b||jsonb_build_object('rows',paper_rows||(
  SELECT coalesce(jsonb_agg(r.value||jsonb_build_object('source','Cassa')),'[]'::jsonb)
  FROM jsonb_array_elements(b->'rows') AS r(value)));
END $export$;

DO $guards$
DECLARE p record;
BEGIN
 FOR p IN SELECT oid::regprocedure signature FROM pg_proc
 WHERE pronamespace='public'::regnamespace
   AND proname IN ('casetta_daily_report','casetta_export_sales')
 LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.signature);
 END LOOP;
END $guards$;