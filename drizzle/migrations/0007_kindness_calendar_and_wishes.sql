-- ============ Calendario della Gentilezza ============
CREATE TABLE public.kindness_doors (
  day smallint PRIMARY KEY CHECK (day BETWEEN 1 AND 24),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 60),
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 280),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, UPDATE ON public.kindness_doors TO authenticated;
GRANT ALL ON public.kindness_doors TO service_role;
ALTER TABLE public.kindness_doors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderators read doors" ON public.kindness_doors FOR SELECT TO authenticated USING (public.is_moderator());
CREATE POLICY "moderators edit doors" ON public.kindness_doors FOR UPDATE TO authenticated USING (public.is_moderator()) WITH CHECK (public.is_moderator());

INSERT INTO public.kindness_doors (day, title, message) VALUES
(1, 'Un buongiorno in più', 'Saluta per primo chi incontri oggi: il vicino, il barista, l''autista del bus. Un buongiorno detto guardando negli occhi scalda più di quanto pensi.'),
(2, 'Grazie a voce alta', 'Ringrazia qualcuno che di solito nessuno ringrazia: chi pulisce le strade, chi consegna i pacchi, chi lavora mentre gli altri fanno festa.'),
(3, 'Una telefonata attesa', 'Chiama una persona che non senti da tempo, magari qualcuno che vive da solo. Basta chiedere: «Come stai, davvero?»'),
(4, 'Il cappotto che non metti', 'Guarda nell''armadio: c''è un capo caldo, pulito e in buono stato che non usi più? Informati su dove donarlo nella tua città.'),
(5, 'Occhi aperti', 'Oggi fai caso a chi ti sta intorno. Se qualcuno sembra in difficoltà, chiedi «Posso aiutarti?». Se la situazione sembra seria, chiama il 112.'),
(6, 'Il numero che conta', 'Ripassa con chi vive con te il numero unico di emergenza: 112. Saperlo tutti, anche i più piccoli, è già un regalo.'),
(7, 'Un biglietto inaspettato', 'Scrivi due righe a mano per qualcuno: un collega, un''insegnante, un vicino. Lascialo dove lo troverà.'),
(8, 'La spesa per due', 'Se puoi, aggiungi alla spesa un prodotto a lunga conservazione da donare a una raccolta alimentare della tua zona.'),
(9, 'Tempo regalato', 'Regala un''ora del tuo tempo: aiuta un vicino con la spesa, accompagna qualcuno, fai compagnia a chi è solo.'),
(10, 'Ascoltare davvero', 'Oggi, quando qualcuno ti parla, metti via il telefono e ascolta fino in fondo. È uno dei regali più rari.'),
(11, 'La porta accanto', 'Bussa da un vicino anziano o che vive da solo e chiedi se ha bisogno di qualcosa per le feste.'),
(12, 'Gentili anche in rete', 'Lascia un commento sincero e gentile sotto il post di qualcuno. La gentilezza funziona anche online.'),
(13, 'Pronti per il freddo', 'Controlla di avere in casa una torcia funzionante, una coperta in più e il telefono carico. Prepararsi è un modo di prendersi cura.'),
(14, 'Dov''è il DAE?', 'Quando esci, cerca il defibrillatore (DAE) più vicino a casa, a scuola o al lavoro. Sapere dov''è può fare la differenza.'),
(15, 'Il complimento sincero', 'Fai un complimento vero a qualcuno: per il suo lavoro, per la sua pazienza, per la sua gentilezza.'),
(16, 'Cedi il posto', 'Sul bus, in fila, in sala d''attesa: lascia il posto a chi ne ha più bisogno, anche se non lo chiede.'),
(17, 'Un gesto che dura', 'Informati su come si diventa donatori di sangue o volontari nella tua città. A volte un gesto gentile diventa un''abitudine.'),
(18, 'Il primo passo', 'C''è una piccola incomprensione rimasta in sospeso? Oggi prova a fare tu il primo passo.'),
(19, 'Anche per chi non parla', 'Pensa agli animali: un po'' d''acqua fresca sul balcone, una passeggiata con il cane del vicino, una coperta per un rifugio.'),
(20, 'Insegna qualcosa', 'Condividi una cosa che sai fare: una ricetta, un trucco con il telefono, un gioco. Imparare insieme avvicina.'),
(21, 'Il giorno più corto', 'Oggi è il giorno con meno luce dell''anno. Accendi una luce per qualcuno: un messaggio, una visita, un invito.'),
(22, 'Mani che aiutano', 'Aiuta in casa senza che te lo chiedano: apparecchia, riordina, prepara qualcosa di caldo per chi è stanco.'),
(23, 'Una sedia in più', 'Se puoi, invita qualcuno che altrimenti passerebbe le feste da solo, anche solo per un caffè.'),
(24, 'La vigilia insieme', 'Stasera fermati un momento con chi ami e raccontatevi il gesto gentile più bello di questo mese. Buon Natale!');

