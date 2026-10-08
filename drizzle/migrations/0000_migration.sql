create type public.app_role as enum ('admin', 'moderator');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'))
$$;

create table public.demo_ornaments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dae','calore','prossimita','cuore')),
  x int not null, y int not null,
  firma text check (char_length(firma) <= 40),
  dedica text check (char_length(dedica) <= 90),
  publish_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  client_id uuid not null,
  created_at timestamptz not null default now()
);
create index on public.demo_ornaments (client_id, created_at);
create index on public.demo_ornaments (created_at);
grant select, update on public.demo_ornaments to authenticated;
grant all on public.demo_ornaments to service_role;
alter table public.demo_ornaments enable row level security;
create policy "moderators read" on public.demo_ornaments for select to authenticated using (public.is_moderator());
create policy "moderators update" on public.demo_ornaments for update to authenticated using (public.is_moderator()) with check (public.is_moderator());

-- Public tree: text only if consented AND approved
create or replace function public.public_tree()
returns table (id uuid, kind text, x int, y int, firma text, dedica text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.kind, o.x, o.y,
    case when o.publish_consent and o.status = 'approved' then o.firma end,
    case when o.publish_consent and o.status = 'approved' then o.dedica end,
    o.created_at
  from public.demo_ornaments o where o.status <> 'rejected'
  order by o.created_at desc limit 300
$$;
grant execute on function public.public_tree() to anon, authenticated;

create or replace function public.hang_ornament(_kind text, _firma text, _dedica text, _consent boolean, _client uuid)
returns table (id uuid, status text)
language plpgsql security definer set search_path = public as $$
declare f text := nullif(btrim(coalesce(_firma,'')),''); d text := nullif(btrim(coalesce(_dedica,'')),'');
  n int; st text; nid uuid; yy int; half numeric;
begin
  if _kind not in ('dae','calore','prossimita','cuore') then raise exception 'Tipo non valido'; end if;
  if _client is null then raise exception 'Client mancante'; end if;
  if f is not null and (char_length(f) > 40 or f !~ '^[[:alnum:] .,''’!-]+$') then raise exception 'Firma non valida'; end if;
  if d is not null and char_length(d) > 90 then raise exception 'Dedica troppo lunga'; end if;
  if not coalesce(_consent,false) then f := null; d := null; end if;
  select count(*) into n from demo_ornaments where client_id = _client and created_at > now() - interval '10 minutes';
  if n >= 3 then raise exception 'Troppi addobbi in poco tempo, riprova tra qualche minuto'; end if;
  select count(*) into n from demo_ornaments where created_at > now() - interval '1 minute';
  if n >= 30 then raise exception 'Albero molto affollato, riprova tra poco'; end if;
  if f is null and d is null then st := 'approved';
  elsif lower(coalesce(d,'') || ' ' || coalesce(f,'')) ~ '(cazz|merd|stronz|vaffan|puttan|coglion|idiot|http|www\.)' then st := 'rejected';
  else st := 'pending'; end if;
  yy := 28 + floor(random()*58)::int; half := ((yy - 10) / 80.0) * 34;
  insert into demo_ornaments (kind, x, y, firma, dedica, publish_consent, status, client_id)
  values (_kind, round(50 + (random()*2-1)*half*0.8)::int, yy, f, d, coalesce(_consent,false), st, _client)
  returning demo_ornaments.id into nid;
  return query select nid, st;
end $$;
grant execute on function public.hang_ornament(text,text,text,boolean,uuid) to anon, authenticated;

create or replace function public.my_ornaments(_client uuid)
returns table (id uuid, kind text, dedica text, status text, publish_consent boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.kind, o.dedica, o.status, o.publish_consent from demo_ornaments o where o.client_id = _client order by created_at desc limit 20
$$;
grant execute on function public.my_ornaments(uuid) to anon, authenticated;

revoke execute on function public.has_role(uuid, app_role) from anon;
grant execute on function public.is_moderator() to authenticated;