import { ONLINE_GIFT } from "./site-experience";
import { TREE_UNTIL, type OrnamentKind, type Project } from "./data";
import rossoLogo from "@/assets/cri-rosso-orizzontale.png.asset.json";
import { CAMPAIGN } from './campaign';

/** Public site used in shared messages and QR codes. */
export const SITE_URL = "https://natale.crimonza.org";
export const projectUrl = (p: Project) => `${SITE_URL}/regali/${p.id}`;
/** Stable deep link: opens the Albero and focuses this ornament (public data only). */
export const ornamentUrl = (id?: string | null) => (id ? `${SITE_URL}/albero?addobbo=${id}` : `${SITE_URL}/albero`);
export const giftLink = (p: Project, ornamentId?: string | null) => (ornamentId ? ornamentUrl(ornamentId) : projectUrl(p));
export const INVITE_LINE = ONLINE_GIFT ? "Un regalo solidale, una pallina digitale. Condividi questo gesto con chi ami." : `Il tuo addobbo si vede sull'albero digitale, sullo schermo della casetta CRI in Piazza San Paolo, fino al ${TREE_UNTIL}.`;

export function postcardText(p: Project, to: string, from: string, msg: string, ornamentId?: string | null, selfThanks = false) {
  const dedica = msg.trim() || p.postcardLine;
  const firma = from.trim() ? `\n— ${from.trim()}` : "";
  const link = ornamentId ? `Il tuo addobbo è sull'Albero di Monza digitale: ${ornamentUrl(ornamentId)}` : `Scopri il regalo: ${projectUrl(p)}`;
  return `${selfThanks ? '🎄 Ho scelto di fare un gesto solidale!\nHo sostenuto' : `🎄 Buon Natale, ${to.trim() || "a te"}!\nHo scelto per te un regalo solidale con`} la Croce Rossa Italiana – Comitato di Monza: “${p.title}”.\n\n“${dedica}”${firma}\n\n${link}\n${INVITE_LINE}${CAMPAIGN.demo ? "\n\n(Prova DEMO: nessuna donazione reale.)" : ""}`;
}

/** Short caption when the illustrated card is attached. Never repeat the private message already printed in the PNG. */
export function postcardCaption(p: Project, to: string, ornamentId?: string | null, selfThanks = false) {
  const recipient = to.trim();
  const greeting = selfThanks
    ? `🎄 Ho scelto di sostenere «${p.title}» con Croce Rossa Monza.`
    : `🎄 ${recipient ? `Un regalo solidale per ${recipient}.` : "Un regalo solidale per te."}`;
  const link = ornamentId ? ornamentUrl(ornamentId) : projectUrl(p);
  const footer = CAMPAIGN.demo ? "\\n\\n(Prova DEMO: nessuna donazione reale.)" : "";
  return `${greeting}\\nScopri la pallina sull’Albero di Monza:\\n${link}${footer}`;
}

