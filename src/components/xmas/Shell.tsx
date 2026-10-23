import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, MapPin, Facebook, Instagram, Youtube, Linkedin, Gift } from "lucide-react";
import { CriMark } from "./Ornament";
import { CRI, TREE_UNTIL } from "@/lib/data";

const SOCIAL_ICON = { Facebook, Instagram, YouTube: Youtube, LinkedIn: Linkedin } as const;

const NAV = [
  { to: "/", label: "Home" },
  { to: "/regali", label: "I regali" },
  { to: "/albero", label: "Albero di Monza" },
  { to: "/piazza", label: "Oggi in Piazza" },
  { to: "/babbo-natale", label: "Babbo Natale" },
  { to: "/piccoli-volontari", label: "Piccoli volontari" },
] as const;

export function DemoBanner() {
  return (
    <div className="bg-ink/80 px-4 py-1.5 text-center text-[10.5px] leading-snug text-paper/80 sm:text-xs">
      <strong className="tracking-widest text-gold">PROTOTIPO DIMOSTRATIVO</strong> · Pagamenti, prenotazioni, email, WhatsApp e dati sono simulati. Nessuna operazione reale viene eseguita.
    </div>
  );
}

/** `hidePiazzaPill`: drop the floating casetta link on full-screen activities (kids' missions) where it would cover the game. */
export function Shell({ children, hidePiazzaPill = false }: { children: ReactNode; hidePiazzaPill?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <DemoBanner />
      <header className="glass-strong sticky top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[72px]">
          <Link to="/" className="flex min-w-0 items-center gap-4" aria-label="Il Natale che fa bene – Croce Rossa Italiana, Comitato di Monza">
            <CriLockup className="h-11 shrink-0 sm:h-12" />
            {/* Campaign title kept apart from the institutional mark (clear space + divider). */}
            <span aria-hidden className="hidden h-8 w-px shrink-0 bg-border sm:block" />
            <span className="hidden min-w-0 font-display text-base leading-tight sm:block">Il Natale <em className="text-gold">che fa bene</em></span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {NAV.slice(1).map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "bg-secondary !text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <Link to="/regali" className="hidden items-center gap-1.5 rounded-full border hairline-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold transition hover:bg-gold hover:text-accent-foreground sm:inline-flex"><Gift className="h-4 w-4" /> Regala</Link>
            <button className="rounded-full p-2 xl:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="animate-rise border-t px-4 pb-4 xl:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block border-b py-3.5 font-display text-xl last:border-0" activeOptions={{ exact: true }} activeProps={{ className: "text-gold" }}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main>{children}</main>

      {!hidePiazzaPill && (
      <Link to="/piazza" className="glass-strong fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-xs shadow-deep transition hover:scale-[1.02] sm:text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate"><strong>Casetta CRI · Piazza San Paolo</strong> <span className="text-gold">· Scopri cosa succede oggi</span></span>
      </Link>
      )}

      <footer className="mt-24 border-t px-4 pb-28 pt-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
          <CriMark variant="vertical" className="h-24" />
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-foreground/80">Croce Rossa Italiana – Comitato di Monza</p>
          <p className="font-display text-xl">Il Natale <em className="text-gold">che fa bene</em></p>
          <p className="text-sm text-muted-foreground">Villaggio di Natale · Piazza San Paolo, Monza · l'Albero di Monza fino al {TREE_UNTIL}</p>
          <a href={CRI.site} target="_blank" rel="noreferrer" className="text-sm text-gold underline-offset-4 hover:underline">crimonza.org</a>
          <ul className="mt-1 flex items-center gap-1">
            {CRI.social.map((s) => {
              const I = SOCIAL_ICON[s.name as keyof typeof SOCIAL_ICON];
              return (
                <li key={s.name}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`CRI Monza su ${s.name}`} className="flex h-11 w-11 items-center justify-center rounded-full text-gold/80 transition hover:bg-secondary hover:text-gold">
                    <I className="h-5 w-5" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center text-[11px] text-muted-foreground">Prototipo dimostrativo · Contenuti e dediche di esempio. Nessun pagamento, invio o prenotazione reale.</p>
      </footer>
    </div>
  );
}

export function PageHead({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:pt-16">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">{kicker}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] sm:text-6xl">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-muted-foreground">{children}</div>}
    </section>
  );
}
