import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { Shell } from "@/components/xmas/Shell";
import { CityThanks, EmailExportBar, PostcardStudio, exportNode } from "@/components/xmas/PostDonation";
import { getProject, type Project } from "@/lib/data";
import { giftEmailHtml } from "@/lib/email-template";
import { MODE_LABEL, type EmailAudience, type EmailMode } from "@/lib/email-demo";

/**
 * Unlinked page for slide screenshots: three post-donation states with fictitious names only.
 * Ornament links point to anonymous public ornaments (no name, no dedication) on the shared demo tree.
 */
const EXAMPLE = {
  city: { project: "calore", ornamentId: "3dc8b27c-8319-4be2-a688-3f2d505fde70" },
  postcard: { project: "prossimita", ornamentId: "8945eccd-4bc2-4fd0-9da0-02b143d9b766", to: "Marco", from: "Giulia", msg: "Per te, che ti prendi sempre cura degli altri. Buon Natale!" },
  email: { project: "battito", ornamentId: "682df251-2867-41d9-9fe0-5f2c201d3ee0", donor: "Giulia", toName: "Marco", to: "marco@esempio.it", msg: "Ti regalo un battito: Buon Natale da tutti noi." },
} as const;

export const Route = createFileRoute("/presentazione")({
  head: () => ({
    meta: [
      { title: "Esempi per la presentazione – Il Natale che fa bene · DEMO" },
      { name: "description", content: "Tre esempi fittizi del percorso dopo il regalo: dono alla città, cartolina WhatsApp ed email." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Esempi per la presentazione · DEMO" },
      { property: "og:description", content: "Dono alla città, cartolina WhatsApp ed email di esempio, con dati fittizi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Presentazione,
});

function Case({ n, title, sub, children, onExport, exportLabel = "Scarica PNG" }: { n: number; title: string; sub: string; children: ReactNode; onExport?: () => void; exportLabel?: string }) {
  return (
    <section className="mx-auto max-w-6xl border-t hairline-gold px-4 py-10" data-testid={`caso-${n}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Caso {n} · esempio fittizio</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>
        </div>
        {onExport && <button onClick={onExport} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"><Download className="h-4 w-4" /> {exportLabel}</button>}
      </div>
      {children}
    </section>
  );
}

function Presentazione() {
  const city = getProject(EXAMPLE.city.project)!;
  const card = getProject(EXAMPLE.postcard.project)!;
  const mail = getProject(EXAMPLE.email.project)!;
  const cityRef = useRef<HTMLDivElement>(null);
  return (
    <Shell>
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">Per la presentazione · DEMO</p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">Dopo il regalo: <em className="text-gold">tre momenti</em></h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Esempi pronti per le schermate. Nomi, dediche e indirizzi sono inventati; nessuna donazione, email o messaggio è reale. I link portano ad addobbi anonimi dell'albero demo.</p>
      </header>

      <Case n={1} title="Il regalo alla città" sub="Chi dona senza dedica chiude in un attimo: grazie, il suo addobbo e l'invito in Piazza San Paolo." onExport={() => void exportNode(cityRef.current, "caso-1-regalo-citta.png")}>
        <div ref={cityRef} className="mx-auto max-w-md rounded-[2rem] bg-background pb-8">
          <CityThanks project={city} ornamentId={EXAMPLE.city.ornamentId} demo />
        </div>
      </Case>

      <Case n={2} title="La cartolina su WhatsApp" sub={`Regalo “${card.title}” a nome di qualcuno: cartolina del progetto, messaggio con il link all'addobbo e invito in piazza.`}>
        <PostcardStudio project={card} to={EXAMPLE.postcard.to} from={EXAMPLE.postcard.from} msg={EXAMPLE.postcard.msg} ornamentId={EXAMPLE.postcard.ornamentId} demo />
      </Case>

      <EmailCase project={mail} />
    </Shell>
  );
}

/** The email body rendered inline (not in an iframe) so it can be exported as PNG as well as HTML/PDF. */
function EmailCase({ project }: { project: Project }) {
  const [mode, setMode] = useState<EmailMode>("christmas");
  const [audience, setAudience] = useState<EmailAudience>("recipient");
  const ref = useRef<HTMLDivElement>(null);
  const e = EXAMPLE.email;
  // Built after hydration only: the bauble image and absolute logo URL need the browser (canvas, origin).
  const [html, setHtml] = useState("");
  useEffect(() => {
    setHtml(giftEmailHtml({ project, audience, mode, donor: e.donor, toName: e.toName, toEmail: audience === "donor" ? "giulia@esempio.it" : e.to, msg: e.msg, ornamentId: e.ornamentId, envelope: true }));
  }, [project, audience, mode, e]);
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
  const pill = (on: boolean) => `rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-primary text-primary-foreground" : "glass"}`;
  return (
    <Case n={3} title="L'email regalo" sub="Una lettera, diversa dalla cartolina: subito oppure allo scoccare di Natale. Anche la versione di ringraziamento per chi dona." onExport={() => void exportNode(ref.current, `caso-3-email-${audience}-${mode}.png`)}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className={pill(audience === "recipient" && mode === "now")} onClick={() => { setAudience("recipient"); setMode("now"); }}>{MODE_LABEL.now}</button>
        <button className={pill(audience === "recipient" && mode === "christmas")} onClick={() => { setAudience("recipient"); setMode("christmas"); }}>{MODE_LABEL.christmas}</button>
        <button className={pill(audience === "donor")} onClick={() => setAudience("donor")}>Grazie al donatore</button>
      </div>
      <div className="overflow-x-auto rounded-2xl">
        {body ? <div ref={ref} className="mx-auto w-fit" data-testid="email-inline" dangerouslySetInnerHTML={{ __html: body }} /> : <div className="glass mx-auto h-[900px] max-w-[648px] animate-pulse rounded-2xl" />}
      </div>
      {html && <div className="mx-auto max-w-md"><EmailExportBar html={html} name={`caso-3-email-${audience}-${mode}.html`} /></div>}
      <p className="mt-2 text-center text-[11px] text-muted-foreground">Email dimostrativa: nessun invio, nessuna programmazione, nessun indirizzo salvato.</p>
    </Case>
  );
}
