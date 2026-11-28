import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {SANTA_DEMO_BOOKINGS,SANTA_VISIT_SLOTS,suggestSantaTeams,hasCoords,mapsRouteUrl} from '@/lib/santa-planner';
import {santaXlsx} from '@/lib/santa-xlsx';
import {santaRequestEmail,santaConfirmedEmail,SANTA_SENDER} from '@/lib/santa-mail';

describe('Babbo Natale 2026 — preview safely gated',()=>{
 it('recovers original graphics and exposes only a simulated request flow',()=>{
  const page=readFileSync('src/routes/babbo-natale.tsx','utf8');
  const home=readFileSync('src/routes/index.tsx','utf8');
  const chimney=readFileSync('src/components/xmas/SantaChimney.tsx','utf8');
  const campaign=readFileSync('src/lib/campaign.ts','utf8');
  expect(page).toContain('AutoSantaScene mode="full"');
  expect(home).toContain('CAMPAIGN.santaHomeVisitsVisible && <SantaChimneySection');
  expect(chimney).toContain('fuori dalla porta');
  expect(page).toContain('SANTA_PUBLIC_REQUESTS_OPEN=false');
  expect(page).toContain('Offerta libera');
  expect(page).toContain('non invia e non salva richieste');
  expect(page).toContain('natale@crimonza.org');
  expect(page).toContain('Area organizzatori');
  expect(campaign).toContain('santaHomeVisitsEnabled: true');
  expect(campaign).toContain('santaBookings: false');
  expect(page).not.toContain('Consegna in sede prima');
 });
 it('allocates max 4 visits per team and fixed one-hour slots',()=>{
  expect(SANTA_VISIT_SLOTS).toEqual(['19:30','20:30','21:30','22:30']);
  const plan=suggestSantaTeams(SANTA_DEMO_BOOKINGS);
  expect(SANTA_DEMO_BOOKINGS).toHaveLength(6);
  expect(plan.teams.length).toBeGreaterThanOrEqual(2);
  expect(plan.teams.flatMap(t=>t.bookings)).toHaveLength(6);
  expect(plan.teams.every(t=>t.bookings.length<=4)).toBe(true);
  for(const team of plan.teams){
   expect(team.bookings.map(b=>b.slot)).toEqual(SANTA_VISIT_SLOTS.slice(0,team.bookings.length));
   expect(team.lengthKm).toBeGreaterThanOrEqual(0);
   expect(mapsRouteUrl(team)).toContain('https://www.google.com/maps/dir/');
  }
 });
 it('cannot invent coordinates when the family address has not been geocoded',()=>{
  const notLocated={...SANTA_DEMO_BOOKINGS[0]!,id:'no-coordinate',lat:null,lon:null};
  expect(hasCoords(notLocated)).toBe(false);
  const plan=suggestSantaTeams([notLocated]);
  expect(plan.teams).toHaveLength(0);
  expect(plan.unmapped).toHaveLength(1);
  expect(plan.warnings.join(' ')).toContain('senza coordinate');
 });
 it('exports complete family register and one real worksheet per team',()=>{
  const plan=suggestSantaTeams(SANTA_DEMO_BOOKINGS);
  const bytes=santaXlsx(SANTA_DEMO_BOOKINGS,plan.teams);
  expect(bytes[0]).toBe(0x50);expect(bytes[1]).toBe(0x4b);
  const raw=new TextDecoder().decode(bytes);
  expect(raw).toContain('Tutte le richieste');
  expect(raw).toContain('xl/worksheets/sheet2.xml');
  expect(raw).toContain('Telefono');
  expect(raw).toContain('Bambini');
  expect(raw).toContain('Note per Babbo Natale');
  expect(raw).toContain('Incassato');
  expect(raw).toContain('Squadra A');
  expect(raw).toContain('Famiglia');
  expect(raw).toContain('https://www.google.com/maps/search/');
 });
 it('prepares reception email, explicitly not a confirmed booking or payment',()=>{
  const family=SANTA_DEMO_BOOKINGS[0]!;
  const mail=santaRequestEmail(family);
  expect(mail.from).toBe(SANTA_SENDER);
  expect(mail.subject).toContain('ricevuto');
  expect(mail.html).toContain('non è ancora prenotata né confermata');
  expect(mail.html).toContain('non ti abbiamo addebitato nulla');
  expect(mail.html).toContain('già incartati fuori dalla porta');
  expect(mail.html).toContain('natale@crimonza.org');
  expect(()=>santaConfirmedEmail(family)).toThrow();
  expect(santaConfirmedEmail({...family,slotAssegnato:'21:30'}).subject).toContain('confermata');
 });
 it('keeps all booking data and admin credentials off the anonymous database role',()=>{
  const sql=readFileSync('drizzle/migrations/0038_santa_private_admin_bookings.sql','utf8');
  const auth=readFileSync('src/lib/santa-admin.functions.ts','utf8');
  const route=readFileSync('src/routes/babbo-natale.organizzatori.tsx','utf8');
  expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  expect(sql).toContain('REVOKE ALL ON public.');
  expect(sql).toContain("('federico.rossi@crimonza.org',true)");
  expect(sql).not.toContain('babbo1864');
  expect(sql).not.toContain('pbkdf2_sha256$100000$4Xf');
  expect(sql).toContain('requests_open boolean NOT NULL DEFAULT false');
  expect(sql).toContain('quota_incassata_cents integer NOT NULL DEFAULT 0');
  expect(auth).toContain('verifyPassword(data.password,verifier)');
  expect(auth).toContain("const COOKIE='cri_santa_admin'");
  expect(auth).toContain('httpOnly:true');
  expect(auth).toContain('currentAdmin()');
  expect(auth).toContain('santa_admin_audit');
  expect(route).toContain('santaAdminLogin');
  expect(route).toContain('santaAdminUpdate');
  expect(route).toContain('SantaRouteMap');
  expect(route).toContain('Scarica Excel');
  expect(route).toContain("Richieste reali");
 });
});
