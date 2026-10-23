-- Minimum demo gift is 5 € everywhere: online (simulated), cash at the casetta, volunteer manual entry.
CREATE OR REPLACE FUNCTION public.hang_ornament(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _client uuid)
 RETURNS TABLE(id uuid, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),'');
  n int; st text; nid uuid; yy int; half numeric;
begin
  if _kind not in ('dae','calore','prossimita','cuore') then raise exception 'Tipo non valido'; end if;
  if _client is null then raise exception 'Client mancante'; end if;
  if _amount_cents is null or _amount_cents < 500 or _amount_cents > 100000 or _amount_cents % 100 <> 0 then raise exception 'Importo non valido: minimo 5 €, massimo 1000 €, solo euro interi'; end if;
  if f is not null and (char_length(f) > 40 or f !~ '^[[:alnum:] .,''’!-]+$') then raise exception 'Firma non valida'; end if;
  if d is not null and char_length(d) > 90 then raise exception 'Dedica troppo lunga'; end if;
  if not coalesce(_consent,false) then f := null; d := null; end if;
  select count(*) into n from demo_ornaments o where o.client_id = _client and o.created_at > now() - interval '10 minutes';
  if n >= 3 then raise exception 'Troppi addobbi in poco tempo, riprova tra qualche minuto'; end if;
  select count(*) into n from demo_ornaments o where o.created_at > now() - interval '1 minute';
  if n >= 30 then raise exception 'Albero molto affollato, riprova tra poco'; end if;
  if f is null and d is null then st := 'approved';
  elsif lower(coalesce(d,'') || ' ' || coalesce(f,'')) ~ '(cazz|merd|stronz|vaffan|puttan|coglion|idiot|http|www\.)' then st := 'rejected';
  else st := 'pending'; end if;
  yy := 28 + floor(random()*58)::int; half := ((yy - 10) / 80.0) * 34;
  insert into demo_ornaments (kind, x, y, firma, dedica, publish_consent, status, client_id, amount_cents)
  values (_kind, round(50 + (random()*2-1)*half*0.8)::int, yy, f, d, coalesce(_consent,false), st, _client, _amount_cents)
  returning demo_ornaments.id into nid;
  return query select nid, st;
end $function$;

DROP FUNCTION IF EXISTS public.hang_ornament(text, text, text, boolean, uuid);
GRANT EXECUTE ON FUNCTION public.hang_ornament(text, integer, text, text, boolean, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_cash_request(_kind text, _amount_cents integer, _firma text, _dedica text, _consent boolean, _client uuid)
 RETURNS TABLE(code text, amount_cents integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),'');
  n int; raw bytea; tok text := ''; abc text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; i int; exp timestamptz := now() + interval '2 hours';
BEGIN
  IF _amount_cents IS NULL OR _amount_cents < 500 OR _amount_cents > 100000 OR _amount_cents % 100 <> 0 THEN RAISE EXCEPTION 'Importo non valido: minimo 5 €, massimo 1000 €, solo euro interi'; END IF;
  RETURN QUERY SELECT * FROM public._create_cash_request_v1(_kind, _amount_cents, _firma, _dedica, _consent, _client);
END $function$;