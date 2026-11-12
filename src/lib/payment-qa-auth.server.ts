import { isQaOwner } from "./email-qa-auth.server";
import { paymentOrigin } from "./payment-deployment";
import { CAMPAIGN } from "./campaign";
import { getRequest } from "@tanstack/react-start/server";

/** Separate staff-only QA authorization. Never alters public payment readiness. */
export async function requirePaymentQa(context: { supabase: any; userId: string }) {
  if (!CAMPAIGN.demo || Date.now() >= Date.parse("2026-11-16T00:00:00Z"))
    throw new Error("Collaudo chiuso.");
  const { data, error } = await context.supabase.auth.getUser();
  if (error || !isQaOwner(data?.user ?? null, context.userId))
    throw new Error("Collaudo riservato agli account CRI autorizzati.");
  paymentOrigin(getRequest().url);
  return context.userId;
}
