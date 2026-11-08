import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advanceStory, initialStory, storyContent, storyDelay, storyOrnaments, storyPriority, STORY_ID_COOLDOWN_MS, STORY_KINDS, STORY_MS } from '@/lib/tv-storytelling';
import { tvCameraFrame } from '@/lib/tv-camera';
import { useTvStorytelling } from '@/components/xmas/useTvStorytelling';
import type { TreeOrnament } from '@/lib/data';

const rows: TreeOrnament[] = STORY_KINDS.flatMap((kind, k) => Array.from({length: kind === 'calore' ? 50 : 4}, (_,i) => ({ id: `${kind}-${i}`, kind, x: 30+k*10, y: 50 })));
afterEach(() => { vi.useRealTimers(); });
describe('public TV cinematic director', () => {
  it('uses reproducible natural jitter between 45 and 60 seconds, independent of panel beats', () => {
    const delays = Array.from({length: 100}, (_,seed) => storyDelay(seed * 100_000));
    for (const d of delays) { expect(d.ms).toBeGreaterThanOrEqual(45_000); expect(d.ms).toBeLessThanOrEqual(60_000); }
    expect(storyDelay(88)).toEqual(storyDelay(88));
    expect(new Set(delays.map(d => d.ms)).size).toBeGreaterThan(90);
  });
  it('holds a focus for 10 seconds and schedules starts 45–60 seconds apart', () => {
    const s = initialStory(0);
    const focus = advanceStory(s, s.nextAt, rows, 'editorial');
    expect(focus.focus?.start).toBe(s.nextAt);
    expect(focus.nextAt-s.nextAt).toBeGreaterThanOrEqual(45_000);
    expect(focus.nextAt-s.nextAt).toBeLessThanOrEqual(60_000);
    expect(advanceStory(focus, s.nextAt+STORY_MS-1, rows, 'editorial').focus).not.toBeNull();
    expect(advanceStory(focus, s.nextAt+STORY_MS, rows, 'editorial').focus).toBeNull();
  });
  it('balances all four available causes despite 50 vs 4 distribution; no consecutive kind or ID', () => {
    let state=initialStory(0);
    let previous: TreeOrnament | undefined;
    for(let i=0;i<80;i++) {
      state=advanceStory(state,state.nextAt,rows,'editorial');
      const picked=rows.find(o=>o.id===state.focus?.id);
      expect(picked).toBeDefined();
      expect(picked?.id).not.toBe(previous?.id);
      expect(picked?.kind).not.toBe(previous?.kind);
      previous=picked;
      state=advanceStory(state,(state.focus?.start??0)+STORY_MS,rows,'editorial');
    }
    expect(state.kindTurns).toEqual({calore:20,dae:20,prossimita:20,cuore:20});
    expect(state.recent.size).toBeLessThanOrEqual(4);
  });
  it('gives a solitary ornament at least three minutes before repeating; an empty tree never focuses', () => {
    let s=initialStory(0); const one=rows.slice(0,1);
    s=advanceStory(s,s.nextAt,one,'editorial');
    const start=s.focus?.start??0;
    s=advanceStory(s,start+STORY_MS,one,'editorial');
    s=advanceStory(s,s.nextAt,one,'editorial');
    expect(s.focus).toBeNull();
    s=advanceStory(s,start+STORY_ID_COOLDOWN_MS+60_000,one,'editorial');
    expect(s.focus?.id).toBe(one[0]?.id);
    expect(advanceStory(initialStory(0),999_999,[],'editorial').focus).toBeNull();
  });
  it('orders noon > arrival > wall > dedication > editorial and discards focus on each interruption', () => {
    expect(storyPriority({ceremony:true,arrival:true,wall:true,dedication:true})).toBe('ceremony');
    expect(storyPriority({ceremony:false,arrival:true,wall:true,dedication:true})).toBe('arrival');
    expect(storyPriority({ceremony:false,arrival:false,wall:true,dedication:true})).toBe('wall');
    expect(storyPriority({ceremony:false,arrival:false,wall:false,dedication:true})).toBe('dedication');
    for(const priority of ['ceremony','arrival','wall','dedication'] as const) {
      const init=initialStory(0); const focused=advanceStory(init,init.nextAt,rows,'editorial');
      const stopped=advanceStory(focused,init.nextAt+1000,rows,priority);
      expect(stopped.focus).toBeNull();
      const resumed=advanceStory(stopped,init.nextAt+20_000,rows,'editorial');
      expect(resumed.focus).toBeNull();
      expect(resumed.nextAt-(init.nextAt+20_000)).toBeGreaterThanOrEqual(45_000);
    }
  });
  it('re-resolves real text and signature verbatim, redacts failures and revocation without a retained snapshot', () => {
    const publicRow: TreeOrnament={id:'approved',kind:'calore',x:50,y:50,dedica:'Grazie per il tempo e l’ascolto.',firma:'Nome pubblico'};
    expect(storyContent('approved',[publicRow],false)?.text).toBe(publicRow.dedica);
    expect(storyContent('approved',[publicRow],false)?.signature).toBe('Nome pubblico');
    expect(storyContent('approved',[publicRow],true)).toBeNull();
    expect(storyContent('approved',[],false)).toBeNull();
    const {dedica: omitted, firma: signature, ...revoked}=publicRow;
    expect(omitted).toBeDefined(); expect(signature).toBeDefined();
    expect(storyContent('approved',[revoked],false)?.dedication).toBeUndefined();
    expect(storyContent('approved',[revoked],false)?.signature).toBeUndefined();
  });
  it('drops extra financial/private fields and does not use local demo ornaments absent from the public input', () => {
    const input={...rows[0],id:'public-only',kind:'calore' as const,x:50,y:50,amount:50,total:999,client:'private',dedica:'Pubblica',firma:'Firma'};
    const safe=storyOrnaments([input],true);
    expect(safe).toEqual([{id:'public-only',kind:'calore',x:50,y:50}]);
    const s=initialStory(0);
    expect(advanceStory(s,s.nextAt,safe,'editorial').focus?.id).toBe('public-only');
    expect(storyContent(1,safe,false)).toBeNull();
  });
  it('uses the cause story rather than modifying dedication containing a financial amount', () => {
    const result=storyContent('money',[{id:'money',kind:'dae',x:50,y:50,dedica:'Ho donato 50 €'}],false);
    expect(result?.dedication).toBeUndefined();
    expect(result?.signature).toBeUndefined();
    expect(result?.text).not.toMatch(/€|EUR|\beuro\b/i);
  });
  it('keeps future proximity acquisition explicit and has no gift-object equivalence', () => {
    const result=storyContent('future',[{id:'future',kind:'prossimita',x:50,y:50}],false);
    expect(result?.text).toContain('futuro acquisto e allestimento');
    expect(result?.text).not.toContain('operativa');
  });
  it('cleans the hook timer and immediately clears content on priority/error changes with fake clocks', () => {
    vi.useFakeTimers();
    const hook=renderHook(({priority,error})=>useTvStorytelling(rows,priority,error,true,false),{initialProps:{priority:'editorial' as 'editorial'|'wall',error:false}});
    act(()=>vi.advanceTimersByTime(60_000));
    // Inspect within the first focus instead of after its 10-second ending.
    act(()=>vi.advanceTimersByTime(45_000));
    hook.rerender({priority:'wall',error:false});
    expect(hook.result.current.content).toBeNull();
    hook.rerender({priority:'editorial',error:true});
    expect(hook.result.current.content).toBeNull();
    hook.unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it('frames editorial closer, preserves legacy selected distance, and breathes around the panorama', () => {
    const h=3;
    const panorama=tvCameraFrame(h,0,null,false);
    expect(panorama.position[2]).toBeCloseTo(5.85);
    expect(tvCameraFrame(h,12,null,false).position).not.toEqual(panorama.position);
    const legacy=tvCameraFrame(h,0,[0,1,1],false);
    const editorial=tvCameraFrame(h,0,[0,1,1],true);
    expect(legacy.position[2]-1).toBe(4);
    expect(editorial.position[2]-1).toBeCloseTo(2.1);
    expect(editorial.look).toEqual([0,1,1]);
  });
});