import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const read = vi.hoisted(() => vi.fn());
vi.mock('@/lib/campaign-rpc', () => ({ campaignRpc: read }));
vi.mock('@/lib/payments.functions', () => ({ livePublicTree: vi.fn() }));
vi.mock('@/lib/tv-tree.functions', () => ({ publicTvTree: vi.fn() }));
import { useTreeStore } from '@/lib/tree-store';
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); });
it('reads shared approved dedication in a fresh browser and never overrides revoked text locally', async () => {
  sessionStorage.setItem('cri-online-session-tree', JSON.stringify([{id:'shared',kind:'calore',x:50,y:50,sessionOnly:true,dedica:'Stale unapproved text'}]));
  read.mockImplementation(async (name: string) => ({data:name==='public_tree'?[{id:'shared',kind:'calore',x:21,y:34,dedica:'Un abbraccio a Monza',firma:'Federico'}]:[],error:null}));
  const tree = renderHook(useTreeStore);
  await act(async () => { await Promise.resolve(); });
  expect(tree.result.current.publicOrnaments).toContainEqual({id:'shared',kind:'calore',x:21,y:34,dedica:'Un abbraccio a Monza',firma:'Federico'});
  read.mockImplementation(async (name: string) => ({data:name==='public_tree'?[{id:'shared',kind:'calore',x:21,y:34,dedica:null,firma:null}]:[],error:null}));
  await act(async () => { await tree.result.current.refresh(); });
  expect(tree.result.current.publicOrnaments[0]).not.toHaveProperty('dedica');
});