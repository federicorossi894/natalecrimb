import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {santaBoard,moveSantaBooking,santaBoardPayload,mapsRouteUrl,
 SANTA_TEAM_IDS,SANTA_TEAM_COLORS,hasCoords,type SantaBooking} from '@/lib/santa-planner';
import {santaXlsx} from '@/lib/santa-xlsx';
import {santaRequestEmail,santaConfirmedEmail,SANTA_SENDER} from '@/lib/santa-mail';
import {santaOriginAllowed} from '@/lib/santa-security';

function make(i:number):SantaBooking{
 return {id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),
  nome:'Famiglia',cognome:'Esempio '+i,email:'federico.rossi@crimonza.org',
  telefono:'3330000000',indirizzo:'Via esempio '+i+', Monza',
  localita:'Monza',bambini:['Anna','Leo'],note:'Un desiderio',
  quotaOffertaCents:3000+i*100,quotaIncassataCents:0,
  squadra:null,teamPosition:null,confirmedTime:null,status:'richiesta',
  mode:'demo',lat:45.58+i/10000,lon:9.27+i/10000,
  geocodeStatus:'approximate'};
}
describe('Babbo Natale — lavagna manuale e richieste DEMO persistenti',()=>{
 it('shows just one demo label and no choice of times on the family page',()=>{
  const page=readFileSync('src/routes/babbo-natale.tsx','utf8');
  const home=readFileSync('src/routes/index.tsx','utf8');
  expect(page).toContain('AutoSantaScene mode="full"');
  expect(home).toContain('CAMPAIGN.santaHomeVisitsVisible && <SantaChimneySection');
  expect(page).toContain('DEMO</div>');
  expect(page.match(/DEMO/g)).toHaveLength(1);
  expect(page).not.toContain('SANTA_VISIT_SLOTS');
  expect(page).not.toContain('Fascia oraria preferita');
  expect(page).toContain('dalle 19 a mezzanotte');
  expect(page).toContain('santaCreateRequest');
  expect(page).toContain('privacy');
  expect(page).not.toContain('nessuna richiesta viene registrata');
 });
 it('assigns ONLY when an organizer drags; supports A-D and reorder',()=>{
  const bookings=[1,2,3,4,5,6].map(make);
  expect(SANTA_TEAM_IDS).toEqual(['Squadra A','Squadra B','Squadra C','Squadra D']);
  expect(new Set(Object.values(SANTA_TEAM_COLORS)).size).toBe(4);
  expect(santaBoard(bookings).unassigned).toHaveLength(6);
  let arranged=moveSantaBooking(bookings,bookings[0]!.id,'Squadra A');
  arranged=moveSantaBooking(arranged,bookings[1]!.id,'Squadra A');
  arranged=moveSantaBooking(arranged,bookings[2]!.id,'Squadra B');
  arranged=moveSantaBooking(arranged,bookings[1]!.id,'Squadra A',0);
  const board=santaBoard(arranged);
  expect(board.teams[0]!.bookings.map(b=>b.id)).toEqual([bookings[1]!.id,bookings[0]!.id]);
  expect(board.teams[0]!.bookings.map(b=>b.teamPosition)).toEqual([1,2]);
  expect(board.teams[1]!.bookings).toHaveLength(1);
  expect(board.unassigned).toHaveLength(3);
  expect(santaBoardPayload(arranged)).toHaveLength(6);
  expect(santaBoardPayload(arranged).filter(x=>x.team==='Squadra A')).toHaveLength(2);
  expect(mapsRouteUrl(board.teams[0]!)).toContain('google.com/maps/dir/');
  expect(hasCoords({...bookings[0]!,lat:null})).toBe(false);
 });
 it('exports 5 sheets with family details, order and real confirmed time',()=>{
  const bookings=[1,2].map(make);
  bookings[0]!.squadra='Squadra A';bookings[0]!.teamPosition=1;bookings[0]!.confirmedTime='20:45';
  const bytes=santaXlsx(bookings,santaBoard(bookings).teams);
  expect(Array.from(bytes.slice(0,2))).toEqual([80,75]);
  const text=new TextDecoder().decode(bytes);
  expect(text).toContain('Tutte le richieste');
  for(const team of SANTA_TEAM_IDS)expect(text).toContain(team);
  expect(text).toContain('sheet5.xml');
  expect(text).toContain('Telefono');
  expect(text).toContain('Bambini');
  expect(text).toContain('Note per Babbo Natale');
  expect(text).toContain('20:45');
 });
 it('auto-email templates distinguish received from confirmed, and promote Christmas links',()=>{
  const b=make(1);
  const req=santaRequestEmail(b);
  expect(req.from).toBe(SANTA_SENDER);
  expect(req.html).toContain('La visita non è ancora confermata');
  expect(req.html).toContain('l’orario definitivo');
  expect(req.html).toContain('Calendario dell’Avvento');
  expect(req.html).toContain('/calendario');
  expect(req.html).toContain('/casetta');
  expect(req.html).toContain('/regali');
  expect(req.html).toContain('/albero');
  expect(req.html).toContain('fuori dalla porta');
  expect(req.html).not.toContain('Fascia preferita');
  expect(()=>santaConfirmedEmail(b)).toThrow();
  expect(santaConfirmedEmail({...b,confirmedTime:'21:15'}).html).toContain('21:15');
 });
 it('stores demo requests, resets them on activation, and protects mailing',()=>{
  const sql=readFileSync('drizzle/migrations/0039_santa_demo_manual_board.sql','utf8');
  const publicFn=readFileSync('src/lib/santa-public.functions.ts','utf8');
  const adminFn=readFileSync('src/lib/santa-admin.functions.ts','utf8');
  const sender=readFileSync('src/lib/santa-mail.server.ts','utf8');
  const ui=readFileSync('src/routes/babbo-natale.organizzatori.tsx','utf8');
  expect(sql).toContain("mode text NOT NULL DEFAULT 'demo'");
  expect(sql).toContain("UPDATE public.santa_admin_settings SET mode='demo',requests_open=true");
  expect(sql).toContain("DELETE FROM public.santa_bookings WHERE mode='demo'");
  expect(sql).toContain('santa_board_save');
  expect(sql).toContain('santa_mail_outbox');
  expect(sql).toContain("AFTER INSERT OR UPDATE OF status");
  expect(publicFn).toContain("santaCreateRequest");
  expect(publicFn).toContain("requestId");
  expect(publicFn).toContain('privacy_accepted_at');
  expect(sender).toContain("if(b.mode==='demo')");
  expect(sender).toContain("santa_admin_allowlist");
  expect(adminFn).toContain('santaAdminBoardSave');
  expect(adminFn).toContain('santaAdminLocate');
  expect(adminFn).toContain('verifyPassword(data.password,verifier)');
  expect(ui).toContain('onDragStart');
  expect(ui).toContain('onDrop');
  expect(ui).toContain('Da assegnare');
  expect(ui).toContain('SantaRouteMap bookings={records}');
  expect(ui).toContain('Scarica Excel');
 });
 it('rejects other origins but allows direct Lovable preview and official site',()=>{
  expect(santaOriginAllowed('https://natale.crimonza.org')).toBe(true);
  expect(santaOriginAllowed('https://id-preview--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app')).toBe(true);
  expect(santaOriginAllowed('https://id-preview-1--f6dd90ba-cd6d-4316-8b9b-58f8b12e499e.lovable.app')).toBe(true);
  expect(santaOriginAllowed('https://malicious.lovable.app')).toBe(false);
  expect(santaOriginAllowed('https://natale.crimonza.org.evil.com')).toBe(false);
  expect(santaOriginAllowed(null)).toBe(false);
 });
});
