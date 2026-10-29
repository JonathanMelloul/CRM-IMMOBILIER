export type ApartmentDraft = Record<string,string|number|boolean>;
export const apartmentHeaderAliases:Record<string,string>={numero:'apartment_number',numerodappartement:'apartment_number',apartmentnumber:'apartment_number',דירה:'apartment_number',reference:'reference',etage:'floor',floor:'floor',קומה:'floor',pieces:'rooms',rooms:'rooms',חדרים:'rooms',surface:'surface',area:'area',שטחדירה:'area',terrasse:'terrace',terrace:'terrace',סהכמרפסות:'terrace',jardin:'garden',garden:'garden',חצר:'garden',prix:'price',price:'price',מחיר:'price',orientation:'direction',direction:'direction',כיווניאוויר:'direction',statut:'status',status:'status',notes:'notes',parking:'parking',cave:'storage',storage:'storage'};
export const normalizeApartmentHeader=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u05d0-\u05ea]/g,'');
const allowed=new Set(Object.values(apartmentHeaderAliases));
const numeric=new Set(['floor','rooms','area','surface','terrace','garden','price']);
export function apartmentRows(matrix:string[][]):Record<string,unknown>[] {
 const first=matrix.findIndex(row=>row.some(v=>v.trim()));if(first<0)throw Error('empty');
 const keys=matrix[first].map(h=>apartmentHeaderAliases[normalizeApartmentHeader(h)]??'');
 if(!keys.includes('apartment_number')&&!keys.includes('reference'))throw Error('headers');
 const known=keys.filter(Boolean);if(new Set(known).size!==known.length)throw Error('headers');
 return matrix.slice(first+1).filter(row=>row.some(v=>v.trim())).map(row=>Object.fromEntries(keys.flatMap((key,i)=>key?[[key,row[i]??'']]:[])));
}
export function validateApartments(input:unknown):ApartmentDraft[]{
 if(!Array.isArray(input)||!input.length||input.length>1000)throw Error('rows');
 const numbers=new Set<string>(),references=new Set<string>();
 return input.map(raw=>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('row');
  const row:ApartmentDraft={};
  for(const [key,value] of Object.entries(raw)){
   if(!allowed.has(key)||value===null||value===undefined||value==='')continue;
   if(typeof value!=='string'&&typeof value!=='number'&&typeof value!=='boolean')throw Error('value');
   if(numeric.has(key)){
    if(typeof value==='boolean')throw Error('number');
    const text=String(value).trim().replace(/[\s\u00a0₪]/g,'');
    const normalized=/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)?text.replace(/,/g,''):text.replace(',','.');
    if(!/^-?\d+(\.\d+)?$/.test(normalized))throw Error('number');
    const n=Number(normalized);if(!Number.isFinite(n)||(key!=='floor'&&n<0)||(key==='floor'&&!Number.isInteger(n)))throw Error('number');row[key]=n;
   }else if(key==='parking'||key==='storage'){
    const text=String(value).trim().toLowerCase();if(!['true','false','1','0','oui','non','yes','no','כן','לא'].includes(text))throw Error('boolean');row[key]=['true','1','oui','yes','כן'].includes(text);
   }else{
    if(typeof value!=='string'&&key!=='apartment_number'&&key!=='reference')throw Error('text');
    if(typeof value==='number'&&!Number.isSafeInteger(value))throw Error('identifier');
    const text=String(value).trim();if(text.length>(key==='notes'?10000:500))throw Error('length');if(text)row[key]=text;
   }
  }
  if(!row.apartment_number&&!row.reference)throw Error('identifier');
  for(const [key,seen] of [['apartment_number',numbers],['reference',references]] as const){const value=String(row[key]??'').trim().toLowerCase();if(value&&seen.has(value))throw Error('duplicate');if(value)seen.add(value);}
  return row;
 });
}
export function hasApartmentConflict(incoming:ApartmentDraft[],existing:Record<string,unknown>[]){
 return incoming.some(a=>existing.some(b=>['apartment_number','reference'].some(key=>a[key]!==undefined&&b[key]!==undefined&&b[key]!==null&&String(a[key]).trim().toLowerCase()===String(b[key]).trim().toLowerCase())));
}
export function validProjectFile(file:{name:string;size:number}){
 return file.size>0&&file.size<=20*1024*1024&&/\.(pdf|png|jpe?g|webp|xlsx|xls)$/i.test(file.name);
}
