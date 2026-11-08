import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isVolunteerHost } from "./lib/volunteer-host";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

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
  if (isVolunteerHost(url.hostname) && url.pathname === "/") {
    return Response.redirect(new URL("/volontari", url), 302);
  }
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [volunteerHostMiddleware, errorMiddleware, csrfMiddleware],
}));
