import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { sendOnlineGiftMail } from '@/lib/gift-mail.functions';
import { giftMailInput } from '@/lib/gift-mail-policy';

type Props = { ornamentId: string; giftRequestId: string; client: string; from: string; toName: string; msg: string; receipt?: boolean };
/** Real email send for a completed gift: confirmation to the donor, or the gift now / at Christmas. */
export function GiftMailForm({ ornamentId, giftRequestId, client, from, toName, msg, receipt = false }: Props) {
  const send = useServerFn(sendOnlineGiftMail);
  const [when, setWhen] = useState<'gift_now' | 'gift_christmas'>('gift_now');
  const [to, setTo] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const submit = async () => {
    if (busy || done) return;
    const payload = { ornamentId, giftRequestId, client, kind: receipt ? 'receipt' as const : when, to, from, toName, msg };
    const parsed = giftMailInput.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Controlla i dati.'); return; }
    setBusy(true); setError(''); setStatus('');
    try {
      const r = await send({ data: parsed.data });
      if (r.state === 'accepted' || r.state === 'unknown' || r.state === 'limited') setDone(true);
      (r.state === 'accepted' ? setStatus : setError)(r.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'L’email non è partita. Riprova.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4">
    {!receipt && <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Quando inviare">
      {([['gift_now', 'Ora'], ['gift_christmas', 'A Natale']] as const).map(([v, l]) => <Button key={v} type="button" role="radio" aria-checked={when === v} variant={when === v ? 'default' : 'outline'} disabled={done} onClick={() => setWhen(v)}>{l}</Button>)}
    </div>}
    <label className="block">{receipt ? 'La tua email' : 'Email del destinatario'}
      <input aria-label={receipt ? 'La tua email' : 'Email del destinatario'} type="email" inputMode="email" autoComplete={receipt ? 'email' : 'off'} maxLength={254} value={to} disabled={done} onChange={e => setTo(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" />
    </label>
    <Button className="h-auto w-full py-4" disabled={busy || done || !to.trim()} onClick={submit}>{busy ? 'Invio…' : receipt ? 'Inviami la conferma' : when === 'gift_christmas' ? 'Invia a Natale' : 'Invia ora'}</Button>
    {status && <p role="status" className="text-sm font-semibold">{status}</p>}
    {error && <p role="alert" className="text-sm text-gold">{error}</p>}
  </div>;
}
