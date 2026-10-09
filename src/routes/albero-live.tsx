import { createFileRoute } from "@tanstack/react-router";
import { TreeTV } from "@/components/xmas/TreeTV";

export const Route = createFileRoute("/albero-live")({
  head: () => ({
    meta: [
      { title: "Albero di Monza · Modalità TV – CRI Monza" },
      { name: "description", content: "Modalità TV 16:9 dell'Albero dei Regali di Monza per lo schermo di Piazza San Paolo." },
      { property: "og:title", content: "Albero di Monza · Modalità TV" },
      { property: "og:description", content: "Anteprima a schermo intero per la casetta CRI in Piazza San Paolo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Live,
});

function Live() {
  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-background">
      <div className="w-full max-w-[calc(100vh*16/9)]">
        <TreeTV />
      </div>
    </div>
  );
}
