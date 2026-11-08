import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {publicEventChanges,queuePublicEvents} from '@/lib/tv-public-events';
import {TvPostcard} from '@/components/xmas/TvPostcard';
import {reviewDecision,reviewOriginAllowed} from '@/lib/volunteer-review-policy';
const ball={id:'a',kind:'calore' as const,x:50,y:50};
it('initial/reload snapshot never replays events; same-ID approval reveals without new ornament',()=>{
 const first=publicEventChanges(null,[ball],[]);expect(first.events).toEqual([]);
 const next=publicEventChanges(first.snapshot,[{...ball,dedica:'Grazie'}],[{id:'wish',body:'Auguri',nickname:null}]);
 expect(next.events).toEqual([{type:'wish',id:'wish'},{type:'dedication',id:'a'}]);
 expect(publicEventChanges(next.snapshot,[{...ball,dedica:'Grazie'}],[{id:'wish',body:'Auguri',nickname:null}]).events).toEqual([]);
 expect(publicEventChanges(null,[{...ball,dedica:'Grazie'}],[]).events).toEqual([]);
});
it('bounded deduplicated event queue is six and no private text is retained',()=>{
 const fresh=Array.from({length:10},(_,i)=>({type:'wish' as const,id:String(i)}));
 expect(queuePublicEvents(fresh.slice(0,1),fresh)).toHaveLength(6);
 expect(queuePublicEvents([],fresh)[0]).toEqual({type:'wish',id:'0'});
});
it('postcard uses original public text and never invents absent signature',()=>{
 render(<TvPostcard ornament={{...ball,dedica:'Grazie per esserci'}}/>);
 expect(screen.getByText('“Grazie per esserci”')).toBeDefined();expect(screen.queryByText(/Anonimo/)).toBeNull();
});
it('review input forbids arbitrary operation/actor and requests must be same-origin',()=>{
 expect(reviewDecision.safeParse({type:'wish',id:'bad',decision:'hidden'}).success).toBe(false);
 expect(reviewOriginAllowed('https://evil.example','https://natalecrimb.lovable.app')).toBe(false);
 expect(reviewOriginAllowed(null,'https://natalecrimb.lovable.app')).toBe(false);
 expect(reviewOriginAllowed('https://natalecrimb.lovable.app','https://natalecrimb.lovable.app/x')).toBe(true);
});