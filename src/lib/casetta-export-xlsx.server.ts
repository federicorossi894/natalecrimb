/** Minimal, dependency-free XLSX writer for the private Casetta ledger.
 * Generates Office Open XML ZIP (stored entries) with styled headers,
 * autofilter, frozen first row, EUR currency and integer product quantities.
 */
export type CasettaExportRow={
  date:string;firstName:string;lastName:string;amountCents:number;
  method:'cash'|'pos';quantities:Record<string,number>;
};
export type CasettaExportProduct={id:string;label:string};
const enc=new TextEncoder();
const xml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&apos;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
function col(n:number){let s='';for(let i=n+1;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
function textCell(addr:string,value:string,style=0){
 return '<c r="'+addr+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>';
}
function numCell(addr:string,value:number,style=0){
 return '<c r="'+addr+'" s="'+style+'"><v>'+value+'</v></c>';
}
const tableTypes={
  types:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
  rels:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  workbook:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'+
    '<sheets><sheet name="Vendite Casetta" sheetId="1" r:id="rId1"/></sheets></workbook>',
  wbRels:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'+
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
  styles:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00 &quot;€&quot;"/></numFmts>'+
    '<fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts>'+
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173D30"/><bgColor indexed="64"/></patternFill></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/>'+
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
};
function crc32(data:Uint8Array){
 let c=0xffffffff;for(const byte of data){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}
 return (c^0xffffffff)>>>0;
}
function zip(files:Array<[string,string]>){
 const parts:Uint8Array[]=[];const central:Uint8Array[]=[];let offset=0;
 const u16=(d:DataView,o:number,v:number)=>d.setUint16(o,v,true);
 const u32=(d:DataView,o:number,v:number)=>d.setUint32(o,v>>>0,true);
 for(const [name,body] of files){
  const nameBytes=enc.encode(name),data=enc.encode(body),crc=crc32(data);
  const local=new Uint8Array(30+nameBytes.length),lv=new DataView(local.buffer);
  u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,8,0);u32(lv,14,crc);
  u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,nameBytes.length);
  local.set(nameBytes,30);parts.push(local,data);
  const cd=new Uint8Array(46+nameBytes.length),cv=new DataView(cd.buffer);
  u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u32(cv,16,crc);
  u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,nameBytes.length);
  u32(cv,42,offset);cd.set(nameBytes,46);central.push(cd);
  offset+=local.length+data.length;
 }
 const centralSize=central.reduce((n,x)=>n+x.length,0);
 const end=new Uint8Array(22),ev=new DataView(end.buffer);
 u32(ev,0,0x06054b50);u16(ev,8,files.length);u16(ev,10,files.length);
 u32(ev,12,centralSize);u32(ev,16,offset);
 const result=new Uint8Array(offset+centralSize+end.length);let at=0;
 for(const chunk of [...parts,...central,end]){result.set(chunk,at);at+=chunk.length;}
 return result;
}
export function casettaXlsx(rows:CasettaExportRow[],products:CasettaExportProduct[]){
 if(rows.length>100000)throw new Error('Esportazione troppo grande');
 const headers=['Data e ora','Nome','Cognome','Importo (€)','Pagamento',...products.map(p=>p.label)];
 const last=col(headers.length-1);
 const header='<row r="1" ht="31" customHeight="1">'+headers.map((h,i)=>textCell(col(i)+'1',h,1)).join('')+'</row>';
 const body=rows.map((r,i)=>{
  const n=i+2;
  const cells=[
   textCell('A'+n,r.date),textCell('B'+n,r.firstName),textCell('C'+n,r.lastName),
   numCell('D'+n,r.amountCents/100,2),textCell('E'+n,r.method==='cash'?'Contanti':'POS'),
   ...products.map((p,j)=>numCell(col(j+5)+n,r.quantities[p.id]||0)),
  ];
  return '<row r="'+n+'">'+cells.join('')+'</row>';
 }).join('');
 const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
  '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
  '<sheetFormatPr defaultRowHeight="19"/><cols>'+
  headers.map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(i===0?22:i===1||i===2?22:i===3?16:i===4?16:24)+'" customWidth="1"/>').join('')+
  '</cols><sheetData>'+header+body+'</sheetData>'+
  '<autoFilter ref="A1:'+last+Math.max(2,rows.length+1)+'"/></worksheet>';
 return zip([
  ['[Content_Types].xml',tableTypes.types],['_rels/.rels',tableTypes.rels],
  ['xl/workbook.xml',tableTypes.workbook],['xl/_rels/workbook.xml.rels',tableTypes.wbRels],
  ['xl/styles.xml',tableTypes.styles],['xl/worksheets/sheet1.xml',sheet],
 ]);
}