/** Resolves a CSS custom property (any colour syntax) to #rrggbb, so canvases and email HTML get plain sRGB. */
export function cssHex(name: string, fallback = "#888888") {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return fallback;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, "0")).join("")}`;
}

const PALETTE: Record<OrnamentKind, { base: string; motif: string }> = {
  calore: { base: "--scene-crimson", motif: "--scene-ivory" },
  dae: { base: "--scene-forest", motif: "--scene-red" },
  prossimita: { base: "--scene-ivory", motif: "--scene-burgundy" },
  cuore: { base: "--scene-burgundy", motif: "--scene-gold" },
};

/** Paints the same bauble as OrnamentIcon (shared motif paths) onto a canvas. */
export function drawBauble(ctx: CanvasRenderingContext2D, kind: OrnamentKind, cx: number, cy: number, r: number) {
  const base = cssHex(PALETTE[kind].base), motif = cssHex(PALETTE[kind].motif);
  const gold = cssHex("--scene-gold"), ivory = cssHex("--scene-ivory"), night = cssHex("--scene-night");
  ctx.save();
  // hanger + cap
  ctx.strokeStyle = gold; ctx.lineWidth = r * 0.04;
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.5); ctx.lineTo(cx, cy - r * 1.08); ctx.stroke();
  ctx.fillStyle = gold;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - r * 0.2, cy - r * 1.14, r * 0.4, r * 0.22, r * 0.05); else ctx.rect(cx - r * 0.2, cy - r * 1.14, r * 0.4, r * 0.22); ctx.fill();
  // sphere
  ctx.fillStyle = night; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.05, cx, cy, r * 1.05);
  g.addColorStop(0, ivory); g.addColorStop(0.28, base); g.addColorStop(1, night);
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = base; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = gold; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.7; ctx.lineWidth = r * 0.03; ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  // motif (64×72 icon space, sphere radius 28)
  ctx.translate(cx, cy); ctx.scale(r / 28, r / 28);
  const fill = (d: string, c: string) => { ctx.fillStyle = c; ctx.fill(new Path2D(d)); };
  if (kind === "cuore") fill("M0 12 C-15 2 -14 -10 -6 -10 C-3 -10 -1 -8 0 -6 C1 -8 3 -10 6 -10 C14 -10 15 2 0 12Z", motif);
  if (kind === "dae") {
    ctx.fillStyle = motif; ctx.strokeStyle = ivory; ctx.lineWidth = 1.2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-11, -10, 22, 20, 3.5); else ctx.rect(-11, -10, 22, 20); ctx.fill(); ctx.stroke();
    fill("M0 6 C-8 0 -8 -6 -4 -7 C-2 -7 -1 -6 0 -4 C1 -6 2 -7 4 -7 C8 -6 8 0 0 6Z", ivory);
    fill("M1 -6 L-2 0 L1 0 L-1 5 L4 -1 L1 -1 L3 -6Z", gold);
  }
  if (kind === "calore") ["M-12 -8 Q0 4 12 -8 L12 -3 Q0 9 -12 -3Z", "M3 -1 L9 -1 L8 13 L3 13Z", "M-4 0 L1 0 L0 11 L-4 11Z"].forEach((d) => fill(d, motif));
  if (kind === "prossimita") {
    fill("M-15 6 L-15 -6 Q-15 -9 -12 -9 L6 -9 L12 -2 L15 0 L15 6Z", motif);
    ctx.fillStyle = ivory; ctx.fillRect(-12, -6, 7, 5); ctx.fillRect(-3, -6, 7, 5);
    ctx.fillStyle = gold; ctx.fillRect(-15, 1, 30, 1.6);
    ctx.fillStyle = night; ctx.beginPath(); ctx.arc(-8, 7, 3, 0, Math.PI * 2); ctx.arc(9, 7, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // specular highlight
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = ivory;
  ctx.beginPath(); ctx.ellipse(cx - r * 0.42, cy - r * 0.45, r * 0.18, r * 0.1, -0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

/** PNG data URL of a bauble, used inside the email preview. */
export function baubleDataUrl(kind: OrnamentKind, size = 240) {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = size; c.height = size * 1.15;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  drawBauble(ctx, kind, size / 2, size * 0.68, size * 0.4);
  return c.toDataURL("image/png");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1]}…`; }
  return lines;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    const timeout = setTimeout(() => { img.onload = null; img.onerror = null; res(null); }, 8000);
    img.crossOrigin = 'anonymous'; // Asset redirects must never taint the export canvas.
    img.onload = () => { clearTimeout(timeout); res(img); };
    img.onerror = () => { clearTimeout(timeout); res(null); };
    img.src = src;
  });
}

