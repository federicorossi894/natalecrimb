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

/** Product photo slot: original photo when attached, otherwise a quiet placeholder (never a generated image). */
export function CasettaPhoto({ slot, label, className }: { slot: CasettaSlot; label: string; className?: string }) {
  const img = CASETTA_MEDIA[slot];
  if (img) {
    // Whole photo, never cropped: white stage matches the original white backdrop.
    return (
      <div className={cn("flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl bg-photo-stage p-3", className)}>
        <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy" className="max-h-full max-w-full object-contain" />
      </div>
    );
  }
  return (
    <div className={cn("flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed hairline-gold bg-secondary/40 text-center", className)} role="img" aria-label={`${label}: foto in arrivo`}>
      <ImageIcon className="h-7 w-7 text-gold/60" aria-hidden />
      <span className="text-xs text-muted-foreground">Foto in arrivo</span>
    </div>
  );
}
