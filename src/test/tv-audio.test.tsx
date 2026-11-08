import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioBag, AudioEventGate } from '@/lib/tv-audio-policy';
import { catalogueReady, TV_TRACKS, uniqueSeconds, type TvTrack } from '@/lib/tv-audio-manifest';
import { TvAudioEngine } from '@/lib/tv-audio-engine';
import { TvAudio } from '@/components/xmas/TvAudio';

const tracks: TvTrack[] = Array.from({length:18}, (_,i) => ({id:`t${i}`,title:`Synthetic test ${i}`,artist:'test only',seconds:240,src:`/audio/tv/test-${i}.mp3`,atmosphere:'night',source:'https://example.test/license',license:'test fixture',checkedOn:'2026-11-08'}));
let contexts: FakeContext[] = [], media: FakeMedia[] = [];
class Param { value=0; ramps: number[]=[]; cancelScheduledValues(){} setValueAtTime(v:number){this.value=v;} setTargetAtTime(v:number){this.value=v;} linearRampToValueAtTime(v:number){this.ramps.push(v);this.value=v;} exponentialRampToValueAtTime(v:number){this.value=v;} }
class Node { gain=new Param(); frequency=new Param(); threshold=new Param(); knee=new Param(); ratio=new Param(); type='sine'; onended:(()=>void)|null=null; connect(){} disconnect(){} start(){} stop(){this.onended?.();} }
class FakeContext {
  currentTime=0; state='suspended'; destination=new Node(); resumes=0; effects=0;
  constructor(){contexts.push(this);}
  createGain(){return new Node();} createDynamicsCompressor(){return new Node();} createMediaElementSource(){return new Node();}
  createOscillator(){this.effects++;return new Node();}
  resume(){this.resumes++;this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();} close(){this.state='closed';return Promise.resolve();}
}
class FakeMedia {
  src=''; preload=''; duration=240; currentTime=0; paused=true; readyState=4; onerror:((event?:Event)=>void)|null=null; onended:(()=>void)|null=null; plays=0;
  constructor(){media.push(this);}
  play(){this.paused=false;this.plays++;return Promise.resolve();} pause(){this.paused=true;} load(){this.currentTime=0;} removeAttribute(){this.src='';}
}
function setup(){contexts=[];media=[];vi.stubGlobal('AudioContext',FakeContext);vi.stubGlobal('Audio',FakeMedia);}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('TV audio safety and four-hour scheduler',()=>{
  it('keeps the actual zero-track catalogue unavailable, not disguised as complete music',()=>{
    expect(TV_TRACKS).toHaveLength(0);expect(uniqueSeconds(TV_TRACKS)).toBe(0);expect(catalogueReady(TV_TRACKS)).toBe(false);
    expect(catalogueReady(tracks,{embeddedFiles:true,venue:false})).toBe(false);
    expect(catalogueReady(tracks,{embeddedFiles:true,venue:true})).toBe(true);
    expect(catalogueReady(tracks.slice(0,12),{embeddedFiles:true,venue:true})).toBe(false);
  });
  it('plays 18 distinct tracks before refill, with no seam repeat over four virtual hours',()=>{
    let seed=98;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const bag=new AudioBag(tracks.map(t=>t.id),random);const played:string[]=[];
    for(let seconds=0;seconds<4*3600;seconds+=236){const id=bag.next();expect(id).toBeDefined();if(id)played.push(id);}
    for(let i=1;i<played.length;i++)expect(played[i]).not.toBe(played[i-1]);
    for(let i=0;i+18<=played.length;i+=18)expect(new Set(played.slice(i,i+18)).size).toBe(18);
  });
  it('skips unavailable files without selecting them again or looping when all fail',()=>{
    const bag=new AudioBag(['a','b','c'],()=>0.5);expect(bag.next(new Set(['a','b']))).toBe('c');expect(bag.next(new Set(['a','b','c']))).toBeUndefined();
  });
  it('never replays initial/hidden/muted events after consent and limits arrival bursts to eight seconds',()=>{
    const gate=new AudioEventGate();const initial={type:'arrival' as const,key:'existing-33'};
    expect(gate.accept(initial,0,false)).toBe(false);expect(gate.accept(initial,1,true)).toBe(false);
    expect(gate.accept({type:'arrival',key:'new-1'},1000,true)).toBe(true);
    expect(gate.accept({type:'arrival',key:'new-2'},2000,true)).toBe(false);
    expect(gate.accept({type:'arrival',key:'new-3'},9000,true)).toBe(true);
    expect(gate.accept({type:'dedication',key:'revoked'},10000,false)).toBe(false);
    expect(gate.accept({type:'dedication',key:'revoked'},10001,true)).toBe(false);
  });
  it('fires each actual ceremony phase once, not once per render or on muted phases',()=>{
    const gate=new AudioEventGate();for(const phase of ['dark','lit','focus','open','message','out']){
      const cue={type:'ceremony' as const,key:'dec-1',phase};expect(gate.accept(cue,100,true)).toBe(true);expect(gate.accept(cue,200,true)).toBe(false);
    }
    expect(gate.accept({type:'ceremony',key:'dec-2',phase:'lit'},300,false)).toBe(false);
  });
  it('creates no context before click, resumes synchronously, never restarts on a new page or six-hour reload',async()=>{
    setup();const cue={arrival:null,dedication:null,ceremony:null};let view=render(<TvAudio cue={cue}/>);
    expect(contexts).toHaveLength(0);expect(screen.getByText('Musica in preparazione')).toBeDefined();
    fireEvent.click(screen.getByRole('button',{name:'Attiva audio'}));expect(contexts[0]?.resumes).toBe(1);
    await act(async()=>{});expect(media.every(m=>m.plays===0)).toBe(true);
    view.unmount();expect(contexts[0]?.state).toBe('closed');
    view=render(<TvAudio cue={cue}/>);expect(screen.getByTestId('tv-audio').getAttribute('data-audio')).toBe('silent');expect(contexts).toHaveLength(1);view.unmount();
  });
  it('synthesizes only visible consented beats and fully mutes them',async()=>{
    setup();const view=render(<TvAudio cue={{arrival:'initial',dedication:null,ceremony:null}}/>);
    expect(contexts).toHaveLength(0);fireEvent.click(screen.getByRole('button',{name:'Attiva audio'}));await act(async()=>{});
    expect(contexts[0]?.effects).toBe(0);
    view.rerender(<TvAudio cue={{arrival:'fresh',dedication:null,ceremony:null}}/>);expect(contexts[0]?.effects).toBe(3);
    fireEvent.click(screen.getByRole('button',{name:'Disattiva audio'}));
    view.rerender(<TvAudio cue={{arrival:null,dedication:'moderated',ceremony:null}}/>);expect(contexts[0]?.effects).toBe(3);expect(contexts[0]?.state).toBe('suspended');view.unmount();
  });
  it('pauses hidden tabs, retains consent without replaying a beat, and disposes timers',async()=>{
    vi.useFakeTimers();setup();const view=render(<TvAudio cue={{arrival:null,dedication:null,ceremony:null}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Attiva audio'}));await act(async()=>{});
    vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'));expect(contexts[0]?.state).toBe('suspended');
    view.rerender(<TvAudio cue={{arrival:'hidden',dedication:null,ceremony:null}}/>);expect(contexts[0]?.effects).toBe(0);
    vi.spyOn(document,'hidden','get').mockReturnValue(false);fireEvent(document,new Event('visibilitychange'));await act(async()=>{});expect(contexts[0]?.state).toBe('running');expect(contexts[0]?.effects).toBe(0);
    view.unmount();act(()=>vi.advanceTimersByTime(1000));expect(vi.getTimerCount()).toBe(0);vi.restoreAllMocks();
  });
  it('preloads only two streams and crossfades for four seconds without restarting the next track',async()=>{
    vi.useFakeTimers();setup();const engine=new TvAudioEngine(tracks);engine.activate();await Promise.resolve();await Promise.resolve();
    expect(media).toHaveLength(2);expect(media[0]?.plays).toBe(1);expect(media[1]?.plays).toBe(0);
    const first=media[0], context=contexts[0];if(!first||!context)throw new Error('missing fixture');
    first.currentTime=236;vi.advanceTimersByTime(250);await Promise.resolve();expect(media[1]?.plays).toBe(1);
    context.currentTime=4.1;vi.advanceTimersByTime(250);expect(first.paused).toBe(true);expect(media).toHaveLength(2);
    engine.dispose();expect(vi.getTimerCount()).toBe(0);expect(media.every(m=>m.src==='')).toBe(true);
  });
  it('recovers from real media error callbacks and terminates retries when every asset fails',async()=>{
    vi.useFakeTimers();setup();const engine=new TvAudioEngine(tracks.slice(0,3));const unavailable=vi.fn();engine.onUnavailable=unavailable;
    engine.activate();await Promise.resolve();await Promise.resolve();
    for(let i=0;i<5;i++){media[0]?.onerror?.();media[1]?.onerror?.();await Promise.resolve();}
    expect(unavailable).toHaveBeenCalled();expect(media).toHaveLength(2);expect(media.every(m=>m.src==='')).toBe(true);
    engine.dispose();expect(vi.getTimerCount()).toBe(0);
  });
  it('ducks music through actual noon phases and restores softly after the visual ceremony',()=>{
    setup();const engine=new TvAudioEngine([]);engine.activate();
    engine.effect({type:'ceremony',key:'day1',phase:'dark'});
    // Music bus is tested by concrete target values, independent of missing real catalogue.
    const internals=engine as unknown as {music:Node};expect(internals.music.gain.value).toBe(0.065);
    engine.endCeremony();expect(internals.music.gain.value).toBe(0.24);engine.dispose();
  });
  it('keeps the engine at two media elements for four accelerated hours of track handovers',async()=>{
    vi.useFakeTimers();setup();const engine=new TvAudioEngine(tracks);engine.activate();await Promise.resolve();await Promise.resolve();
    const context=contexts[0];if(!context)throw new Error('missing context');
    for(let seconds=0;seconds<14400;seconds+=236){
      const state=engine as unknown as {current:number};const playing=media[state.current];if(!playing)throw new Error('missing deck');
      playing.currentTime=236;vi.advanceTimersByTime(250);await Promise.resolve();
      context.currentTime+=4.1;vi.advanceTimersByTime(250);await Promise.resolve();
      expect(media).toHaveLength(2);expect(media.filter(m=>!m.paused)).toHaveLength(1);
    }
    expect(media.reduce((s,m)=>s+m.plays,0)).toBeGreaterThan(60);
    engine.dispose();expect(vi.getTimerCount()).toBe(0);
  });
});