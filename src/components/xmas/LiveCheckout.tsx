import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { CAMPAIGN, campaignPaymentMethods, type OnlineProvider } from '@/lib/campaign';
import { startDonationCheckout } from '@/lib/payments.functions';
import { newDonationAccess, saveDonationAccess } from '@/lib/payment-device';
import type { Project } from '@/lib/data';
export function LiveCheckout({ project, amount, onEdit }: { project: Project; amount: number; onEdit: () => void }) {
  const start = useServerFn(startDonationCheckout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [access] = useState(newDonationAccess);
  const pay = async (provider: OnlineProvider) => {
    setBusy(true); setError('');
    try {
      saveDonationAccess(access); // Must persist before redirect, or do not initiate checkout.
      const checkout = await start({ data: { provider, kind: project.ornament, amount, requestId: access.id, accessToken: access.accessToken } });
      window.location.assign(checkout.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Pagamento non disponibile.'); setBusy(false); }
  };
  return <section className="mx-auto max-w-lg px-4 pt-6">
    <h1 className="font-display text-3xl">{CAMPAIGN.livePayments ? `Dona ${amount} €` : 'Donazioni online non disponibili'}</h1>
    <p className="mt-4 text-muted-foreground">{CAMPAIGN.livePayments ? `${project.title} · La conferma arriva dal servizio di pagamento. Il tuo addobbo viene creato una sola volta.` : 'Il pagamento reale non è ancora verificato. Nessun addebito e nessun addobbo vengono registrati.'}</p>
    <div className="mt-6 grid gap-3">{campaignPaymentMethods().filter((p): p is OnlineProvider => p !== 'cash').map(provider => <Button key={provider} size="lg" disabled={busy} onClick={() => void pay(provider)}>{busy ? 'Attendi…' : `Continua con ${provider === 'sumup' ? 'SumUp' : 'PayPal'}`}</Button>)}
    <Button variant="outline" onClick={onEdit} disabled={busy}>Cambia importo</Button></div>
    {error && <p role="alert" className="mt-4 text-primary">{error}</p>}
  </section>;
}