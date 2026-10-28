export type PaymentLine={label:string;ils:string;eur:string;percentage?:string};
export type PaymentTemplate={version:1;property:string;priceIls:string;priceEur:string;signature:PaymentLine[];delivery:PaymentLine[];fees:PaymentLine[];notes:string;exchangeRate?:number;exchangeDate?:string};
const prefix='YI_PAYMENT_TEMPLATE_V1\n';
export function emptyTemplate(feeLabels:string[]):PaymentTemplate{return {version:1,property:'',priceIls:'',priceEur:'',signature:[{label:'',ils:'',eur:''},{label:'',ils:'',eur:''}],delivery:[{label:'',ils:'',eur:''}],fees:feeLabels.map(label=>({label,ils:'',eur:''})),notes:''};}
export function cents(raw:string):number|null {if(!raw.trim())return null;const value=raw.trim().replace(/[\s\u00a0]/g,'').replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(value))throw new Error('money');const [whole,fraction='']=value.split('.');const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));if(!Number.isSafeInteger(result))throw new Error('money');return result;}
export function total(lines:PaymentLine[],currency:'ils'|'eur'):number|null{let sum=0,any=false;for(const line of lines){const amount=cents(line[currency]);if(amount!==null){sum+=amount;any=true;}}if(!Number.isSafeInteger(sum))throw new Error('money');return any?sum:null;}
export function encodeTemplate(value:PaymentTemplate):string{value=applyPercentages(value);for(const group of [value.signature,value.delivery,value.fees])if(group.length>100)throw new Error('length');for(const amount of [value.priceIls,value.priceEur,...[...value.signature,...value.delivery,...value.fees].flatMap(row=>[row.ils,row.eur])])cents(amount);for(const group of [value.signature,value.delivery,value.fees]){total(group,'ils');total(group,'eur');}const result=prefix+JSON.stringify(value);if(result.length>20000)throw new Error('length');return result;}
export function decodeTemplate(raw:string):PaymentTemplate|null{if(!raw.startsWith(prefix))return null;try{const value=JSON.parse(raw.slice(prefix.length));if(value.version!==1||!['property','priceIls','priceEur','notes'].every(key=>typeof value[key]==='string')||!['signature','delivery','fees'].every(key=>Array.isArray(value[key])&&value[key].length<=100&&value[key].every((row:PaymentLine)=>row&&['label','ils','eur'].every(k=>typeof row[k as keyof PaymentLine]==='string'))))return null;encodeTemplate(value);return value;}catch{return null;}}

export function convertToEuro(raw:string,rate:number):string{if(!Number.isFinite(rate)||rate<=0)throw new Error('money');const amount=cents(raw);if(amount===null)return '';const converted=Math.round(amount/rate);if(!Number.isSafeInteger(converted))throw new Error('money');return (converted/100).toFixed(2);}
export function applyExchange(value:PaymentTemplate,rate:number,date:string):PaymentTemplate{value=deliveryBalance(value);return {...value,exchangeRate:rate,exchangeDate:date,priceEur:convertToEuro(value.priceIls,rate),signature:value.signature.map(row=>({...row,eur:convertToEuro(row.ils,rate)})),delivery:value.delivery.map(row=>({...row,eur:convertToEuro(row.ils,rate)})),fees:value.fees.map(row=>({...row,eur:convertToEuro(row.ils,rate)}))};}

export function deliveryBalance(value:PaymentTemplate):PaymentTemplate{value=applyPercentages(value);const price=cents(value.priceIls);const paid=total(value.signature,'ils')??0;if(price!==null&&paid>price)throw new Error('money');const ils=price===null?'':((price-paid)/100).toFixed(2);let eur='';if(ils&&value.exchangeRate)eur=convertToEuro(ils,value.exchangeRate);else{const euroPrice=cents(value.priceEur);const euroPaid=total(value.signature,'eur')??0;if(euroPrice!==null&&euroPaid<=euroPrice)eur=((euroPrice-euroPaid)/100).toFixed(2);}return {...value,delivery:[{label:'',ils,eur}]};}

export function percentageAmount(price:string,percentage:string):string {
 const basisPoints=cents(percentage);
 if(basisPoints===null)return '';
 if(basisPoints>10000)throw new Error('money');
 const priceCents=cents(price);
 if(priceCents===null)return '';
 const result=(BigInt(priceCents)*BigInt(basisPoints)+5000n)/10000n;
 if(result>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('money');
 return `${result/100n}.${String(result%100n).padStart(2,'0')}`;
}
export function applyPercentages(value:PaymentTemplate):PaymentTemplate {
 return {...value,signature:value.signature.map(calculate),fees:value.fees.map(calculate)};
 function calculate(row:PaymentLine):PaymentLine {
  if(row.percentage===undefined)return row;
  if(typeof row.percentage!=='string')throw new Error('money');
  return row.percentage.trim()?{...row,ils:percentageAmount(value.priceIls,row.percentage)}:row;
 }
}
