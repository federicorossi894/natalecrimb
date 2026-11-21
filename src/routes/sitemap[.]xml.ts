import { createFileRoute } from '@tanstack/react-router';
import { getRouterInstance } from '@tanstack/react-start';
import { PROJECTS } from '@/lib/data';
import { SEO_ORIGIN } from '@/lib/seo';
import { isSitemapRouteIncluded, sitemapStaticPaths, sitemapPathForLocation, sitemapXML } from '@/lib/sitemap';

export const Route = createFileRoute('/sitemap.xml')({
  staticData: { sitemap: false },
  server: { handlers: { GET: async () => {
    const router = await getRouterInstance();
    const entries = sitemapStaticPaths(router).map(path => ({ path }));
    const routeId = '/regali/$id';
    if (isSitemapRouteIncluded(router.routesById[routeId])) {
      for (const project of PROJECTS) {
        const location = router.buildLocation({ to: '/regali/$id', params: { id: project.id }, search: () => ({}), hash: '' });
        const path = sitemapPathForLocation(router, location, routeId);
        if (path) entries.push({ path });
      }
    }
    if (!entries.length) return new Response('No public pages included', { status: 404 });
    return new Response(sitemapXML(SEO_ORIGIN, entries), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  } } },
});