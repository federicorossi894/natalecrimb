/** Server-only owner-confirmed destination. Never accept recipient/content from the browser. */
export const DEMO_EMAIL_QA = {
  confirmedRecipients: ["federico.rossi@crimonza.org"] as readonly string[],
  enabled: false,
  senderVerified: false,
  managedAdapterVerified: false,
  durableRateAuditVerified: false,
  minIntervalSeconds: 600,
  maximumPerDay: 3,
} as const;

export type QaPorts = {
  authorized: boolean;
  demo: boolean;
  senderVerified: boolean;
  enabled: boolean;
  /** Atomic durable limit + audit, supplied only after a verified integration exists. */
  claim: () => Promise<string | null>;
  send: (recipient: string, attemptId: string) => Promise<{ sent: boolean }>;
  finish: (attemptId: string, state: "accepted" | "suppressed") => Promise<void>;
};

export async function runDemoEmailQa(p: QaPorts) {
  if (!p.authorized) throw new Error("Prova riservata al personale autorizzato.");
  if (!p.demo || !p.enabled || !p.senderVerified)
    return { state: "unavailable" as const, reason: "managed_sender_not_configured" };
  const recipient = DEMO_EMAIL_QA.confirmedRecipients[0];
  if (!recipient || DEMO_EMAIL_QA.confirmedRecipients.length !== 1)
    return { state: "unavailable" as const, reason: "qa_recipient_not_confirmed" };
  const attemptId = await p.claim();
  if (!attemptId) return { state: "rate_limited" as const };
  // An ambiguous error leaves the durable claim intact. Never blind-retry a send.
  const result = await p.send(recipient, attemptId);
  const state = result.sent ? "accepted" as const : "suppressed" as const;
  await p.finish(attemptId, state);
  return { state };
}