import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest, getRequestHeader, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';

const COOKIE = 'cri_casetta_pos';
const COOKIE_AGE = 60 * 60 * 24 * 45;
const tokenPattern = /^[A-Za-z0-9_-]{40,64}$/;
const productSchema = z.object({ id: z.string().regex(/^[a-z0-9_-]{2,40}$/), label: z.string(), priceCents: z.number().int().positive() });
const itemsSchema = z.array(z.object({ id: z.string().regex(/^[a-z0-9_-]{2,40}$/), quantity: z.number().int().min(1).max(99) }).strict()).min(1).max(25);
const saleSchema = z.object({
  requestId: z.string().uuid(), method: z.enum(['cash','pos']), items: itemsSchema,
}).strict();
export type CasettaProduct = z.infer<typeof productSchema>;
export type CasettaSaleInput = z.infer<typeof saleSchema>;

const db = async () => (await import('@/integrations/supabase/client.server')).supabaseAdmin as unknown as {
  rpc: (name: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const hashToken = async (token: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
};
function requireSameOrigin() {
  const request = getRequest();
  const origin = getRequestHeader('origin');
  // Origin is mandatory on writes; no cross-origin requests even with a stolen cookie.
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) throw new Error('Origine non autorizzata.');
}
async function tokenHash() {
  const token = getCookie(COOKIE);
  return token && tokenPattern.test(token) ? hashToken(token) : null;
}
async function catalogFor(token: string) {
  const { data, error } = await (await db()).rpc('casetta_catalog', { _token_hash: await hashToken(token) });
  if (error) throw new Error('QR scaduto o non autorizzato.');
  return z.array(productSchema).parse(data);
}
export const casettaActivateQr = createServerFn({ method:'POST' })
  .inputValidator((input) => z.object({ token: z.string().regex(tokenPattern) }).strict().parse(input))
  .handler(async ({ data }) => {
    requireSameOrigin();
    const products = await catalogFor(data.token);
    setCookie(COOKIE,data.token,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:COOKIE_AGE});
    return { ok:true as const, products };
  });
export const casettaSession = createServerFn({ method:'GET' }).handler(async () => {
  const hash = await tokenHash();
  if (!hash) return { authorized:false as const, products:[] as CasettaProduct[] };
  const { data, error } = await db().rpc('casetta_catalog', { _token_hash:hash });
  if (error) return { authorized:false as const, products:[] as CasettaProduct[] };
  return { authorized:true as const, products:z.array(productSchema).parse(data) };
});
export const casettaRecordSale = createServerFn({ method:'POST' })
  .inputValidator((input) => saleSchema.parse(input))
  .handler(async ({ data }) => {
    requireSameOrigin();
    const hash = await tokenHash();
    if (!hash) throw new Error('Accesso scaduto: scansiona nuovamente il QR.');
    const { data: result,error } = await db().rpc('casetta_record_sale',{
      _token_hash:hash,_request_id:data.requestId,_method:data.method,_items:data.items,
    });
    if (error) throw new Error('Vendita non registrata. Controlla la connessione e riprova senza modificare la vendita.');
    return z.object({id:z.string().uuid(),totalCents:z.number().int(),alreadyRecorded:z.boolean()}).parse(result);
  });
