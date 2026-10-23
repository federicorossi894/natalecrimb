import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { canopyTiers, ornamentAnchor, surfaceRadius, treeHeight, treeLayout, treeWidth } from "@/lib/tree-layout";
import { eventSchema, romeToIso } from '@/lib/events';
import { giftEmailSchema, deliveryLabel, CHRISTMAS_DELIVERY_ISO } from '@/lib/email-demo';

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
  it('keeps every existing gift on the same spot of the tree when a new one arrives',()=>{
    const a=treeLayout(30),b=treeLayout(31),ha=treeHeight(30),hb=treeHeight(31);
    a.forEach((p,i)=>{const q=b[i]!;expect(q.theta).toBe(p.theta);expect(q.pos[1]/hb).toBeCloseTo(p.pos[1]/ha,6);});
    const o={id:'stable-demo-id',kind:'cuore' as const,x:50,y:50};
    expect(ornamentAnchor(o,treeHeight(16),3,16)).toEqual(treeLayout(16)[3]!.pos);
  });
  it.each([4,16,30,60,100,200])('never lets %i baubles (with cap and ribbon) touch each other',(n)=>{
    const L=treeLayout(n);let worst=Infinity;
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const p=L[i]!,q=L[j]!,R=p.R;
      // 3D: horizontal clearance for two ~2R wide baubles, vertical for the -R..+2R hanger span.
      worst=Math.min(worst,Math.hypot(Math.hypot(p.pos[0]-q.pos[0],p.pos[2]-q.pos[2])/(2.2*R),(p.pos[1]-q.pos[1])/(3*R)));}
    expect(worst).toBeGreaterThanOrEqual(1);
  });
  it.each([4,30,100])('hangs %i baubles on the outer needles, never inside the branches',(n)=>{
    const h=treeHeight(n),tiers=canopyTiers(h,n);
    for(const p of treeLayout(n)){const radial=Math.hypot(p.pos[0],p.pos[2]);expect(radial-p.R*0.88).toBeGreaterThanOrEqual(surfaceRadius(tiers,h,p.pos[1],p.theta));const sr=(y:number,a:number)=>surfaceRadius(tiers,h,y,a),da=p.R/Math.max(0.2,sr(p.pos[1],p.theta));
      let rest=0;for(const dy of [-0.6,0,0.6])for(const dt of [-0.6,0,0.6])rest=Math.max(rest,sr(p.pos[1]+dy*p.R,p.theta+dt*da)+p.R*Math.sqrt(Math.max(0,1-dy*dy-dt*dt)));
      const hook=Math.max(sr(p.pos[1]+1.4*p.R,p.theta),sr(p.pos[1]+1.95*p.R,p.theta));
      // Its sphere touches the needles, or it hangs from the bough right above it: never floats in front.
      expect(Math.min(radial-rest,radial-hook)).toBeLessThan(p.R*0.3);}
  });
  it('grows wider as well as taller with the gifts',()=>{
    expect(treeWidth(100)).toBeGreaterThan(treeWidth(4));
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
    // 00:05 in Rome (winter time, UTC+1) is 23:05 UTC on 24 December.
    expect(CHRISTMAS_DELIVERY_ISO).toBe('2026-12-24T23:05:00.000Z');
  });
  it('requires a valid recipient email', () => {
    expect(giftEmailSchema.safeParse({ mode: 'now', donor: '', to: 'non-una-email', msg: '' }).success).toBe(false);
    expect(giftEmailSchema.safeParse({ mode: 'now', donor: '', to: 'nome@esempio.it', msg: '' }).success).toBe(true);
  });
});

import { amountSchema, formatCode, isCompleteCode, manualOrnamentSchema, normalizeCode } from '@/lib/cash';
describe('Cash at the casetta (demo)', () => {
  it('reads a typed code the same as the scanned one (dashes, lowercase, O/I/L)', () => {
    expect(normalizeCode('k7qm-2xpa 9dtr-4hwo')).toBe('K7QM2XPA9DTR4HW0');
    expect(formatCode('K7QM2XPA9DTR4HW0')).toBe('K7QM-2XPA-9DTR-4HW0');
    expect(isCompleteCode('K7QM-2XPA-9DTR-4HW0')).toBe(true);
    expect(isCompleteCode('K7QM-2XPA')).toBe(false);
  });
  it('accepts amounts from 1 to 1000 euro only', () => {
    expect(amountSchema.safeParse(1).success).toBe(true);
    expect(amountSchema.safeParse(1000).success).toBe(true);
    expect(amountSchema.safeParse(0).success).toBe(false);
    expect(amountSchema.safeParse(1001).success).toBe(false);
  });
  it('requires the volunteer to acknowledge the simulated payment', () => {
    const base = { kind: 'dae', amount: '20', method: 'cash', firma: '', dedica: '', consent: false };
    expect(manualOrnamentSchema.safeParse({ ...base, simulated: true }).success).toBe(true);
    expect(manualOrnamentSchema.safeParse({ ...base, simulated: false }).success).toBe(false);
  });
});

import { createDemoDesk, DEMO_CODE } from '@/lib/volunteer-demo';
describe('Volunteer presentation mode', () => {
  it('confirms the example QR once; a second scan adds nothing', async () => {
    const log: unknown[] = []; const desk = createDemoDesk((e) => log.push(e));
    expect((await desk.lookup('d3m0-cr1m-0nza-2025'))?.amount_cents).toBe(2000);
    expect((await desk.confirm(DEMO_CODE, 'cash')).result).toBe('confirmed');
    expect((await desk.confirm(DEMO_CODE, 'pos_manual')).result).toBe('already_confirmed');
    expect(log).toHaveLength(1);
  });
  it('drops name and dedication without consent', async () => {
    const log: { firma: string | null }[] = []; const desk = createDemoDesk((e) => log.push(e));
    expect((await desk.add({ kind: 'cuore', amount_cents: 500, method: 'cash', firma: 'Mario', dedica: 'Ciao', consent: false })).status).toBe('approved');
    expect(log[0]?.firma).toBeNull();
  });
});
