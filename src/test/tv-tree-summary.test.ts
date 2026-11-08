import { expect, it } from 'vitest';
import { tvTreeSummary } from '@/lib/tv-tree-summary';
const row = {id:'one',kind:'calore',x:50,y:50,firma:'Firma privata',dedica:'Testo privato',status:'pending',publish_consent:true,created_at:'2026-11-08T00:00:00Z'};
it('redacts pending text while keeping its real solidarity count', () => {
  expect(tvTreeSummary([row], 1)).toMatchObject({count:1,rows:[{firma:null,dedica:null}]});
});
it('redacts unconsented approved text and excludes rejected ornaments', () => {
  expect(tvTreeSummary([{...row,status:'approved',publish_consent:false},{...row,id:'rejected',status:'rejected'}],1).rows).toEqual([{id:'one',kind:'calore',x:50,y:50,created_at:row.created_at,firma:null,dedica:null}]);
});
it('keeps the exact count above 300 with a bounded rendering window', () => {
  const rows = Array.from({length:350}, (_,i) => ({...row,id:`${i}`,status:'approved'}));
  const summary = tvTreeSummary(rows,350);
  expect(summary.count).toBe(350);expect(summary.rows).toHaveLength(300);expect(summary.rows[0]?.dedica).toBe('Testo privato');
});