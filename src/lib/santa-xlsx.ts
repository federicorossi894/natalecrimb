/** Offline XLSX export: general register and one printable sheet per Santa team.
 * Runs only in the authenticated administrator browser after data is fetched.
 * No spreadsheet content is uploaded to third-party services.
 */
import type {SantaBooking,SantaTeam} from './santa-planner';
const utf8=new TextEncoder();
const escapeXml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\u0000-\u001F]/g,' ');
const col=(n:number)=>{let s='';for(let i=n+1;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const cell=(ref:string,v:string|number)=>typeof v==='number'
 ?`<c r="${ref}"><v>${v}</v></c>`
 :`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`;
function sheet(headers:string[],rows:Array<Array<string|number>>){
 const xmlRows=[headers,...rows].map((r,i)=>
  `<row r="${i+1}">${r.map((v,j)=>cell(col(j)+(i+1),v)).join('')}</row>`).join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
  '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
  '<cols>'+headers.map((_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===6||i===8?42:22}" customWidth="1"/>`).join('')+'</cols>'+
  '<sheetData>'+xmlRows+'</sheetData>'+
  `<autoFilter ref="A1:${col(headers.length-1)}${Math.max(2,rows.length+1)}"/>`+
  '<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/></worksheet>';
}
const u16=(d:DataView,i:number,v:number)=>d.setUint16(i,v,true);
const u32=(d:DataView,i:number,v:number)=>d.setUint32(i,v>>>0,true);
function crc32(data:Uint8Array){
 let crc=0xffffffff;for(const byte of data){crc^=byte;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function zip(files:Array<[string,string]>){
 const parts:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;
 for(const [name,value] of files){
  const nameB=utf8.encode(name),data=utf8.encode(value),crc=crc32(data);
  const local=new Uint8Array(30+nameB.length),v=new DataView(local.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);
  u16(v,26,nameB.length);local.set(nameB,30);parts.push(local,data);
  const cd=new Uint8Array(46+nameB.length),w=new DataView(cd.buffer);
  u32(w,0,0x02014b50);u16(w,4,20);u16(w,6,20);u32(w,16,crc);u32(w,20,data.length);
  u32(w,24,data.length);u16(w,28,nameB.length);u32(w,42,offset);cd.set(nameB,46);central.push(cd);
  offset+=local.length+data.length;
 }
 const size=central.reduce((sum,a)=>sum+a.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);
 u32(view,0,0x06054b50);u16(view,8,files.length);u16(view,10,files.length);u32(view,12,size);u32(view,16,offset);
 const data=new Uint8Array(offset+size+22);let i=0;
 for(const a of [...parts,...central,end]){data.set(a,i);i+=a.length;}
 return data;
}
const headers=[
 'ID richiesta','Stato','Nome','Cognome','Email','Telefono','Indirizzo','Località',
 'Bambini','Note per Babbo Natale','Offerta proposta (€)','Incassato (€)',
 'Squadra','Ordine visita','Orario definitivo','Coordinate','Origine'
];
const euro=(x:number)=>(x/100).toFixed(2);
const row=(b:SantaBooking):Array<string|number>=>
 [b.id,b.status,b.nome,b.cognome,b.email,b.telefono,b.indirizzo,b.localita,
 b.bambini.join(', '),b.note,euro(b.quotaOffertaCents),euro(b.quotaIncassataCents),
 b.squadra??'',b.teamPosition??'',b.confirmedTime??'',
 b.lat!==null&&b.lon!==null?b.lat+','+b.lon:'',b.mode];
export function santaXlsx(bookings:SantaBooking[],teams:SantaTeam[]){
 if(bookings.length>400)throw new Error('Esportazione troppo grande.');
 const sheets=[{name:'Tutte le richieste',data:sheet(headers,bookings.map(row))}];
 for(const team of teams){
  const th=['Tappa','Orario definitivo','Famiglia','Telefono','Indirizzo',
   'Località','Email','Bambini','Note per Babbo Natale','Offerta proposta (€)',
   'Incassato (€)','Stato','ID richiesta','Link Maps'];
  const rows=team.bookings.map((b,i)=>[
   b.teamPosition??i+1,b.confirmedTime??'',b.nome+' '+b.cognome,b.telefono,
   b.indirizzo,b.localita,b.email,b.bambini.join(', '),b.note,
   euro(b.quotaOffertaCents),euro(b.quotaIncassataCents),b.status,b.id,
   b.lat!==null&&b.lon!==null
    ?'https://www.google.com/maps/search/?api=1&query='+b.lat+','+b.lon:''
  ] as Array<string|number>);
  sheets.push({name:team.id,data:sheet(th,rows)});
 }
 const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
  sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+
  '</Types>';
 const rel='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
 const wb='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
  '<sheets>'+sheets.map((s,i)=>`<sheet name="${escapeXml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>';
 const wr='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+
  '</Relationships>';
 return zip([['[Content_Types].xml',types],['_rels/.rels',rel],
  ['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',wr],
  ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,s.data] as [string,string])]);
}
