import { CAMPAIGN } from "@/lib/campaign";
import { ONLINE_GIFT } from "@/lib/site-experience";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Hand, MapPin } from "lucide-react";
import { CriMark } from "@/components/xmas/Ornament";
import { MISSIONS, claimSurprise, type AcademyState } from "@/lib/kids-academy";
import { HelperBadge, Medal, Seal } from "./KidsArt";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

/** Local courtesy acknowledgement, independent of payments, login and campaign tier. */
export function DiplomaView({ state, update, onExit }: { state: AcademyState; update: (fn: (s: AcademyState) => AcademyState) => void; onExit: () => void }) {
  const d = state.diploma;
  if (!d || !state.done.length) return null;
  const claimed = d.claimedAt !== null;
  return (
    <section className="mx-auto max-w-3xl px-4 pt-5" data-testid="diploma">
      <button type="button" onClick={onExit} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /> Torna all'Accademia</button>
      <article className="animate-rise relative mt-3 overflow-hidden rounded-[2rem] border-[6px] border-double border-gold bg-paper p-6 text-center text-ink shadow-deep sm:p-10">
        <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border border-gold/60" />
        <CriMark variant="red" className="relative mx-auto h-12 sm:h-14" />
        <p className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.25em] opacity-70">Comitato di Monza</p>
        <p className="relative mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Accademia dei piccoli aiutanti di Babbo Natale</p>
        <h1 className="relative mt-2 font-display text-4xl leading-tight sm:text-5xl">Diploma di<br /><em>Piccolo Aiutante di Babbo Natale</em></h1>
        <HelperBadge id={state.helper ?? "stella"} className="relative mx-auto mt-5 h-24 w-24 drop-shadow-lg" />
        <p className="relative mt-4 text-lg">Per aver completato con coraggio e gentilezza</p>
        <div className="relative mx-auto mt-4 grid max-w-md grid-cols-3 gap-3">
          {MISSIONS.map((m) => {
            const ok = state.done.includes(m.id);
            return (
              <div key={m.id} className="flex flex-col items-center">
                <Medal mission={m.id} earned={ok} className="h-20 w-20" />
                <span className={`mt-1 text-xs font-semibold leading-tight ${ok ? "" : "opacity-50"}`}>{ok ? m.title : "Da scoprire"}</span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-6 flex items-end justify-between gap-4 text-left text-sm">
          <div><p className="opacity-70">Monza,</p><p className="font-semibold">{fmt(d.issuedAt)}</p></div>
          <Seal className="h-20 w-20 shrink-0" />
          <div className="text-right"><p className="opacity-70">Codice diploma</p><p className="font-mono text-lg font-bold tracking-widest" data-testid="diploma-code">{d.code}</p></div>
        </div>
        {!ONLINE_GIFT && claimed && (
          <div className="kid-stamp pointer-events-none absolute right-4 top-24 rounded-xl border-4 border-primary px-3 py-1 text-primary sm:right-8" data-testid="claimed-stamp">
            <p className="font-display text-lg font-bold uppercase leading-none">Sorpresa consegnata</p>
            <p className="text-center text-xs font-semibold">{d.claimedAt ? fmt(d.claimedAt) : ""}</p>
          </div>
        )}
      </article>

      {ONLINE_GIFT ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">Hai imparato ad aiutare con attenzione e gentilezza. Il tuo diploma digitale resta qui: puoi continuare con le altre missioni!</p>
      ) : claimed ? (
        <div className="mt-5 flex gap-3 rounded-3xl border hairline-gold bg-card p-5">
          <CheckCircle2 className="h-7 w-7 shrink-0 text-gold" />
          <p className="text-lg leading-relaxed">Hai già ritirato la tua sorpresa: grazie, piccolo aiutante! Puoi continuare a giocare tutte le missioni che vuoi.</p>
        </div>
      ) : CAMPAIGN.courtesyBiscuit ? (
        <div className="mt-5 rounded-3xl bg-primary p-5 text-primary-foreground shadow-deep">
          <div className="flex gap-3">
            <MapPin className="mt-1 h-7 w-7 shrink-0" />
            <p className="font-display text-2xl leading-snug">Mostra questa schermata ai volontari della casetta CRI in Piazza San Paolo per ritirare il biscotto</p>
          </div>
          <p className="mt-3 text-sm opacity-90">{CAMPAIGN.demo ? "DEMO · ritiro simulato, disponibilità da approvare dal Comitato." : "Omaggio di cortesia, non legato a donazioni o acquisti, fino a esaurimento disponibilità."}</p>
        </div>
      ) : (
        <p className="mt-5 text-center text-sm text-muted-foreground">Il tuo diploma resta disponibile. Il biscotto è in attesa di approvazione del Comitato.</p>
      )}
      {!ONLINE_GIFT && !claimed && CAMPAIGN.courtesyBiscuit && <VolunteerCheck onConfirm={() => { if (CAMPAIGN.courtesyBiscuit) update((s) => claimSurprise(s, new Date())); }} />}
      <p className="mt-4 text-center text-[11px] text-muted-foreground">Nessuna registrazione e nessun dato del bambino: il diploma resta solo su questo dispositivo.</p>
    </section>
  );
}

/** The volunteer taps on the visitor's phone; no identity or QR verification. */
function VolunteerCheck({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed hairline-gold p-4 text-center" data-testid="volunteer-check">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Conferma sulla schermata del visitatore{CAMPAIGN.demo && " · DEMO"}</p>
      <Button type="button" onClick={onConfirm} className="mt-2 min-h-14 w-full max-w-sm rounded-full">
        <Hand className="h-5 w-5" /> Biscotto ritirato
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Ritiro registrato solo su questo dispositivo. Il diploma resta. Nessun login, QR o dato inviato.</p>
    </div>
  );
}
