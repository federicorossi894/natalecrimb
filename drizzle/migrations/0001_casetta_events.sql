CREATE TABLE public.casetta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 240),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  visible boolean NOT NULL DEFAULT false,
  confirmed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

GRANT SELECT ON public.casetta_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.casetta_events TO authenticated;
GRANT ALL ON public.casetta_events TO service_role;

ALTER TABLE public.casetta_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public sees confirmed upcoming events" ON public.casetta_events
  FOR SELECT TO anon, authenticated
  USING (visible AND confirmed AND coalesce(ends_at, starts_at) > now());

CREATE POLICY "moderators read all events" ON public.casetta_events
  FOR SELECT TO authenticated USING (public.is_moderator());
CREATE POLICY "moderators insert events" ON public.casetta_events
  FOR INSERT TO authenticated WITH CHECK (public.is_moderator());
CREATE POLICY "moderators update events" ON public.casetta_events
  FOR UPDATE TO authenticated USING (public.is_moderator()) WITH CHECK (public.is_moderator());
CREATE POLICY "moderators delete events" ON public.casetta_events
  FOR DELETE TO authenticated USING (public.is_moderator());

CREATE INDEX casetta_events_starts_idx ON public.casetta_events (starts_at);