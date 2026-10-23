CREATE OR REPLACE FUNCTION public.create_cash_request(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _client uuid)
RETURNS TABLE (code text, amount_cents integer, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),'');
  n int; raw bytea; tok text := ''; abc text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; i int; exp timestamptz := now() + interval '2 hours';
BEGIN
  IF _kind NOT IN ('dae','calore','prossimita','cuore') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF _client IS NULL THEN RAISE EXCEPTION 'Client mancante'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 500 OR _amount_cents > 100000 OR _amount_cents % 100 <> 0 THEN RAISE EXCEPTION 'Importo non valido: minimo 5 €, massimo 1000 €, solo euro interi'; END IF;
  IF f IS NOT NULL AND (char_length(f) > 40 OR f !~ '^[[:alnum:] .,''’!-]+$') THEN RAISE EXCEPTION 'Firma non valida'; END IF;
  IF d IS NOT NULL AND char_length(d) > 90 THEN RAISE EXCEPTION 'Dedica troppo lunga'; END IF;
  IF NOT coalesce(_consent,false) THEN f := NULL; d := NULL; END IF;
  SELECT count(*) INTO n FROM cash_requests c WHERE c.client_id = _client AND c.created_at > now() - interval '10 minutes';
  IF n >= 3 THEN RAISE EXCEPTION 'Troppe richieste in poco tempo, riprova tra qualche minuto'; END IF;
  SELECT count(*) INTO n FROM cash_requests c WHERE c.created_at > now() - interval '1 minute';
  IF n >= 60 THEN RAISE EXCEPTION 'Casetta molto affollata, riprova tra poco'; END IF;
  DELETE FROM cash_requests c WHERE c.status = 'pending' AND c.expires_at < now() - interval '1 day';
  raw := extensions.gen_random_bytes(16);
  FOR i IN 0..15 LOOP tok := tok || substr(abc, (get_byte(raw, i) % 32) + 1, 1); END LOOP;
  INSERT INTO cash_requests (token_hash, kind, amount_cents, firma, dedica, publish_consent, client_id, expires_at)
  VALUES (public.cash_code_hash(tok), _kind, _amount_cents, f, d, coalesce(_consent,false), _client, exp);
  RETURN QUERY SELECT tok, _amount_cents, exp;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_cash_request(text,integer,text,text,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_cash_request(text,integer,text,text,boolean,uuid) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.hang_ornament(text,integer,text,text,boolean,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hang_ornament(text,integer,text,text,boolean,uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.volunteer_add_ornament(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _method text)
 RETURNS TABLE(id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),''); n int; st text; nid uuid; yy int; half numeric;
BEGIN
  IF NOT public.is_volunteer() THEN RAISE EXCEPTION 'Non autorizzato' USING ERRCODE = '42501'; END IF;
  IF _kind NOT IN ('dae','calore','prossimita','cuore') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF _method NOT IN ('cash','pos_manual') THEN RAISE EXCEPTION 'Metodo non valido'; END IF;
  IF _amount_cents IS NULL OR _amount_cents < 500 OR _amount_cents > 100000 OR _amount_cents % 100 <> 0 THEN RAISE EXCEPTION 'Importo non valido: minimo 5 €, massimo 1000 €, solo euro interi'; END IF;
  IF f IS NOT NULL AND (char_length(f) > 40 OR f !~ '^[[:alnum:] .,''’!-]+$') THEN RAISE EXCEPTION 'Firma non valida'; END IF;
  IF d IS NOT NULL AND char_length(d) > 90 THEN RAISE EXCEPTION 'Dedica troppo lunga'; END IF;
  IF NOT coalesce(_consent,false) THEN f := NULL; d := NULL; END IF;
  SELECT count(*) INTO n FROM demo_ornaments o WHERE o.added_by = auth.uid() AND o.created_at > now() - interval '10 minutes';
  IF n >= 40 THEN RAISE EXCEPTION 'Troppi inserimenti in poco tempo, riprova tra qualche minuto'; END IF;
  st := public.ornament_text_status(f, d);
  yy := 28 + floor(random()*58)::int; half := ((yy - 10) / 80.0) * 34;
  INSERT INTO demo_ornaments (kind, x, y, firma, dedica, publish_consent, status, client_id, payment_method, amount_cents, added_by)
  VALUES (_kind, round(50 + (random()*2-1)*half*0.8)::int, yy, f, d, coalesce(_consent,false), st, gen_random_uuid(), _method, _amount_cents, auth.uid())
  RETURNING demo_ornaments.id INTO nid;
  RETURN QUERY SELECT nid, st;
END $function$;