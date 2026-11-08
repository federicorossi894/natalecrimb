import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { requestPaidGiftEmail, cancelDonationEmail } from "@/lib/gift-email.functions";
import { officialEmailReady } from "@/lib/email-readiness";
import { loadDonationAccess } from "@/lib/payment-device";
import { CHRISTMAS_DELIVERY } from "@/lib/email-demo";
export function PaidGiftEmail({ donationId }: { donationId: string }) {
  const request = useServerFn(requestPaidGiftEmail);
  const cancel = useServerFn(cancelDonationEmail);
  const [mode, setMode] = useState<"now" | "christmas">("now");
  const [to, setTo] = useState("");
  const [donor, setDonor] = useState("");
  const [toName, setToName] = useState("");
  const [msg, setMsg] = useState("");
  const [expected, setExpected] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const access = loadDonationAccess(donationId);
    if (!access) return;
    setBusy(true);
    try {
      if (!expected) throw new Error("Conferma che la persona si aspetta questo regalo.");
      const result = await request({
        data: { ...access, gift: { mode, to, donor, toName, msg, recipientExpected: true } },
      });
      setStatus(
        result.state === "accepted"
          ? "Email accettata dal servizio di invio; la consegna non è ancora attestata."
          : result.state === "suppressed"
            ? "Il destinatario non può ricevere email da questo mittente."
            : "Nessuna email inviata o programmata. Richiesta da verificare.",
      );
      if (result.state === "accepted" || result.state === "suppressed") setTo("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Email non disponibile.");
    } finally {
      setBusy(false);
    }
  };
  const optOut = async () => {
    const access = loadDonationAccess(donationId);
    if (!access) return;
    try {
      await cancel({ data: { ...access, kind: "receipt" } });
      setStatus("Richiesta di conferma donazione annullata.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Annullamento non disponibile.");
    }
  };
  return (
    <div className="mt-8 space-y-3">
      <h2 className="font-display text-2xl">Un regalo via email</h2>
      <p className="text-sm text-muted-foreground">
        Separato dalla conferma al donatore. Invio reale impossibile finché il mittente ufficiale
        Natale non è configurato e verificato.
      </p>
      <div role="radiogroup" aria-label="Consegna email regalo" className="flex flex-wrap gap-3">
        <label className="flex gap-2">
          <input type="radio" checked={mode === "now"} onChange={() => setMode("now")} />
          Subito
        </label>
        <label className="flex gap-2">
          <input
            type="radio"
            checked={mode === "christmas"}
            onChange={() => setMode("christmas")}
          />
          {CHRISTMAS_DELIVERY}
        </label>
      </div>
      <input
        type="email"
        aria-label="Email destinatario regalo"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        maxLength={254}
        className="glass w-full rounded-lg p-3"
      />
      <input
        aria-label="Il tuo nome, facoltativo"
        value={donor}
        onChange={(e) => setDonor(e.target.value)}
        maxLength={40}
        className="glass w-full rounded-lg p-3"
      />
      <input
        aria-label="Nome destinatario, facoltativo"
        value={toName}
        onChange={(e) => setToName(e.target.value)}
        maxLength={40}
        className="glass w-full rounded-lg p-3"
      />
      <textarea
        aria-label="Messaggio regalo, facoltativo"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        maxLength={90}
        className="glass w-full rounded-lg p-3"
      />
      <label className="flex gap-2 text-sm">
        <input type="checkbox" checked={expected} onChange={(e) => setExpected(e.target.checked)} />
        La persona si aspetta questo regalo e mi ha autorizzato a usare questo indirizzo.
      </label>
      <Button disabled={busy || !officialEmailReady()} onClick={() => void send()}>
        {officialEmailReady() ? "Conferma email regalo" : "Invio email non ancora disponibile"}
      </Button>
      <Button variant="link" onClick={() => void optOut()}>
        Rinuncia alla conferma donazione via email
      </Button>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
