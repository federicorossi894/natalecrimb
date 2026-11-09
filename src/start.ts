import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isVolunteerHost } from "./lib/volunteer-host";
import { experienceRouteAllowed, ONLINE_GIFT } from './lib/site-experience';
import { supabase } from '@/integrations/supabase/client';

// The public kiosk never waits for an account or storage. Other pages retain bearer attachment;
// storage failures mean signed-out, never authorization granted. Server checks remain authoritative.
const attachAppAuth = createMiddleware({ type: 'function' }).client(async ({ next }) => {
  if (window.location.pathname === '/albero-live' || window.location.pathname === '/tv-preview') return next();
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch { return next(); }
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// The dedicated volunteer host opens the portal at "/"; every other host is untouched.
const volunteerHostMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (!experienceRouteAllowed(url.pathname)) return Response.redirect(new URL('/', url), 302);
  if (!ONLINE_GIFT && isVolunteerHost(url.hostname) && url.pathname === "/") {
    return Response.redirect(new URL("/volontari", url), 302);
  }
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachAppAuth],
  requestMiddleware: [volunteerHostMiddleware, errorMiddleware, csrfMiddleware],
}));
