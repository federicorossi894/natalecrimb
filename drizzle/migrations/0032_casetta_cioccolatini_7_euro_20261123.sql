-- CRI Monza, listino confermato da Guido il 23/11/2026.
-- Cambia solo il prezzo delle vendite FUTURE; le righe di vendita storiche
-- conservano gli importi originali, compreso il pre-utilizzo del 21/11.
DO $price$
DECLARE current_price integer;
BEGIN
 SELECT price_cents INTO current_price FROM public.casetta_products WHERE id='cioccolatini' FOR UPDATE;
 IF current_price IS NULL THEN RAISE EXCEPTION 'Prodotto cioccolatini non presente';END IF;
 IF current_price NOT IN (700,1000) THEN
  RAISE EXCEPTION 'Prezzo cioccolatini inatteso: % cent; aggiornamento interrotto', current_price;
 END IF;
 UPDATE public.casetta_products SET price_cents=700 WHERE id='cioccolatini' AND price_cents=1000;
END $price$;
