import { z } from 'zod';
import type { TreeOrnament } from './data';

const text = (max: number) => z.string().trim().max(max).refine(v => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v), 'Caratteri non ammessi');
export const onlineDedication = z.object({ dedica: text(90), firma: text(40).regex(/^[\p{L}\p{N} .,'’!-]*$/u), consent: z.boolean() });
export const giftSessionSchema = z.object({
  project: z.string().max(40), amount: z.number().int().min(5).max(1000), request: z.string().uuid(), client: z.string().uuid(),
  id: z.string().uuid().nullable(), kind: z.enum(['calore', 'dae', 'prossimita', 'cuore']),
  gift: z.boolean(), to: text(40), from: text(40), msg: text(90),
  dedica: text(90), firma: text(40), consent: z.boolean(), provider: z.enum(['sumup', 'paypal']),
});
export type GiftSession = z.infer<typeof giftSessionSchema>;
export type SessionOrnament = TreeOrnament & { sessionOnly?: boolean };
const CURRENT = 'cri-online-current';
const TREE = 'cri-online-session-tree';
export const SESSION_TREE_EVENT = 'cri-online-session-tree-change';
let current: GiftSession | null = null;
let localRows: SessionOrnament[] = [];
export function loadGiftSession(project: string): GiftSession | null {
  try { const parsed = giftSessionSchema.safeParse(JSON.parse(sessionStorage.getItem(CURRENT) || 'null')); current = parsed.success ? parsed.data : null; } catch { /* page-memory fallback */ }
  return current?.project === project ? current : null;
}
export function saveGiftSession(value: GiftSession) {
  current = giftSessionSchema.parse(value);
  try { sessionStorage.setItem(CURRENT, JSON.stringify(current)); } catch { /* page-memory fallback */ }
}
export function clearGiftSession() {
  current = null;
  try { sessionStorage.removeItem(CURRENT); } catch { /* restricted storage */ }
}
const rowSchema = z.object({ id: z.string().uuid(), kind: giftSessionSchema.shape.kind, x: z.number(), y: z.number(), dedica: text(90).optional(), firma: text(40).optional(), sessionOnly: z.literal(true) });
export function sessionOrnaments(): SessionOrnament[] {
  try { const parsed = z.array(rowSchema).max(48).safeParse(JSON.parse(sessionStorage.getItem(TREE) || '[]')); if (parsed.success) localRows = parsed.data; } catch { /* page-memory fallback */ }
  return localRows;
}
export function rememberSessionOrnament(value: GiftSession) {
  const v = giftSessionSchema.parse(value);
  if (!v.id) return;
  const row: SessionOrnament = { id: v.id, kind: v.kind, x: 50, y: 50, sessionOnly: true,
    ...(v.consent && v.dedica ? { dedica: v.dedica } : {}), ...(v.consent && v.firma ? { firma: v.firma } : {}) };
  localRows = [...sessionOrnaments().filter(o => o.id !== row.id), row].slice(-48);
  try { sessionStorage.setItem(TREE, JSON.stringify(localRows)); } catch { /* page-memory fallback */ }
  window.dispatchEvent(new Event(SESSION_TREE_EVENT));
}
/** Only the visitor tree receives this local overlay; never public-only/TV data. */
export function mergeSessionOrnaments(remote: TreeOrnament[], local: SessionOrnament[]): SessionOrnament[] {
  const map = new Map(local.map(o => [o.id, o]));
  return [...remote.map(o => { const own = map.get(o.id); map.delete(o.id); return own ? { ...o, dedica: own.dedica, firma: own.firma, sessionOnly: true } : o; }), ...map.values()];
}