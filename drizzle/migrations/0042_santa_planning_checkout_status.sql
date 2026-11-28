-- CRI Monza | Vigilia 2026: planning a quattro slot e tracciamento offerte.
-- ATTENZIONE: questa migrazione NON abilita incassi reali, non pubblica
-- pagine e non conferma le prenotazioni gia' esistenti.
ALTER TABLE public.santa_admin_settings
 ADD COLUMN IF NOT EXISTS planning_confirmed_at timestamptz,
 ADD COLUMN IF NOT EXISTS online_checkout_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.santa_bookings
 ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'non_richiesto'
 CHECK(payment_state IN ('non_richiesto','da_pagare','in_verifica','pagato_online','pagato_bonifico')),
 ADD COLUMN IF NOT EXISTS payment_method text
 CHECK(payment_method IS NULL OR payment_method IN ('paypal','sumup','bonifico')),
 ADD COLUMN IF NOT EXISTS paid_at timestamptz,
 ADD COLUMN IF NOT EXISTS payment_reference text;
CREATE TABLE IF NOT EXISTS public.santa_payment_links (
 booking_id uuid PRIMARY KEY REFERENCES public.santa_bookings(id) ON DELETE CASCADE,
 token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.santa_payment_attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES public.santa_bookings(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('paypal','sumup')),
 amount_cents integer NOT NULL CHECK(amount_cents BETWEEN 3000 AND 100000),
 status text NOT NULL DEFAULT 'creating'
  CHECK(status IN ('creating','pending','paid','failed','uncertain')),
 provider_id text UNIQUE,
 checkout_url text,
 capture_claimed_at timestamptz,
 provider_payment_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS santa_payment_attempts_booking_idx
 ON public.santa_payment_attempts(booking_id,created_at DESC);

DO $security$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['santa_payment_links','santa_payment_attempts']
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',tbl);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',tbl);
 END LOOP;
END $security$;

-- Idempotency: the same booking/provider never produces a second
-- checkout until the original payment is authoritatively reconciled.
CREATE UNIQUE INDEX IF NOT EXISTS santa_payment_one_provider
 ON public.santa_payment_attempts(booking_id,provider);
