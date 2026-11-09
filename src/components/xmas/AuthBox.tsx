import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const cred = z.object({ email: z.string().trim().email("Email non valida").max(255), password: z.string().min(8, "Almeno 8 caratteri").max(72) });

/** Individual email/password sign-in for reserved areas; roles are assigned separately by an administrator. */
export function AuthBox({ title, returnPath, roleName, loginOnly = false }: { title: string; returnPath: string; roleName: string; loginOnly?: boolean }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = cred.safeParse({ email, password });
    if (!r.success) { setMsg(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword(r.data)
      : await supabase.auth.signUp({ ...r.data, options: { emailRedirectTo: `${window.location.origin}${returnPath}` } });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === "up") setMsg(`Controlla la tua email per confermare l'account. Il ruolo di ${roleName} va poi assegnato da un amministratore.`);
  };
  return (
    <form onSubmit={submit} className="glass mx-auto max-w-sm space-y-3 rounded-2xl p-5">
      <p className="font-display text-xl">{mode === "in" ? title : "Crea account"}</p>
      <input type="email" autoComplete="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="glass w-full rounded-xl px-4 py-3 outline-none" />
      <input type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} aria-label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="glass w-full rounded-xl px-4 py-3 outline-none" />
      {msg && <p role="status" className="text-sm text-gold">{msg}</p>}
      <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">{mode === "in" ? "Accedi" : "Registrati"}</button>
      {!loginOnly && <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="w-full text-xs underline">
        {mode === "in" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
      </button>}
    </form>
  );
}
