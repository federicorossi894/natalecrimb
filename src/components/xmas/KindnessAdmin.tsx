import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

type Row = { day: number; title: string; message: string };
const doorSchema = z.object({
  title: z.string().trim().min(2, "Titolo troppo corto").max(60, "Massimo 60 caratteri"),
  message: z.string().trim().min(5, "Messaggio troppo corto").max(280, "Massimo 280 caratteri"),
});

/** Staff can edit the 24 doors (moderators/admins via RLS). The public only gets doors whose Rome date has come. */
export function KindnessAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<Record<number, string>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from("kindness_doors").select("day,title,message").order("day");
    setRows(data ?? []);
  }, []);
  useEffect(() => { if (open && rows.length === 0) void load(); }, [open, rows.length, load]);
  const save = async (r: Row) => {
    const p = doorSchema.safeParse(r);
    if (!p.success) { setMsg((m) => ({ ...m, [r.day]: p.error.issues[0]?.message ?? "Dati non validi" })); return; }
    const { error } = await supabase.from("kindness_doors").update({ title: p.data.title, message: p.data.message }).eq("day", r.day);
    setMsg((m) => ({ ...m, [r.day]: error ? error.message : "Salvato" }));
  };
  const edit = (day: number, k: "title" | "message", v: string) => setRows((rs) => rs.map((r) => (r.day === day ? { ...r, [k]: v } : r)));
  return (
    <div className="mt-10" data-testid="kindness-admin">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Calendario della Gentilezza</h2>
        <button onClick={() => setOpen(!open)} className="rounded-full border hairline-gold px-4 py-2 text-xs font-semibold text-gold">{open ? "Chiudi" : "Modifica i 24 messaggi"}</button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Il pubblico vede solo le finestrelle già arrivate (data italiana del server). Scrivi gesti semplici e sicuri, senza dati o promesse non confermate.</p>
      {open && (
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.day} className="glass rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold">{r.day} dicembre</p>
              <input value={r.title} maxLength={60} onChange={(e) => edit(r.day, "title", e.target.value)} aria-label={`Titolo giorno ${r.day}`} className="glass mt-2 w-full rounded-xl px-3 py-2 font-display outline-none" />
              <textarea value={r.message} maxLength={280} rows={3} onChange={(e) => edit(r.day, "message", e.target.value)} aria-label={`Messaggio giorno ${r.day}`} className="glass mt-2 w-full rounded-xl p-3 text-sm outline-none" />
              <div className="mt-2 flex items-center gap-3">
                <button onClick={() => save(r)} className="rounded-full bg-fir px-4 py-2 text-xs font-semibold text-snow">Salva</button>
                {msg[r.day] && <span className="text-xs text-gold" role="status">{msg[r.day]}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
