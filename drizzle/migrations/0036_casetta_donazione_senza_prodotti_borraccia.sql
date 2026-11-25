-- Croce Rossa Monza: donation-only checkout and thermal bottles.
-- Donation-only is accounted as extra_donation_cents (no fake inventory SKU),
-- with no casetta_sale_items rows. The only sold items affect stock.
-- Preserves LIVE mode, opening hours 09-19 and customer email safeguards.

INSERT INTO public.casetta_products(id,label,price_cents,sort_order,active)
VALUES('borraccia_termica','Borraccia termica',1000,90,true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.casetta_inventory_config
 (product_id,opening_qty,low_stock_threshold,initialized_at,updated_at)
VALUES('borraccia_termica',4,2,now(),now())
ON CONFLICT(product_id) DO NOTHING;

DO $verify_bottle$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.casetta_products p
  JOIN public.casetta_inventory_config c ON c.product_id=p.id
  WHERE p.id='borraccia_termica' AND p.label='Borraccia termica'
    AND p.active AND p.price_cents=1000 AND c.opening_qty=4
 ) THEN RAISE EXCEPTION 'Borraccia termica configuration mismatch';END IF;
END $verify_bottle$;

-- Previous check required goods strictly greater than the donation.
-- Permit equality only for a *positive* donation-only transaction.
ALTER TABLE public.casetta_sales
 DROP CONSTRAINT IF EXISTS casetta_sales_extra_donation_range;
ALTER TABLE public.casetta_sales
 ADD CONSTRAINT casetta_sales_extra_donation_range
 CHECK(extra_donation_cents BETWEEN 0 AND 100000
   AND total_cents>=extra_donation_cents AND total_cents>0);

-- Update ONLY the eight-argument checkout used by the current live UI.
-- Older five/seven argument RPCs retain their original product requirement.
DO $patch$
DECLARE
 body text;
 required text:=$old$OR jsonb_array_length(_items) NOT BETWEEN 1 AND 20$old$;
 updated text:=$new$OR jsonb_array_length(_items) NOT BETWEEN 0 AND 20$new$;
 total_old text:=$old2$IF v_products<1 OR v_total>100000 OR v_count>200$old2$;
 total_new text:=$new2$IF v_total<1 OR v_total>100000 OR v_count>200
   OR (v_products=0 AND _extra_donation_cents=0)$new2$;
BEGIN
 SELECT pg_get_functiondef(
  'public.casetta_record_sale(uuid,text,jsonb,text,text,text,text,integer)'::regprocedure
 ) INTO body;
 IF position(updated IN body)>0 AND position(total_new IN body)>0 THEN
   RETURN;
 END IF;
 IF position(required IN body)=0 OR position(total_old IN body)=0 THEN
  RAISE EXCEPTION 'Checkout RPC body differs; abort rather than patch wrong function';
 END IF;
 IF position($clock$time < time '09:00'$clock$ IN body)=0
  OR position($clock$time >= time '19:00'$clock$ IN body)=0
  OR position('customer_receipts_enabled' IN body)=0 THEN
  RAISE EXCEPTION 'Live checkout hours or receipt guard missing';
 END IF;
 body:=replace(body,required,updated);
 body:=replace(body,total_old,total_new);
 EXECUTE body;
END $patch$;

DO $acl$ BEGIN
 REVOKE ALL ON FUNCTION public.casetta_record_sale(
 uuid,text,jsonb,text,text,text,text,integer)
 FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.casetta_record_sale(
 uuid,text,jsonb,text,text,text,text,integer) TO service_role;
END $acl$;
