import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { CAMPAIGN } from "./campaign";
import { officialEmailReady } from "./email-readiness";
import { deliverDonationEmail, DefiniteEmailRefusal, type DeliveryPorts } from "./donation-email-delivery";
import type { DeliveryKind } from "./donation-email-policy";
import { z } from "zod";
import { PROJECTS } from "./data";

/** Gmail delivery for an already-paid donation, using the exact managed connection
 * shared by the tested DEMO gifts. No address is returned to the browser.
 * The existing SQL claim locks each delivery permanently on an ambiguous outcome.
 */
const privateGift = z.object({ donor: z.string().max(40), toName: z.string().max(40), msg: z.string().max(90) }).strict();
const managedSendAdapter: DeliveryPorts["send"] = async (donationId, kind) => {
  const { data: record, error } = await supabaseAdmin.from("live_donations")
    .select("id,kind,amount_cents,created_at,status,settlement_state,donor_email_private,gift_email_private,gift_email_data,gift_email_due_at")
    .eq("id", donationId).single();
  if (error || !record || record.status !== "paid" || record.settlement_state !== "completed")
    throw new DefiniteEmailRefusal("Donazione non confermata.");
  const project = PROJECTS.find(p => p.ornament === record.kind);
  if (!project) throw new DefiniteEmailRefusal("Progetto non disponibile.");
  const to = kind === "receipt" ? record.donor_email_private : record.gift_email_private;
  if (!to) return { sent: false, reason: "recipient_suppressed" };
  if (kind === "gift" && record.gift_email_due_at && Date.parse(record.gift_email_due_at) > Date.now())
    throw new DefiniteEmailRefusal("Regalo non ancora dovuto.");
  const personal = kind === "gift" ? privateGift.safeParse(record.gift_email_data) : null;
  if (kind === "gift" && !personal?.success) throw new DefiniteEmailRefusal("Dettagli regalo non validi.");
  const { data: bauble, error: baubleError } = await supabaseAdmin.from("live_ornaments")
    .select("id").eq("donation_id", donationId).single();
  if (baubleError || !bauble) throw new DefiniteEmailRefusal("Pallina non trovata per il pagamento.");
  const { sendGiftMail } = await import("./gift-mail.server");
  const data = personal?.success ? personal.data : { donor: "", toName: "", msg: "" };
  const { data: qaPermit } = await supabaseAdmin.from("natale_payment_qa_2026")
    .select("donation_id").eq("donation_id",donationId).maybeSingle();
  const result = await sendGiftMail({
    kind: kind === "receipt" ? "receipt" : record.gift_email_due_at ? "gift_christmas" : "gift_now",
    to, projectTitle: project.title, projectKind: project.ornament,
    amount: record.amount_cents / 100, ornamentId: bauble.id,
    from: data.donor, toName: data.toName, msg: data.msg, createdAt: record.created_at,
  }, `paid-${donationId}-${kind}`, Boolean(qaPermit && CAMPAIGN.demo));
  if (result.state === "accepted") return { sent: true };
  if (result.state === "failed") throw new DefiniteEmailRefusal("Provider Gmail ha rifiutato l'invio.");
  throw new Error("Risposta Gmail ambigua; non ritentare automaticamente.");
};
export async function processDonationEmail(id: string, kind: DeliveryKind, retry = false, qaAuthorized = false) {
  const adapter = managedSendAdapter;
  if (qaAuthorized) {
    if (!CAMPAIGN.demo) return { state: "blocked" as const };
    const {data:permit,error:pError}=await supabaseAdmin.from("natale_payment_qa_2026")
      .select("donation_id").eq("donation_id",id).maybeSingle();
    const {data:donation,error:dError}=await supabaseAdmin.from("live_donations")
      .select("amount_cents,donor_email_private,gift_email_private,gift_email_due_at,settlement_state,status")
      .eq("id",id).single();
    if(pError || !permit || dError || donation?.status!=="paid"
      || donation.settlement_state!=="completed" || donation.amount_cents!==500
      || (kind==="receipt" && donation.donor_email_private!=="natale@crimonza.org")
      || (kind==="gift" && (donation.gift_email_private!=="natale@crimonza.org" || donation.gift_email_due_at!==null)))
      return {state:"blocked" as const};
  } else if (CAMPAIGN.demo || !officialEmailReady()) return { state: "blocked" as const };
  // Reject a stale connection that still belongs to a personal Gmail account
  // BEFORE the SQL claim is consumed.
  const { gmailQaIdentity } = await import("./demo-email-qa.server");
  if (!(await gmailQaIdentity())) return { state: "blocked" as const };
  const { data: d, error } = await supabaseAdmin
    .from("live_donations")
    .select("id,status,settlement_state,donor_email_requested,gift_email_private")
    .eq("id", id)
    .single();
  if (error || !d) return { state: "blocked" as const };
  return deliverDonationEmail(
    {
      ...d,
      requested: kind === "receipt" ? d.donor_email_requested : Boolean(d.gift_email_private),
    },
    kind,
    {
      ready: true,
      demo: false,
      send: adapter,
      claim: async (donationId, purpose, authorizedRetry) => {
        const result = await supabaseAdmin.rpc("claim_donation_email", {
          _id: donationId,
          _kind: purpose,
          _retry: authorizedRetry,
        });
        if (result.error) throw new Error("Conferma email da verificare.");
        return result.data;
      },
      finish: async (donationId, purpose, claim, state) => {
        const result = await supabaseAdmin.rpc("finish_donation_email", {
          _id: donationId,
          _kind: purpose,
          _claim: claim,
          _state: state,
        });
        if (result.error || !result.data) throw new Error("Esito email da verificare.");
      },
    },
    retry,
  );
}

/** Bounded worker for durable Christmas deliveries. Must only be called from a
 * DB-authenticated internal cron endpoint, never from a browser action.
 * Ambiguous Gmail outcomes remain claimed and require staff reconciliation.
 */
export async function processDueChristmasGiftEmails() {
  if (CAMPAIGN.demo || !officialEmailReady()) return { state: "blocked" as const, processed: 0 };
  // This is the 2026 campaign. Never send abandoned 2026 gifts next Christmas.
  const now = Date.now();
  if (now < Date.parse("2026-12-24T23:05:00.000Z") || now >= Date.parse("2026-12-27T00:00:00.000Z"))
    return { state: "out_of_window" as const, processed: 0 };
  const { data: due, error } = await supabaseAdmin.from("live_donations")
    .select("id")
    .eq("status", "paid")
    .eq("settlement_state", "completed")
    .eq("gift_email_state", "blocked")
    .not("gift_email_due_at", "is", null)
    .lte("gift_email_due_at", new Date().toISOString())
    .order("gift_email_due_at", { ascending: true })
    .limit(12);
  if (error) throw new Error("Coda Natale non disponibile.");
  const result = { state: "checked" as const, processed: 0, accepted: 0, review: 0 };
  for (const row of due ?? []) {
    result.processed++;
    try {
      const status = await processDonationEmail(row.id, "gift");
      if (status.state === "accepted") result.accepted++;
      else if (status.state !== "unchanged") result.review++;
    } catch {
      result.review++; // No blind retry: the SQL claim may have been taken.
    }
  }
  return result;
}
