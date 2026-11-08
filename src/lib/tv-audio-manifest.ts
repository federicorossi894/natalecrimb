/** No placeholder audio: add only actually acquired, individually checked, normalized files. */
export type TvTrack = {
  id: string; title: string; artist: string; seconds: number; src: string;
  atmosphere: 'night' | 'market' | 'joy' | 'snow';
  source: string; license: string; checkedOn: string;
};
export const TV_TRACKS: readonly TvTrack[] = [];
export const TV_AUDIO_CLEARANCE = { embeddedFiles: false, venue: false };
export const uniqueSeconds = (tracks: readonly TvTrack[]) => tracks.reduce((s, t) => s + t.seconds, 0);
export function catalogueReady(tracks: readonly TvTrack[], clearance = TV_AUDIO_CLEARANCE) {
  return clearance.embeddedFiles && clearance.venue && tracks.length >= 15 && uniqueSeconds(tracks) >= 3300
    && new Set(tracks.map(t => t.id)).size === tracks.length
    && tracks.every(t => t.seconds > 0 && t.source.startsWith('https://') && t.license && t.checkedOn && t.src.startsWith('/audio/tv/'));
}