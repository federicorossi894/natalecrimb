import type { TreeOrnament } from '@/lib/data';
export function TvPostcard({ ornament }: { ornament: TreeOrnament }) {
  if (!ornament.dedica) return null;
  return <div className="tv-postcard" data-testid="tv-postcard">
    <span className="tv-postcard-stamp" aria-hidden>✦</span>
    <p className="tv-postcard-kicker">Una dedica, una luce</p>
    <p className="tv-postcard-text font-display">“{ornament.dedica}”</p>
    {ornament.firma&&<p className="tv-postcard-signature">— {ornament.firma}</p>}
    <p className="tv-postcard-foot">L’Albero dei Regali di Monza</p>
  </div>;
}