import { Checkbox } from '@/components/ui/checkbox';
import { donorConfirmationSchema, type DonorConfirmation } from '@/lib/donation-email-policy';
export function DonorConfirmationChoice({ value, onChange, demo }: { value: DonorConfirmation; onChange: (v: DonorConfirmation) => void; demo: boolean }) {
  const result = donorConfirmationSchema.safeParse(value);
  return <div className="mt-5 space-y-2 text-sm">
    <label className="flex items-start gap-3">
      <Checkbox checked={value.requested} onCheckedChange={v => onChange(v === true ? { requested: true, email: '' } : { requested: false })} aria-label="Vuoi ricevere via email la conferma della tua donazione?" />
      <span>Vuoi ricevere via email la conferma della tua donazione? <span className="text-muted-foreground">Facoltativo.</span></span>
    </label>
    {value.requested && <label className="block">Email del donatore<input type="email" autoComplete="email" maxLength={254} value={value.email} onChange={e => onChange({ requested: true, email: e.target.value })} className="glass mt-1 w-full rounded-lg p-3" aria-label="Email per la conferma donazione" aria-invalid={Boolean(value.email && !result.success)} /></label>}
    {value.requested && value.email && !result.success && <p role="alert" className="text-primary">Indirizzo email non valido.</p>}
    <p className="text-xs text-muted-foreground">Separata dall’email regalo, va solo al donatore dopo la conferma del pagamento. Non è un documento fiscale e non attesta la detraibilità. Nessuna iscrizione o messaggio promozionale.</p>
    {demo && <p className="text-xs text-gold">DEMO: solo anteprima sul telefono; nessuna email inviata, nessun indirizzo salvato.</p>}
  </div>;
}