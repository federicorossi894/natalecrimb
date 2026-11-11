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
  const demoNote = CAMPAIGN.demo ? '<p style="margin:0;padding:12px 16px;background:#fff1de;color:#5e3b27;font-size:13px;font-weight:bold">PROVA DEMO · Nessun pagamento o regalo reale effettuato.</p>' : '';
  const personalNote = p.personalMessage ? `<div style="margin:24px 0;padding:20px;background:#f8f1e5;border-left:3px solid #b89a59;border-radius:5px"><p style="font-size:11px;letter-spacing:.1em;color:#6c5240;font-weight:bold">UN MESSAGGIO PER TE</p><p style="font:italic 20px/1.5 Georgia,serif;color:#27362e">“${esc(p.personalMessage)}”</p>${p.signedBy ? `<p style="margin:0;color:#a32b3c;font-weight:bold">— ${esc(p.signedBy)}</p>` : ''}</div>` : '';
  const reason = p.invitation ? '<p style="font-size:12px;color:#5c6b63">Ricevi questa email perché una persona ti ha dedicato un regalo solidale.</p>' : '';
  const invitation = p.invitation ? `<div style="border-top:1px solid #dce3df;margin-top:28px;padding-top:20px"><h3 style="font-family:Georgia,serif">${esc(p.invitation.title)}</h3><p style="line-height:1.6">${esc(p.invitation.text)}</p><p><a href="${esc(p.invitation.url)}" style="color:#c8102e">${esc(p.invitation.label)}</a></p></div>` : '';
  const html = `<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1d2a24"><div style="display:none!important;font-size:1px;color:#ffffff;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(p.preheader)}</div><div style="max-width:600px;margin:auto"><div style="background:#183b2c;color:#fffdf8;padding:30px"><p style="margin:0 0 8px">Croce Rossa Italiana · Comitato di Monza</p><h1 style="font-family:Georgia,serif;margin:0">Il Natale che fa bene</h1></div>${demoNote}<div style="padding:30px"><h2 style="font-family:Georgia,serif">${esc(p.title)}</h2>${p.lines.map(l => `<p style="line-height:1.6;font-size:16px">${esc(l)}</p>`).join('')}${personalNote}<p style="margin:28px 0"><a href="${esc(link)}" style="display:inline-block;padding:16px 22px;background:#c8102e;color:#ffffff;text-decoration:none;border-radius:6px">${esc(p.cta)}</a></p>${invitation}${reason}<p style="font-size:12px;color:#5c6b63">Croce Rossa Italiana – Comitato di Monza · ${esc(GIFT_MAIL_SITE.replace('https://', ''))}</p><p style="font-size:12px"><a href="${GIFT_MAIL_SITE}/privacy" style="color:#5c6b63">Informazioni privacy (bozza in revisione)</a></p></div></div></body></html>`;
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
