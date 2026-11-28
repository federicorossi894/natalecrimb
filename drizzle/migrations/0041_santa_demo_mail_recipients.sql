-- Collaudo Babbo Natale: gli indirizzi che ricevono email di prova
-- sono separati dagli utenti abilitati all'area organizzatori.
-- Nessun destinatario aggiunto al codice pubblico: inserimento
-- delle caselle di test autorizzate direttamente nel database privato.
CREATE TABLE IF NOT EXISTS public.santa_demo_mail_recipients(
 email text PRIMARY KEY CHECK(email=lower(trim(email)) AND length(email)<=254 AND position('@' in email)>1),
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.santa_demo_mail_recipients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.santa_demo_mail_recipients FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.santa_demo_mail_recipients TO service_role;
COMMENT ON TABLE public.santa_demo_mail_recipients IS
 'Destinatari ammessi per email REALI durante demo Babbo Natale. Non attribuisce accesso amministrativo. Nessuna email verso destinatari arbitrari.';
