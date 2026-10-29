export type ImportLead={line:number;name:string;email:string;phone:string;country:string;received_on:string;received_time:string;objective:string;deadline:string;commercial:string;issue:string;duplicate:boolean;swapped:boolean};
export function phoneKey(value:string){return value.replace(/^p:/i,'').replace(/[^\d]/g,'').replace(/^00/,'');}
export function splitDelimited(text:string,delimiter:string){
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('quoted');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]/g,'');
const monthNames=['janv','fevr','mars','avr','mai','juin','juil','aout','sept','oct','nov','dec'];
export function receptionDate(raw:string,year:number,fallback:string){
 let value=raw.trim();if(!value)return fallback;
 let m=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);let y:number,d:number,month:number;
 if(m){y=+m[1];month=+m[2];d=+m[3];}else{m=normalize(value).match(/^(\d{1,2})([a-z]+)(\d{4})?$/);if(m){d=+m[1];month=monthNames.findIndex(n=>m![2].startsWith(n))+1;y=m[3]?+m[3]:year;}else{m=value.match(/^(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{4}))?$/);if(!m)return '';d=+m[1];month=+m[2];y=m[3]?+m[3]:year;}}
 const date=new Date(Date.UTC(y,month-1,d));return y>=1900&&y<=2200&&date.getUTCFullYear()===y&&date.getUTCMonth()===month-1&&date.getUTCDate()===d?`${y}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
}
export function parseLeads(matrix:string[][],year:number,fallback:string,existing:{email?:unknown;phone?:unknown}[]=[]){
 const first=matrix.findIndex(r=>r.some(s=>s.trim()));if(first<0)return [];
 const header=matrix[first].map(normalize);const index=(keys:string[])=>header.findIndex(h=>keys.includes(h));
 const name=index(['nom','name','fullname']);if(name<0)throw new Error('headers');
 const keys={email:index(['email','mail']),phone:index(['telephone','tel','phone']),country:index(['pays','country']),date:index(['date','datedereception','receivedon']),time:index(['heure','time']),objective:index(['objectifdecetachat','objectif','objective']),deadline:index(['delaidachat','delai','deadline']),commercial:index(['משווקמטפל','commercial','responsable'])};
 if(keys.date<0&&header[0]==='')keys.date=0;
 const emails=new Set(existing.map(p=>String(p.email??'').trim().toLowerCase()).filter(Boolean)),phones=new Set(existing.map(p=>phoneKey(String(p.phone??''))).filter(Boolean));
 return matrix.slice(first+1).flatMap((r,i)=>{
  if(!r.some(s=>s.trim()))return [];const get=(n:number)=>n<0?'':String(r[n]??'').trim();let email=get(keys.email),rawPhone=get(keys.phone);const swapped=/^(?:p:\s*)?\+?[\d\s().-]{5,}$/i.test(email)&&(!rawPhone||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawPhone));if(swapped)[email,rawPhone]=[rawPhone,email];const phone=rawPhone.replace(/^p:/i,'').trim(),received_on=receptionDate(get(keys.date),year,fallback),received_time=get(keys.time);
  const duplicate=!!((email&&emails.has(email.toLowerCase()))||(phoneKey(phone)&&phones.has(phoneKey(phone))));
  let issue=!get(name)?'name':!received_on?'date':received_time&&!/^([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(received_time)?'time':email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?'email':'';
  if(!issue){if(email)emails.add(email.toLowerCase());if(phoneKey(phone))phones.add(phoneKey(phone));}
  return [{line:first+i+2,name:get(name),email,phone,country:get(keys.country),received_on,received_time,objective:get(keys.objective),deadline:get(keys.deadline),commercial:get(keys.commercial),issue,duplicate,swapped}];
 });
}