CREATE OR REPLACE FUNCTION public.santa_claim_capture(_attempt uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $claim$
DECLARE claimed boolean;
BEGIN
 UPDATE public.santa_payment_attempts SET capture_claimed_at=now()
 WHERE id=_attempt AND provider='paypal' AND status='pending'
  AND capture_claimed_at IS NULL RETURNING true INTO claimed;
 RETURN coalesce(claimed,false);
END $claim$;
REVOKE ALL ON FUNCTION public.santa_claim_capture(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_claim_capture(uuid) TO service_role;

-- This entrypoint accepts trusted provider evidence only from the server
-- service-role and refuses amount, currency or checkout-identity mismatches.
CREATE OR REPLACE FUNCTION public.santa_settle_online_payment(
 _attempt uuid,_provider_id text,_payment_id text,_amount_cents integer,_currency text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $settle$
DECLARE a record; b record; existing boolean;
BEGIN
 IF _currency<>'EUR' THEN RAISE EXCEPTION 'Currency mismatch'; END IF;
 SELECT * INTO a FROM public.santa_payment_attempts WHERE id=_attempt FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('pending','paid') OR
    a.provider_id<>_provider_id OR a.amount_cents<>_amount_cents OR length(_payment_id)<3
 THEN RAISE EXCEPTION 'Payment evidence mismatch'; END IF;
 SELECT * INTO b FROM public.santa_bookings WHERE id=a.booking_id FOR UPDATE;
 IF b.id IS NULL OR b.mode<>'live' OR b.status<>'confermata'
  OR b.quota_offerta_cents<>_amount_cents
 THEN RAISE EXCEPTION 'Booking mismatch'; END IF;
 IF a.status='paid' AND a.provider_payment_id=_payment_id THEN RETURN true; END IF;
 IF b.payment_state IN ('pagato_online','pagato_bonifico')
 THEN RAISE EXCEPTION 'Booking already paid'; END IF;
 UPDATE public.santa_payment_attempts SET status='paid',provider_payment_id=_payment_id,updated_at=now() WHERE id=_attempt;
 UPDATE public.santa_bookings SET payment_state='pagato_online',payment_method=a.provider,
  quota_incassata_cents=_amount_cents,paid_at=now(),payment_reference=_payment_id WHERE id=b.id;
 RETURN true;
END $settle$;
REVOKE ALL ON FUNCTION public.santa_settle_online_payment(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_settle_online_payment(uuid,text,text,integer,text) TO service_role;

-- An ordinary press of "Confirm planning" schedules no real transfer:
-- it atomically allocates an hour, generates a private payment link,
-- creates the email intents and closes intake. Only the caller
-- with a valid Santa admin server session can invoke this service RPC.
CREATE OR REPLACE FUNCTION public.santa_confirm_planning(_actor text,_expected bigint)
RETURNS TABLE(booking_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE active_mode text; v bigint; booked int;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.santa_admin_allowlist WHERE email=_actor AND enabled)
 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 SELECT mode,board_version INTO active_mode,v FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 IF v<>_expected THEN RAISE EXCEPTION 'Planning cambiato: ricarica' USING ERRCODE='40001'; END IF;
 IF (SELECT planning_confirmed_at FROM public.santa_admin_settings WHERE singleton) IS NOT NULL
 THEN RAISE EXCEPTION 'Planning gia confermato' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO booked FROM public.santa_bookings WHERE mode=active_mode AND status<>'annullata';
 IF booked=0 THEN RAISE EXCEPTION 'Nessuna richiesta da confermare' USING ERRCODE='22023'; END IF;
 IF EXISTS (
  SELECT 1 FROM public.santa_bookings
  WHERE mode=active_mode AND status<>'annullata'
   AND (status<>'richiesta' OR squadra IS NULL OR team_position IS NULL OR team_position NOT BETWEEN 1 AND 4)
 ) THEN RAISE EXCEPTION 'Assegna ogni famiglia a una squadra e a uno dei quattro orari' USING ERRCODE='22023'; END IF;
 IF EXISTS (
  SELECT 1 FROM (
   SELECT squadra,count(*) c,min(team_position) lo,max(team_position) hi
   FROM public.santa_bookings WHERE mode=active_mode AND status<>'annullata'
   GROUP BY squadra
  ) t WHERE t.c>4 OR t.lo<>1 OR t.hi<>t.c
 ) THEN RAISE EXCEPTION 'Gli orari delle squadre devono essere consecutivi dalle 19:30' USING ERRCODE='22023'; END IF;
 -- Source of truth for the emails: time derives from saved team position.
 UPDATE public.santa_bookings SET
  confirmed_time=(ARRAY['19:30','20:30','21:30','22:30'])[team_position],
  slot_assegnato=(ARRAY['19:30','20:30','21:30','22:30'])[team_position],
  status='confermata',payment_state='da_pagare'
 WHERE mode=active_mode AND status='richiesta';
 INSERT INTO public.santa_payment_links(booking_id)
 SELECT id FROM public.santa_bookings WHERE mode=active_mode AND status='confermata'
 ON CONFLICT(booking_id) DO NOTHING;
 UPDATE public.santa_admin_settings SET planning_confirmed_at=now(),
  requests_open=false,board_version=board_version+1,updated_at=now() WHERE singleton;
 INSERT INTO public.santa_admin_audit(actor_email,action,changed)
 VALUES(_actor,'planning_confirmed',jsonb_build_object('count',booked,'mode',active_mode));
 RETURN QUERY SELECT id FROM public.santa_bookings
 WHERE mode=active_mode AND status='confermata' ORDER BY squadra,team_position;
END $$;
REVOKE ALL ON FUNCTION public.santa_confirm_planning(text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_confirm_planning(text,bigint) TO service_role;

-- A cancelled booking is retained for audit, excluded from the board.
CREATE OR REPLACE FUNCTION public.santa_cancel_booking(_actor text,_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE active_mode text; present int;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.santa_admin_allowlist WHERE email=_actor AND enabled)
 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 SELECT mode INTO active_mode FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 IF (SELECT planning_confirmed_at FROM public.santa_admin_settings WHERE singleton) IS NOT NULL
 THEN RAISE EXCEPTION 'Planning confermato: contatta il coordinatore per annullamenti' USING ERRCODE='22023'; END IF;
 UPDATE public.santa_bookings SET status='annullata',squadra=NULL,team_position=NULL
 WHERE id=_id AND mode=active_mode AND status='richiesta'
 RETURNING 1 INTO present;
 IF present IS NULL THEN RAISE EXCEPTION 'La richiesta non puo essere eliminata' USING ERRCODE='22023'; END IF;
 UPDATE public.santa_admin_settings SET board_version=board_version+1,updated_at=now() WHERE singleton;
 INSERT INTO public.santa_admin_audit(actor_email,booking_id,action)
 VALUES(_actor,_id,'booking_cancelled');
END $$;
REVOKE ALL ON FUNCTION public.santa_cancel_booking(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_cancel_booking(text,uuid) TO service_role;

-- Once planning is confirmed, reorder/transfer is forbidden to prevent
-- silent schedule changes after confirmation emails have been sent.
CREATE OR REPLACE FUNCTION public.santa_board_save(_actor text,_expected bigint,_assignments jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE active_mode text; current_version bigint; next_version bigint; matching int; valid_ids int;
BEGIN
 IF jsonb_typeof(_assignments)<>'array' OR jsonb_array_length(_assignments)>250
 THEN RAISE EXCEPTION 'Invalid board payload' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.santa_admin_allowlist WHERE email=_actor AND enabled)
 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 SELECT mode,board_version INTO active_mode,current_version FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 IF (SELECT planning_confirmed_at FROM public.santa_admin_settings WHERE singleton) IS NOT NULL
 THEN RAISE EXCEPTION 'Planning confermato' USING ERRCODE='22023'; END IF;
 IF _expected<>current_version THEN RAISE EXCEPTION 'Lavagna cambiata da un altro organizzatore' USING ERRCODE='40001'; END IF;
 SELECT count(*) INTO matching FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int);
 IF matching<>(SELECT count(DISTINCT x.id) FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int))
 OR matching<>(SELECT count(*) FROM public.santa_bookings WHERE mode=active_mode AND status<>'annullata')
 THEN RAISE EXCEPTION 'Lavagna non aggiornata' USING ERRCODE='40001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
  WHERE (x.team IS NOT NULL AND x.team NOT IN ('Squadra A','Squadra B','Squadra C','Squadra D'))
  OR (x.team IS NULL AND x.position IS NOT NULL)
  OR (x.team IS NOT NULL AND (x.position IS NULL OR x.position<1 OR x.position>4)))
 THEN RAISE EXCEPTION 'La squadra dispone di quattro orari, da 19:30 a 22:30' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
  WHERE x.team IS NOT NULL GROUP BY x.team,x.position HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Due famiglie nello stesso orario' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO valid_ids FROM public.santa_bookings b
 JOIN jsonb_to_recordset(_assignments) x(id uuid,team text,position int) ON b.id=x.id
 WHERE b.mode=active_mode AND b.status='richiesta';
 IF valid_ids<>matching THEN RAISE EXCEPTION 'Richieste non valide' USING ERRCODE='40001'; END IF;
 UPDATE public.santa_bookings SET team_position=NULL WHERE mode=active_mode AND status='richiesta';
 UPDATE public.santa_bookings b SET squadra=x.team,team_position=x.position
 FROM jsonb_to_recordset(_assignments) x(id uuid,team text,position int)
 WHERE b.id=x.id AND b.mode=active_mode AND b.status='richiesta';
 UPDATE public.santa_admin_settings SET board_version=board_version+1,updated_at=now()
 WHERE singleton RETURNING board_version INTO next_version;
 INSERT INTO public.santa_admin_audit(actor_email,action,changed)
 VALUES(_actor,'board_reordered',jsonb_build_object('version',next_version,'count',matching));
 RETURN next_version;
END $$;
REVOKE ALL ON FUNCTION public.santa_board_save(text,bigint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_board_save(text,bigint,jsonb) TO service_role;

-- A real bank transfer requires an authorized administrator to verify the
-- credit and record a reference, never a click from the family's browser.
CREATE OR REPLACE FUNCTION public.santa_record_bank_transfer(
 _actor text,_id uuid,_reference text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b record; active_mode text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.santa_admin_allowlist WHERE email=_actor AND enabled)
 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
 SELECT mode INTO active_mode FROM public.santa_admin_settings WHERE singleton FOR UPDATE;
 IF active_mode<>'live' THEN RAISE EXCEPTION 'Collaudo: nessun bonifico reale' USING ERRCODE='22023'; END IF;
 IF length(trim(_reference))<3 OR length(_reference)>150
 THEN RAISE EXCEPTION 'Riferimento bonifico obbligatorio' USING ERRCODE='22023'; END IF;
 SELECT * INTO b FROM public.santa_bookings WHERE id=_id AND mode='live' FOR UPDATE;
 IF b.id IS NULL OR b.status<>'confermata' OR b.payment_state='pagato_online'
 THEN RAISE EXCEPTION 'Stato non valido per registrare il bonifico' USING ERRCODE='22023'; END IF;
 UPDATE public.santa_bookings SET payment_state='pagato_bonifico',payment_method='bonifico',
  paid_at=now(),payment_reference=_reference,quota_incassata_cents=quota_offerta_cents WHERE id=_id;
 INSERT INTO public.santa_admin_audit(actor_email,booking_id,action,changed)
 VALUES(_actor,_id,'bank_transfer_recorded',jsonb_build_object('reference',_reference));
END $$;
REVOKE ALL ON FUNCTION public.santa_record_bank_transfer(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.santa_record_bank_transfer(text,uuid,text) TO service_role;
