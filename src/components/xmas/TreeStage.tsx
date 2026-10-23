import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { TreeOrnament } from "@/lib/data";
import { Tree } from "./Tree";

const Scene = lazy(() => import("./TreeScene"));

export type TreeStageProps = {
  ornaments: TreeOrnament[];
  selected: TreeOrnament | null;
  onPick?: (o: TreeOrnament) => void;
  tv?: boolean;
  arrivingId?: string | number | null;
  resetKey?: number;
  reduced: boolean;
};

/** True when the browser can create a WebGL context (some office/remote browsers run without GPU acceleration). */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Ornament size (% of the tree width) shrinks as the tree fills up, so baubles stay readable without piling up. */
export function fallbackOrnamentSize(count: number) {
  return count <= 12 ? 9 : count <= 30 ? 7 : count <= 60 ? 5.5 : 4.5;
}

/**
 * Illustrated (non-WebGL) Albero di Monza: same shared ornaments, same picking, no GPU needed.
 * Used when WebGL is missing, when the 3D scene fails, or after the GPU context is lost.
 */
export function IllustratedTree({ ornaments, selected, onPick, tv = false, arrivingId }: Omit<TreeStageProps, "reduced" | "resetKey">) {
  // Very large trees: keep the most recent 90 baubles on the drawing; the count and list stay complete.
  const shown = ornaments.length > 90 ? ornaments.slice(-90) : ornaments;
  return (
    <div className="tree-stage tree-illustrated" data-testid="tree-fallback" data-ornament-count={ornaments.length} aria-label="Albero dei Regali illustrato">
      <div className="tree-illustrated-sky" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 top-[6%] mx-auto aspect-[3/4] max-w-full" style={{ maxHeight: tv ? "100%" : "94%" }}>
        <Tree ornaments={shown} focusId={selected?.id ?? null} arrivingId={arrivingId ?? null} onPick={onPick} size={fallbackOrnamentSize(shown.length)} />
      </div>
      {!tv && (
        <p className="absolute inset-x-0 bottom-3 px-4 text-center text-[11px] text-muted-foreground">
          Versione illustrata · la vista 3D non è disponibile su questo dispositivo. Tocca un addobbo per leggere la dedica.
        </p>
      )}
    </div>
  );
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function StageInner(props: TreeStageProps) {
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => { setGl(hasWebGL()); }, []);
  const fallback = <IllustratedTree ornaments={props.ornaments} selected={props.selected} {...(props.onPick ? { onPick: props.onPick } : {})} {...(props.tv ? { tv: true } : {})} arrivingId={props.arrivingId ?? null} />;
  if (gl === null) return <div className="tree-stage" aria-busy="true" />;
  // No WebGL: never download the 3D engine, go straight to the illustrated tree.
  if (!gl) return fallback;
  return (
    <SceneBoundary fallback={fallback}>
      <Suspense fallback={<div className="tree-stage flex items-center justify-center text-gold">{props.tv ? null : "L’albero si accende…"}</div>}>
        <Scene {...props} />
      </Suspense>
    </SceneBoundary>
  );
}

/** 3D tree when the device supports it, illustrated tree otherwise. Client-only (WebGL and canvas). */
export function TreeStage(props: TreeStageProps) {
  return <ClientOnly fallback={<div className="tree-stage" />}><StageInner {...props} /></ClientOnly>;
}
