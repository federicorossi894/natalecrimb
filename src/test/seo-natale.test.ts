import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PROJECTS } from '@/lib/data';
import { PUBLIC_SEO, SEO_ORIGIN, SEO_SHARE_IMAGE, projectSeoHead, seoHead } from '@/lib/seo';

const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');
const robots = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8');
const routes = Object.keys(PUBLIC_SEO);
const giftRoutes = PROJECTS.map(project => `/regali/${project.id}`);
const publicRoutes = [...routes, ...giftRoutes];

describe('Christmas campaign search visibility', () => {
  it('exposes only the canonical public routes in the static sitemap', () => {
    expect(sitemap).toMatch(/^<\\?xml version="1.0" encoding="UTF-8"\\?>/);
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(match => match[1]);
    expect(locations).toHaveLength(publicRoutes.length);
    expect(new Set(locations).size).toBe(locations.length);
    expect(locations.sort()).toEqual(publicRoutes.map(path => `${SEO_ORIGIN}${path}`).sort());
    expect(locations.every(url => url.startsWith(SEO_ORIGIN) && !/[?#]/.test(url))).toBe(true);
    expect(sitemap).not.toMatch(/pagamento|collaudo|email-qa|tv-preview|moderazione|volontari|augurio|api\\//i);
    expect(robots).toContain(`Sitemap: ${SEO_ORIGIN}/sitemap.xml`);
  });

  it('sets unique, local, canonical metadata for every indexed page', () => {
    for (const path of routes) {
      const page = PUBLIC_SEO[path as keyof typeof PUBLIC_SEO];
      const head = seoHead(path, page, { image: true });
      const canonical = `${SEO_ORIGIN}${path}`;
      expect(head.links).toEqual([{ rel: 'canonical', href: canonical }]);
      expect(head.meta).toContainEqual({ title: page.title });
      expect(head.meta).toContainEqual({ name: 'description', content: page.description });
      expect(head.meta).toContainEqual({ property: 'og:url', content: canonical });
      expect(head.meta).toContainEqual({ property: 'og:image', content: SEO_SHARE_IMAGE });
      expect(page.description).toMatch(/Monza/i);
      const script = head.scripts[0];
      expect(script.type).toBe('application/ld+json');
      const data = JSON.parse(script.children);
      expect(data['@context']).toBe('https://schema.org');
      expect(data['@graph'][0].url).toBe(canonical);
      expect(data['@graph'].some((node: { '@type': string }) => node['@type'] === 'WebPage')).toBe(true);
    }
  });

  it('publishes NGO and WebSite only on the homepage, with valid breadcrumbs elsewhere', () => {
    const home = JSON.parse(seoHead('/', PUBLIC_SEO['/']).scripts[0].children)['@graph'];
    expect(home.map((node: { '@type': string }) => node['@type'])).toEqual(['WebPage', 'NGO', 'WebSite']);
    const gift = projectSeoHead(PROJECTS[0]);
    const graph = JSON.parse(gift.scripts![0]!.children)['@graph'];
    const crumbs = graph.find((node: { '@type': string }) => node['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(3);
    expect(crumbs.itemListElement[2].item).toBe(`${SEO_ORIGIN}/regali/${PROJECTS[0].id}`);
  });

  it('does not index an unknown gift project', () => {
    const head = projectSeoHead(undefined);
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow, noarchive' });
    expect('links' in head).toBe(false);
  });
});
