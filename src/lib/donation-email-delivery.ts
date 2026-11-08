import { donationEmailKey, maySendDonationEmail, type DeliveryKind } from "./donation-email-policy";
/** Client-safe orchestration contract; real IO is provided only by server-only code. */
export type DeliveryRecord = {
  id: string;
  status: string;
  settlement_state: string;
  requested: boolean;
};
export interface DeliveryPorts {
  ready: boolean;
  demo: boolean;
  claim: (id: string, kind: DeliveryKind, retry: boolean) => Promise<string | null>;
  send: (
    id: string,
    kind: DeliveryKind,
    key: string,
  ) => Promise<{ sent: boolean; reason?: string }>;
  finish: (
    id: string,
    kind: DeliveryKind,
    claim: string,
    state: "accepted" | "failed" | "suppressed",
  ) => Promise<void>;
}
/** Only a definite pre-acceptance refusal is retryable; timeouts keep the permanent claim for reconciliation. */
export class DefiniteEmailRefusal extends Error {}
export async function deliverDonationEmail(
  record: DeliveryRecord,
  kind: DeliveryKind,
  ports: DeliveryPorts,
  retry = false,
) {
  if (!ports.ready) return { state: "blocked" as const };
  if (!maySendDonationEmail(record, record.requested, ports.demo))
    return { state: "not_requested" as const };
  const claim = await ports.claim(record.id, kind, retry);
  if (!claim) return { state: "unchanged" as const };
  try {
    const sent = await ports.send(record.id, kind, donationEmailKey(record.id, kind));
    if (!sent.sent && sent.reason !== "recipient_suppressed")
      throw new Error("Esito email ambiguo");
    const state = sent.sent ? ("accepted" as const) : ("suppressed" as const);
    await ports.finish(record.id, kind, claim, state);
    return { state };
  } catch (error) {
    if (error instanceof DefiniteEmailRefusal) {
      await ports.finish(record.id, kind, claim, "failed");
      return { state: "failed" as const };
    }
    return { state: "claimed" as const }; // Never blindly retry an unknown acceptance.
  }
}
