import test from 'node:test';import assert from 'node:assert/strict';
import {emptyTemplate,cents,total,encodeTemplate,decodeTemplate,convertToEuro,applyExchange} from '../src/lib/payment-template.ts';
test('new sheet has blank values and preserves typed labels and both currencies',()=>{const sheet=emptyTemplate(['Taxe']);assert.equal(sheet.signature[0].ils,'');assert.equal(sheet.priceIls,'');sheet.signature[0]={label:'7%',ils:'1 234,56',eur:'350.25'};assert.deepEqual(decodeTemplate(encodeTemplate(sheet)),sheet);});
test('currency totals use exact cents and blank totals stay blank',()=>{assert.equal(total([{label:'',ils:'0.10',eur:''},{label:'',ils:'0.20',eur:''}],'ils'),30);assert.equal(total([{label:'',ils:'',eur:''}],'eur'),null);assert.throws(()=>cents('-1'));assert.throws(()=>cents('1.234'));});
test('old plain text conditions are never parsed as a sheet',()=>{assert.equal(decodeTemplate('Anciennes conditions'),null);assert.equal(decodeTemplate('YI_PAYMENT_TEMPLATE_V1\n{"version":1}'),null);});
test('convert shekels to euros by dividing, rounding cents and retaining rate date',()=>{assert.equal(convertToEuro('3436.10',3.4361),'1000.00');assert.equal(convertToEuro('',3.4361),'');assert.throws(()=>convertToEuro('100',0));const sheet=emptyTemplate(['Taxe']);sheet.signature[0].ils='100';sheet.signature[0].eur='999';const result=applyExchange(sheet,3.4361,'2026-10-07T12:22:04Z');assert.equal(result.signature[0].eur,'29.10');assert.equal(result.exchangeRate,3.4361);assert.equal(result.exchangeDate,'2026-10-07T12:22:04Z');assert.equal(sheet.signature[0].eur,'999');});
test('percentages calculate installments, fees, euros and remaining balance from the property price',()=>{
 const sheet=emptyTemplate(['Taxe']);sheet.priceIls='1000000';sheet.signature[0].percentage='20';sheet.signature[1].percentage='7,5';sheet.fees[0].percentage='2';
 const result=applyExchange(sheet,4,'2026-10-28');
 assert.equal(result.signature[0].ils,'200000.00');assert.equal(result.signature[1].ils,'75000.00');assert.equal(result.signature[0].eur,'50000.00');assert.equal(result.fees[0].ils,'20000.00');assert.equal(result.delivery[0].ils,'725000.00');
 assert.equal(decodeTemplate(encodeTemplate(result)).signature[0].percentage,'20');
 assert.equal(applyExchange({...sheet,priceIls:'2000000'},4,'2026-10-28').signature[0].ils,'400000.00');
 assert.equal(sheet.signature[0].ils,'');
});
test('percentages validate bounds and round cents, while blank percentages preserve manual amounts',()=>{
 const sheet=emptyTemplate([]);sheet.priceIls='0.05';sheet.signature[0].percentage='10';assert.equal(applyExchange(sheet,4,'2026-10-28').signature[0].ils,'0.01');
 for(const invalid of ['-1','100.01','abc','1.234']){sheet.signature[0].percentage=invalid;assert.throws(()=>applyExchange(sheet,4,'2026-10-28'));assert.throws(()=>encodeTemplate(sheet));}
 sheet.signature[0].percentage='0';assert.equal(applyExchange(sheet,4,'2026-10-28').signature[0].ils,'0.00');
 sheet.signature[0]={label:'',ils:'0.02',eur:'',percentage:''};assert.equal(applyExchange(sheet,4,'2026-10-28').signature[0].ils,'0.02');
 sheet.signature[0].percentage='20';sheet.priceIls='';assert.equal(applyExchange(sheet,4,'2026-10-28').signature[0].ils,'');
 sheet.priceIls='100';sheet.signature[0].percentage='60';sheet.signature[1].percentage='50';assert.throws(()=>applyExchange(sheet,4,'2026-10-28'));
});
