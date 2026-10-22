import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { ornamentAnchor, treeHeight } from '@/lib/tree-layout';
import { eventSchema, romeToIso } from '@/lib/events';
import { giftEmailSchema, deliveryLabel } from '@/lib/email-demo';

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe('Shared tree layout',()=>{
  it('grows from real demo counts with a bounded height',()=>{
    expect(treeHeight(4)).toBeLessThan(treeHeight(100));
    expect(treeHeight(5)).toBeLessThan(treeHeight(50));
    expect(treeHeight(50)).toBeLessThan(treeHeight(200));
    expect(treeHeight(1000)).toBe(treeHeight(200));
  });
  it('keeps each ornament anchor deterministic as the tree grows',()=>{
    const o={id:'stable-demo-id',kind:'cuore' as const,x:50,y:50};
    expect(ornamentAnchor(o,treeHeight(4))).toEqual(ornamentAnchor(o,treeHeight(4)));
    const small=ornamentAnchor(o,2,3),large=ornamentAnchor(o,4,3);
    expect(small[1]/2).toBeCloseTo(large[1]/4);
  });
  it('spreads the first gifts apart instead of clustering them',()=>{
    const o={id:'x',kind:'cuore' as const,x:50,y:50};
    const pts=Array.from({length:6},(_,i)=>ornamentAnchor(o,2.2,i));
    let min=Infinity;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i]!,b=pts[j]!;min=Math.min(min,Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]));}
    expect(min).toBeGreaterThan(0.25);
  });
});

import { SANTA_CONTRIBUTION_EUR, santaBookingSchema, emptySantaForm } from '@/lib/santa';
describe('Babbo Natale demo booking', () => {
  const valid = { ...emptySantaForm(), nome: 'Giulia', cognome: 'Rossi', email: 'giulia@esempio.it', telefono: '333 1234567', indirizzo: 'Via Italia 10', bambini: '2', fascia: 'Indifferente', demo: true };
  it('proposes an indicative €30 contribution per family', () => {
    expect(SANTA_CONTRIBUTION_EUR).toBe(30);
  });
  it('accepts an adult booking with optional child names and notes left empty', () => {
    expect(santaBookingSchema.safeParse(valid).success).toBe(true);
  });
  it('requires at least one child and the simulation acknowledgement', () => {
    expect(santaBookingSchema.safeParse({ ...valid, bambini: '0' }).success).toBe(false);
    expect(santaBookingSchema.safeParse({ ...valid, demo: false }).success).toBe(false);
  });
});

describe('Casetta events', () => {
  it('stores Monza wall-clock times in UTC (winter time is UTC+1)', () => {
    expect(romeToIso('2026-12-24', '17:30')).toBe('2026-12-24T16:30:00.000Z');
  });
  it('rejects an event that ends before it starts', () => {
    const r = eventSchema.safeParse({ title: 'Evento prova', description: '', date: '2026-12-20', start: '18:00', end: '17:00', confirmed: true, visible: true });
    expect(r.success).toBe(false);
  });
});

describe('Gift email demo', () => {
  it('schedules the Christmas surprise for 25 December at 00:05 Italian time', () => {
    expect(deliveryLabel('christmas')).toBe('25 dicembre · ore 00:05 (ora italiana)');
  });
  it('requires a valid recipient email', () => {
    expect(giftEmailSchema.safeParse({ mode: 'now', donor: '', to: 'non-una-email', msg: '' }).success).toBe(false);
    expect(giftEmailSchema.safeParse({ mode: 'now', donor: '', to: 'nome@esempio.it', msg: '' }).success).toBe(true);
  });
});
