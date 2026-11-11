/** Server-only: builds and sends online-gift emails from the connected Gmail account. */
export const GIFT_MAIL_SENDER = 'federico.rossi@crimonza.org';
export const GIFT_MAIL_SITE = 'https://natale.crimonza.org';
export type GiftMailKind = 'receipt' | 'gift_now' | 'gift_christmas';
import { PROJECTS, type OrnamentKind } from './data';
import { GIFT_IMPACT } from './gift-impact';
import { CAMPAIGN } from './campaign';
export type GiftMailContent = { kind: GiftMailKind; to: string; projectTitle: string; projectKind?: OrnamentKind; amount: number; ornamentId: string; from: string; toName: string; msg: string; createdAt?: string };

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), b => String.fromCharCode(b)).join(''));
const header = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function giftMailParts(c: GiftMailContent) {
  const from = oneLine(c.from), toName = oneLine(c.toName), msg = oneLine(c.msg);
  const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c.amount);
  const kind = c.projectKind ?? PROJECTS.find(p => p.title === c.projectTitle)?.ornament;
  const impact = kind ? GIFT_IMPACT[kind] : 'Il gesto sostiene le attività sanitarie e sociali di Croce Rossa Monza, per una città più vicina a chi ha bisogno.';
  const date = c.createdAt && !Number.isNaN(Date.parse(c.createdAt)) ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeZone: 'Europe/Rome' }).format(new Date(c.createdAt)) : null;
  if (c.kind === 'receipt') return {
    subject: `Grazie per la tua donazione · ${c.projectTitle}`,
    title: 'Il tuo Natale fa già bene.',
    preheader: `Grazie per il gesto di ${euro}. La tua pallina ti aspetta sull’Albero di Monza.`,
    lines: [`Grazie di cuore per il tuo gesto di ${euro} a sostegno di «${c.projectTitle}».`, impact, 'Sull’Albero di Monza c’è anche la tua pallina: un piccolo segno di una scelta concreta.', ...(date ? [`Data del gesto: ${date}.`] : []), `Riferimento addobbo: ${c.ornamentId}.`, 'Questa email è una conferma informativa e non costituisce ricevuta fiscale.'],
    cta: 'Guarda la tua pallina',
    invitation: null,
    personalMessage: null,
    signedBy: null,
  };
  const opener = from ? `${from} ti ha fatto un regalo solidale` : 'Hai ricevuto un regalo solidale';
  return {
    subject: c.kind === 'gift_christmas' ? `Buon Natale${toName ? `, ${toName}` : ''}! ${from ? `Un regalo da ${from}` : 'Un regalo per te'}` : `${opener} 🎁`,
    title: c.kind === 'gift_christmas' ? `Buon Natale${toName ? `, ${toName}` : ''}!` : (toName ? `${toName}, c’è un regalo per te.` : 'C’è un regalo per te.'),
    preheader: 'Un pensiero dedicato a te, che sostiene un progetto solidale di Croce Rossa Monza.',
    lines: [
      ...(c.kind === 'gift_christmas' ? ['Un pensiero speciale per il giorno di Natale.'] : []),
      `${from || 'Qualcuno che ti vuole bene'} ha scelto per te «${c.projectTitle}»: un regalo solidale di Croce Rossa Monza, con una pallina dedicata sull’albero digitale.`,
      impact,
    ],
    cta: 'Apri la tua pallina',
    invitation: { title: 'Un gesto che può continuare', text: 'Se vorrai dedicare anche tu un regalo solidale a qualcuno, i quattro progetti di Croce Rossa Monza ti aspettano.', label: 'Scopri i regali solidali', url: `${GIFT_MAIL_SITE}/regali` },
    personalMessage: msg || null,
    signedBy: from || null,
  };
}

