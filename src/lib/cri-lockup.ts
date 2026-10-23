/**
 * Territorial indication "Comitato di Monza" composed next to the UNALTERED official CRI mark files, following
 * the CRI "Manuale di comunicazione istituzionale" (2017), §1.3:
 * - Arial Regular, same colour as the mark (white or red);
 * - centred under the words "Croce Rossa Italiana" (not under the whole mark);
 * - horizontal mark: text 20% smaller than "Croce Rossa Italiana"; vertical mark: 30% smaller;
 * - vertical gap between the two lines = x-height of "Croce Rossa Italiana".
 * Geometry below is measured in pixels on the official PNGs from Marchio_2.zip (alpha channel).
 * The Comitato's own official lockup file, when supplied, should replace this composition.
 */
export const TERRITORIAL_LABEL = "Comitato di Monza";
export const CRI_RED = "#CC0000";
/** Arial cap height as a fraction of the font size. */
const ARIAL_CAP = 0.716;

type Geometry = {
  /** Source PNG size. */
  w: number; h: number;
  /** "Croce Rossa Italiana": horizontal centre, cap top, baseline, x-height (px on the PNG). */
  wordCenterX: number; wordCapTop: number; wordBaseline: number; wordXHeight: number;
  /** Territorial text size relative to the wordmark (manual: 0.8 horizontal, 0.7 vertical). */
  ratio: number;
  /** Crop inside the transparent safety margin of the PNG (keeps clear space around the lockup). */
  view: [number, number, number, number];
};

function territorial(g: Omit<Geometry, "view">) {
  const wordFont = (g.wordBaseline - g.wordCapTop) / ARIAL_CAP;
  const fontSize = wordFont * g.ratio;
  const capTop = g.wordBaseline + g.wordXHeight;
  return { fontSize, x: g.wordCenterX, baseline: capTop + fontSize * ARIAL_CAP };
}

export const LOCKUP = {
  horizontal: { w: 1600, h: 501, wordCenterX: 902, wordCapTop: 209, wordBaseline: 290, wordXHeight: 59, ratio: 0.8, view: [120, 150, 1360, 300] },
  vertical: { w: 900, h: 900, wordCenterX: 448.5, wordCapTop: 711, wordBaseline: 756, wordXHeight: 33, ratio: 0.7, view: [100, 190, 700, 670] },
} satisfies Record<string, Geometry>;

export type LockupLayout = "horizontal" | "vertical";
export const lockupText = (layout: LockupLayout) => territorial(LOCKUP[layout]);
