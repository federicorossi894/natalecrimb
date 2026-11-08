import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testDemoEmail } from "@/lib/gift-email.functions";

export function EmailQa() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    try {
      const r = await testDemoEmail({ data: {} });
      setStatus(
        r.recipientConfirmed
          ? "Destinazione QA confermata. Invio bloccato: completare dominio, mittente e verifica del limite con registro delle prove. Nessuna email inviata."
          : "Destinazione QA non confermata. Nessuna email inviata.",
      );
    } catch {
      setStatus("Verifica non disponibile o accesso non autorizzato. Nessuna email inviata.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 border-t py-6">
      <h2 className="font-display text-2xl">Prova email · DEMO</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        [DEMO — NESSUN PAGAMENTO] · prova manuale, non una ricevuta.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Mittente Natale non verificato. Nessun invio automatico; limite previsto: una prova ogni 10
        minuti, massimo tre al giorno.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" disabled={busy} onClick={check}>
          <MailCheck />
          Verifica predisposizione
        </Button>
        <Button disabled>Invio QA non disponibile</Button>
      </div>
      {status && (
        <p role="status" className="mt-3 text-sm text-gold">
          {status}
        </p>
      )}
    </section>
  );
}
