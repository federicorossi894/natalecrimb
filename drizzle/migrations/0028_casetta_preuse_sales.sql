-- Historical paper sales, CRI Monza 21 November 2026.
-- These are aggregate product counts, not individual customer transactions.
-- No invented buyer, payment channel or sale time. DEMO remains isolated.
CREATE TABLE IF NOT EXISTS public.casetta_preuse_sales (
 sale_day date NOT NULL,
 product_id text NOT NULL REFERENCES public.casetta_products(id),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 unit_price_cents integer NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 100000),
 total_cents integer GENERATED ALWAYS AS(quantity * unit_price_cents) STORED,
 stock_reconciliation text NOT NULL DEFAULT 'pending'
   CHECK(stock_reconciliation IN('pending','apply_to_opening','already_in_count')),
 source_note text NOT NULL DEFAULT 'Registro cartaceo del 21/11/2026',
 imported_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(sale_day,product_id)
);
ALTER TABLE public.casetta_preuse_sales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.casetta_preuse_sales FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.casetta_preuse_sales TO service_role;
INSERT INTO public.casetta_preuse_sales(sale_day,product_id,quantity,unit_price_cents)
VALUES
 ('2026-11-21','latta_panettone_pandoro',11,1600),
 ('2026-11-21','cioccolatini',3,1000),
 ('2026-11-21','riso_500',20,500),
 ('2026-11-21','riso_1000',4,800),
 ('2026-11-21','tisane_etiche',24,500),
 ('2026-11-21','the_verde_rosso',6,500),
 ('2026-11-21','panettone_cartone',1,1400),
 ('2026-11-21','bastoncino_zucchero',8,300)
ON CONFLICT(sale_day,product_id) DO NOTHING;
-- Price confirmed by organizer. Historical price is frozen in preuse rows.
UPDATE public.casetta_products SET price_cents=1000 WHERE id='cioccolatini';
UPDATE public.casetta_products SET price_cents=500 WHERE id='the_verde_rosso';
-- No stock debit here. The six counts recorded on 22/11 might already
-- include the paper sales. Only explicit per-product reconciliation can
-- change stock_reconciliation to apply_to_opening or already_in_count.
