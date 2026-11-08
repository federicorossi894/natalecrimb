import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old games page now lives inside the kids' academy: keep the URL working with a permanent redirect. */
export const Route = createFileRoute("/giochi")({
  head: () => ({ meta: [
    { title: "Giochi solidali – Accademia CRI Monza" },
    { name: "description", content: "Le missioni dei piccoli aiutanti di Croce Rossa Italiana – Comitato di Monza." },
    { property: "og:title", content: "Giochi solidali – Accademia CRI Monza" },
    { property: "og:description", content: "Tre missioni di gentilezza e un diploma per i piccoli aiutanti di Monza." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/piccoli-volontari", statusCode: 301 });
  },
});
