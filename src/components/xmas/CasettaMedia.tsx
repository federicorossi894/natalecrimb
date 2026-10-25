import { ImageIcon } from "lucide-react";
import { CASETTA_MEDIA, type CasettaSlot } from "@/lib/casetta";
import { cn } from "@/lib/utils";

/** Official poster or a sober placeholder. The original file is shown untouched (no crop, no overlay). */
export function CasettaPoster({ className, placeholder = true }: { className?: string; placeholder?: boolean }) {
  const img = CASETTA_MEDIA.poster;
  if (img) {
    return (
      <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy"
        className={cn("h-auto w-full rounded-2xl shadow-deep", className)} data-testid="casetta-poster" />
    );
  }
  if (!placeholder) return null;
  return (
    <div className={cn("flex aspect-[1/1.414] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed hairline-gold bg-secondary/40 p-6 text-center", className)} data-testid="casetta-poster-slot">
      <ImageIcon className="h-8 w-8 text-gold/70" aria-hidden />
      <p className="font-display text-lg leading-tight">Locandina ufficiale<br /><em className="text-gold">Mercatini di Natale</em></p>
      <p className="max-w-[18ch] text-xs text-muted-foreground">Spazio riservato al file originale del Comitato</p>
    </div>
  );
}

/**
 * Product stage: the original photo, whole and uncropped, on a uniform white stage. Without an original
 * (pandoro) it shows a neutral line illustration declared as such — never a generated or fake photo.
 */
export function CasettaPhoto({ slot, label, className }: { slot: CasettaSlot; label: string; className?: string }) {
  const img = CASETTA_MEDIA[slot];
  return (
    <div className={cn("flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-photo-stage p-[9%]", className)}>
      {img
        ? <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy" className="max-h-full max-w-full object-contain" />
        : <NeutralTin label={label} />}
    </div>
  );
}

function NeutralTin({ label }: { label: string }) {
  return (
    <figure className="flex h-full w-full flex-col items-center justify-center" data-testid="casetta-illustration">
      <svg viewBox="0 0 120 110" className="h-[78%] w-auto" role="img" aria-label={`${label}: illustrazione neutra, non una foto del prodotto`}>
        <g fill="none" stroke="var(--wood)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="60" cy="22" rx="38" ry="10" />
          <path d="M22 22 V86 A38 10 0 0 0 98 86 V22" />
          <path d="M22 30 A38 10 0 0 0 98 30" opacity="0.5" />
        </g>
        <path d="M60 46 L65 57 L77 58 L68 66 L71 78 L60 72 L49 78 L52 66 L43 58 L55 57Z" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <figcaption className="mt-1 text-[10px] italic text-ink/55">Illustrazione, non foto del prodotto</figcaption>
    </figure>
  );
}
