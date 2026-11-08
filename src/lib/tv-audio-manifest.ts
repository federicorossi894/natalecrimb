import audio0 from '../../public/audio/tv/usuan1100391.mp3.asset.json';
import audio1 from '../../public/audio/tv/usuan1100891.mp3.asset.json';
import audio2 from '../../public/audio/tv/usuan1100718.mp3.asset.json';
import audio3 from '../../public/audio/tv/usuan1100307.mp3.asset.json';
import audio4 from '../../public/audio/tv/usuan1100263.mp3.asset.json';
import audio5 from '../../public/audio/tv/usuan1100191.mp3.asset.json';
import audio6 from '../../public/audio/tv/usuan1100188.mp3.asset.json';
import audio7 from '../../public/audio/tv/usuan1100127.mp3.asset.json';
import audio8 from '../../public/audio/tv/usuan1100075.mp3.asset.json';
import audio9 from '../../public/audio/tv/usuan1100012.mp3.asset.json';
import audio10 from '../../public/audio/tv/usuan1100799.mp3.asset.json';
import audio11 from '../../public/audio/tv/usuan1100516.mp3.asset.json';
import audio12 from '../../public/audio/tv/usuan1100232.mp3.asset.json';
import audio13 from '../../public/audio/tv/usuan1200093.mp3.asset.json';
import audio14 from '../../public/audio/tv/usuan1100270.mp3.asset.json';
/** Official CC BY recordings, normalized and stored through project static assets. */
export type TvTrack = {
  id: string; title: string; artist: string; seconds: number; src: string;
  atmosphere: 'night' | 'market' | 'joy' | 'snow';
  source: string; license: string; checkedOn: string;
};
export const TV_TRACKS: readonly TvTrack[] = [
  { id: "USUAN1100391", title: "Wish Background", artist: 'Kevin MacLeod', seconds: 1174.073, src: audio0.url, atmosphere: 'night', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100391", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100891", title: "Angels We Have Heard on High", artist: 'Kevin MacLeod', seconds: 244.062, src: audio1.url, atmosphere: 'snow', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100891", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100718", title: "Silver Blue Light", artist: 'Kevin MacLeod', seconds: 350.064, src: audio2.url, atmosphere: 'night', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100718", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100307", title: "Oh, Little Town of Bethlehem", artist: 'Kevin MacLeod', seconds: 106.527, src: audio3.url, atmosphere: 'snow', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100307", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100263", title: "Deck the Halls A", artist: 'Kevin MacLeod', seconds: 247.484, src: audio4.url, atmosphere: 'market', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100263", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100191", title: "It Came Upon a Midnight Clear", artist: 'Kevin MacLeod', seconds: 265.561, src: audio5.url, atmosphere: 'snow', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100191", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100188", title: "Jingle Bells (Calm)", artist: 'Kevin MacLeod', seconds: 142.028, src: audio6.url, atmosphere: 'joy', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100188", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100127", title: "Oh Holy Night", artist: 'Kevin MacLeod', seconds: 242.129, src: audio7.url, atmosphere: 'snow', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100127", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100075", title: "Silent Night", artist: 'Kevin MacLeod', seconds: 131.213, src: audio8.url, atmosphere: 'night', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100075", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100012", title: "What Child is This", artist: 'Kevin MacLeod', seconds: 139.86, src: audio9.url, atmosphere: 'night', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100012", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100799", title: "Enchanted Journey", artist: 'Kevin MacLeod', seconds: 269.558, src: audio10.url, atmosphere: 'night', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100799", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100516", title: "Frost Waltz", artist: 'Kevin MacLeod', seconds: 135.471, src: audio11.url, atmosphere: 'market', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100516", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100232", title: "Fairytale Waltz", artist: 'Kevin MacLeod', seconds: 99.265, src: audio12.url, atmosphere: 'market', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100232", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1200093", title: "Enchanted Valley", artist: 'Kevin MacLeod', seconds: 190.276, src: audio13.url, atmosphere: 'joy', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200093", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
  { id: "USUAN1100270", title: "Dance of the Sugar Plum Fairies", artist: 'Kevin MacLeod', seconds: 106.344, src: audio14.url, atmosphere: 'joy', source: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100270", license: 'CC BY 4.0', checkedOn: '2026-11-08' },
];
export const TV_AUDIO_CLEARANCE = { embeddedFiles: true, venue: false };
export const uniqueSeconds = (tracks: readonly TvTrack[]) => tracks.reduce((s, t) => s + t.seconds, 0);
export function catalogueReady(tracks: readonly TvTrack[], clearance = TV_AUDIO_CLEARANCE) {
  return clearance.embeddedFiles && tracks.length >= 15 && uniqueSeconds(tracks) >= 3600
    && new Set(tracks.map(t => t.id)).size === tracks.length
    && tracks.every(t => t.seconds > 0 && t.source.startsWith('https://') && t.license && t.checkedOn && (t.src.startsWith('/audio/tv/') || t.src.startsWith('/__l5e/assets-v1/')));
}