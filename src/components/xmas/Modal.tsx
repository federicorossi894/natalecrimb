import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, children, wide = false, panelClassName = "glass-strong" }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean; panelClassName?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
        className={`${panelClassName} animate-rise relative max-h-[92vh] w-full overflow-y-auto rounded-3xl p-5 shadow-deep sm:p-7 ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <button onClick={onClose} aria-label="Chiudi" className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="text-center">
      <span className="inline-block rounded-full border hairline-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gold">Demo</span>
      <p className="mt-4 font-display text-xl">{children}</p>
    </div>
  );
}
