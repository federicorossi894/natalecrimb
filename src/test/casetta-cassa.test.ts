import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { reportHtml,receiptHtml,romeClock,type CasettaReport } from '@/lib/casetta-report.server';
import { casettaXlsx } from '@/lib/casetta-export-xlsx.server';

const sql=readFileSync('drizzle/migrations/0023_casetta_cassa.sql','utf8');
const ui=readFileSync('src/routes/cassa.tsx','utf8');
const receipt={
 id:'d66a06a8-778d-4214-8e8b-a3c90c9d4444',
 claim:'e43f34a9-5e28-4d34-8e24-2dfe0a82c999',
 email:'person@example.org',mode:'live' as const,firstName:'Giulia',totalCents:2200,productsCents:2200,extraDonationCents:0,createdAt:'2026-11-22T11:00:00Z',
 items:[{label:'Panettone cartone',quantity:1,totalCents:1400},{label:'Cioccolatini',quantity:1,totalCents:800}],
};
const report:CasettaReport={
 date:'2026-11-22',finance:{totalCents:3200,productsCents:3200,extraDonationCents:0,cashCents:2000,posCents:1200,transactions:3,preUseCents:0,preUseUnits:0,preUseGroups:0,unallocatedCents:0},
 cumulativeCents:9400,cumulativeExtraDonationCents:0,
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
  expect(raw).toContain('Donazione extra (€)');
  expect(raw).toContain('Prodotti (€)');
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
  expect(mail).toContain('Vendite da registri cartacei');
  expect(mail).toContain('Di cui pagamento non rilevato');
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
  expect(finance).toContain('cri-emblema-email-192.png');
  expect(stock).toContain('cri-emblema-email-192.png');
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
  expect(html).toContain('cri-emblema-email-192.png');
  expect(html).not.toContain('cri-monza-email-v2.png');
  expect(html).toContain('font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700');
  expect(html).toContain('https://natale.crimonza.org/calendario');
  expect(html).toContain('Il nostro Calendario dell’Avvento');
  expect(html).toContain('Calendario della Gentilezza');
  expect(html).not.toContain('margin:-37px');
  expect(html).toContain('La magia può continuare');
  expect(html).toContain('Scopri il Natale che fa bene');
  expect(html).toContain('Grazie, Giulia.');
  expect(html).toContain('Non è un’iscrizione a newsletter');
  expect(html).not.toContain('❌');
  expect(html).toContain('https://natale.crimonza.org/privacy');

 });
 it('allows evening read-only preview of the actual checkout without recording sales',()=>{
  const ui=readFileSync('src/routes/cassa.tsx','utf8');
  const database=readFileSync('drizzle/migrations/0034_casetta_orario_09_19_live_24nov.sql','utf8');
  expect(ui).toContain('const preview=Boolean(catalog&&!catalog.open)');
  expect(ui).toContain('const canBrowse=Boolean(catalog&&online)');
  expect(ui).toContain('data-testid="casetta-readonly-preview"');
  expect(ui).toContain('Cassa chiusa · Anteprima');
  expect(ui).toContain("{catalog&&phase==='cart'&&");
  expect(ui).toContain("{catalog&&(phase==='review'||phase==='sending')&&");
  expect(ui).toContain('disabled={!canBrowse||!count}');
  expect(ui).toContain('disabled={!open||phase===\'sending\'} onClick={()=>void submit()}');
  expect(ui).toContain("if(!open||!lines.length||phase!=='review')return");
  expect(ui).toContain('CONFERMA NON DISPONIBILE IN ANTEPRIMA');
  expect(database).toContain("v_clock>=time '09:00' AND v_clock<time '19:00'");
  expect(database).toContain("time >= time '19:00'");
 });
 it('preserves paper morning and afternoon sales of 23/11 as 180 euro and 34 articles',()=>{
  const sql=readFileSync('drizzle/migrations/0035_casetta_cartaceo_23nov_mattina_pomeriggio.sql','utf8');
  expect(sql).toContain("('2026-11-23','mattina',2,'riso_500',12,500,'unknown'");
  expect(sql).toContain("('2026-11-23','pomeriggio',7,'riso_500',8,500,'pos'");
  expect(sql).toContain("('2026-11-23','pomeriggio',6,'riso_500',1,500,'cash'");
  expect(sql).toContain("('2026-11-23','pomeriggio',4,'cioccolatini',1,1000,'pos'");
  expect(sql).toContain("IF c<>11 OR amt<>18000 OR pieces<>34 OR pos_amount<>7000 OR cash_amount<>2000");
  expect(sql).toContain("OR unknown_amount<>9000");
  expect(sql).toContain("'apply_to_opening' ELSE 'pending'");
  expect(sql).toContain('ON CONFLICT(sale_day,shift,line_no) DO NOTHING');
  expect(sql).toContain('ON CONFLICT(sale_day,product_id) DO NOTHING');
  expect(sql).toContain("'unallocatedCents',pre_amount-v_paper_cash-v_paper_pos");
  expect(sql).toContain("NOT EXISTS (");
  expect(sql).toContain("casetta_paper_sale_lines");
  const email=reportHtml({...report,
    finance:{...report.finance,totalCents:18000,productsCents:18000,
      preUseCents:18000,preUseUnits:34,preUseGroups:4,
      cashCents:2000,posCents:7000,unallocatedCents:9000}
  },'finance');
  expect(email).toContain('Vendite da registri cartacei');
  expect(email).toContain('Di cui pagamento non rilevato');
  expect(email).toContain('180,00');
  expect(email).toContain('90,00');
 });
 it('requires a deliberate cash-or-POS choice and uses the corrected chocolate price',()=>{
  const current=readFileSync('src/routes/cassa.tsx','utf8');
  const server=readFileSync('src/lib/casetta-cassa.functions.ts','utf8');
  const migration=readFileSync('drizzle/migrations/0032_casetta_cioccolatini_7_euro_20261123.sql','utf8');
  const oldSql=readFileSync('drizzle/migrations/0031_casetta_extra_donazione.sql','utf8');
  expect(current).toContain("useState<Method|null>(null)");
  expect(current).toContain("setMethod(null);setRequestId('')");
  expect(current).toContain("if(method!=='cash'&&method!=='pos')");
  expect(current).toContain("Seleziona obbligatoriamente il metodo di pagamento");
  expect(current).toContain("Come ha pagato? *");
  expect(current).toContain("Seleziona CONTANTI o POS: il metodo di pagamento è obbligatorio.");
  expect(server).toContain("method:z.enum(['cash','pos'])");
  expect(oldSql).toContain("_method NOT IN('cash','pos')");
  expect(migration).toContain("price_cents=700");
  expect(migration).toContain("id='cioccolatini'");
  expect(migration).not.toContain("UPDATE public.casetta_sale_items");
  expect(migration).not.toContain("UPDATE public.casetta_preuse_sales");
 });
 it('keeps the customer email feature dormant but permits management reports from 24 November',()=>{
  const ui=readFileSync('src/routes/cassa.tsx','utf8');
  const server=readFileSync('src/lib/casetta-cassa.functions.ts','utf8');
  const reports=readFileSync('src/lib/casetta-report.server.ts','utf8');
  const sql=readFileSync('drizzle/migrations/0033_casetta_live_20261124_email_disattivate.sql','utf8');
  expect(ui).toContain('const CUSTOMER_EMAIL_ENABLED=false');
  expect(ui).toContain('{CUSTOMER_EMAIL_ENABLED&&<><label');
  expect(ui).toContain('email:CUSTOMER_EMAIL_ENABLED&&wantsEmail?email.trim()');
  expect(ui).not.toContain('Email al cliente solo se richiesta. Report delle 19:00 sospesi.');
  expect(server).toContain('_email:null,_client_tag:await tagFor(data.deviceId)');
  expect(reports).toContain('const CUSTOMER_RECEIPTS_ENABLED=false');
  expect(reports).toContain('if(!CUSTOMER_RECEIPTS_ENABLED)return {processed:0,outcomes:{}};');
  expect(reports).toContain("if(hour<19)");
  expect(sql).toContain('customer_receipts_enabled boolean NOT NULL DEFAULT false');
  expect(sql).toContain('casetta_activate_scheduled_live');
  expect(sql).toContain("2026-11-24T07:00:00+00");
  expect(sql).toContain("'0 7 24 11 *'");
  expect(sql).toContain("activation_done=true");
  expect(sql).toContain("live_from<now()");
  expect(sql).toContain("REVOKE ALL ON FUNCTION public.casetta_activate_scheduled_live()");
 });
 it('handles extra donation independently of products, email and daily totals',()=>{
  const mail=receiptHtml({...receipt,totalCents:2800,productsCents:2200,extraDonationCents:600});
  expect(mail).toContain('Donazione extra');
  expect(mail).toContain('6,00');
  expect(mail).toContain('28,00');
  const finance=reportHtml({
    ...report,cumulativeExtraDonationCents:600,
    finance:{...report.finance,totalCents:3800,productsCents:3200,extraDonationCents:600},
  },'finance');
  expect(finance).toContain('Di cui donazioni extra');
  expect(finance).toContain('6,00');
  expect(finance).toContain('Di cui prodotti');
  const book=new TextDecoder().decode(casettaXlsx([{
    date:'22/11/2026 11:00',firstName:'Mario',lastName:'Rossi',
    amountCents:2000,productsCents:1400,extraDonationCents:600,
    method:'pos',source:'Cassa',quantities:{panettone_cartone:1},
  }],[{id:'panettone_cartone',label:'Panettone cartone'}]));
  expect(book).toContain('Donazione extra (€)');
  expect(book).toContain('Totale incassato (€)');
  expect(book).toContain('<v>20</v>');
  expect(book).toContain('<v>14</v>');
  expect(book).toContain('<v>6</v>');
  const migration=readFileSync('drizzle/migrations/0031_casetta_extra_donazione.sql','utf8');
  expect(migration).toContain('extra_donation_cents integer NOT NULL DEFAULT 0');
  expect(migration).toContain("v_products:=v_products+v_product.price_cents*v_qty");
  expect(migration).toContain("v_total:=v_products+_extra_donation_cents");
  const uiCode=readFileSync('src/routes/cassa.tsx','utf8');
  expect(uiCode).toContain('Donazione extra?');
  expect(uiCode).toContain('donationEuroCents');
  expect(uiCode).toContain('TOTALE DA INCASSARE');
  const serverCode=readFileSync('src/lib/casetta-cassa.functions.ts','utf8');
  expect(serverCode).toContain('_extra_donation_cents:data.extraDonationCents');
  const apiCode=readFileSync('src/routes/api/public/casetta-export.ts','utf8');
  expect(apiCode).toContain("z.enum(['cash','pos','unknown'])");
 });
 it('does not require a QR, password or admin interface',()=>{
  expect(ui).toContain("createFileRoute('/cassa')");
  expect(ui).not.toContain('casettaActivateQr');
  expect(ui).not.toContain('password');
  expect(ui).toContain('noindex, nofollow, noarchive');
 });
 it('enforces the real Casetta opening hours 09:00–19:00 on all RPCs',()=>{
  const migration=readFileSync('drizzle/migrations/0034_casetta_orario_09_19_live_24nov.sql','utf8');
  const ui=readFileSync('src/routes/cassa.tsx','utf8');
  const server=readFileSync('src/lib/casetta-cassa.functions.ts','utf8');
  const runbook=readFileSync('docs/CASETTA_CASSA_ATTIVAZIONE.md','utf8');
  expect(migration).toContain("v_clock>=time '09:00' AND v_clock<time '19:00'");
  expect(migration).toContain("time < time '09:00'");
  expect(migration).toContain("time >= time '19:00'");
  expect(migration).toContain("proname='casetta_record_sale'");
  expect(migration).toContain('Expected exactly three protected checkout RPC signatures');
  expect(migration).toContain("'2026-11-24T08:00:00+00'");
  expect(migration).toContain("'0 8 24 11 *'");
  expect(migration).toContain("'*/2 8-18 * 11,12 *'");
  expect(migration).toContain("live_from<=now()");
  expect(ui).toContain('09:00 alle 19:00');
  expect(ui).toContain('Orario 09:00–19:00');
  expect(server).toContain('Cassa chiusa: aperta ogni giorno dalle 09:00 alle 19:00.');
  expect(runbook).toContain('**09:00–19:00 ora italiana**');
  expect(runbook).toContain('**24 novembre 2026, ore 09:00 italiane**');
  expect(runbook).not.toContain('L\'orario operativo della cassa continua a consentire inserimenti fino alle 20:00');
 });
 it('preserves historical DEMO schema rules as an archival migration',()=>{
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
