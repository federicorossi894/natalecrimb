import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TV_TRACKS, catalogueReady } from '@/lib/tv-audio-manifest';
import { AudioEventGate, type TvAudioEvent } from '@/lib/tv-audio-policy';
import { TvAudioEngine } from '@/lib/tv-audio-engine';

export type TvAudioCue = { arrival: string | null; dedication: string | null; wish?: string|null; ceremony: { key: string; phase: string } | null };
export function TvAudio({ cue }: { cue: TvAudioCue }) {
  const engine = useRef<TvAudioEngine | null>(null);
  const gate = useRef(new AudioEventGate());
  const consent = useRef(false);
  const [active, setActive] = useState(false);
  const [notice, setNotice] = useState('');
  const [compact, setCompact] = useState(false);
  const ready = catalogueReady(TV_TRACKS);
  const previousCeremony = useRef(false);

  useEffect(() => {
    const visible = () => {
      if (document.hidden) engine.current?.silence();
      else if (consent.current && engine.current) engine.current.activate();
    };
    document.addEventListener('visibilitychange', visible);
    return () => { document.removeEventListener('visibilitychange', visible); engine.current?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => {
    if (!active) { setCompact(false); return; }
    const timer = setTimeout(() => setCompact(true), 7000);
    return () => clearTimeout(timer);
  }, [active]);
  // Cue changes alone trigger sounds. Enabling/returning to the tab never replays a current beat.
  useEffect(() => {
    const audible = consent.current && !document.hidden;
    // Revocation, scene interruption and priority changes must stop the old tail, not merely prevent new notes.
    engine.current?.stopEffects();
    const send = (event: TvAudioEvent) => {
      if (gate.current.accept(event, performance.now(), audible)) engine.current?.effect(event);
    };
    if (cue.ceremony) send({ type: 'ceremony', ...cue.ceremony });
    else {
      if (previousCeremony.current) engine.current?.endCeremony();
      if (cue.arrival) send({ type: 'arrival', key: cue.arrival });
      else if(cue.wish) send({type:'wish',key:cue.wish});
      else if (cue.dedication) send({ type: 'dedication', key: cue.dedication });
    }
    previousCeremony.current = !!cue.ceremony;
  }, [cue.arrival, cue.dedication, cue.wish, cue.ceremony?.key, cue.ceremony?.phase]);

  const toggle = () => {
    if (active) {
      consent.current = false; engine.current?.silence(); setActive(false);
      try { localStorage.setItem('cri-tv-audio-preference', 'off'); } catch { /* optional preference */ }
      return;
    }
    try {
      // Synchronous user gesture: no async import, network or storage precedes resume().
      if (!engine.current) engine.current = new TvAudioEngine(ready ? TV_TRACKS : []);
      engine.current.onBlocked = () => { consent.current = false; engine.current?.silence(); setActive(false); setNotice('Tocca per riattivare audio'); };
      engine.current.onUnavailable = () => setNotice('Musica non disponibile · effetti attivi');
      consent.current = true; engine.current.activate(); setActive(true); setNotice('');
      try { localStorage.setItem('cri-tv-audio-preference', 'on'); } catch { /* never auto-resume on a new page */ }
    } catch { consent.current = false; setActive(false); setNotice('Audio non disponibile su questo browser'); }
  };
  return <div className={`tv-audio ${compact ? 'is-compact' : ''}`} data-testid="tv-audio" data-audio={active ? 'enabled' : 'silent'}>
    <Button className="tv-audio-button" variant="outline" onClick={toggle} aria-label={active ? 'Disattiva audio' : 'Attiva audio'} title={active ? 'Disattiva audio' : 'Attiva audio'}>
      {active ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
      <span>{active ? ready ? 'Audio attivo' : 'Effetti attivi' : 'Attiva audio'}</span>
    </Button>
    {!ready && <span className="tv-audio-status" role="status">Musica in preparazione</span>}
    {notice && <span className="tv-audio-status" role="status">{notice}</span>}
  </div>;
}