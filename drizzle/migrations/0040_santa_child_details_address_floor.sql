-- CRI Monza — Babbo Natale: dettaglio figli e accesso al domicilio.
-- Additive: le richieste DEMO e LIVE precedenti conservano i loro dati.
-- Bambini in "bambini" rimane per compatibilità con flussi già esistenti.
-- I nuovi moduli registrano anche bambini_dettagli con cognome, età, soprannome.
ALTER TABLE public.santa_bookings
 ADD COLUMN IF NOT EXISTS bambini_dettagli jsonb,
 ADD COLUMN IF NOT EXISTS piano text,
 ADD COLUMN IF NOT EXISTS dettagli_accesso text;

DO $checks$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint
   WHERE conrelid='public.santa_bookings'::regclass
     AND conname='santa_bambini_dettagli_chk') THEN
  ALTER TABLE public.santa_bookings
   ADD CONSTRAINT santa_bambini_dettagli_chk
   CHECK(bambini_dettagli IS NULL OR (
    jsonb_typeof(bambini_dettagli)='array'
    AND jsonb_array_length(bambini_dettagli) BETWEEN 1 AND 8
    AND jsonb_array_length(bambini_dettagli)=cardinality(bambini)
   ));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint
   WHERE conrelid='public.santa_bookings'::regclass
     AND conname='santa_piano_chk') THEN
  ALTER TABLE public.santa_bookings ADD CONSTRAINT santa_piano_chk
   CHECK(piano IS NULL OR length(trim(piano)) BETWEEN 1 AND 60);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint
   WHERE conrelid='public.santa_bookings'::regclass
     AND conname='santa_accesso_chk') THEN
  ALTER TABLE public.santa_bookings ADD CONSTRAINT santa_accesso_chk
   CHECK(dettagli_accesso IS NULL OR length(dettagli_accesso)<=240);
 END IF;
END $checks$;

COMMENT ON COLUMN public.santa_bookings.bambini_dettagli
 IS 'Dettagli dei bambini, solo accesso organizzatori: [{nome,cognome,soprannome,eta}]; NULL per richieste precedenti';
COMMENT ON COLUMN public.santa_bookings.piano
 IS 'Piano di accesso comunicato dal genitore (es. terra, 2, rialzato)';
COMMENT ON COLUMN public.santa_bookings.dettagli_accesso
 IS 'Citofono, scala, interno e indicazioni utili alla squadra CRI';

DO $verification$
BEGIN
 IF EXISTS(SELECT 1 FROM public.santa_bookings
  WHERE bambini_dettagli IS NOT NULL AND
    (jsonb_typeof(bambini_dettagli)<>'array'
     OR jsonb_array_length(bambini_dettagli)<>cardinality(bambini)))
 THEN RAISE EXCEPTION 'Vecchie richieste incoerenti';END IF;
 IF (SELECT mode FROM public.santa_admin_settings WHERE singleton=true) <> 'demo'
 THEN RAISE EXCEPTION 'Non modificare la configurazione LIVE accidentalmente';END IF;
END $verification$;