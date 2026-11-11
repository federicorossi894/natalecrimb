import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CAMPAIGN } from "@/lib/campaign";
import {
  checkDonationPayment,
  updatePaidDedication,
  paidDonationDetails,
} from "@/lib/payments.functions";
import { PostcardStudio } from "@/components/xmas/PostDonation";
import { PROJECTS, type Project } from "@/lib/data";
import { loadDonationAccess } from "@/lib/payment-device";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/xmas/Shell";
import { PaidGiftEmail } from '@/components/xmas/PaidGiftEmail';
import { loadGiftSession } from "@/lib/online-gift-session";
import { LiveGiftCompletion } from "@/components/xmas/LiveGiftCompletion";
export const Route = createFileRoute("/pagamento")({
  validateSearch: z.object({
    id: z.string().uuid().optional(),
    annullato: z.coerce.number().optional(),
    token: z.string().max(256).optional(),
    PayerID: z.string().max(256).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Conferma donazione – Il Natale che fa bene · CRI Monza" },
      {
        name: "description",
        content: "Verifica sicura della donazione e del tuo addobbo digitale.",
      },
      { property: "og:title", content: "La tua donazione · CRI Monza" },
      { property: "og:description", content: "Conferma della donazione sull’Albero di Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentReturn,
});
function PaymentReturn() {
  const { id, annullato } = Route.useSearch();
  const check = useServerFn(checkDonationPayment);
  const dedicate = useServerFn(updatePaidDedication);
  const details = useServerFn(paidDonationDetails);
  const [status, setStatus] = useState("pending");
  const [ornament, setOrnament] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [firma, setFirma] = useState("");
  const [dedica, setDedica] = useState("");
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [to, setTo] = useState("");
  const [showPostcard, setShowPostcard] = useState(false);
  useEffect(() => {
    if (CAMPAIGN.demo || !CAMPAIGN.livePayments || !id) return;
    const access = loadDonationAccess(id);
    if (!access) {
      setError("Apri questa pagina sul dispositivo con cui hai iniziato la donazione.");
      return;
    }
    let active = true;
    let settled = false;
    let checking = false;
    const refresh = async () => {
      if (settled || checking) return;
      checking = true;
      try {
        const result = await check({ data: { ...access, capture: !annullato } });
        if (active) {
          setStatus(result.status);
          setOrnament(result.ornamentId);
          setError("");
          if (result.status === "paid" && result.ornamentId) {
            const paid = await details({ data: access });
            if (active) setProject(PROJECTS.find((p) => p.ornament === paid.kind) ?? null);
            settled = true;
          } else if (result.status === "failed") settled = true;
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Conferma non disponibile.");
      } finally {
        checking = false;
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, annullato, check, details]);
  const save = async () => {
    const access = id ? loadDonationAccess(id) : null;
    if (!access) return;
    try {
      await dedicate({ data: { ...access, firma, dedica, consent } });
      setSaved(true);
    } catch {
      setError("Dedica non salvata.");
    }
  };
  // Restore the ONLINE_GIFT recipient/dedication on the ORIGINAL paying device.
  // This branch is available only after authoritative paid status and ornament creation.
  if (!CAMPAIGN.demo && status === "paid" && ornament && project && id
      && loadGiftSession(project.id)?.request === id) {
    return <Shell hidePiazzaPill><LiveGiftCompletion donationId={id} ornamentId={ornament} project={project}/></Shell>;
  }
  return (
    <Shell hidePiazzaPill>
      <section className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-3xl">
          {CAMPAIGN.demo
            ? "DEMO · Nessun pagamento reale"
            : !CAMPAIGN.livePayments
              ? "Donazioni online non disponibili"
              : ornament && status === "paid"
                ? "Grazie! Il tuo addobbo è sull’albero."
                : status === "failed"
                  ? "Pagamento non completato"
                  : "Verifica della donazione"}
        </h1>
        {!CAMPAIGN.demo && annullato && !ornament && (
          <p className="mt-4 text-muted-foreground">
            Hai interrotto il checkout. Verifichiamo comunque lo stato presso il servizio di
            pagamento.
          </p>
        )}
        {!CAMPAIGN.demo && !ornament && (
          <p role="status" className="mt-4 text-muted-foreground">
            Nessun addobbo viene creato finché il servizio non conferma il pagamento. Non effettuare
            un secondo pagamento per riprovare la verifica.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-primary">
            {error}
          </p>
        )}
        {ornament && (
          <>
            <Button asChild className="mt-6">
              <Link to="/albero" search={{ addobbo: ornament }}>
                Trova il tuo addobbo
              </Link>
            </Button>
            <div className="mt-6 space-y-3">
              <input
                aria-label="Firma facoltativa"
                value={firma}
                onChange={(e) => setFirma(e.target.value)}
                maxLength={40}
                className="glass w-full rounded-lg p-3"
              />
              <textarea
                aria-label="Dedica facoltativa"
                value={dedica}
                onChange={(e) => setDedica(e.target.value)}
                maxLength={90}
                className="glass w-full rounded-lg p-3"
              />
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Acconsento alla pubblicazione dopo moderazione.
              </label>
              <Button onClick={() => void save()}>Salva dedica</Button>
              {saved && (
                <p role="status">Dedica salvata. I testi pubblici attendono moderazione.</p>
              )}
            </div>
          </>
        )}
        {!CAMPAIGN.demo && ornament && status === "paid" && project && (
          <section className="mt-8 space-y-3">
            <h2 className="font-display text-2xl">La tua cartolina</h2>
            <input
              aria-label="Destinatario cartolina, non salvato"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              maxLength={40}
              className="glass w-full rounded-lg p-3"
            />
            <Button variant="outline" onClick={() => setShowPostcard(true)}>
              Prepara cartolina WhatsApp
            </Button>
            {showPostcard && (
              <PostcardStudio
                project={project}
                to={to}
                from={firma}
                msg={dedica}
                ornamentId={ornament}
              />
            )}
          </section>
        )}
        <Button asChild variant="outline" className="mt-6">
          <Link to="/regali">Torna ai progetti</Link>
        </Button>
        {!CAMPAIGN.demo && ornament && status === 'paid' && id && <PaidGiftEmail donationId={id} />}
      </section>
    </Shell>
  );
}
