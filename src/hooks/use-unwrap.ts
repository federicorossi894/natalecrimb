import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useReducedMotion } from "@/components/xmas/TreeExperience";

/** Tap on a gift box: play the opening, then go to its project (instant with reduced motion or modifier keys). */
export function useUnwrap() {
  const nav = useNavigate();
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState<string | null>(null);
  const unwrap = (id: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || reduced) return;
    e.preventDefault();
    if (opening) return;
    setOpening(id);
    setTimeout(() => nav({ to: "/regali/$id", params: { id } }), 950);
  };
  return { opening, unwrap };
}
