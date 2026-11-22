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
 date:'2026-11-22',finance:{totalCents:3200,cashCents:2000,posCents:1200,transactions:3,preUseCents:0,preUseUnits:0,preUseGroups:0,unallocatedCents:0},
 cumulativeCents:9400,
 stock:[{id:'panettone_cartone',label:'Panettone cartone',quantity:2,totalCents:2800},
 {id:'riso_500',label:'Riso 500 g',quantity:1,totalCents:400}],
 hourly:[{hour:8,todayCents:800,averageCents:500},{hour:9,todayCents:2400,averageCents:900}],
 daily:[{date:'2026-11-21',totalCents:6200},{date:'2026-11-22',totalCents:3200}],
};
describe('Casetta register: isolated no-login 08–20 service',()=>{
 it('shows Michela available stock and low/out/unknown warnings, not Manuela',()=>{
  const inventory=[
   {id:'panettone_cartone',label:'Panettone cartone',openingQty:20,receivedToday:10,soldToday:3,availableQty:4,thresholdQty:5,status:'low' as const,preUseSoldToday:0,preUsePending:2},
   {id:'riso_500',label:'Riso 500 g',openingQty:5,receivedToday:0,soldToday:2,availableQty:0,thresholdQty:5,status:'out' as const,preUseSoldToday:0,preUsePending:0},
   {id:'riso_1000',label:'Riso 1 kg',openingQty:null,receivedToday:0,soldToday:0,availableQty:null,thresholdQty:5,status:'unknown' as const,preUseSoldToday:0,preUsePending:0},
  ];
  const stock=reportHtml(report,'stock',undefined,inventory);
  expect(stock).toContain('Magazzino · giacenze residue');
  expect(stock).toContain('SCORTA BASSA');
  expect(stock).toContain('ESAURITO');
  expect(stock).toContain('Da censire');
  expect(stock).toContain('1 prodotti esauriti, 1 sotto soglia');
  expect(stock).toContain('ATTENZIONE · SCORTE DA RIASSORTIRE');
  expect(stock).toContain('Soglia: 5 pz');
  expect(stock).toContain('Giacenze ancora da censire');
  expect(stock).toContain('Pre-utilizzo cassa · scorte da riconciliare');
  expect(stock).toContain('2 pz da riconciliare');
  expect(stock).toContain('Le prove DEMO non scalano nulla');
  expect(reportHtml(report,'finance',undefined,inventory)).not.toContain('Magazzino · giacenze residue');
 });
 it('inventory snapshot ignores demo sales and does not assume unknown stock is zero',()=>{
  const migration=readFileSync('drizzle/migrations/0026_casetta_inventory.sql','utf8');
  expect(migration).toContain("sa.mode='live'");
  expect(migration).toContain('WHEN c.opening_qty IS NULL THEN NULL');
  expect(migration).toContain('casetta_inventory_movements');
  expect(migration).toContain('external_ref text NOT NULL UNIQUE');
  expect(migration).toContain('low_stock_threshold integer NOT NULL DEFAULT 5');
  expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
  const cron=readFileSync('src/routes/api/internal/casetta-daily-report.ts','utf8');
  expect(cron).toContain("catalog.mode==='live'");
 });

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
  expect(raw).toContain('Origine');
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
  expect(current).toContain('Il cliente desidera ricevere via email la ricevuta NON fiscale e il messaggio di ringraziamento?');
  expect(current).toContain('ricevuta NON fiscale con il riepilogo');
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
 it('accounts for paper sales separately and sends managerial reports from 19:00',()=>{
  const history=readFileSync('drizzle/migrations/0028_casetta_preuse_sales.sql','utf8');
  const reporting=readFileSync('drizzle/migrations/0029_casetta_preuse_reporting_19.sql','utf8');
  const mail=readFileSync('src/lib/casetta-report.server.ts','utf8');
  const exportCode=readFileSync('src/lib/casetta-export-xlsx.server.ts','utf8');
  expect(history).toContain("('2026-11-21','the_verde_rosso',6,500)");
  expect(history).toContain("('2026-11-21','cioccolatini',3,1000)");
  expect(history).toContain("ON CONFLICT(sale_day,product_id) DO NOTHING");
  expect(history).toContain("stock_reconciliation text NOT NULL DEFAULT 'pending'");
  expect(reporting).toContain("public.casetta_daily_report_base(_day)");
  expect(reporting).toContain("public.casetta_inventory_snapshot_base(_day)");
  expect(reporting).toContain("preUseCents");
  expect(reporting).toContain("time '19:00'");
  expect(mail).toContain('if(hour<19)');
  expect(mail).toContain('Pre-utilizzo cassa · metodo non rilevato');
  expect(exportCode).toContain("'Pagamento','Origine'");
  expect(exportCode).toContain("'Non rilevato'");
  const historicalXlsx=casettaXlsx([{
    date:'21/11/2026',firstName:'',lastName:'',amountCents:3000,
    method:'unknown',source:'Pre-utilizzo cassa',quantities:{the_verde_rosso:6},
  }],[{id:'the_verde_rosso',label:'Tè verde / rosso'}]);
  const xml=new TextDecoder().decode(historicalXlsx);
  expect(xml).toContain('Pre-utilizzo cassa');
  expect(xml).toContain('Non rilevato');
  expect(xml).toContain('<v>6</v>');
 });
 it('separates finance and stock recipients',()=>{
  const finance=reportHtml(report,'finance');
  const stock=reportHtml(report,'stock');
  expect(finance).toContain('94,00');
  expect(finance).toContain('Andamento ultimi 7 giorni');
  expect(finance).not.toContain('Panettone cartone');
  expect(finance).not.toContain('Vendite per orario');
  expect(stock).toContain('Panettone cartone');
  expect(finance).toContain('cri-monza-email-v2.png');
  expect(stock).toContain('cri-monza-email-v2.png');
  expect(finance).toContain('href="https://natale.crimonza.org/"');
  expect(stock).toContain('Vendite per orario');
  expect(stock).toContain('Quantità vendute, non giacenze');
 });
 it('sends a non-fiscal purchase summary and online gift invitation',()=>{
  const html=receiptHtml(receipt);
  expect(html).toContain('Conferma informativa non fiscale');
  expect(html).toContain('href="https://natale.crimonza.org/"');
  expect(html).not.toContain('href="https://natale.crimonza.org/regali"');
  expect(html).toContain('Panettone cartone');
  expect(html).toContain('22,00');
  expect(html).toContain('Croce Rossa Italiana');
  expect(html).toContain('Comitato di Monza');
  expect(html).toContain('cri-monza-email-v2.png');
  expect(html).toContain('https://natale.crimonza.org/calendario');
  expect(html).toContain('Il Calendario della Gentilezza');
  expect(html).not.toContain('margin:-37px');
  expect(html).toContain('La magia può continuare');
  expect(html).toContain('Scopri il Natale che fa bene');
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
 it('keeps the original eight SKUs and adds separate pandoro with Michela initial stock',()=>{
  const initial=readFileSync('drizzle/migrations/0027_casetta_scorte_iniziali_20261122.sql','utf8');
  expect(initial).toContain("('panettone_cartone',100,15)");
  expect(initial).toContain("('latta_panettone_pandoro',36,8)");
  expect(initial).toContain("('pandoro',10,4)");
  expect(initial).toContain("('cioccolatini',73,12)");
  expect(initial).toContain("('riso_500',60,10)");
  expect(initial).toContain("('riso_1000',12,4)");
  expect(initial).toContain("INSERT INTO public.casetta_products");
  expect(initial).toContain("c.opening_qty IS NULL");
  expect(initial).toContain("mode FROM public.casetta_settings");
  const reportCode=readFileSync('src/lib/casetta-report.server.ts','utf8');
  expect(reportCode).toContain("const STOCK='monza.sviluppo@lombardia.cri.it'");
  expect(reportCode).toContain("const AUDIT_BCC='federico.rossi@crimonza.org'");
  expect(reportCode).not.toContain("r.mode==='test'?AUDIT_BCC:undefined");
  expect(reportCode).toContain("receiptHtml(r),'casetta-ricevuta-'+r.id);");
  expect(reportCode).toContain("'casetta-'+audience+'-'+date,audience==='stock'?AUDIT_BCC:undefined");
  for(const sku of ['panettone_cartone','latta_panettone_pandoro','cioccolatini','tisane_etiche',
    'riso_500','riso_1000','the_verde_rosso','bastoncino_zucchero'])expect(sql).toContain(sku);
 });
});
