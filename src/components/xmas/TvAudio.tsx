import { useEffect, useRef, useState } from 'react';
import { VolumeX } from 'lucide-react';
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
  const ready = catalogueReady(TV_TRACKS);
  const previousCeremony = useRef(false);

  useEffect(() => {
    const visible = () => {
      if (document.hidden) engine.current?.silence();
      else if (consent.current && engine.current) {
        try { engine.current.activate(); }
        catch { consent.current = false; setActive(false); setNotice('Audio bloccato. Riprova.'); }
      }
    };
    document.addEventListener('visibilitychange', visible);
    return () => { document.removeEventListener('visibilitychange', visible); engine.current?.dispose(); engine.current = null; };
  }, []);
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

  const activate = () => {
    try {
      // Synchronous user gesture: no async import, network or storage precedes resume().
      if (!engine.current) engine.current = new TvAudioEngine(ready ? TV_TRACKS : []);
      engine.current.onBlocked = () => { consent.current = false; engine.current?.silence(); setActive(false); setNotice('Audio bloccato. Riprova.'); };
      engine.current.onUnavailable = () => { consent.current = false; engine.current?.silence(); setActive(false); setNotice('Audio non disponibile. Riprova.'); };
      const context = engine.current.context;
      context.onstatechange = () => {
        if (consent.current && context.state === 'running') { setActive(true); setNotice(''); }
      };
      consent.current = true; engine.current.activate();
      if (context.state === 'running') setActive(true);
      setNotice('');
      try { localStorage.setItem('cri-tv-audio-preference', 'on'); } catch { /* never auto-resume on a new page */ }
    } catch { consent.current = false; setActive(false); setNotice('Audio non disponibile su questo browser'); }
  };
  if (active) return null;
  return <div className="tv-audio" data-testid="tv-audio" data-audio="silent">
    <Button className="tv-audio-button" variant="outline" onClick={activate} aria-label="Attiva audio">
      <VolumeX aria-hidden />
      <span>Attiva audio</span>
    </Button>
    {notice && <span className="tv-audio-status" role="status">{notice}</span>}
  </div>;
}