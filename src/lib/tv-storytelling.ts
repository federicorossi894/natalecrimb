import { PROJECTS, type OrnamentKind, type TreeOrnament } from './data';

export const STORY_MS = 10_000;
export const STORY_RETURN_MS = 2_000;
export const STORY_ID_COOLDOWN_MS = 180_000;
export const STORY_KINDS: OrnamentKind[] = ['calore', 'dae', 'prossimita', 'cuore'];

/** TV-only micro-stories distilled from PROJECTS; no promises of objects bought or services already operating. */
export const TV_STORIES: Record<OrnamentKind, string> = {
  calore: 'In strada, il calore è anche tempo e ascolto. Il tuo gesto sostiene le uscite dei volontari e i beni di conforto.',
  dae: 'Sapere cosa fare può cambiare tutto. Il tuo gesto sostiene i corsi BLSD, la cultura del soccorso e la diffusione dei defibrillatori.',
  prossimita: 'Il primo passo, insieme. Il tuo gesto sostiene il futuro acquisto e allestimento dell’Unità Mobile di Prossimità.',
  cuore: 'Scegliere di esserci, quando serve. Il tuo gesto sostiene le attività sanitarie e sociali dove il bisogno è più urgente.',
};

export type StoryPriority = 'ceremony' | 'arrival' | 'wall' | 'dedication' | 'editorial';
export function storyPriority(s: { ceremony: boolean; arrival: boolean; wall: boolean; dedication: boolean }): StoryPriority {
  return s.ceremony ? 'ceremony' : s.arrival ? 'arrival' : s.wall ? 'wall' : s.dedication ? 'dedication' : 'editorial';
}

export type StoryState = {
  seed: number;
  nextAt: number;
  focus: { id: TreeOrnament['id']; start: number } | null;
  blocked: boolean;
  lastId: TreeOrnament['id'] | null;
  lastKind: OrnamentKind | null;
  kindTurns: Record<OrnamentKind, number>;
  recent: Map<TreeOrnament['id'], number>;
};
function random(seed: number) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function storyDelay(seed: number) {
  const r = random(seed);
  return { seed: r.seed, ms: 45_000 + Math.floor(r.value * 15_001) };
}
export function initialStory(now: number, seed = 20261108, tempo = 1): StoryState {
  const d = storyDelay(seed);
  return { seed: d.seed, nextAt: now + d.ms * tempo, focus: null, blocked: false, lastId: null, lastKind: null, kindTurns: { calore: 0, dae: 0, prossimita: 0, cuore: 0 }, recent: new Map() };
}

/** Call ONLY with the read-only public tree projection, never mine/publicOrnaments/local demo fixtures.
 * Explicit reconstruction drops arbitrary fields (including amount, consent/status and private client IDs).
 * Consented moderated text is already redacted by the server. Fetch errors redact it again here.
 */
export function storyOrnaments(publicRows: readonly TreeOrnament[], error: boolean): TreeOrnament[] {
  return publicRows.filter(o => STORY_KINDS.includes(o.kind) && Number.isFinite(o.x) && Number.isFinite(o.y)).map(o => ({
    id: o.id, kind: o.kind, x: o.x, y: o.y,
    ...(!error && o.dedica ? { dedica: o.dedica, ...(o.firma ? { firma: o.firma } : {}) } : {}),
  }));
}

/** Re-resolve every render: no retained dedication snapshot survives revocation or a failed read. */
export function storyContent(id: TreeOrnament['id'] | undefined, publicRows: readonly TreeOrnament[], error: boolean) {
  if (error || id === undefined) return null;
  const row = storyOrnaments(publicRows, false).find(o => o.id === id);
  if (!row) return null;
  const project = PROJECTS.find(p => p.ornament === row.kind);
  if (!project) return null;
  // Never edit a donor's meaning or show a financial amount: use the official project story instead.
  const financial = /€|\b(?:EUR|euro)\b|[$£]/i;
  const dedicated = !!row.dedica && row.dedica.length <= 90 && (row.firma?.length ?? 0) <= 40 && !financial.test(`${row.dedica} ${row.firma ?? ''}`);
  return { ornament: row, project, dedication: dedicated ? row.dedica : undefined, signature: dedicated ? row.firma ?? 'Anonimo' : undefined, text: dedicated ? row.dedica ?? '' : TV_STORIES[row.kind] };
}

/** Bounded, deterministic scheduler. Interruption discards a focus and gives a fresh quiet interval.
 * Least-used available causes win independently of their ornament counts; IDs have a 3-minute cooldown.
 */
export function advanceStory(state: StoryState, now: number, publicRows: readonly TreeOrnament[], priority: StoryPriority, error = false, tempo = 1): StoryState {
  const blocked = priority !== 'editorial' || error || !publicRows.length;
  const schedule = (s: StoryState) => { const d = storyDelay(s.seed); return { ...s, seed: d.seed, nextAt: now + d.ms * tempo }; };
  if (blocked) return state.blocked && !state.focus ? state : { ...state, blocked: true, focus: null };
  if (state.blocked) return schedule({ ...state, blocked: false, focus: null });
  if (state.focus) {
    if (!publicRows.some(o => o.id === state.focus?.id)) return schedule({ ...state, focus: null });
    return now - state.focus.start >= STORY_MS ? { ...state, focus: null } : state;
  }
  if (now < state.nextAt) return state;
  const recent = new Map([...state.recent].filter(([id, at]) => now - at < STORY_ID_COOLDOWN_MS * tempo && publicRows.some(o => o.id === id)));
  const candidates = storyOrnaments(publicRows, false).filter(o => !recent.has(o.id) && (publicRows.length === 1 || o.id !== state.lastId));
  let kinds = STORY_KINDS.filter(k => candidates.some(o => o.kind === k));
  if (kinds.length > 1) kinds = kinds.filter(k => k !== state.lastKind);
  if (!kinds.length) return schedule({ ...state, recent });
  const min = Math.min(...kinds.map(k => state.kindTurns[k]));
  kinds = kinds.filter(k => state.kindTurns[k] === min);
  const r = random(state.seed);
  const kind = kinds[Math.floor(r.value * kinds.length)];
  const choices = candidates.filter(o => o.kind === kind);
  const r2 = random(r.seed);
  const picked = choices[Math.floor(r2.value * choices.length)];
  if (!picked) return schedule({ ...state, seed: r2.seed, recent });
  recent.set(picked.id, now);
  return schedule({ ...state, seed: r2.seed, recent, focus: { id: picked.id, start: now }, lastId: picked.id, lastKind: picked.kind, kindTurns: { ...state.kindTurns, [picked.kind]: state.kindTurns[picked.kind] + 1 } });
}