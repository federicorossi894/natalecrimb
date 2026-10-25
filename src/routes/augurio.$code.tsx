import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useMemo } from "react";
import { Shell, PageHead } from "@/components/xmas/Shell";
import { WishWriter } from "@/components/xmas/WishWall";
import { DEMO_WISH_CODE, createDemoWishApi, realWishApi } from "@/lib/wishes";

export const Route = createFileRoute("/augurio/$code")({
  head: () => ({
    meta: [
      { title: "Il tuo augurio · Muro degli Auguri – CRI Monza" },
      { name: "description", content: "Scrivi il tuo augurio per il Muro degli Auguri della casetta di Croce Rossa Italiana – Comitato di Monza." },
      { property: "og:title", content: "Il tuo augurio per Monza" },
      { property: "og:description", content: "Un biglietto personale per il Muro degli Auguri della casetta CRI in Piazza San Paolo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Augurio,
});

function Augurio() {
  const { code } = Route.useParams();
  const demo = code.toLowerCase().startsWith(DEMO_WISH_CODE);
  const api = useMemo(() => (demo ? createDemoWishApi() : realWishApi), [demo]);
  return (
    <Shell hidePiazzaPill>
      <PageHead kicker={demo ? "DEMO · Muro degli Auguri" : "Muro degli Auguri"} title={<>Il tuo augurio <em className="text-gold">per Monza</em></>} />
      <section className="mx-auto max-w-lg px-4 pb-10">
        <ClientOnly fallback={<p className="py-10 text-center text-muted-foreground">Apro il tuo biglietto…</p>}>
          <WishWriter code={demo ? DEMO_WISH_CODE : code} api={api} demo={demo} />
        </ClientOnly>
      </section>
    </Shell>
  );
}
