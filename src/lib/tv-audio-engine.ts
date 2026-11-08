import type { TvTrack } from './tv-audio-manifest';
import { AudioBag, AUDIO_CROSSFADE_SECONDS, type TvAudioEvent } from './tv-audio-policy';

/** Browser APIs only inside constructor/methods called from the user's click. */
export class TvAudioEngine {
  readonly context: AudioContext;
  readonly master: GainNode;
  private music: GainNode;
  private decks: { el: HTMLAudioElement; source: MediaElementAudioSourceNode; gain: GainNode }[];
  private bag: AudioBag;
  private failed = new Set<string>();
  private timer: ReturnType<typeof setInterval>;
  private current = 0;
  private starting = false;
  private enabled = false;
  private disposed = false;
  private fadedUntil = 0;
  private oscillators = new Set<OscillatorNode>();
  private trackIds: (string | undefined)[] = [];
  private loadAt: number[] = [];
  onBlocked: (() => void) | undefined;
  onUnavailable: (() => void) | undefined;
  constructor(private tracks: readonly TvTrack[]) {
    const Browser = window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Constructor = Browser.AudioContext ?? Browser.webkitAudioContext;
    if (!Constructor) throw new Error('Web Audio unavailable');
    this.context = new Constructor();
    this.master = this.context.createGain(); this.master.gain.value = 0;
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -16; limiter.knee.value = 12; limiter.ratio.value = 6;
    this.master.connect(limiter); limiter.connect(this.context.destination);
    this.music = this.context.createGain(); this.music.gain.value = 0.24; this.music.connect(this.master);
    this.decks = Array.from({ length: 2 }, () => {
      const el = new Audio(); el.preload = 'auto';
      const source = this.context.createMediaElementSource(el), gain = this.context.createGain();
      gain.gain.value = 0; source.connect(gain); gain.connect(this.music);
      return { el, source, gain };
    });
    this.bag = new AudioBag(tracks.map(t => t.id));
    this.decks.forEach((deck, index) => {
      deck.el.onended = () => {
        if (!this.enabled || this.disposed || index !== this.current) return;
        this.current = 1 - this.current;
        this.fadedUntil = 0;
        this.start();
      };
    });
    this.timer = setInterval(() => this.tick(), 250);
  }
  /** Invoke resume synchronously in the click stack, not after importing/fetching. */
  activate() {
    this.enabled = true;
    const resume = this.context.resume();
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.7, this.context.currentTime, 0.3);
    void resume.then(() => { if (!this.disposed && this.enabled) this.start(); }).catch(() => this.onBlocked?.());
  }
  private load(index: number) {
    const id = this.bag.next(this.failed), track = this.tracks.find(t => t.id === id), deck = this.decks[index];
    if (!deck || !track) return false;
    deck.el.onerror = null;
    deck.el.pause(); deck.el.removeAttribute('src'); deck.el.load();
    this.trackIds[index] = track.id;
    this.loadAt[index] = performance.now();
    deck.el.src = track.src;
    deck.el.onerror = () => {
      this.failed.add(track.id); this.trackIds[index] = undefined;
      deck.el.onerror = null;
      deck.el.pause(); deck.el.removeAttribute('src'); deck.el.load();
      if (this.failed.size >= this.tracks.length) this.onUnavailable?.();
      else if (index === this.current) { this.load(index); this.start(); }
      else this.load(index);
    };
    deck.el.load();
    return true;
  }
  private start() {
    if (!this.enabled || this.disposed || !this.tracks.length) return;
    const deck = this.decks[this.current]; if (!deck) return;
    if (!this.trackIds[this.current] && !this.load(this.current)) return;
    deck.gain.gain.setValueAtTime(1, this.context.currentTime);
    void deck.el.play().then(() => {
      const next = 1 - this.current;
      if (!this.trackIds[next]) this.load(next);
    }).catch(() => { if (this.enabled && !this.disposed) this.onBlocked?.(); });
  }
  private tick() {
    if (!this.enabled || this.disposed || this.starting) return;
    this.decks.forEach((deck, index) => {
      if (this.trackIds[index] && deck.el.readyState < 3 && performance.now() - (this.loadAt[index] ?? 0) > 15000) deck.el.onerror?.(new Event('error'));
    });
    if (this.fadedUntil && this.context.currentTime >= this.fadedUntil) {
      this.fadedUntil = 0;
      const old = 1 - this.current, deck = this.decks[old];
      if (deck) { deck.el.pause(); deck.gain.gain.setValueAtTime(0, this.context.currentTime); }
      this.trackIds[old] = undefined;
      this.load(old);
    }
    const a = this.decks[this.current], next = 1 - this.current, b = this.decks[next];
    if (!a || !b || !this.trackIds[next] || !Number.isFinite(a.el.duration) || a.el.paused) return;
    if (a.el.duration - a.el.currentTime > AUDIO_CROSSFADE_SECONDS || this.context.currentTime < this.fadedUntil) return;
    if (b.el.readyState < 3) return; // visual TV never waits for buffering
    this.starting = true;
    void b.el.play().then(() => {
      this.starting = false;
      if (!this.enabled || this.disposed) { b.el.pause(); return; }
      const at = this.context.currentTime;
      a.gain.gain.cancelScheduledValues(at); a.gain.gain.setValueAtTime(1, at); a.gain.gain.linearRampToValueAtTime(0, at + 4);
      b.gain.gain.cancelScheduledValues(at); b.gain.gain.setValueAtTime(0, at); b.gain.gain.linearRampToValueAtTime(1, at + 4);
      this.current = next; this.fadedUntil = at + 4;
    }).catch(() => { this.starting = false; this.onBlocked?.(); });
  }
  private tone(frequency: number, delay: number, seconds: number, level = 0.035) {
    if (!this.enabled || this.context.state !== 'running' || this.oscillators.size >= 12) return;
    const at = this.context.currentTime + delay, osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = 'sine'; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
    osc.connect(gain); gain.connect(this.master); this.oscillators.add(osc);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.oscillators.delete(osc); };
    osc.start(at); osc.stop(at + seconds + 0.03);
  }
  effect(event: TvAudioEvent) {
    if (!this.enabled) return;
    if (event.type === 'arrival') [1046.5, 1568, 2093].forEach((f, i) => this.tone(f, i * 0.12, 0.9, 0.023));
    else if (event.type === 'dedication') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, i * 0.2, 1.4, 0.025));
    else if(event.type==='wish') { this.tone(1800,0.7,0.065,0.035); this.tone(850,0.73,0.09,0.025); }
    else {
      const at = this.context.currentTime;
      this.music.gain.cancelScheduledValues(at); this.music.gain.setTargetAtTime(0.065, at, 0.35);
      if (event.phase === 'lit') [261.63, 392, 523.25].forEach(f => this.tone(f, 0, 3, 0.018));
      if (event.phase === 'focus') [659.25, 783.99].forEach((f, i) => this.tone(f, i * 0.3, 3, 0.022));
      if (event.phase === 'open') [783.99, 1046.5, 1318.5, 1568].forEach((f, i) => this.tone(f, i * 0.14, 1.6, 0.028));
      if (event.phase === 'message') [261.63, 329.63, 392].forEach(f => this.tone(f, 0, 14, 0.012));
      if (event.phase === 'out') [523.25, 783.99].forEach(f => this.tone(f, 0, 1.4, 0.009));
    }
  }
  endCeremony() { const at = this.context.currentTime; this.music.gain.cancelScheduledValues(at); this.music.gain.setTargetAtTime(0.24, at, 1); }
  stopEffects() { this.oscillators.forEach(o => { try { o.stop(); } catch { /* already ended */ } }); }
  silence() {
    this.enabled = false;
    this.master.gain.cancelScheduledValues(this.context.currentTime); this.master.gain.setValueAtTime(0, this.context.currentTime);
    this.decks.forEach(d => d.el.pause());
    this.stopEffects();
    void this.context.suspend().catch(() => {});
  }
  dispose() {
    this.disposed = true; this.silence(); clearInterval(this.timer);
    this.decks.forEach(d => { d.el.onerror = null; d.el.onended = null; d.el.removeAttribute('src'); d.el.load(); d.source.disconnect(); d.gain.disconnect(); });
    this.music.disconnect(); this.master.disconnect(); void this.context.close().catch(() => {});
  }
}