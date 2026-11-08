import { createFileRoute } from '@tanstack/react-router';
import { Shell, PageHead } from '@/components/xmas/Shell';
import { TV_TRACKS, uniqueSeconds } from '@/lib/tv-audio-manifest';

export const Route = createFileRoute('/crediti-musica')({
  head: () => ({ meta: [
    { title: 'Crediti musicali · Il Natale che fa bene – CRI Monza' },
    { name: 'description', content: 'Titoli, fonti e licenza della colonna sonora strumentale della TV natalizia CRI Monza.' },
    { property: 'og:title', content: 'Crediti musicali · Il Natale che fa bene – CRI Monza' },
    { property: 'og:description', content: 'Musiche di Kevin MacLeod, utilizzate con attribuzione CC BY 4.0.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Credits,
});
function duration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function Credits() {
  return <Shell hidePiazzaPill>
    <PageHead kicker="Colonna sonora" title="Crediti musicali">
      {TV_TRACKS.length} registrazioni diverse · {duration(uniqueSeconds(TV_TRACKS))} di musica strumentale.
    </PageHead>
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <p className="max-w-3xl leading-relaxed text-muted-foreground">Musiche di Kevin MacLeod (incompetech.com), con licenza <a className="text-gold underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">Creative Commons Attribution 4.0</a>. Registrazioni ricodificate e normalizzate per volume e picco; nessuna melodia riscritta. Fonti verificate l’8 novembre 2026. Nessuna affiliazione o approvazione del compositore è implicata.</p>
      <p className="mt-5 max-w-3xl leading-relaxed text-muted-foreground">Prima della diffusione pubblica alla casetta, il Comitato deve verificare gli obblighi applicabili SIAE e diritti connessi per queste registrazioni e rendere disponibili i crediti nel programma dell’iniziativa. La licenza CC BY non equivale a un’esenzione automatica. La prova tecnica DEMO non attesta tali adempimenti.</p>
      <ol className="mt-10 divide-y divide-border">
        {TV_TRACKS.map(track => <li key={track.id} className="py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="font-display text-2xl">{track.title}</h2><span className="text-gold">{duration(track.seconds)}</span></div>
          <p className="mt-2 text-sm text-muted-foreground">“{track.title}” Kevin MacLeod (incompetech.com) · ISRC {track.id}</p>
          <p className="mt-1 text-sm"><a className="text-gold underline" href={track.source} target="_blank" rel="noreferrer">Fonte ufficiale</a> · <a className="text-gold underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">Licensed under Creative Commons: By Attribution 4.0 License</a></p>
        </li>)}
      </ol>
    </section>
  </Shell>;
}