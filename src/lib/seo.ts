import type { Project } from './data';

export const SEO_ORIGIN = 'https://natale.crimonza.org';
export const SEO_SHARE_IMAGE = `${SEO_ORIGIN}/og-natale-cri-monza.png`;
export const PUBLIC_SEO = {
  '/': {
    title: 'Natale 2026 Croce Rossa Monza | Regali solidali',
    description: 'Il Natale che fa bene: regali solidali e donazioni online da 5 € a Croce Rossa Monza. Dedica una pallina sull’albero e scopri la casetta in Piazza San Paolo.',
    name: 'Il Natale che fa bene',
  },
  '/regali': {
    title: 'Regali solidali Natale 2026 a Monza | Croce Rossa',
    description: 'Scegli tra quattro progetti di Croce Rossa Monza e fai un regalo solidale da 5 €. Una donazione, una pallina digitale e una cartolina da condividere.',
    name: 'Regali solidali',
  },
  '/albero': {
    title: 'Albero di Monza: regali e dediche | Natale Croce Rossa',
    description: 'Scopri l’Albero di Monza di Croce Rossa: ogni donazione aggiunge una pallina digitale. Leggi le dediche pubbliche e regala un gesto solidale da 5 €.',
    name: 'Albero di Monza',
  },
  '/casetta': {
    title: 'Casetta di Natale a Monza | Regali solidali Croce Rossa',
    description: 'La casetta di Croce Rossa Monza in Piazza San Paolo, dal 21 novembre al 6 gennaio: panettone, pandoro, riso e tisane. Vendita solo alla casetta.',
    name: 'Casetta di Natale',
  },
  '/calendario': {
    title: 'Calendario dell’Avvento – Calendario della Gentilezza | Croce Rossa Monza',
    description: 'Il Calendario della Gentilezza è il calendario dell’Avvento di Croce Rossa Monza: apri ogni giorno una delle 24 finestrelle della sede natalizia e scopri un gesto gentile.',
    name: 'Calendario dell’Avvento · Calendario della Gentilezza',
  },
  '/piccoli-volontari': {
    title: 'Accademia dei Piccoli Volontari | Natale CRI Monza',
    description: 'Tre missioni digitali di gentilezza e sicurezza per bambini dai 6 ai 12 anni, con Croce Rossa Monza. Impara ad aiutare e scarica il diploma sul tuo dispositivo.',
    name: 'Accademia dei Piccoli Volontari',
  },
  '/privacy': {
    title: 'Privacy e dati personali | Il Natale che fa bene – CRI Monza',
    description: 'Informativa della campagna Natale Croce Rossa Monza: donazioni, dediche pubbliche, cartoline ed email. Scopri l’uso dei dati e i tuoi diritti.',
    name: 'Informativa sulla privacy',
  },
} as const;

type PageSEO = { title: string; description: string; name: string };
type Crumb = { name: string; path: string };
const homeCrumb: Crumb = { name: 'Il Natale che fa bene', path: '/' };

export function seoHead(path: string, page: PageSEO, options: { image?: boolean; breadcrumbs?: Crumb[] } = {}) {
  const url = `${SEO_ORIGIN}${path}`;
  const graph: Record<string, unknown>[] = [{
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title,
    description: page.description, inLanguage: 'it-IT',
    isPartOf: { '@id': `${SEO_ORIGIN}/#website` },
    about: { '@id': `${SEO_ORIGIN}/#organization` },
  }];
  if (path === '/') {
    graph.push({ '@type': 'NGO', '@id': `${SEO_ORIGIN}/#organization`,
      name: 'Croce Rossa Italiana – Comitato di Monza', url: 'https://www.crimonza.org/' });
    graph.push({ '@type': 'WebSite', '@id': `${SEO_ORIGIN}/#website`, url,
      name: 'Il Natale che fa bene – Croce Rossa Monza', inLanguage: 'it-IT',
      publisher: { '@id': `${SEO_ORIGIN}/#organization` } });
  } else {
    const crumbs = options.breadcrumbs ?? [homeCrumb, { name: page.name, path }];
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem', position: index + 1, name: crumb.name, item: `${SEO_ORIGIN}${crumb.path}`,
    })) });
  }
  return {
    meta: [
      { title: page.title }, { name: 'description', content: page.description },
      { property: 'og:title', content: page.title }, { property: 'og:description', content: page.description },
      { property: 'og:type', content: 'website' }, { property: 'og:url', content: url },
      { name: 'twitter:card', content: options.image ? 'summary_large_image' : 'summary' },
      ...(options.image ? [
        { property: 'og:image', content: SEO_SHARE_IMAGE }, { name: 'twitter:image', content: SEO_SHARE_IMAGE },
        { property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Il Natale che fa bene · Croce Rossa Italiana, Comitato di Monza' },
      ] : []),
    ],
    links: [{ rel: 'canonical', href: url }],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') }],
  };
}

const projectDescriptions: Record<string, string> = {
  calore: 'Regala calore a Natale: dona da 5 € per sostenere le uscite in strada di Croce Rossa Monza, con ascolto e beni di conforto per chi è in difficoltà.',
  battito: 'Regala un battito a Natale: dona da 5 € a Croce Rossa Monza per sostenere defibrillatori e cultura del soccorso. Dedica una pallina sull’albero digitale.',
  prossimita: 'Regala prossimità a Natale: sostieni da 5 € il progetto di acquisto e allestimento dell’Unità Mobile di Prossimità di Croce Rossa Monza.',
  cuore: 'Dona da 5 € a Croce Rossa Monza dove serve di più: un regalo solidale di Natale per sostenere le attività del Comitato e i bisogni più urgenti.',
};

export function projectSeoHead(project: Project | undefined) {
  if (!project) return unavailableSeoHead();
  const path = `/regali/${project.id}`;
  return seoHead(path, {
    title: `${project.title} | Regalo solidale Natale – CRI Monza`,
    description: projectDescriptions[project.id] ?? project.intro, name: project.title,
  }, { image: true, breadcrumbs: [homeCrumb, { name: 'Regali solidali', path: '/regali' }, { name: project.title, path }] });
}

export function unavailableSeoHead() {
  return { meta: [
    { title: 'Pagina non disponibile | Natale CRI Monza' },
    { name: 'description', content: 'La pagina richiesta non è disponibile.' },
    { property: 'og:title', content: 'Pagina non disponibile | Natale CRI Monza' },
    { property: 'og:description', content: 'La pagina richiesta non è disponibile.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
  ] };
}