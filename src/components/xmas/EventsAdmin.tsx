import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eventSchema, formatEventWhen, romeToIso } from "@/lib/events";

type AdminEvent = { id: string; title: string; description: string; starts_at: string; ends_at: string | null; visible: boolean; confirmed: boolean };
const EMPTY = { title: "", description: "", date: "", start: "", end: "", confirmed: false, visible: false };

/** Moderator-only management of casetta events (RLS: is_moderator). Only confirmed + visible + upcoming events reach the TV. */
export function EventsAdmin() {
  const [rows, setRows] = useState<AdminEvent[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("casetta_events").select("id,title,description,starts_at,ends_at,visible,confirmed").order("starts_at", { ascending: true }).limit(100);
    setRows(data ?? []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = eventSchema.safeParse(form);
    if (!r.success) { setMsg(r.error.issues[0]?.message ?? "Dati non validi"); return; }
    setBusy(true);
    const v = r.data;
    const { error } = await supabase.from("casetta_events").insert({
      title: v.title, description: v.description, starts_at: romeToIso(v.date, v.start), ends_at: v.end ? romeToIso(v.date, v.end) : null, visible: v.visible, confirmed: v.confirmed,
    });
    setBusy(false);
    if (error) { setMsg("Salvataggio non riuscito: verifica di avere il ruolo di moderatore."); return; }
    setForm(EMPTY); setMsg("Evento salvato."); void load();
  };
  const update = async (id: string, patch: Partial<Pick<AdminEvent, "visible" | "confirmed">>) => { await supabase.from("casetta_events").update(patch).eq("id", id); void load(); };
  const remove = async (id: string) => { if (!window.confirm("Eliminare questo evento?")) return; await supabase.from("casetta_events").delete().eq("id", id); void load(); };
  const field = "glass w-full rounded-xl px-4 py-3 outline-none";
  const now = Date.now();

  return (
    <section className="mt-10 border-t pt-6" aria-labelledby="eventi-admin">
      <h2 id="eventi-admin" className="font-display text-2xl">Eventi della casetta</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sulla TV compaiono solo eventi <b>confermati</b>, <b>visibili</b> e non ancora conclusi. Orari in ora di Monza.</p>
      <form onSubmit={submit} className="glass mt-4 grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">Titolo<input className={field} maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="text-sm sm:col-span-2">Descrizione breve<textarea className={field} maxLength={240} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="text-sm">Data<input type="date" className={field} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">Inizio<input type="time" className={field} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label className="text-sm">Fine<input type="time" className={field} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.confirmed} onChange={(e) => setForm({ ...form, confirmed: e.target.checked })} />Evento confermato dal Comitato</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />Mostra in TV</label>
        {msg && <p role="status" className="text-sm text-gold sm:col-span-2">{msg}</p>}
        <button disabled={busy} className="rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2">{busy ? "Salvataggio…" : "Aggiungi evento"}</button>
      </form>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nessun evento inserito: la TV mostra esempi etichettati DEMO.</p>}
        {rows.map((e) => {
          const live = e.visible && e.confirmed && new Date(e.ends_at ?? e.starts_at).getTime() > now;
          return (
            <div key={e.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase text-gold">{formatEventWhen(e)}</p>
                <p className="font-display text-lg">{e.title}</p>
                <p className="text-xs text-muted-foreground">{live ? "In onda sulla TV" : "Non mostrato in TV"}</p>
              </div>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={e.confirmed} onChange={(ev) => update(e.id, { confirmed: ev.target.checked })} />Confermato</label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={e.visible} onChange={(ev) => update(e.id, { visible: ev.target.checked })} />Visibile</label>
              <button onClick={() => remove(e.id)} className="text-xs underline">Elimina</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
