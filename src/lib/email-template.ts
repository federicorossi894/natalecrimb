import type { Project } from "./data";
import { CRI, TREE_UNTIL } from "./data";
import { EMAIL_SENDER, deliveryLabel, type EmailAudience, type EmailMode } from "./email-demo";
import { baubleDataUrl, cssHex, ornamentUrl, projectUrl } from "./postcard-share";
import biancoLogo from "@/assets/cri-bianco-orizzontale.png.asset.json";
import { LOCKUP, TERRITORIAL_LABEL, lockupText } from "./cri-lockup";

/**
 * Email-safe lockup: the unaltered official mark, then "Comitato di Monza" in Arial Regular, white, centred under
 * "Croce Rossa Italiana" (CRI manual §1.3). Geometry from src/lib/cri-lockup.ts scaled to the rendered height.
 */
export function lockupHtml(src: string, height = 84) {
  const g = LOCKUP.horizontal, t = lockupText("horizontal"), k = height / g.h;
  const width = Math.round(g.w * k);
  const font = +(t.fontSize * k).toFixed(1);
  // Text line box: centred on the wordmark, its baseline pulled up into the mark's transparent safety margin.
  const shift = Math.round(2 * (t.x * k - width / 2));
  const lift = Math.round((g.h - t.baseline) * k + font * 0.22);
  return `<div style="width:${width}px"><img src="${src}" alt="Croce Rossa Italiana" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;border:0">`
    + `<div style="margin:-${lift}px 0 0 ${shift}px;font:400 ${font}px/1 Arial,Helvetica,sans-serif;color:#FFFFFF;text-align:center;height:${Math.ceil(font)}px">${TERRITORIAL_LABEL}</div>`
    + `<div style="height:${Math.max(0, lift - Math.ceil(font))}px;line-height:0;font-size:0">&nbsp;</div></div>`;
}

