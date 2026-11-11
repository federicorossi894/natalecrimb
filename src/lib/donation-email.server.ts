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
  const { sendGiftMail } = await import("./gift-mail.server");
  const data = personal?.success ? personal.data : { donor: "", toName: "", msg: "" };
  const result = await sendGiftMail({
    kind: kind === "receipt" ? "receipt" : record.gift_email_due_at ? "gift_christmas" : "gift_now",
    to, projectTitle: project.title, projectKind: project.ornament,
    amount: record.amount_cents / 100, ornamentId: record.id,
    from: data.donor, toName: data.toName, msg: data.msg, createdAt: record.created_at,
  }, `paid-${donationId}-${kind}`);
  if (result.state === "accepted") return { sent: true };
  if (result.state === "failed") throw new DefiniteEmailRefusal("Provider Gmail ha rifiutato l'invio.");
  throw new Error("Risposta Gmail ambigua; non ritentare automaticamente.");
};
export async function processDonationEmail(id: string, kind: DeliveryKind, retry = false) {
  const adapter = managedSendAdapter;
  if (CAMPAIGN.demo || !officialEmailReady() || !adapter) return { state: "blocked" as const };
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
