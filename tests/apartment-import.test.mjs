import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentRows,validateApartments,hasApartmentConflict,validProjectFile} from '../src/lib/apartment-import.ts';
test('French and Hebrew tables map columns without accepting project or owner IDs',()=>{
 const rows=validateApartments(apartmentRows([['Numéro','Étage','Pièces','Prix','project_id'],['02','-1','3','3 487 725','bad']]));
 assert.deepEqual(rows,[{apartment_number:'02',floor:-1,rooms:3,price:3487725}]);
 assert.equal(validateApartments(apartmentRows([['דירה','מחיר'],['2','4,730,100']]))[0].price,4730100);
});
test('decimal comma and explicit booleans; missing amenities remain unknown',()=>{
 const [row]=validateApartments([{reference:'A2',area:'72,39',price:'3,487,725',parking:'non',storage:null}]);
 assert.equal(row.area,72.39);assert.equal(row.parking,false);assert.equal('storage' in row,false);
 assert.equal('created_by' in validateApartments([{reference:'A',created_by:'attacker'}])[0],false);
});
test('reject invalid values, missing identifiers, duplicate columns and duplicate identifiers',()=>{
 for(const row of [{rooms:-1},{price:true},{price:'abc'},{price:' '},{floor:1.5},{parking:'unknown'},{area:Infinity}])assert.throws(()=>validateApartments([{reference:'A',...row}]));
 assert.throws(()=>validateApartments([{price:3}]));assert.throws(()=>validateApartments([{reference:'A'},{reference:' a '}]));
 assert.throws(()=>apartmentRows([['Numéro','apartment_number'],['1','2']]));
 assert.throws(()=>validateApartments([{apartment_number:9007199254740992}]));
});
test('same-project conflicts detect either reference or apartment number',()=>{
 assert.equal(hasApartmentConflict([{reference:'A',apartment_number:'1'}],[{reference:'a'}]),true);
 assert.equal(hasApartmentConflict([{apartment_number:'1'}],[{apartment_number:'1'}]),true);
 assert.equal(hasApartmentConflict([{reference:'B'}],[{reference:'A'}]),false);
});
test('uploads reject unsupported formats and oversized or empty files',()=>{
 for(const name of ['plan.PDF','prix.xlsx','prix.XLS'])assert.equal(validProjectFile({name,size:100}),true);
 for(const file of [{name:'a.html',size:10},{name:'a.pdf',size:0},{name:'a.png',size:21*1024*1024},{name:'a.xlsm',size:100},{name:'a.xlsx',size:0},{name:'a.xls',size:21*1024*1024}])assert.equal(validProjectFile(file),false);
});
