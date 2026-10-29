import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {readApartmentWorkbook,apartmentSheetRows} from '../src/lib/apartment-import.ts';

test('Hebrew workbook detects headers after introductory rows and keeps building identifiers distinct',()=>{
 const rows=apartmentSheetRows([
  ['', '120000'],
  ['בניין',"מס' דירה",'קומה',"מס' חדרים",'שטח דירה לפי מכר','שטח מרפסת','מחירון מניבים','מחירון משווקים','חניה'],
  ['A','17','3','2','51','6.5','1906000','2026000','1'],
  ['B','17','4','3','70','8','2500000','2620000','2'],
  ['', '', '', '', '', '', '4406000'],
 ]);
 assert.equal(rows.length,2);assert.equal(rows[0].reference,'A-17');assert.equal(rows[1].reference,'B-17');assert.equal(rows[0].price,2026000);assert.equal(rows[0].surface,51);assert.equal(rows[1].parking,true);
 assert.match(rows[0].notes,/1906000/);
});

test('workbook previews each sheet independently using cached prices without evaluating formulas',async()=>{
 const wb=new ExcelJS.Workbook();
 for(const [name,price] of [['גיליון2',2026000],['גיליון1',2044000]]){
  const s=wb.addWorksheet(name);
  s.addRow(['בניין',"מס' דירה",'קומה',"מס' חדרים",'שטח דירה לפי מכר',name==='גיליון2'?'מחירון משווקים':'מחירון שיווק']);
  s.addRow(['A',17,3,2,51,{formula:'1+1',result:price}]);
 }
 const bad=wb.addWorksheet('Missing cached price');bad.addRow(['reference','price']);bad.addRow(['X',{formula:'1+1'}]);
 const buffer=await wb.xlsx.writeBuffer();
 const sheets=await readApartmentWorkbook(buffer);
 assert.equal(sheets.length,3);assert.equal(sheets[0].rows[0].price,2026000);assert.equal(sheets[1].rows[0].price,2044000);assert.equal(sheets[2].rows,null);
});