-- Doors unlock on the Europe/Rome calendar date computed by the server, never by the visitor's clock.
CREATE OR REPLACE FUNCTION public.kindness_unlocked_day(_at timestamptz)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN extract(month FROM (_at AT TIME ZONE 'Europe/Rome')) = 12 THEN least(extract(day FROM (_at AT TIME ZONE 'Europe/Rome'))::int, 24)
    WHEN extract(month FROM (_at AT TIME ZONE 'Europe/Rome')) = 1 THEN 24
    ELSE 0 END
$$;
REVOKE EXECUTE ON FUNCTION public.kindness_unlocked_day(timestamptz) FROM PUBLIC, anon, authenticated;

-- Future doors return only their number: their text never leaves the database early.
CREATE OR REPLACE FUNCTION public.kindness_calendar()
RETURNS TABLE (day integer, title text, message text, server_now timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.day::int,
    CASE WHEN d.day <= u.n THEN d.title END,
    CASE WHEN d.day <= u.n THEN d.message END,
    now()
  FROM public.kindness_doors d CROSS JOIN (SELECT public.kindness_unlocked_day(now()) AS n) u
  ORDER BY d.day
$$;
REVOKE EXECUTE ON FUNCTION public.kindness_calendar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kindness_calendar() TO anon, authenticated;

-- ============ Muro degli auguri ============
CREATE TABLE public.wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 180),
  nickname text CHECK (nickname IS NULL OR char_length(nickname) <= 24),
  publish_consent boolean NOT NULL CHECK (publish_consent),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  auto_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderated_by uuid
);
GRANT SELECT ON public.wishes TO authenticated;
GRANT ALL ON public.wishes TO service_role;
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moderators read wishes" ON public.wishes FOR SELECT TO authenticated USING (public.is_moderator());
CREATE INDEX wishes_status_idx ON public.wishes (status, moderated_at DESC);

-- One-time wish tokens handed out by volunteers after a purchase at the casetta. Only the SHA-256 is stored.
CREATE TABLE public.wish_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  wish_id uuid REFERENCES public.wishes(id) ON DELETE SET NULL
);
CREATE INDEX wish_tokens_creator_idx ON public.wish_tokens (created_by, created_at);
GRANT ALL ON public.wish_tokens TO service_role;
ALTER TABLE public.wish_tokens ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: reachable only through the security-definer functions below.

-- Support signals for moderators only (never an automatic publication decision).
CREATE OR REPLACE FUNCTION public.wish_flags(_body text, _nick text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN lower(t) ~ '(https?://|www\.|[a-z0-9-]+\.(it|com|org|net|eu|info)(\s|/|$))' THEN 'link' END,
    CASE WHEN lower(t) ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN 'email' END,
    CASE WHEN regexp_replace(t, '[\s.\-/()+]', '', 'g') ~ '[0-9]{7,}' THEN 'telefono' END,
    CASE WHEN t ~ '(^|\s)@[A-Za-z0-9_.]{3,}' THEN 'social' END,
    CASE WHEN lower(t) ~ '(cazz|merd|stronz|vaffan|fanculo|puttan|coglion|troia|bastard|minchi)' THEN 'linguaggio' END,
    CASE WHEN lower(t) ~ '(via|viale|piazza|corso)\s+[a-z]+\s+[0-9]+' THEN 'indirizzo' END
  ], NULL)
  FROM (SELECT coalesce(_body,'') || ' ' || coalesce(_nick,'') AS t) s
