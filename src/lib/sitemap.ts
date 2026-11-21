/** Route flags retained for explicit public/private SEO inventory.
 * The production sitemap is a static XML asset, so no router server handler
 * can accidentally include payment, QA, preview or donor-specific URLs.
 */
import type { AnyRoute } from '@tanstack/react-router';
export type SitemapRoute = AnyRoute;
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    sitemap: boolean | 'exclude-subtree';
  }
}
