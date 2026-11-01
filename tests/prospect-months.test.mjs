import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectMonth,prospectMonths,monthLabel} from '../src/lib/prospect-months.ts';

test('month folders separate years and keep missing or invalid reception dates unknown',()=>{
 const rows=[{id:'a',received_on:'2026-10-31'},{id:'b',received_on:'2027-01-01'},{id:'c',received_on:'2026-10-01'},
  {id:'d',received_on:null,created_at:'2027-01-01'},{id:'e',received_on:'2026-02-30'},{id:'f',received_on:'2026-13-01'}];
 assert.deepEqual(prospectMonths(rows),[['2027-01',1],['2026-10',2],['unknown',3]]);
 assert.deepEqual(rows.filter(r=>prospectMonth(r)==='2026-10').map(r=>r.id),['a','c']);
 assert.equal(rows.filter(r=>prospectMonth(r)==='2028-01').length,0);
 assert.deepEqual(prospectMonths([]),[]);
});

test('month labels include the year and remain stable across civil timezone boundaries',()=>{
 assert.equal(monthLabel('2026-10','fr'),'octobre 2026');
 assert.equal(monthLabel('2027-01','en'),'January 2027');
 assert.match(monthLabel('2027-01','he'),/2027/);
 assert.equal(prospectMonth({id:'leap',received_on:'2028-02-29'}),'2028-02');
});
