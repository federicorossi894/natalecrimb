import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { reportHtml,receiptHtml,romeClock,type CasettaReport } from '@/lib/casetta-report.server';
import { casettaXlsx } from '@/lib/casetta-export-xlsx.server';

const sql=readFileSync('drizzle/migrations/0023_casetta_cassa.sql','utf8');
const ui=readFileSync('src/routes/cassa.tsx','utf8');
const receipt={
 id:'d66a06a8-778d-4214-8e8b-a3c90c9d4444',
 claim:'e43f34a9-5e28-4d34-8e24-2dfe0a82c999',
 email:'person@example.org',mode:'live' as const,firstName:'Giulia',totalCents:2200,createdAt:'2026-11-22T11:00:00Z',
 items:[{label:'Panettone cartone',quantity:1,totalCents:1400},{label:'Cioccolatini',quantity:1,totalCents:800}],
};
const report:CasettaReport={
 date:'2026-11-22',finance:{totalCents:3200,cashCents:2000,posCents:1200,transactions:3},
 cumulativeCents:9400,
 stock:[{id:'panettone_cartone',label:'Panettone cartone',quantity:2,totalCents:2800},
 {id:'riso_500',label:'Riso 500 g',quantity:1,totalCents:400}],
 hourly:[{hour:8,todayCents:800,averageCents:500},{hour:9,todayCents:2400,averageCents:900}],
 daily:[{date:'2026-11-21',totalCents:6200},{date:'2026-11-22',totalCents:3200}],
};
describe('Casetta register: isolated no-login 08–20 service',()=>{
 it('demo receipts are visibly marked as a simulation and internal reports remain paused',()=>{
  expect(receiptHtml({...receipt,mode:'test'})).toContain('SIMULAZIONE / DEMO');
  expect(receiptHtml(receipt)).not.toContain('SIMULAZIONE / DEMO');
  const handler=readFileSync('src/routes/api/internal/casetta-daily-report.ts','utf8');
  expect(handler).toContain("catalog.mode==='live'");
  expect(handler).toContain('demo_reports_paused');
  const migration=readFileSync('drizzle/migrations/0025_casetta_demo_optin_email.sql','utf8');
  expect(migration).toContain("WHERE mode IN ('live','test')");
  expect(migration).toContain("CASE WHEN v_email IS NOT NULL THEN 'pending'");
 });
 it('generates a valid Office Open XML ZIP with private payment rows and eight product columns',()=>{
  const products=[
   {id:'panettone_cartone',label:'Panettone cartone'},
   {id:'riso_500',label:'Riso 500 g'},
  ];
  const bytes=casettaXlsx([{
   date:'22/11/2026 10:34',firstName:'Giulia',lastName:'Rossi',amountCents:1900,
   method:'pos',quantities:{panettone_cartone:1,riso_500:1},
  }],products);
  expect(bytes[0]).toBe(0x50);expect(bytes[1]).toBe(0x4b);
  const raw=new TextDecoder().decode(bytes);
  expect(raw).toContain('xl/worksheets/sheet1.xml');
  expect(raw).toContain('Giulia');
  expect(raw).toContain('Rossi');
  expect(raw.includes('>Contanti<')).toBe(false);
  expect(raw).toContain('POS');
  expect(raw).toContain('Panettone cartone');
  expect(raw).toContain('Riso 500 g');
  expect(raw).toContain('<v>19</v>');
  expect(raw).toContain('autoFilter');
  expect(raw).toContain('frozen');
 });
 it('requires names, opt-in customer email and keeps ledger link private',()=>{
  const current=readFileSync('src/routes/cassa.tsx','utf8');
  const server=readFileSync('src/lib/casetta-cassa.functions.ts','utf8');
  const migration=readFileSync('drizzle/migrations/0024_casetta_nominativi_export.sql','utf8');
  const route=readFileSync('src/routes/api/public/casetta-export.ts','utf8');
  expect(current).toContain('Dati cliente · obbligatori');
  expect(current).toContain('Il cliente desidera ricevere l’email');
  expect(server).toContain('_first_name:data.firstName');
  expect(server).toContain('_last_name:data.lastName');
  expect(migration).toContain('casetta_export_tokens');
  expect(migration).toContain("interval '7 days'");
  expect(route).toContain("'Cache-Control':'private, no-store, max-age=0'");
  expect(route).toContain('casetta_export_sales');
  expect(reportHtml(report,'finance','https://natale.crimonza.org/api/public/casetta-export?token=test'))
    .toContain('Scarica Excel vendite');
 });

 it('handles DST correctly in Europe/Rome',()=>{
  expect(romeClock(new Date('2026-03-29T05:59:00Z')).hour).toBe(7);
  expect(romeClock(new Date('2026-03-29T06:00:00Z')).hour).toBe(8);
  expect(romeClock(new Date('2026-10-25T19:00:00Z')).hour).toBe(20);
  expect(romeClock(new Date('2026-11-22T19:00:00Z')).hour).toBe(20);
 });
 it('separates finance and stock recipients',()=>{
  const finance=reportHtml(report,'finance');
  const stock=reportHtml(report,'stock');
  expect(finance).toContain('94,00');
  expect(finance).toContain('Andamento ultimi 7 giorni');
  expect(finance).not.toContain('Panettone cartone');
  expect(finance).not.toContain('Vendite per orario');
  expect(stock).toContain('Panettone cartone');
  expect(stock).toContain('Vendite per orario');
  expect(stock).toContain('Quantità vendute, non giacenze');
 });
 it('sends a non-fiscal purchase summary and online gift invitation',()=>{
  const html=receiptHtml(receipt);
  expect(html).toContain('Conferma informativa non fiscale');
  expect(html).toContain('https://natale.crimonza.org/regali');
  expect(html).toContain('Panettone cartone');
  expect(html).toContain('22,00');
  expect(html).toContain('Croce Rossa Italiana');
  expect(html).toContain('Comitato di Monza');
  expect(html).toContain('cri-rosso-orizzontale.png');
  expect(html).toContain('La magia può continuare');
  expect(html).toContain('Grazie, Giulia.');
  expect(html).toContain('Non è un’iscrizione a newsletter');
  expect(html).not.toContain('❌');
  expect(html).toContain('https://natale.crimonza.org/privacy');

 });
 it('does not require a QR, password or admin interface',()=>{
  expect(ui).toContain("createFileRoute('/cassa')");
  expect(ui).not.toContain('casettaActivateQr');
  expect(ui).not.toContain('password');
  expect(ui).toContain('noindex, nofollow, noarchive');
 });
 it('keeps test sales out of financial reports and closes at 20:00',()=>{
  expect(sql).toContain("DEFAULT 'test'");
  expect(sql).toContain("WHERE mode='live'");
  expect(sql).toContain("time '08:00'");
  expect(sql).toContain("time '20:00'");
  expect(sql).toContain('UNIQUE');
  expect(sql).toContain('REVOKE ALL ON TABLE');
  expect(sql).toContain('REVOKE ALL ON FUNCTION');
 });
 it('uses the exact eight-item listino',()=>{
  for(const sku of ['panettone_cartone','latta_panettone_pandoro','cioccolatini','tisane_etiche',
    'riso_500','riso_1000','the_verde_rosso','bastoncino_zucchero'])expect(sql).toContain(sku);
 });
});
