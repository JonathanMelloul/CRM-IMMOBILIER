export function whatsappNumber(value:string,country=''):string|null {
 const raw=value.trim().replace(/^p:\s*/i,'');
 if(!/^[+\d\s().-]+$/.test(raw))return null;
 const normalized=raw.replace(/^((?:\+|00)(?:33|972))\s*\(0\)/,'$1').replace(/[\s().-]/g,'');
 let digits:string;
 if(/^\+[1-9]\d{7,14}$/.test(normalized))digits=normalized.slice(1);
 else if(/^00[1-9]\d{7,14}$/.test(normalized))digits=normalized.slice(2);
 else {
  const region=country.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/^(?:33\d{9}|972\d{8,9})$/.test(normalized))digits=normalized;
  else if(['fr','fra','france','צרפת'].includes(region)&&/^0?[1-9]\d{8}$/.test(normalized))digits='33'+normalized.replace(/^0/,'');
  else if(['il','isr','israel','ישראל'].includes(region)&&/^0?[1-9]\d{7,8}$/.test(normalized))digits='972'+normalized.replace(/^0/,'');
  else return null;
 }
 return digits;
}
