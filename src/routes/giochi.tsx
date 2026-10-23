import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old games page now lives inside the kids' academy: keep the URL working with a permanent redirect. */
export const Route = createFileRoute("/giochi")({
  beforeLoad: () => {
    throw redirect({ to: "/piccoli-volontari", statusCode: 301 });
  },
});
