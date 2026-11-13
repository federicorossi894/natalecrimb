import { CAMPAIGN, campaignRouteAllowed } from "@/lib/campaign";
import { qaRouteAllowed } from "@/lib/qa-route-policy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  notFound,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { resetPageScroll } from "@/lib/reset-page-scroll";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Pagina non disponibile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina che cerchi non è disponibile.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location }) => { if (!campaignRouteAllowed(location.pathname) || !qaRouteAllowed(location.pathname)) throw notFound(); },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Il Natale che fa bene – Croce Rossa Monza" },
      { name: "description", content: CAMPAIGN.demo ? "Demo della campagna natalizia di Croce Rossa Italiana – Comitato di Monza." : "Campagna natalizia di Croce Rossa Italiana – Comitato di Monza." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:locale", content: "it_IT" },
      { property: "og:site_name", content: "Il Natale che fa bene · CRI Monza" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Manrope:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap" },
      { rel: "icon", href: "/favicon.ico?v=20261108", type: "image/x-icon" },
      { rel: "icon", href: "/favicon-32.png?v=20261108", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/favicon-180.png?v=20261108", sizes: "180x180" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ScrollToTopOnNavigation() {
  const pathname = useRouterState({ select: state => state.location.pathname });
  useEffect(() => {
    resetPageScroll();
    // Safari may restore an old scroll position during the same frame;
    // reassert top once the new page layout is ready.
    const frame = window.requestAnimationFrame(resetPageScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTopOnNavigation />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
