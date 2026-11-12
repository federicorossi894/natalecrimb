/** While the public site is in DEMO, provider callbacks are ignored unless
 * that exact provider has a reserved CRI QA transaction. No browser access.
 */
export async function paymentQaProviderActive(provider: "sumup"|"paypal") {
  if (Date.now() >= Date.parse("2026-11-16T00:00:00Z")) return false;
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const {data,error}=await supabaseAdmin.from("natale_payment_qa_2026")
    .select("provider").eq("provider",provider).maybeSingle();
  if(error)throw new Error("Registro webhook QA non disponibile.");
  return Boolean(data);
}
