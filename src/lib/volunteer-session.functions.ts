import { createServerFn } from '@tanstack/react-start';
import { deleteCookie, getCookie, getRequest, getRequestHeader, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { assertCampaignRpc, CAMPAIGN } from './campaign';
import { reviewDecision, reviewOriginAllowed, type ReviewList } from './volunteer-review-policy';
import { b64url, makeVerifier, normalizeVolunteerName, sha256Hex, verifyPassword, VOLUNTEER_COOKIE, VOLUNTEER_SESSION_HOURS } from './volunteer-auth';

/** The only operations reachable with the shared volunteer password. */
export const SHARED_VOLUNTEER_RPC = ['cash_request_lookup', 'confirm_cash_request', 'volunteer_add_ornament'] as const;
/** Plus one no-input operation: a one-time wish QR after a casetta sale (createSharedWishToken). */
const GENERIC = 'Nome o password non corretti.';
const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: VOLUNTEER_SESSION_HOURS * 3600 };
async function reviewSession() {
  if (!CAMPAIGN.demo) throw new Error('Revisione volontari disponibile solo in DEMO.');
  if (!reviewOriginAllowed(getRequestHeader('origin') ?? null, getRequest().url)) throw new Error('Origine non autorizzata.');
  const h = await currentTokenHash();
  if (!h) throw new Error('Sessione scaduta: accedi di nuovo.');
  return h;
}
export const volunteerReviewList = createServerFn({ method: 'POST' }).handler(async (): Promise<ReviewList> => {
  const h = await reviewSession();
  const {data,error} = await (await admin()).rpc('volunteer_demo_review', { _token_hash:h, _action:'list' });
  if (error) throw new Error('Lista non disponibile o sessione scaduta.');
  return data as unknown as ReviewList;
});
export const volunteerReviewDecide = createServerFn({ method:'POST' }).inputValidator(d=>reviewDecision.parse(d)).handler(async ({data}) => {
  const h=await reviewSession();
  const {data:r,error}=await (await admin()).rpc('volunteer_demo_review',{_token_hash:h,_action:'decide',_type:data.type,_id:data.id,_decision:data.decision});
  if(error)throw new Error('Decisione non completata o sessione scaduta.');
  return r as unknown as {result:string};
});

async function admin() {
  return (await import('@/integrations/supabase/client.server')).supabaseAdmin;
}
async function currentTokenHash(): Promise<string | null> {
  const t = getCookie(VOLUNTEER_COOKIE);
  return t && /^[A-Za-z0-9_-]{40,64}$/.test(t) ? sha256Hex(t) : null;
}

export const volunteerLogin = createServerFn({ method: 'POST' })
  .inputValidator((d) => z.object({ name: z.string().max(120), password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const name = normalizeVolunteerName(data.name);
    if (!name) return { ok: false as const, error: 'Scrivi nome e cognome (almeno due parole).' };
    const db = await admin();
    const ip = getRequestHeader('cf-connecting-ip') ?? getRequestHeader('x-real-ip') ?? 'unknown';
    const key = (await sha256Hex(`vol:${ip}`)).slice(0, 40);
    const { data: allowed, error: gateErr } = await db.rpc('volunteer_login_allowed', { _client_key: key });
    if (gateErr) return { ok: false as const, error: 'Accesso momentaneamente non disponibile.' };
    if (!allowed) return { ok: false as const, error: 'Troppi tentativi. Riprova tra qualche minuto.' };

    const { volunteerVerifier } = await import('./volunteer-secret.server');
    const owner = volunteerVerifier();
    const source = (await sha256Hex(owner)).slice(0, 32);
    // Fast path: a 100k-iteration verifier derived after the first good login, stored service-only.
    const cached = await db.from('volunteer_password_cache').select('verifier').eq('source', source).maybeSingle();
    let ok: boolean;
    if (cached.data?.verifier) ok = await verifyPassword(data.password, cached.data.verifier);
    else {
      ok = await verifyPassword(data.password, owner);
      if (ok) await db.from('volunteer_password_cache').upsert({ source, verifier: await makeVerifier(data.password) });
    }
    await db.rpc('volunteer_login_record', { _client_key: key, _ok: ok });
    if (!ok) return { ok: false as const, error: GENERIC };

    const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const { data: rows, error } = await db.rpc('volunteer_session_open', { _token_hash: await sha256Hex(token), _display_name: name, _hours: VOLUNTEER_SESSION_HOURS });
    const s = rows?.[0];
    if (error || !s) return { ok: false as const, error: 'Accesso momentaneamente non disponibile.' };
    setCookie(VOLUNTEER_COOKIE, token, cookieOpts);
    return { ok: true as const, name: s.display_name, expiresAt: s.expires_at };
  });

export const volunteerMe = createServerFn({ method: 'GET' }).handler(async () => {
  const h = await currentTokenHash();
  if (!h) return null;
  const { data } = await (await admin()).rpc('volunteer_session_get', { _token_hash: h });
  const s = data?.[0];
  return s ? { name: s.display_name, expiresAt: s.expires_at } : null;
});

export const volunteerLogout = createServerFn({ method: 'POST' }).handler(async () => {
  const h = await currentTokenHash();
  if (h) await (await admin()).rpc('volunteer_session_close', { _token_hash: h });
  deleteCookie(VOLUNTEER_COOKIE, { path: '/', secure: true, httpOnly: true, sameSite: 'lax' });
  return { ok: true };
});

const rpcInput = z.object({ name: z.enum(SHARED_VOLUNTEER_RPC), args: z.record(z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])).default({}) });
export const volunteerRpc = createServerFn({ method: 'POST' })
  .inputValidator((d) => rpcInput.parse(d))
  .handler(async ({ data }) => {
    assertCampaignRpc(data.name, 'volunteer');
    const h = await currentTokenHash();
    if (!h) throw new Error('Sessione scaduta: accedi di nuovo.');
    // Actor/name are resolved in the DB from the session row; client args never carry identity.
    const { _actor: _ignored, ...args } = data.args as Record<string, unknown>;
    const { data: result, error } = await (await admin()).rpc('campaign_volunteer_dispatch', { _token_hash: h, _name: data.name, _args: args as never });
    if (error) throw new Error(error.code === '42501' ? 'Sessione scaduta: accedi di nuovo.' : 'Operazione non completata. Controlla i dati e riprova.');
    return result;
  });

/** "Acquisto alla casetta": one-time wish code for the customer, same shared session, no client input. */
export const createSharedWishToken = createServerFn({ method: 'POST' }).handler(async () => {
  assertCampaignRpc('create_wish_token', 'volunteer');
  const h = await currentTokenHash();
  if (!h) throw new Error('Sessione scaduta: accedi di nuovo.');
  const { data: result, error } = await (await admin()).rpc('campaign_volunteer_dispatch', { _token_hash: h, _name: 'create_wish_token', _args: {} as never });
  if (error) throw new Error(error.code === '42501' ? 'Sessione scaduta: accedi di nuovo.' : 'Codice non creato: attendi qualche minuto e riprova.');
  const r = (result as Array<{ code: string; expires_at: string }> | null)?.[0];
  if (!r) throw new Error('Codice non creato');
  return { code: r.code, expires_at: r.expires_at };
});
