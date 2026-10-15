import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, MapPin, Facebook, Instagram, Youtube, Globe } from "lucide-react";
import { CriMark } from "./Ornament";
import { CRI } from "@/lib/data";

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

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <DemoBanner />
      <header className="glass-strong sticky top-0 z-50 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <CriMark className="h-12 shrink-0 sm:h-14" />
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-[15px]">Il Natale che fa bene</p>
              <p className="text-[10px] text-gold">Comitato di Monza</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "bg-secondary !text-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <nav className="animate-rise border-t px-4 pb-4 lg:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block border-b py-3.5 font-display text-xl last:border-0" activeOptions={{ exact: true }} activeProps={{ className: "text-gold" }}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main>{children}</main>

      <Link to="/piazza" className="glass-strong fixed bottom-4 left-1/2 z-40 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-xs shadow-deep transition hover:scale-[1.02] sm:text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate"><strong>Casetta CRI · Piazza San Paolo</strong> <span className="text-gold">· Scopri cosa succede oggi</span></span>
      </Link>

      <footer className="mt-24 border-t px-4 pb-28 pt-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <CriMark variant="vertical" className="h-28 shrink-0" />
            <div>
              <p className="font-display text-lg">Comitato di Monza</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Villaggio di Natale · Piazza San Paolo, Monza</p>
            <a href={CRI.site} target="_blank" rel="noreferrer" className="mt-2 inline-block text-gold underline-offset-4 hover:underline">crimonza.org — sito ufficiale</a>
          </div>
          <div>
            <div className="flex gap-2">
              {[Facebook, Instagram, Youtube, Globe].map((I, i) => (
                <a key={i} href={CRI.site} target="_blank" rel="noreferrer" className="glass rounded-full p-2.5 transition hover:text-gold" aria-label="Link social (demo)">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Icone social demo: rimandano al sito ufficiale.</p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-[11px] text-muted-foreground">Prototipo dimostrativo · Contenuti, numeri e dediche sono di esempio. Nessuna operazione reale viene eseguita.</p>
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
