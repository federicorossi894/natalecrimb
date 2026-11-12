/** Private scheduler authentication. The token lives only in Supabase Vault.
 * Both donation reconciliation and Christmas mail dispatch use this existing
 * service_role-only verifier; no token is bundled into the site or GitHub.
 */
export async function authenticateInternalScheduler(request: Request): Promise<Response | null> {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return new Response("Unauthorized", { status: 401 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const verify = await supabaseAdmin.rpc("verify_natal_cron_token", { p_token: match[1] });
  if (verify.error) return new Response("Scheduler configuration unavailable", { status: 503 });
  if (verify.data !== true) return new Response("Unauthorized", { status: 401 });
  return null;
}
