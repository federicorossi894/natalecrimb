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
  top: 12.5,
  bottom: 53.6,
  maxRows: 5,
  gap: 1.8,
  font: 1.25,
  line: 1.4,
} as const;

export type WallSize = "s" | "m" | "l";
export const WALL_WIDTH: Record<WallSize, number> = { s: 12.5, m: 16.5, l: 22 };
/** Conservative glyph width for the handwritten font (em): overestimates lines, so text never spills. */
const CHAR_EM = 0.5;
const PAD_X = 1.6;
/** Pin + top padding, bottom padding, signature line, optional DEMO stamp. */
const PAD_Y = 1.9 + 0.7;
const SIG = 1.6;
const STAMP = 1.65;
/** Pin above the twine + max downward drop of a note. */
const ROW_EXTRA = 1.2;

export const wallSize = (body: string): WallSize => (body.length <= 48 ? "s" : body.length <= 105 ? "m" : "l");

export type WallNote = { wish: PublicWish; size: WallSize; width: number; lines: number; height: number; tilt: number; drop: number; isNew: boolean };
export type WallRow = { y: number; right: number; height: number; notes: WallNote[] };
export type WallLayout = { rows: WallRow[]; used: number };

export function measureNote(wish: PublicWish, isNew = false): WallNote {
  const size = wallSize(wish.body);
  const width = WALL_WIDTH[size];
  const perLine = Math.max(8, Math.floor((width - PAD_X * 2) / (WALL.font * CHAR_EM)));
  const lines = Math.max(1, Math.ceil(wish.body.length / perLine));
  const look = noteLook(wish.id);
  return {
    wish, size, width, lines, isNew,
    height: PAD_Y + lines * WALL.line + SIG + (wish.demo ? STAMP : 0),
    tilt: Math.round(look.rotate * 0.4 * 10) / 10,
    drop: Math.round((look.lift / 12) * 0.8 * 10) / 10,
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
  const queue = wishes.map((w) => measureNote(w, newIds.has(w.id)));
  const desiredRows = Math.min(WALL.maxRows, Math.max(1, Math.ceil(queue.length / 4)));
  const perRow = Math.max(2, Math.ceil(queue.length / desiredRows));
  const rows: WallRow[] = [];
  let y = WALL.top;
  let i = 0;
  while (i < queue.length && rows.length < WALL.maxRows) {
    const rest = queue.slice(i);
    let right: number = WALL.fullRight;
    let notes = packRow(rest, right - WALL.left, perRow);
    let h = Math.max(...notes.map((n) => n.height + n.drop)) + ROW_EXTRA;
    if (y + h > WALL.qrTop) {
      right = WALL.shortRight;
      notes = packRow(rest, right - WALL.left, perRow);
      if (!notes.length) break;
      h = Math.max(...notes.map((n) => n.height + n.drop)) + ROW_EXTRA;
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
    if (moved.every((r) => r.right !== WALL.fullRight || r.y + r.height <= WALL.qrTop)) return { rows: moved, used: i };
  }
  return { rows, used: i };
}
