import { noteLook, type PublicWish } from "./wishes";

/**
 * Panoramic wish wall for the 16:9 casetta TV. All measures are in cqw (1% of the TV width), so the
 * same layout holds at 1366×768, 1080p and 4K. Notes are packed row by row on 3–5 twine lines:
 * short notes are narrow, long ones wider, row heights follow the tallest note, and the bottom rows
 * stop before the QR block, which stays on screen in every scene.
 */
export const WALL = {
  left: 2.5,
  fullRight: 97.5,
  /** Rows that reach below qrTop end at shortRight, leaving the QR block free. */
  shortRight: 58.5,
  qrTop: 35,
  top: 13.2,
  bottom: 55.4,
  maxRows: 5,
  gap: 1.1,
  font: 1.2,
  line: 1.32,
} as const;

export type WallSize = "s" | "m" | "l";
/** Paper width range: short wishes get small notes, long ones wider paper so they stay within ~3 lines. */
export const WALL_WIDTH = { min: 12.5, max: 32 } as const;
/** Conservative glyph width for the handwritten font (em): overestimates lines, so text never spills. */
const CHAR_EM = 0.38;
const PAD_X = 1.4;
/** Pin + top padding and bottom padding. */
const PAD_Y = 1.7 + 0.6;
const SIG = 1.5;
const STAMP = 1.55;
/** Note offset below the twine + rotation slack. */
const ROW_EXTRA = 0.9;
const TARGET_LINES = 3;
/** Signature: sans-serif at 1cqw, ~0.56em per glyph; the paper is always wide enough to keep it on one line. */
const SIG_EM = 0.56;
export const DEFAULT_SIGNATURE = "Un augurio da Monza";

export const wallSize = (body: string): WallSize => (body.length <= 48 ? "s" : body.length <= 105 ? "m" : "l");

export type WallNote = { wish: PublicWish; size: WallSize; width: number; lines: number; height: number; tilt: number; drop: number; isNew: boolean };
export type WallRow = { y: number; right: number; height: number; notes: WallNote[] };
/** `scale` enlarges paper and handwriting together when few wishes leave room (more legible from afar). */
export type WallLayout = { rows: WallRow[]; used: number; scale: number };
export const WALL_SCALES = [1.4, 1.25, 1.1, 1] as const;

export function measureNote(wish: PublicWish, isNew = false, scale = 1): WallNote {
  const len = wish.body.length;
  const glyph = WALL.font * CHAR_EM * scale;
  const padX = PAD_X * scale;
  const sigNeed = (`— ${wish.nickname ?? DEFAULT_SIGNATURE}`.length * SIG_EM + PAD_X * 2 + 0.4) * scale;
  const ideal = Math.max((Math.ceil(len / TARGET_LINES) + 2) * glyph + padX * 2, sigNeed);
  const width = Math.round(Math.min(WALL_WIDTH.max * scale, Math.max(WALL_WIDTH.min * scale, ideal)) * 10) / 10;
  const perLine = Math.max(8, Math.floor((width - padX * 2) / glyph));
  // Word wrapping wastes part of each line: assume 85% fill so the estimate stays on the safe side.
  const lines = Math.max(1, Math.ceil(len / (perLine * 0.85)));
  const look = noteLook(wish.id);
  return {
    wish, size: wallSize(wish.body), width, lines, isNew,
    height: (PAD_Y + lines * WALL.line + SIG + (wish.demo ? STAMP : 0)) * scale,
    tilt: Math.round(look.rotate * 0.35 * 10) / 10,
    drop: Math.round((look.lift / 12) * 0.5 * 10) / 10,
  };
}

function packRow(queue: WallNote[], capacity: number, maxCount: number) {
  const picked: WallNote[] = [];
  let width = 0;
  for (const n of queue) {
    if (picked.length >= maxCount) break;
    const next = width + n.width + (picked.length ? WALL.gap : 0);
    if (next > capacity) break;
    picked.push(n);
    width = next;
  }
  return picked;
}

/**
 * Lays out as many wishes as fit, in order, starting from the first. Returns positioned rows and
 * how many wishes were placed (the caller advances its cursor by `used`).
 */
export function layoutWall(wishes: PublicWish[], newIds: ReadonlySet<string> = new Set()): WallLayout {
  // Largest handwriting that still fits every wish; otherwise normal size and as many as fit.
  for (const scale of WALL_SCALES) {
    const l = layoutAt(wishes, newIds, scale);
    if (l.used === wishes.length || scale === 1) return l;
  }
  return layoutAt(wishes, newIds, 1);
}

function layoutAt(wishes: PublicWish[], newIds: ReadonlySet<string>, scale: number): WallLayout {
  const queue = wishes.map((w) => measureNote(w, newIds.has(w.id), scale));
  const desiredRows = Math.min(WALL.maxRows, Math.max(1, Math.ceil(queue.length / 3)));
  const perRow = Math.max(2, Math.ceil(queue.length / desiredRows));
  const rows: WallRow[] = [];
  let y = WALL.top;
  let i = 0;
  while (i < queue.length && rows.length < WALL.maxRows) {
    const rest = queue.slice(i);
    let right: number = WALL.fullRight;
    let notes = packRow(rest, right - WALL.left, perRow);
    let h = Math.max(...notes.map((n) => n.height + n.drop)) + ROW_EXTRA * scale;
    if (y + h > WALL.qrTop) {
      right = WALL.shortRight;
      notes = packRow(rest, right - WALL.left, perRow);
      if (!notes.length) break;
      h = Math.max(...notes.map((n) => n.height + n.drop)) + ROW_EXTRA * scale;
    }
    if (!notes.length || y + h > WALL.bottom) break;
    rows.push({ y, right, height: h, notes });
    y += h + WALL.gap;
    i += notes.length;
  }
  // Spread spare height between rows, but never push a full-width row down into the QR block.
  const spare = WALL.bottom - y + WALL.gap;
  const extra = rows.length > 1 ? Math.min(3, spare / rows.length) : 0;
  if (extra > 0) {
    const moved = rows.map((r, k) => ({ ...r, y: r.y + extra * k }));
    if (moved.every((r) => r.right !== WALL.fullRight || r.y + r.height <= WALL.qrTop)) return { rows: moved, used: i, scale };
  }
  return { rows, used: i, scale };
}