/** Draws a 1080×1350 shareable postcard image locally (nothing is uploaded). */
export async function renderPostcardImage(p: Project, to: string, from: string, msg: string, ornamentId?: string | null, selfThanks = false): Promise<File | null> {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  await document.fonts?.ready;
  const bg = cssHex(p.theme.bg), ribbon = cssHex(p.theme.ribbon), ink = cssHex(p.theme.ink);
  const paper = cssHex("--paper"), inkDark = cssHex("--ink"), red = cssHex("--primary"), gold = cssHex("--gold");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(540, 420, 80, 540, 600, 980);
  v.addColorStop(0, "rgba(255,240,210,0.22)"); v.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // snow + sparkle
  for (let i = 0; i < 90; i++) {
    const x = (i * 397) % W, y = (i * 233) % 860, r = 1.5 + (i % 4);
    ctx.globalAlpha = 0.18 + (i % 3) * 0.08; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ribbon frame
  ctx.strokeStyle = gold; ctx.globalAlpha = 0.65; ctx.lineWidth = 3;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(36, 36, W - 72, H - 72, 30); else ctx.rect(36, 36, W - 72, H - 72); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink; ctx.textAlign = "center";
  ctx.font = "700 26px Manrope, system-ui, sans-serif"; ctx.fillText("IL NATALE CHE FA BENE", W / 2, 112);
  ctx.globalAlpha = 0.8; ctx.font = "500 24px Manrope, system-ui, sans-serif"; ctx.fillText(ONLINE_GIFT ? "Un regalo solidale per chi ami" : "Albero di Monza · Piazza San Paolo", W / 2, 150); ctx.globalAlpha = 1;
  // glow + bauble + bow
  const glow = ctx.createRadialGradient(540, 430, 40, 540, 430, 300);
  glow.addColorStop(0, "rgba(255,224,160,0.45)"); glow.addColorStop(1, "rgba(255,224,160,0)");
  ctx.fillStyle = glow; ctx.fillRect(200, 120, 680, 620);
  drawBauble(ctx, p.ornament, 540, 450, 165);
  ctx.fillStyle = ribbon;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(540 + s * 46, 238, 46, 22, s * -0.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(540, 244, 15, 0, Math.PI * 2); ctx.fill();
  // headline
  ctx.fillStyle = ink;
  ctx.font = "600 80px Fraunces, Georgia, serif";
  const heading = selfThanks ? 'Grazie di cuore!' : `Per te, ${to.trim() || "con affetto"}`;
  ctx.font = "600 66px Fraunces, Georgia, serif";
  const head = wrap(ctx, heading, 900, 2);
  head.forEach((l, i) => ctx.fillText(l, W / 2, 735 + i * 86));
  const after = 735 + (head.length - 1) * 86;
  ctx.globalAlpha = 0.92; ctx.font = "italic 400 40px Fraunces, Georgia, serif";
  ctx.fillText(`un regalo solidale: ${p.title}`, W / 2, after + 62); ctx.globalAlpha = 1;
  // paper card
  const top = 890;
  ctx.fillStyle = paper; ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(70, top, W - 140, H - top - 70, 26); else ctx.rect(70, top, W - 140, H - top - 70);
  ctx.fill();
  ctx.fillStyle = inkDark; ctx.font = `italic 400 ${selfThanks ? 28 : 32}px Fraunces, Georgia, serif`;
  const lines = wrap(ctx, `“${msg.trim() || p.postcardLine}”`, 820, selfThanks ? 5 : 3);
  const lineHeight = selfThanks ? 32 : 38;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + 52 + i * lineHeight, 820));
  ctx.fillStyle = red; ctx.font = "700 32px Manrope, system-ui, sans-serif";
  ctx.fillText(`— ${selfThanks ? 'Croce Rossa Monza' : from.trim() || "Un amico"}`, W / 2, top + 72 + lines.length * lineHeight, 820);
  // footer row: official mark (unaltered) + invite
  const fy = H - 70 - 104;
  ctx.strokeStyle = inkDark; ctx.globalAlpha = 0.12; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(110, fy - 10); ctx.lineTo(W - 110, fy - 10); ctx.stroke(); ctx.globalAlpha = 1;
  const logo = await loadImage(rossoLogo.url);
  if (logo) { const h = 78, w = (logo.width / logo.height) * h; ctx.drawImage(logo, 100, fy + 6, w, h); }
  ctx.textAlign = "right"; ctx.fillStyle = inkDark;
  ctx.font = "700 24px Manrope, system-ui, sans-serif"; ctx.fillText("Comitato di Monza", W - 110, fy + 30);
  ctx.globalAlpha = 0.75; ctx.font = "500 21px Manrope, system-ui, sans-serif";
  ctx.fillText(ONLINE_GIFT ? "Una pallina sull’albero digitale" : `Piazza San Paolo · fino al ${TREE_UNTIL}`, W - 110, fy + 60);
  ctx.fillText(CAMPAIGN.demo && !ONLINE_GIFT ? (ornamentId ? "natale.crimonza.org/albero · DEMO" : "Cartolina DEMO · nessuna donazione reale") : "Il Natale che fa bene · Albero di Monza", W - 110, fy + 88);
  ctx.globalAlpha = 1; ctx.textAlign = "left";
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  return blob ? new File([blob], `cartolina-cri-monza-${p.id}.png`, { type: "image/png" }) : null;
}