export type GiftEmail = {
  project: Project;
  audience: EmailAudience;
  mode: EmailMode;
  donor: string;
  toName: string;
  toEmail: string;
  msg: string;
  ornamentId?: string | null;
  /** Show the Da/A/Oggetto/Consegna envelope above the message (presentation + export). */
  envelope?: boolean;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function emailSubject(e: Pick<GiftEmail, "audience" | "donor" | "toName">) {
  if (e.audience === "donor") return "🎄 Grazie! Il tuo regalo è sull'Albero di Monza";
  return `🎄 ${e.donor.trim() || "Qualcuno"} ti ha lasciato un regalo sotto l'Albero di Monza`;
}

/** Table-based, inline-styled HTML email (demo). Distinct from the postcard: a letter, not a picture. */
export function giftEmailHtml(e: GiftEmail) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const C = {
    outer: cssHex("--ivory", "#f3e9d2"), paper: cssHex("--paper", "#fbf6ec"), ink: cssHex("--ink", "#2b1d1a"),
    fir: cssHex("--fir-deep", "#183b2c"), gold: cssHex("--gold", "#e8c37a"), red: cssHex("--primary", "#c8102e"),
    burgundy: cssHex("--burgundy", "#5c1a24"), snow: cssHex("--snow", "#fffdf8"), theme: cssHex(e.project.theme.bg, "#c8102e"),
  };
  const p = e.project;
  const link = e.ornamentId ? ornamentUrl(e.ornamentId) : ornamentUrl();
  const donor = esc(e.donor.trim());
  const toName = esc(e.toName.trim());
  const msg = esc(e.msg.trim() || p.postcardLine);
  const christmas = e.mode === "christmas" && e.audience === "recipient";
  const kicker = e.audience === "donor" ? "Grazie dalla casetta di Piazza San Paolo" : christmas ? "Buon Natale da Monza" : "Il Natale che fa bene";
  const title = e.audience === "donor"
    ? `Grazie${donor ? `, ${donor}` : ""}!`
    : christmas ? `Buon Natale${toName ? `, ${toName}` : ""}!` : `${toName ? `${toName}, c'è` : "C'è"} un regalo per te`;
  const lead = e.audience === "donor"
    ? "Il tuo regalo alla casetta di Croce Rossa è diventato un addobbo sull'Albero di Monza."
    : `${donor || "Qualcuno che ti vuole bene"} ha fatto a tuo nome un regalo per Monza con Croce Rossa Italiana – Comitato di Monza.`;
  const social = CRI.social.map((s) => `<a href="${s.url}" style="color:${C.ink};text-decoration:underline">${s.name}</a>`).join(" · ");
  const envelope = e.envelope ? `
  <tr><td style="padding:0 0 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font:13px/1.6 Arial,sans-serif;color:${C.ink};background:${C.snow};border:1px solid ${C.gold};border-radius:12px">
      <tr><td style="padding:12px 18px">
        <b>Da:</b> Croce Rossa Monza &lt;${EMAIL_SENDER}&gt;<br>
        <b>A:</b> ${esc(e.toEmail.trim()) || (e.audience === "donor" ? "email del donatore" : "email del destinatario")}<br>
        <b>Oggetto:</b> ${esc(emailSubject(e))}<br>
        <b>Consegna:</b> ${e.audience === "donor" ? "Subito, appena confermi" : esc(deliveryLabel(e.mode))}
        <span style="display:inline-block;margin-left:6px;padding:1px 8px;border-radius:99px;background:${C.gold};color:${C.ink};font-size:11px;font-weight:bold;letter-spacing:1px">DEMO · NON INVIATA</span>
      </td></tr>
    </table>
  </td></tr>` : "";
  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<title>${esc(emailSubject(e))}</title>
<style>
  body{margin:0;padding:0}
  @media (max-width:620px){.wrap{width:100%!important}.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:32px!important}}
  @media print{body{background:#fff!important}.wrap{box-shadow:none!important}}
</style></head>
<body style="margin:0;background:${C.outer}">
<div style="display:none;max-height:0;overflow:hidden">${esc(lead)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.outer}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
${envelope}
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};border-radius:20px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(0,0,0,.35)">
  <tr><td class="px" style="background:${C.fir};padding:22px 36px">
    <table role="presentation" width="100%"><tr>
      <td>${lockupHtml(origin + biancoLogo.url)}</td>
    </tr></table>
  </td></tr>
  <tr><td class="px" align="center" style="background:${C.fir};padding:6px 36px 42px;color:${C.snow}">
    <p style="margin:0 0 10px;font:700 12px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:${C.gold}">${esc(kicker)}</p>
    <img src="${baubleDataUrl(p.ornament, 240)}" width="132" alt="" style="display:block;width:132px;height:auto;margin:0 auto">
    <h1 class="h1" style="margin:14px 0 0;font:600 40px/1.1 Georgia,'Times New Roman',serif;color:${C.snow}">${title}</h1>
    <p style="margin:14px auto 0;max-width:440px;font:16px/1.55 Georgia,serif;color:${C.snow};opacity:.92">${esc(lead)}</p>
  </td></tr>
  <tr><td style="height:6px;background:${C.gold};line-height:6px;font-size:0">&nbsp;</td></tr>
  <tr><td class="px" style="padding:34px 40px 10px;color:${C.ink}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.gold};border-radius:14px">
      <tr>
        <td width="10" style="background:${C.theme};border-radius:14px 0 0 14px">&nbsp;</td>
        <td style="padding:18px 20px;font:15px/1.5 Arial,sans-serif">
          <p style="margin:0;font:700 11px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${C.red}">${e.audience === "donor" ? "Il tuo regalo" : "Il regalo a tuo nome"}</p>
          <p style="margin:8px 0 2px;font:600 24px/1.2 Georgia,serif">${esc(p.title)}</p>
          <p style="margin:0;color:${C.ink};opacity:.8">${esc(p.tagline)}</p>
          <p style="margin:10px 0 0;font-size:12px;color:${C.ink};opacity:.65">È una donazione a Croce Rossa Italiana – Comitato di Monza, non l'acquisto di un oggetto.</p>
        </td>
      </tr>
    </table>
    <p style="margin:30px 0 6px;font:italic 24px/1.4 Georgia,serif;text-align:center">“${msg}”</p>
    <p style="margin:0 0 28px;font:700 15px/1.4 Arial,sans-serif;text-align:center;color:${C.red}">— ${donor || (e.audience === "donor" ? "Croce Rossa Monza" : "Un amico")}</p>
    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="border-radius:999px;background:${C.red}">
      <a href="${link}" style="display:inline-block;padding:15px 30px;font:700 15px/1 Arial,sans-serif;color:${C.snow};text-decoration:none">Guarda l'addobbo sull'albero</a>
    </td></tr></table>
    <p style="margin:14px 0 30px;text-align:center;font:13px/1.4 Arial,sans-serif"><a href="${projectUrl(p)}" style="color:${C.ink}">Scopri il progetto “${esc(p.title)}”</a></p>
  </td></tr>
  <tr><td class="px" style="background:${C.burgundy};padding:26px 40px;color:${C.snow}">
    <p style="margin:0;font:700 11px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${C.gold}">Ti aspettiamo in piazza</p>
    <p style="margin:8px 0 0;font:19px/1.4 Georgia,serif">L'Albero di Monza è in Piazza San Paolo fino al ${TREE_UNTIL}. Alla casetta di Croce Rossa trovi i volontari.</p>
  </td></tr>
  <tr><td class="px" style="padding:22px 40px 26px;font:12px/1.6 Arial,sans-serif;color:${C.ink}">
    <p style="margin:0;font-weight:700">Croce Rossa Italiana – Comitato di Monza</p>
    <p style="margin:2px 0 0"><a href="${CRI.site}" style="color:${C.ink}">crimonza.org</a> · ${social}</p>
    <p style="margin:10px 0 0;opacity:.6">Inviata da ${EMAIL_SENDER} · Email dimostrativa: nessuna email è stata inviata o programmata, nessuna donazione reale.</p>
  </td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body></html>`;
}
