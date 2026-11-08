/** Shuffle bag: every available track once before refill, never same at cycle seam. */
export class AudioBag {
  private bag: string[] = [];
  private last: string | null = null;
  constructor(private ids: readonly string[], private random: () => number = Math.random) {}
  next(excluded: ReadonlySet<string> = new Set()): string | undefined {
    const available = this.ids.filter(id => !excluded.has(id));
    if (!available.length) return;
    this.bag = this.bag.filter(id => available.includes(id));
    if (!this.bag.length) {
      this.bag = [...available];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        const a = this.bag[i], b = this.bag[j];
        if (a !== undefined && b !== undefined) { this.bag[i] = b; this.bag[j] = a; }
      }
      const end = this.bag.length - 1;
      if (this.bag[end] === this.last && end > 0) {
        const a = this.bag[0], b = this.bag[end];
        if (a !== undefined && b !== undefined) { this.bag[0] = b; this.bag[end] = a; }
      }
    }
    const id = this.bag.pop();
    this.last = id ?? null;
    return id;
  }
}
export const AUDIO_CROSSFADE_SECONDS = 4;
export type TvAudioEvent = { type: 'arrival' | 'dedication'; key: string } | { type: 'ceremony'; key: string; phase: string };
/** Tiny bounded event gate. No retained dedications, no replay on consent/visibility. */
export class AudioEventGate {
  private last = new Map<string, string>();
  private lastArrival = -Infinity;
  accept(event: TvAudioEvent, now: number, audible: boolean) {
    const channel = event.type;
    const token = event.type === 'ceremony' ? `${event.key}:${event.phase}` : event.key;
    if (this.last.get(channel) === token) return false;
    this.last.set(channel, token);
    if (!audible) return false;
    if (channel === 'arrival') {
      if (now - this.lastArrival < 8000) return false;
      this.lastArrival = now;
    }
    return true;
  }
}