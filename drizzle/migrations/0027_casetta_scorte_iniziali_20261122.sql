-- Quantita' iniziali comunicate da Michela il 22/11/2026.
-- Si tratta di conteggi INIZIALI, non di giacenze aggiornate dopo il venduto
-- cartaceo del 21/11: la riconciliazione resta in sospeso.
-- Prezzi invariati in attesa di conferma di Guido.
-- Sicurezza: non attiva LIVE, non invia email, non tocca le vendite DEMO.
DO $
BEGIN
 -- La migrazione puo' essere ripetuta dopo l'attivazione LIVE soltanto
 -- se tutte le scorte note erano gia' state censite: nessuna riscrittura.
 IF EXISTS (
   SELECT 1 FROM public.casetta_inventory_config
   WHERE product_id IN ('panettone_cartone','latta_panettone_pandoro',
     'pandoro','cioccolatini','riso_500','riso_1000')
   AND opening_qty IS NULL
 ) AND (
   (SELECT mode FROM public.casetta_settings WHERE singleton=true) <> 'test'
   OR EXISTS (SELECT 1 FROM public.casetta_sales WHERE mode='live')
 ) THEN RAISE EXCEPTION 'Nuove scorte iniziali consentite solo prima di LIVE'; END IF;
END $;

-- Il vecchio SKU unificato conserva il proprio ID, per non alterare gli
-- eventuali movimenti storici. Da oggi identifica solo il panettone in latta.
UPDATE public.casetta_products
 SET label='Panettone in latta'
 WHERE id='latta_panettone_pandoro' AND label='Panettone / Pandoro latta';

-- Il pandoro diventa una voce distinta per poter segnalare le sue scorte.
-- Il prezzo di 16 euro e' quello del vecchio SKU condiviso: DA CONFERMARE con Guido.
INSERT INTO public.casetta_products(id,label,price_cents,sort_order,active)
 SELECT 'pandoro','Pandoro',price_cents,25,true
 FROM public.casetta_products WHERE id='latta_panettone_pandoro'
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.casetta_inventory_config(product_id)
 VALUES('pandoro') ON CONFLICT(product_id) DO NOTHING;

-- Impostazione solo dove la giacenza non era ancora stata censita.
-- Le soglie sono segnali anticipati di riassortimento, non ordini automatici.
WITH supplied(product_id,qty,threshold) AS (
 VALUES
 ('panettone_cartone',100,15),
 ('latta_panettone_pandoro',36,8),
 ('pandoro',10,4),
 ('cioccolatini',73,12),
 ('riso_500',60,10),
 ('riso_1000',12,4)
)
UPDATE public.casetta_inventory_config c
 SET opening_qty=s.qty,low_stock_threshold=s.threshold,
     initialized_at=now(),updated_at=now()
 FROM supplied s
 WHERE c.product_id=s.product_id AND c.opening_qty IS NULL;

-- Tisane, te' e bastoncini: quantitativi non comunicati, restano DA CENSIRE.
-- NON sottrarre il venduto del 21/11 finche' non si sa se le quantita'
-- iniziali sono antecedenti o successive a quella giornata.
