/** Server-only: builds and sends online-gift emails from the connected Gmail account. */
export const GIFT_MAIL_SENDER = 'federico.rossi@crimonza.org';
export const GIFT_MAIL_SITE = 'https://natalecrimb.lovable.app';
export type GiftMailKind = 'receipt' | 'gift_now' | 'gift_christmas';
import { PROJECTS, type OrnamentKind } from './data';
import { GIFT_IMPACT } from './gift-impact';
export type GiftMailContent = { kind: GiftMailKind; to: string; projectTitle: string; projectKind?: OrnamentKind; amount: number; ornamentId: string; from: string; toName: string; msg: string };

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), b => String.fromCharCode(b)).join(''));
const header = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

export function giftMailParts(c: GiftMailContent) {
  const from = oneLine(c.from), toName = oneLine(c.toName), msg = oneLine(c.msg);
  const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(c.amount);
  const kind = c.projectKind ?? PROJECTS.find(p => p.title === c.projectTitle)?.ornament;
  const impact = kind ? GIFT_IMPACT[kind] : 'Il gesto sostiene le attività sanitarie e sociali di Croce Rossa Monza, per una città più vicina a chi ha bisogno.';
  if (c.kind === 'receipt') return {
    subject: `Grazie per la tua donazione · ${c.projectTitle}`,
    title: 'Grazie di cuore',
    lines: [`Grazie per il tuo gesto di ${euro} per il progetto «${c.projectTitle}».`, impact, 'La tua pallina è appesa sull’albero digitale del Natale che fa bene.', 'Questa email è una conferma informativa e non costituisce ricevuta fiscale.'],
    cta: 'Guarda la tua pallina',
  };
  const opener = from ? `${from} ti ha fatto un regalo solidale` : 'Hai ricevuto un regalo solidale';
  return {
    subject: c.kind === 'gift_christmas' ? `Buon Natale${toName ? `, ${toName}` : ''}! ${from ? `Un regalo da ${from}` : 'Un regalo per te'}` : `${opener} 🎁`,
    title: c.kind === 'gift_christmas' ? `Buon Natale${toName ? `, ${toName}` : ''}!` : `${toName ? `${toName}, ` : ''}${opener.charAt(0).toLowerCase() + opener.slice(1)}`.replace(/^./, s => s.toUpperCase()),
    lines: [
      ...(c.kind === 'gift_christmas' ? [`${opener}.`] : []),
      `Al posto di un regalo qualunque, ha scelto di sostenere «${c.projectTitle}» della Croce Rossa di Monza, e ha appeso una pallina per te sull’albero digitale.`,
      impact,
      ...(msg ? [`«${msg}»`] : []),
    ],
    cta: 'Apri la tua pallina',
  };
}

export function giftMailRaw(c: GiftMailContent, messageRef: string) {
  const p = giftMailParts(c);
  const link = `${GIFT_MAIL_SITE}/albero?addobbo=${encodeURIComponent(c.ornamentId)}`;
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#1d2a24"><div style="max-width:600px;margin:auto"><div style="background:#183b2c;color:#fffdf8;padding:30px"><p style="margin:0 0 8px">Croce Rossa Italiana · Comitato di Monza</p><h1 style="font-family:Georgia,serif;margin:0">Il Natale che fa bene</h1></div><div style="padding:30px"><h2 style="font-family:Georgia,serif">${esc(p.title)}</h2>${p.lines.map(l => `<p style="line-height:1.6;font-size:16px">${esc(l)}</p>`).join('')}<p style="margin:28px 0"><a href="${esc(link)}" style="display:inline-block;padding:16px 22px;background:#c8102e;color:#ffffff;text-decoration:none;border-radius:6px">${esc(p.cta)}</a></p><p style="font-size:12px;color:#5c6b63">Croce Rossa Italiana – Comitato di Monza · ${esc(GIFT_MAIL_SITE.replace('https://', ''))}</p></div></div></body></html>`;
  return b64([
    `From: ${header('CRI Monza · Il Natale che fa bene')} <${GIFT_MAIL_SENDER}>`,
    `To: <${c.to}>`,
    `Subject: ${header(p.subject)}`,
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