export function giftMailRaw(c: GiftMailContent, messageRef: string) {
  const p = giftMailParts(c);
  const link = `${GIFT_MAIL_SITE}/albero?addobbo=${encodeURIComponent(c.ornamentId)}`;
  // Email-client-safe editorial design: a single-column table with inline styles and a quiet mobile media query.
  const demoNote = CAMPAIGN.demo ? `<tr><td style="padding:11px 24px;background:#fff0d8;color:#5d3929;text-align:center;font:700 12px/1.4 Arial,sans-serif;letter-spacing:.06em">PROVA DEMO · Nessun pagamento o regalo reale effettuato.</td></tr>` : "";
  const personalNote = p.personalMessage ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background:#fff9ef;border:1px solid #e1c998;border-radius:12px"><tr><td style="padding:24px 26px;text-align:center"><p style="margin:0 0 12px;font:700 11px/1.4 Arial,sans-serif;letter-spacing:2px;color:#8a642e">UN MESSAGGIO PER TE</p><p style="margin:0;font:italic 23px/1.5 Georgia,serif;color:#20352d;overflow-wrap:anywhere">“${esc(p.personalMessage)}”</p>${p.signedBy ? `<p style="margin:15px 0 0;color:#a8202f;font:700 15px/1.5 Arial,sans-serif">— ${esc(p.signedBy)}</p>` : ""}</td></tr></table>` : "";
  const invitation = p.invitation ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e1dbca"><tr><td style="padding-top:20px"><p style="margin:0 0 7px;font:700 20px/1.3 Georgia,serif;color:#234434">${esc(p.invitation.title)}</p><p style="margin:0 0 12px;font:15px/1.65 Arial,sans-serif;color:#415349">${esc(p.invitation.text)}</p><a href="${esc(p.invitation.url)}" style="color:#a8202f;font:700 14px/1.5 Arial,sans-serif;text-decoration:underline">${esc(p.invitation.label)}</a></td></tr></table>` : "";
  const reason = p.invitation ? `<p style="margin:18px 0 0;font:12px/1.5 Arial,sans-serif;color:#65746d">Ricevi questa email perché una persona ti ha dedicato un regalo solidale.</p>` : "";
  const html = `<!doctype html>
    <html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>@media only screen and (max-width:620px){.email-wrap{padding:12px!important}.email-card{width:100%!important}.email-content{padding:26px 20px!important}.email-header{padding:28px 20px!important}.email-title{font-size:31px!important}.email-cta{display:block!important;text-align:center!important}}</style>
    </head>
    <body style="margin:0;padding:0;background:#e8ede5;color:#20352d;font-family:Arial,sans-serif">
    <div style="display:none!important;font-size:1px;color:#e8ede5;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(p.preheader)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e8ede5"><tr><td class="email-wrap" align="center" style="padding:32px 16px">
    <table role="presentation" class="email-card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fffdfa;border:1px solid #dedaca;border-radius:14px;overflow:hidden">
    <tr><td class="email-header" style="padding:35px 40px 32px;background:#173e30;color:#fff7e7;text-align:center">
    <p style="margin:0 0 17px;font:700 11px/1.5 Arial,sans-serif;letter-spacing:2.3px;color:#f1d4a0">CROCE ROSSA ITALIANA · COMITATO DI MONZA</p>
    <p style="margin:0 0 8px;font:400 14px/1 Georgia,serif;color:#dfc58a">✦ &nbsp; ✦ &nbsp; ✦</p>
    <h1 style="margin:0;font:normal 36px/1.14 Georgia,serif;letter-spacing:-.5px;color:#fff7e7">Il Natale che fa bene</h1>
    <p style="margin:13px 0 0;font:13px/1.5 Arial,sans-serif;color:#e2e4d7">Un regalo solidale, una storia da condividere</p>
    </td></tr>${demoNote}
    <tr><td class="email-content" style="padding:36px 42px 38px">
    <p style="margin:0 0 8px;font:700 11px/1.5 Arial,sans-serif;color:#956c32;letter-spacing:2px">${p.invitation ? "UN REGALO SPECIALE" : "GRAZIE PER IL TUO GESTO"}</p>
    <h2 class="email-title" style="margin:0 0 21px;font:normal 35px/1.16 Georgia,serif;color:#203e31">${esc(p.title)}</h2>
    ${p.lines.map((line, i) => `<p style="margin:${i ? "13px 0" : "0 0 13px"};font:16px/1.68 Arial,sans-serif;color:#35483c;overflow-wrap:anywhere">${esc(line)}</p>`).join("")}
    ${personalNote}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 30px"><tr><td align="center">
    <a class="email-cta" href="${esc(link)}" style="display:inline-block;padding:17px 28px;border-radius:999px;background:#b51f31;color:#ffffff;font:700 15px/1.35 Arial,sans-serif;text-decoration:none;box-shadow:0 5px 0 #872234">${esc(p.cta)}</a>
    </td></tr></table>
    ${invitation}${reason}
    </td></tr>
    <tr><td style="padding:22px 35px 27px;background:#f4eee2;border-top:1px solid #e4ddcd;text-align:center">
    <p style="margin:0 0 8px;font:700 12px/1.5 Arial,sans-serif;color:#294a38">Croce Rossa Italiana – Comitato di Monza</p>
    <p style="margin:0 0 10px;font:12px/1.5 Arial,sans-serif;color:#607064"><a href="${GIFT_MAIL_SITE}" style="color:#607064;text-decoration:underline">${esc(GIFT_MAIL_SITE.replace("https://", ""))}</a></p>
    <p style="margin:0;font:12px/1.5 Arial,sans-serif"><a href="${GIFT_MAIL_SITE}/privacy" style="color:#607064;text-decoration:underline">Informazioni privacy (bozza in revisione)</a></p>
    </td></tr></table>
    <p style="margin:17px 0 0;font:12px/1.6 Arial,sans-serif;color:#54685e;text-align:center">Un piccolo gesto. Un Natale che fa bene.</p>
    </td></tr></table></body></html>`;
  return b64([
    `From: ${header('CRI Monza · Il Natale che fa bene')} <${GIFT_MAIL_SENDER}>`,
    `To: <${c.to}>`,
    `Subject: ${header(CAMPAIGN.demo ? `[DEMO] ${p.subject}` : p.subject)}`,
    `Message-ID: <gift-${messageRef}@crimonza.org>`,
    'MIME-Version: 1.0', 'Content-Type: text/html; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', b64(html),
  ].join('\r\n')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendGiftMail(c: GiftMailContent, messageRef: string): Promise<{ state: 'accepted' | 'failed' | 'unknown'; messageId?: string }> {
  const key = process.env['GOOGLE_MAIL_API_KEY'], auth = process.env['LOVABLE_API_KEY'];
  if (!key || !auth) return { state: 'failed' };
  const response = await fetch('https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: giftMailRaw(c, messageRef) }),
  });
  if (!response.ok) { console.error('Gift mail send', response.status, await response.text()); return { state: response.status >= 500 ? 'unknown' : 'failed' }; }
  const r = await response.json() as { id?: string };
  return r.id ? { state: 'accepted', messageId: r.id } : { state: 'unknown' };
}