$$;
REVOKE EXECUTE ON FUNCTION public.wish_flags(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_wish_token()
RETURNS TABLE (code text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; raw bytea; tok text := ''; abc text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; i int; exp timestamptz := now() + interval '7 days';
BEGIN
  IF NOT public.is_volunteer() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  SELECT count(*) INTO n FROM wish_tokens w WHERE w.created_by = auth.uid() AND w.created_at > now() - interval '10 minutes';
  IF n >= 30 THEN RAISE EXCEPTION 'Troppi codici in poco tempo, riprova tra qualche minuto'; END IF;
  -- Data minimisation: forget unused codes a day after they expire.
  DELETE FROM wish_tokens w WHERE w.used_at IS NULL AND w.expires_at < now() - interval '1 day';
  raw := extensions.gen_random_bytes(16);
  FOR i IN 0..15 LOOP tok := tok || substr(abc, (get_byte(raw, i) % 32) + 1, 1); END LOOP;
  INSERT INTO wish_tokens (token_hash, created_by, expires_at) VALUES (public.cash_code_hash(tok), auth.uid(), exp);
  RETURN QUERY SELECT tok, exp;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_wish_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wish_token() TO authenticated;

-- The holder of the code (personal link) can see whether it is free, and later the state of their own wish.
CREATE OR REPLACE FUNCTION public.wish_lookup(_code text)
RETURNS TABLE (state text, expires_at timestamptz, body text, nickname text, wish_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE WHEN t.used_at IS NOT NULL THEN 'used' WHEN t.expires_at < now() THEN 'expired' ELSE 'available' END,
    t.expires_at, w.body, w.nickname, w.status
  FROM wish_tokens t LEFT JOIN wishes w ON w.id = t.wish_id
  WHERE t.token_hash = public.cash_code_hash(_code)
$$;
REVOKE EXECUTE ON FUNCTION public.wish_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wish_lookup(text) TO anon, authenticated;

-- Atomic: the row lock serialises concurrent submissions; a code writes at most one wish.
CREATE OR REPLACE FUNCTION public.submit_wish(_code text, _body text, _nickname text, _consent boolean)
RETURNS TABLE (result text, wish_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t wish_tokens; b text := btrim(regexp_replace(coalesce(_body,''), '\s+', ' ', 'g')); nk text := nullif(btrim(regexp_replace(coalesce(_nickname,''), '\s+', ' ', 'g')),''); wid uuid;
BEGIN
  SELECT * INTO t FROM wish_tokens w WHERE w.token_hash = public.cash_code_hash(_code) FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'not_found'::text, NULL::text; RETURN; END IF;
  IF t.used_at IS NOT NULL THEN RETURN QUERY SELECT 'already_used'::text, (SELECT x.status FROM wishes x WHERE x.id = t.wish_id); RETURN; END IF;
  IF t.expires_at < now() THEN RETURN QUERY SELECT 'expired'::text, NULL::text; RETURN; END IF;
  IF NOT coalesce(_consent,false) THEN RAISE EXCEPTION 'Serve il consenso alla pubblicazione'; END IF;
  IF char_length(b) < 2 THEN RAISE EXCEPTION 'Scrivi il tuo augurio'; END IF;
  IF char_length(b) > 180 THEN RAISE EXCEPTION 'Massimo 180 caratteri'; END IF;
  IF nk IS NOT NULL AND (char_length(nk) > 24 OR nk !~ '^[[:alnum:] .''’-]+$') THEN RAISE EXCEPTION 'Soprannome non valido'; END IF;
  INSERT INTO wishes (body, nickname, publish_consent, auto_flags) VALUES (b, nk, true, public.wish_flags(b, nk)) RETURNING wishes.id INTO wid;
  UPDATE wish_tokens w SET used_at = now(), wish_id = wid WHERE w.id = t.id;
  RETURN QUERY SELECT 'ok'::text, 'pending'::text;
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_wish(text,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_wish(text,text,text,boolean) TO anon, authenticated;

-- Public wall: approved + consented only. Pending, rejected and hidden wishes never leave the database.
CREATE OR REPLACE FUNCTION public.public_wishes()
RETURNS TABLE (id uuid, body text, nickname text, approved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.body, w.nickname, w.moderated_at FROM wishes w
  WHERE w.status = 'approved' AND w.publish_consent
  ORDER BY w.moderated_at DESC NULLS LAST LIMIT 240
$$;
REVOKE EXECUTE ON FUNCTION public.public_wishes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_wishes() TO anon, authenticated;

-- Moderation is for moderators/admins only (not plain volunteers), re-checked server-side.
CREATE OR REPLACE FUNCTION public.moderate_wish(_id uuid, _status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_moderator() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  IF _status NOT IN ('approved','rejected','hidden') THEN RAISE EXCEPTION 'Stato non valido'; END IF;
  UPDATE wishes w SET status = _status, moderated_at = now(), moderated_by = auth.uid() WHERE w.id = _id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  RETURN _status;
END $$;
REVOKE EXECUTE ON FUNCTION public.moderate_wish(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_wish(uuid,text) TO authenticated;

-- Doors edited by staff record who changed them.
CREATE OR REPLACE FUNCTION public.kindness_doors_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); NEW.updated_by := auth.uid(); NEW.day := OLD.day; RETURN NEW; END $$;
CREATE TRIGGER kindness_doors_touch BEFORE UPDATE ON public.kindness_doors FOR EACH ROW EXECUTE FUNCTION public.kindness_doors_touch();