import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Shown if a page takes a moment to load, so the previous page never lingers under the new address. */
function RoutePending() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <p className="font-display text-xl text-gold">Un attimo…</p>
    </div>
  );
}

let preloadGuard = false;

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // Each new page and checkout step begins at the top. Do not restore a stale iOS offset.
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 300,
    defaultPendingMinMs: 0,
  });

  // A page chunk that fails to download (new deploy, flaky network, dev re-optimisation) would otherwise leave
  // the old page visible under the new URL: load the requested address fresh instead.
  if (typeof window !== "undefined" && !preloadGuard) {
    preloadGuard = true;
    window.addEventListener("vite:preloadError", (e) => {
      e.preventDefault();
      window.location.reload();
    });
  }

  return router;
};
