import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { previousRomeDate,reportHtml,type CasettaReport } from '@/lib/casetta-report.server';

const migration=readFileSync(new URL('../../drizzle/migrations/0023_casetta_cassa.sql',import.meta.url),'utf8');
const route=readFileSync(new URL('../routes/cassa.tsx',import.meta.url),'utf8');

describe('Casetta cash register safety and daily recaps',()=>{
  it('uses Europe/Rome dates including the DST boundary',()=>{
    expect(previousRomeDate(new Date('2026-11-22T09:00:00Z'))).toBe('2026-11-21');
    expect(previousRomeDate(new Date('2026-03-29T22:30:00Z'))).toBe('2026-03-29');
    expect(previousRomeDate(new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-25');
  });
  const report:CasettaReport={
    date:'2026-11-22',
    finance:{totalCents:3200,cashCents:2000,posCents:1200,transactions:3},
    stock:[{id:'panettone',label:'Panettone',quantity:2,totalCents:2000},
      {id:'cioccolatini',label:'Cioccolatini',quantity:3,totalCents:1200}],
  };
  it('sends finance-only numbers to administration',()=>{
    const html=reportHtml(report,'finance');
    expect(html).toContain('32,00');
    expect(html).toContain('Contanti');
    expect(html).toContain('POS');
    expect(html).not.toContain('Panettone');
    expect(html).not.toContain('Cioccolatini');
  });
  it('sends financial figures and product counts to stock manager',()=>{
    const html=reportHtml(report,'stock');
    expect(html).toContain('32,00');
    expect(html).toContain('Panettone');
    expect(html).toContain('Cioccolatini');
    expect(html).toContain('Quantità vendute, non giacenze effettive');
  });
  it('does not seed prices, grant anonymous access or create a live QR',()=>{
    expect(migration).toContain('price_cents integer');
    expect(migration).toContain('active boolean NOT NULL DEFAULT false');
    expect(migration).toContain('REVOKE ALL ON TABLE');
    expect(migration).toContain('REVOKE ALL ON FUNCTION');
    expect(migration).not.toContain('INSERT INTO public.casetta_access_keys');
    expect(route).toContain('noindex, nofollow, noarchive');
    expect(route).toContain('no-referrer');
  });
});
