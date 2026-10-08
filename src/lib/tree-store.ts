import { useEffect, useState } from "react";
import { z } from "zod";
import { TREE_ORNAMENTS, MOCK_TOTAL_GIFTS, type OrnamentKind, type TreeOrnament } from "./data";

/** DEMO store: persists in this browser only (localStorage). No real donations. */
export type StoredOrnament = TreeOrnament & { status: "approved" | "pending" | "rejected"; createdAt: number; mine?: boolean };

const KEY = "cri-demo-tree-v1";
const EVT = "cri-demo-tree";

const BANNED = ["cazzo", "merda", "stronz", "vaffan", "puttan", "coglion", "idiot", "http", "www."];

export const dedicaSchema = z.object({
  firma: z.string().trim().max(40, "Massimo 40 caratteri").regex(/^[\p{L}\p{N} .,'’!-]*$/u, "Caratteri non ammessi").optional().or(z.literal("")),
  dedica: z.string().trim().max(90, "Massimo 90 caratteri").optional().or(z.literal("")),
});

const read = (): StoredOrnament[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredOrnament[]; } catch { return []; }
};
const write = (list: StoredOrnament[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

/** Free slots on the tree (inside the triangle). */
const slot = (n: number) => {
  const r = (s: number) => { const v = Math.sin(n * 91.7 + s * 47.3) * 43758.5; return v - Math.floor(v); };
  const y = 28 + r(1) * 58;
  const half = ((y - 10) / 80) * 34;
  return { x: Math.round(50 + (r(2) * 2 - 1) * half * 0.8), y: Math.round(y) };
};

export function addOrnament(kind: OrnamentKind, firma: string, dedica: string): StoredOrnament {
  const list = read();
  const flagged = BANNED.some((w) => (dedica + " " + firma).toLowerCase().includes(w));
  const o: StoredOrnament = {
    id: 1000 + list.length + Date.now() % 1000,
    kind,
    ...slot(list.length + 3),
    dedica: dedica.trim() || undefined,
    firma: firma.trim() || undefined,
    // Without a dedica nothing needs review. With a dedica: auto-filter + manual demo review.
    status: !dedica.trim() && !firma.trim() ? "approved" : flagged ? "rejected" : "pending",
    createdAt: Date.now(),
    mine: true,
  };
  write([...list, o]);
  return o;
}

export function moderate(id: number, status: "approved" | "rejected") {
  write(read().map((o) => (o.id === id ? { ...o, status } : o)));
}
export function resetDemo() { write([]); }

export function useTreeStore() {
  const [list, setList] = useState<StoredOrnament[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync); // other tabs (e.g. TV tab)
    const t = setInterval(sync, 5000);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); clearInterval(t); };
  }, []);
  // Public view: only approved dedicas are shown; pending ones show as plain ornaments without text.
  const publicOrnaments: TreeOrnament[] = [
    ...TREE_ORNAMENTS,
    ...list.filter((o) => o.status !== "rejected").map((o) => (o.status === "approved" ? o : { id: o.id, kind: o.kind, x: o.x, y: o.y })),
  ];
  return { list, publicOrnaments, total: MOCK_TOTAL_GIFTS + list.length };
}
