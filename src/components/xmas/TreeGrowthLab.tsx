import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Box, Monitor, RotateCcw, Smartphone } from 'lucide-react';
import { TreeStage, hasWebGL } from './TreeStage';
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion';
import { demoGrowthOrnaments, GROWTH_MAX, GROWTH_PRESETS } from '@/lib/tree-growth-demo';
import { treeHeight } from '@/lib/tree-layout';

export type GrowthFormat = 'tv' | 'phone';

/**
 * Internal preview of the tree growth: the real TreeStage (3D or illustrated fallback) fed only with fictitious
 * in-memory ornaments. No store, no Cloud call, no donation flow. "TV 16:9" uses the real TV camera; "Smartphone
 * 9:16" renders the same tree in a 390px-wide screen with the mobile orbit camera and phone-sized controls.
 */
export function TreeGrowthLab() {
  const [count, setCount] = useState<number>(33);
  const [format, setFormat] = useState<GrowthFormat>('tv');
  const [gl, setGl] = useState<boolean | null>(null);
  const [fallbackShown, setFallbackShown] = useState(false);
  const [reset, setReset] = useState(0);
  const reduced = usePrefersReducedMotion();
  const shownCount = useDeferredValue(count);
  const ornaments = useMemo(() => demoGrowthOrnaments(shownCount), [shownCount]);
  const frame = useRef<HTMLDivElement>(null);

  useEffect(() => { setGl(hasWebGL()); }, []);
  // The stage can also fall back after a scene error or a lost GPU context: watch for the illustrated tree.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const check = () => setFallbackShown(Boolean(el.querySelector('[data-testid="tree-fallback"]')));
    check();
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [format]);

  const illustrated = gl === false || fallbackShown;
  const height = treeHeight(shownCount);

  const status = (
    <div role="status" data-testid="growth-render-mode" data-mode={gl === null ? 'checking' : illustrated ? 'fallback' : '3d'}
      className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${illustrated ? 'border-gold bg-gold/15 text-foreground' : 'border-border text-muted-foreground'}`}>
      {illustrated ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden /> : <Box className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <span>
        {gl === null ? 'Verifica del supporto 3D…' : illustrated ? <><strong>Fallback illustrato — 3D non verificabile su questo dispositivo</strong>{shownCount > 90 ? ' · il disegno mostra le ultime 90 palline.' : '.'}</> : 'Vista 3D reale (WebGL attivo) · stesso albero del sito e della TV.'}
      </span>
    </div>
  );

  const controls = (compact: boolean) => (
    <div className={compact ? 'space-y-2' : 'flex flex-wrap items-center gap-x-5 gap-y-3'} data-testid="growth-controls">
      <div role="group" aria-label="Numero di palline simulate" className={compact ? 'grid grid-cols-5 gap-1.5' : 'flex flex-wrap gap-2'}>
        {GROWTH_PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setCount(p)} aria-pressed={count === p}
            className={`rounded-full border font-semibold tabular-nums transition ${compact ? 'px-1 py-2 text-xs' : 'px-4 py-2 text-sm'} ${count === p ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/60'}`}>
            {p}
          </button>
        ))}
      </div>
      <label className={`flex items-center gap-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className="shrink-0 text-muted-foreground">Palline</span>
        <input type="range" min={1} max={GROWTH_MAX} value={count} onChange={(e) => setCount(Number(e.target.value))} className={`accent-primary ${compact ? 'w-full' : 'w-56'}`} aria-label="Palline simulate (1–200)" />
        <span className="w-8 text-right font-semibold tabular-nums">{count}</span>
      </label>
    </div>
  );

  const stage = <TreeStage key={format} ornaments={ornaments} selected={null} resetKey={reset} reduced={reduced} {...(format === 'tv' ? { tv: true } : {})} />;

  return (
    <section aria-label="Crescita albero" className="mt-4" data-testid="growth-lab" data-format={format} data-count={shownCount}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Formato simulato" className="inline-flex rounded-full border border-border p-1">
          {([['tv', 'TV 16:9', Monitor], ['phone', 'Smartphone 9:16', Smartphone]] as const).map(([f, label, Icon]) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${format === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Addobbi fittizi in memoria · nessun salvataggio, nessuna donazione.</p>
      </div>

      <div className="mt-3">{status}</div>

      {format === 'tv' ? (
        <>
          <div ref={frame} className="growth-tv mt-3" data-testid="growth-frame">
            <div className="tv-tree">{stage}</div>
            <div className="growth-tv-panel">
              <span className="growth-demo-badge">DEMO · Crescita simulata</span>
              <p className="growth-tv-count" data-testid="growth-count"><strong>{shownCount}</strong> palline simulate</p>
              <p className="growth-tv-meta">Altezza albero {height.toFixed(2)} (unità scena) · inquadratura TV</p>
            </div>
          </div>
          <div className="mt-3">{controls(false)}</div>
        </>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
          <div ref={frame} className="growth-phone" data-testid="growth-frame">
            <div className="growth-phone-screen">
              <div className="growth-phone-stage">
                {stage}
                <div className="pointer-events-none absolute inset-x-0 top-3 flex items-start justify-between gap-3 px-4">
                  <div>
                    <span className="growth-demo-badge">DEMO</span>
                    <p className="mt-1 font-display text-xl text-snow" data-testid="growth-count">{shownCount} palline simulate</p>
                  </div>
                  <button type="button" onClick={() => setReset((r) => r + 1)} aria-label="Vista generale" title="Vista generale"
                    className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="growth-phone-bar">{controls(true)}</div>
            </div>
          </div>
          <div className="max-w-[390px] text-xs leading-relaxed text-muted-foreground lg:max-w-xs lg:pt-2">
            <p>Schermo simulato largo 390 px (formato 9:16), con la stessa telecamera e gli stessi gesti dell’albero su telefono: trascina per ruotare, pizzica per zoomare.</p>
            <p className="mt-2">Altezza albero {height.toFixed(2)} (unità scena). Su un telefono reale più stretto lo schermo simulato si adatta alla larghezza disponibile.</p>
          </div>
        </div>
      )}
    </section>
  );
}
