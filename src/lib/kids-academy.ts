/**
 * "Accademia dei piccoli aiutanti di Babbo Natale": pure rules for the three kids' missions.
 * No child data is collected: progress, the chosen helper badge and the diploma live only in this device's storage.
 */
export type MissionId = "citta" | "zaino" | "battito";
export type HelperId = "stella" | "pupazzo" | "lanterna" | "pettirosso";

export const MISSIONS: { id: MissionId; n: number; title: string; age: string; minutes: string; teaser: string }[] = [
  { id: "citta", n: 1, title: "La città ha bisogno di te!", age: "6–7 anni", minutes: "2–3 minuti", teaser: "Accorgiti di chi è in difficoltà e scegli come aiutare, sempre insieme a un adulto." },
  { id: "zaino", n: 2, title: "Prepara lo zaino della missione", age: "7–9 anni", minutes: "2 minuti", teaser: "Domani nevica! Trascina nello zaino ciò che serve davvero." },
  { id: "battito", n: 3, title: "Missione Battito", age: "9–12 anni", minutes: "3 minuti", teaser: "Riconosci un'emergenza, fai chiamare il 112 e allena il ritmo sul cuore magico." },
];

export const HELPERS: { id: HelperId; name: string }[] = [
  { id: "stella", name: "Stellina" },
  { id: "pupazzo", name: "Pupazzo di neve" },
  { id: "lanterna", name: "Lanterna" },
  { id: "pettirosso", name: "Pettirosso" },
];

export type Diploma = { code: string; issuedAt: string; claimedAt: string | null };
export type AcademyState = { done: MissionId[]; helper: HelperId | null; diploma: Diploma | null };
export const EMPTY_ACADEMY: AcademyState = { done: [], helper: null, diploma: null };
export const ACADEMY_KEY = "cri-academy-v1";

const isMission = (v: unknown): v is MissionId => v === "citta" || v === "zaino" || v === "battito";
const isHelper = (v: unknown): v is HelperId => HELPERS.some((h) => h.id === v);

/** Reads and sanitises stored progress; anything unexpected falls back to an empty academy. */
export function parseAcademy(raw: string | null): AcademyState {
  if (!raw) return EMPTY_ACADEMY;
  try {
    const o = JSON.parse(raw) as Partial<AcademyState>;
    const d = o.diploma;
    const diploma = d && typeof d.code === "string" && typeof d.issuedAt === "string"
      ? { code: d.code, issuedAt: d.issuedAt, claimedAt: typeof d.claimedAt === "string" ? d.claimedAt : null } : null;
    return { done: Array.isArray(o.done) ? [...new Set(o.done.filter(isMission))] : [], helper: isHelper(o.helper) ? o.helper : null, diploma };
  } catch {
    return EMPTY_ACADEMY;
  }
}

/** Unambiguous alphabet (no 0/O, 1/I/L) so a volunteer can read the code aloud. */
const ABC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function diplomaCode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ABC[(bytes[i] ?? 0) % ABC.length];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

/**
 * Marks a mission as done. The diploma is issued once, on the first completed mission, and never re-issued:
 * replaying or reloading keeps the same code, so it cannot generate a new surprise.
 */
export function completeMission(s: AcademyState, id: MissionId, now: Date, bytes: Uint8Array): AcademyState {
  const done = s.done.includes(id) ? s.done : [...s.done, id];
  const diploma = s.diploma ?? { code: diplomaCode(bytes), issuedAt: now.toISOString(), claimedAt: null };
  return { ...s, done, diploma };
}

/** Volunteer confirmation (demo, on this device): one surprise per diploma, a second confirmation changes nothing. */
export function claimSurprise(s: AcademyState, now: Date): AcademyState {
  if (!s.diploma || s.diploma.claimedAt) return s;
  return { ...s, diploma: { ...s.diploma, claimedAt: now.toISOString() } };
}

export const canOpenDiploma = (s: AcademyState) => s.done.length > 0 && s.diploma !== null;

/* ---------- Missione Battito: rhythm ---------- */
export const BPM_MIN = 100;
export const BPM_MAX = 120;
export const GUIDE_BPM = 110;
export const RHYTHM_SECONDS = 18;
/** Taps needed to finish a session: about half of the expected beats, so accuracy never blocks the reward. */
export const MIN_TAPS = 10;

export type Zone = "slow" | "good" | "fast";
export const zoneOf = (bpm: number): Zone => (bpm < BPM_MIN ? "slow" : bpm > BPM_MAX ? "fast" : "good");

/** Live tempo from the last few taps (median interval, robust to one missed or double tap). */
export function liveBpm(taps: number[]): number | null {
  const last = taps.slice(-6);
  if (last.length < 3) return null;
  const iv = last.slice(1).map((t, i) => t - last[i]!).filter((d) => d > 150 && d < 2000).sort((a, b) => a - b);
  if (!iv.length) return null;
  return Math.round(60000 / iv[Math.floor(iv.length / 2)]!);
}

export function rhythmSummary(taps: number[]) {
  const iv = taps.slice(1).map((t, i) => t - taps[i]!).filter((d) => d > 150 && d < 2000);
  const good = iv.filter((d) => zoneOf(60000 / d) === "good").length;
  const avg = iv.length ? Math.round(60000 / (iv.reduce((a, b) => a + b, 0) / iv.length)) : null;
  return { taps: taps.length, avgBpm: avg, goodShare: iv.length ? good / iv.length : 0 };
}

/* ---------- Prepara lo zaino ---------- */
export type PackItemId = "torcia" | "acqua" | "berretto" | "guanti" | "telefono" | "gelato" | "pallone" | "videogioco" | "infradito";
export const PACK_ITEMS: { id: PackItemId; name: string; needed: boolean; note: string }[] = [
  { id: "torcia", name: "Torcia", needed: true, note: "Con la neve fa buio presto: una luce ti fa vedere la strada e ti fa vedere dagli altri." },
  { id: "guanti", name: "Guanti", needed: true, note: "Mani calde e asciutte: con il freddo sono le prime a soffrire." },
  { id: "infradito", name: "Infradito", needed: false, note: "Le infradito sulla neve? Brrr! Oggi servono scarponi caldi ai piedi." },
  { id: "acqua", name: "Borraccia d'acqua", needed: true, note: "Anche d'inverno il corpo ha bisogno di bere." },
  { id: "gelato", name: "Gelato", needed: false, note: "Un gelato in mezzo alla neve? Meglio una bevanda calda, una volta a casa." },
  { id: "berretto", name: "Berretto e sciarpa", needed: true, note: "Testa e collo al caldo: è da lì che scappa tanto calore." },
  { id: "pallone", name: "Pallone", needed: false, note: "Il pallone oggi resta a casa: sulla neve si scivola." },
  { id: "telefono", name: "Telefono carico", needed: true, note: "Carico, per chiamare casa o, insieme a un adulto, il 112 se serve davvero." },
  { id: "videogioco", name: "Videogioco", needed: false, note: "Il videogioco può aspettare: in missione servono mani libere e occhi attenti." },
];
export const NEEDED_ITEMS = PACK_ITEMS.filter((i) => i.needed).map((i) => i.id);
export const isPackComplete = (packed: PackItemId[]) => NEEDED_ITEMS.every((id) => packed.includes(id));
