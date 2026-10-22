import type { Project } from "./data";

/** Public site used in shared messages and QR codes. */
export const SITE_URL = "https://natalecrimb.lovable.app";
export const projectUrl = (p: Project) => `${SITE_URL}/regali/${p.id}`;

export function postcardText(p: Project, to: string, from: string, msg: string) {
  const dedica = msg.trim() || p.postcardLine;
  return `🎄 ${to.trim() || "Per te"}, ho scelto un regalo per Monza a tuo nome: “${p.title}” con la Croce Rossa Italiana – Comitato di Monza.\n\n“${dedica}”${from.trim() ? `\n— ${from.trim()}` : ""}\n\nScopri il progetto: ${projectUrl(p)}\n(Cartolina DEMO: nessuna donazione reale)`;
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "gray";

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

/** Draws a 1080×1350 shareable postcard image locally (nothing is uploaded). */
export async function renderPostcardImage(p: Project, to: string, from: string, msg: string): Promise<File | null> {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1350;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  await document.fonts?.ready;
  const bg = cssVar(p.theme.bg), ribbon = cssVar(p.theme.ribbon), ink = cssVar(p.theme.ink);
  const paper = cssVar("--paper"), inkDark = cssVar("--ink"), red = cssVar("--primary"), gold = cssVar("--gold");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1350);
  const v = ctx.createRadialGradient(540, 500, 200, 540, 600, 900);
  v.addColorStop(0, "rgba(255,255,255,0.08)"); v.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 70; i++) {
    const x = (i * 397) % 1080, y = (i * 233) % 760, r = 2 + (i % 4);
    ctx.globalAlpha = 0.35; ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = ribbon; ctx.fillRect(770, 0, 70, 1350); ctx.fillRect(0, 300, 1080, 70);
  ctx.strokeStyle = ribbon; ctx.lineWidth = 28;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(805 + s * 80, 300, 82, 42, s * -0.45, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = ribbon; ctx.beginPath(); ctx.arc(805, 335, 32, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
  ctx.font = "700 30px Manrope, system-ui, sans-serif"; ctx.fillText("IL NATALE CHE FA BENE · MONZA", 80, 120);
  ctx.font = "600 92px Fraunces, Georgia, serif";
  wrap(ctx, `Per te, ${to.trim() || "…"}`, 640, 2).forEach((l, i) => ctx.fillText(l, 80, 230 + i * 100));
  ctx.font = "italic 400 60px Fraunces, Georgia, serif"; ctx.fillText(p.title, 80, 520);
  ctx.font = "500 34px Manrope, system-ui, sans-serif"; ctx.fillText(p.tagline, 80, 580);

  ctx.fillStyle = paper; ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(70, 700, 940, 560, 28); else ctx.rect(70, 700, 940, 560);
  ctx.fill();
  ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = inkDark; ctx.font = "italic 400 48px Fraunces, Georgia, serif";
  const lines = wrap(ctx, `“${msg.trim() || p.postcardLine}”`, 840, 5);
  lines.forEach((l, i) => ctx.fillText(l, 120, 800 + i * 62));
  ctx.fillStyle = red; ctx.font = "700 38px Manrope, system-ui, sans-serif";
  ctx.fillText(`— ${from.trim() || "Un amico"}`, 120, 820 + lines.length * 62);
  ctx.fillStyle = inkDark; ctx.globalAlpha = 0.7; ctx.font = "500 26px Manrope, system-ui, sans-serif";
  ctx.fillText("Croce Rossa Italiana – Comitato di Monza", 120, 1180);
  ctx.fillText("Cartolina DEMO · nessuna donazione reale · natalecrimb.lovable.app", 120, 1220);
  ctx.globalAlpha = 1;
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
  return blob ? new File([blob], `cartolina-cri-monza-${p.id}.png`, { type: "image/png" }) : null;
}
