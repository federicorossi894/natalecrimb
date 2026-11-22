-- Giacenze comunicate da Michela = stock iniziale precedente al venduto del 21/11/2026.
-- Non riscrivere opening_qty: lo snapshot scala gia' ogni riga marcata apply_to_opening.
-- Le scorte NON comunicate (tisane, te', candy cane) restano sconosciute.
DO $reconcile$
DECLARE rows_updated integer;
BEGIN
 IF EXISTS (
  SELECT 1 FROM (VALUES
   ('panettone_cartone',100,1),
   ('latta_panettone_pandoro',36,11),
   ('cioccolatini',73,3),
   ('riso_500',60,20),
   ('riso_1000',12,4)
  ) AS x(pid,opening,sold)
  LEFT JOIN public.casetta_inventory_config c ON c.product_id=x.pid
  LEFT JOIN public.casetta_preuse_sales h ON h.product_id=x.pid
   AND h.sale_day=DATE '2026-11-21'
  WHERE c.opening_qty IS DISTINCT FROM x.opening
    OR h.quantity IS DISTINCT FROM x.sold
    OR h.stock_reconciliation NOT IN ('pending','apply_to_opening')
 ) THEN
   RAISE EXCEPTION 'La base inventariale o i movimenti del 21/11 non coincidono: non modificati';
 END IF;
 UPDATE public.casetta_preuse_sales h
 SET stock_reconciliation='apply_to_opening'
 WHERE h.sale_day=DATE '2026-11-21'
   AND h.product_id IN ('panettone_cartone','latta_panettone_pandoro',
    'cioccolatini','riso_500','riso_1000')
   AND h.stock_reconciliation='pending';
 GET DIAGNOSTICS rows_updated=ROW_COUNT;
 IF rows_updated NOT IN (0,5) THEN
  RAISE EXCEPTION 'Riconciliazione parziale: % righe invece di 5',rows_updated;
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.casetta_preuse_sales h
  WHERE h.sale_day=DATE '2026-11-21'
   AND h.product_id IN ('tisane_etiche','the_verde_rosso','bastoncino_zucchero')
   AND h.stock_reconciliation<>'pending'
 ) THEN
  RAISE EXCEPTION 'Prodotti con giacenza sconosciuta modificati inattesi';
 END IF;
END $reconcile$;
