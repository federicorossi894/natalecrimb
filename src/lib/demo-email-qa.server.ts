import type { DemoGiftMailPayload } from './demo-gift-mail-policy';
/** Fixed server-only Gmail QA; optional validated online-gift content, never arbitrary addresses. */
export const DEMO_EMAIL_QA = {
  confirmedRecipients: ["natale@crimonza.org"] as readonly string[],
  sender: "natale@crimonza.org",
  enabled: true,
  minIntervalSeconds: 600,
  maximumPerDay: 3,
} as const;
export type QaKind = "receipt" | "gift_now" | "christmas_simulation";
export type QaResult = {
  state: "accepted" | "failed" | "unknown";
  messageId?: string;
  status?: number;
};
export type QaPorts = {
  authorized: boolean;
  demo: boolean;
  senderVerified: boolean;
  enabled: boolean;
  claim: () => Promise<string | null>;
  send: (recipient: string, attemptId: string) => Promise<QaResult>;
  finish: (attemptId: string, result: QaResult) => Promise<void>;
};
export async function runDemoEmailQa(p: QaPorts) {
  if (!p.authorized) throw new Error("Prova riservata al personale autorizzato.");
  if (!p.demo || !p.enabled || !p.senderVerified) return { state: "unavailable" as const };
  const attempt = await p.claim();
  if (!attempt) return { state: "rate_limited" as const };
  let result: QaResult;
  try {
    result = await p.send(DEMO_EMAIL_QA.sender, attempt);
  } catch {
    result = { state: "unknown" };
  }
  // A failed audit leaves the permanent claim intact; never retry automatically.
  await p.finish(attempt, result);
  return result;
}
const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
export function qaRawMessage(kind: QaKind, attempt: string, gift?: DemoGiftMailPayload) {
  const labels = {
    receipt: "Conferma informativa donazione DEMO",
    gift_now: "Ti hanno fatto un regalo · DEMO",
    christmas_simulation: "SIMULAZIONE ORARIO · Auguri di Natale",
  };
  const common =
    "[DEMO — NESSUN PAGAMENTO]\r\nCroce Rossa Italiana – Comitato di Monza\r\nIl Natale che fa bene\r\n\r\n";
  const content = gift ? (kind==='receipt' ? `Conferma informativa: simulazione completata di ${gift.amount.toFixed(2)} € per ${gift.projectTitle}. Nessun incasso. SIMULAZIONE, NON VALIDA COME RICEVUTA. Nessun beneficio fiscale attestato.` : `${kind==='christmas_simulation' ? "SIMULAZIONE ORARIO · simulazione dell'invio programmato: inviata SUBITO, in produzione sarebbe programmato per il 25/12. Nessuna email programmata. " : 'Ti hanno fatto un regalo! '}${gift.toName ? `Per ${gift.toName}. ` : ''}${gift.donor ? `Da ${gift.donor}. ` : ''}${gift.projectTitle}. ${gift.msg} DEMO: nessun pagamento reale.`) :
    kind === "receipt"
      ? "Conferma informativa di una donazione SIMULATA di 5,00 € per il progetto Calore. Metodo: pagamento online SIMULATO. Nessun incasso, nessuna transazione. SIMULAZIONE, NON VALIDA COME RICEVUTA. Nessun beneficio fiscale è attestato."
      : kind === "gift_now"
        ? "Un gesto di gentilezza illumina il Natale di Monza. Questo augurio è una prova del regalo email immediato: nessuna donazione o pagamento è avvenuto."
        : "SIMULAZIONE ORARIO: questa prova viene inviata SUBITO. In produzione sarebbe programmato per il 25/12 alle 00:05 Europe/Rome; non è stata programmata alcuna email per Natale. Buon Natale dal Comitato di Monza!";
  const body =
    common +
    content +
    `\r\n\r\nData prova: ${new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" }).format(new Date())}\r\nRiferimento prova: ${attempt}\r\nAlbero digitale: https://natale.crimonza.org/albero\r\nProva tecnica riservata, nessuna iscrizione a comunicazioni promozionali.`;
  const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
  const link=gift ? `https://natale.crimonza.org/albero?addobbo=${encodeURIComponent(gift.ornamentId)}` : 'https://natale.crimonza.org/albero';
  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto"><div style="background:#183b2c;color:#fffdf8;padding:30px"><p>Croce Rossa Italiana · Comitato di Monza</p><h1 style="font-family:Georgia,serif">Il Natale che fa bene</h1><p style="color:#e8c37a">[DEMO — NESSUN PAGAMENTO]</p></div><div style="padding:30px"><h2>${escape(labels[kind])}</h2><p style="line-height:1.6">${escape(content)}</p><p>${escape(gift?.projectTitle ?? 'Regala calore')} · un gesto di gentilezza, un regalo digitale.</p><a href="${escape(link)}" style="display:inline-block;padding:16px;background:#c8102e;color:#ffffff;text-decoration:none">Apri la pallina digitale</a><p style="font-size:12px">${escape(body)}</p></div></div></body></html>`;
  return b64(
    [
      `From: ${DEMO_EMAIL_QA.sender}`,
      `To: ${DEMO_EMAIL_QA.sender}`,
      `Subject: =?UTF-8?B?${b64(`[DEMO — NESSUN PAGAMENTO] ${labels[kind]}`)}?=`,
      `Message-ID: <qa-${attempt}@crimonza.org>`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      b64(html),
    ].join("\r\n"),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export async function gmailQaIdentity() {
  const key = process.env["GOOGLE_MAIL_API_KEY_1"];
  const auth = process.env["LOVABLE_API_KEY"];
  if (!key || !auth) return false;
  const response = await fetch(
    "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key } },
  );
  if (!response.ok) {
    console.error("Gmail QA identity", response.status, await response.text());
    return false;
  }
  return (await response.json()).emailAddress === DEMO_EMAIL_QA.sender;
}
export async function sendGmailQa(kind: QaKind, attempt: string, gift?: DemoGiftMailPayload): Promise<QaResult> {
  const key = process.env["GOOGLE_MAIL_API_KEY_1"];
  const auth = process.env["LOVABLE_API_KEY"];
  if (!key || !auth) return { state: "failed" };
  const response = await fetch(
    "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "X-Connection-Api-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: qaRawMessage(kind, attempt, gift) }),
    },
  );
  if (!response.ok) {
    console.error("Gmail QA send", response.status, await response.text());
    return { state: response.status >= 500 ? "unknown" : "failed", status: response.status };
  }
  const result = await response.json();
  return result.id
    ? { state: "accepted", messageId: result.id, status: response.status }
    : { state: "unknown", status: response.status };
}
