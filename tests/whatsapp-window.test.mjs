import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(fs.readFileSync('src/lib/whatsapp-window.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup(open){
 const exports={};vm.runInNewContext(code,{exports,window:{open}});return exports.openWhatsAppWindow;
}
function tab(){return {closed:false,opener:{},location:{href:'about:blank'},focusCalls:0,focus(){this.focusCalls++;},close(){this.closed=true;}};}
const url=name=>`https://web.whatsapp.com/send?phone=33612345678&text=${encodeURIComponent(name)}`;

test('reuses the same tab and updates its personalized message without leaving an opener',()=>{
 const opened=tab(),calls=[];const open=setup((...args)=>{calls.push(args);return opened;});
 assert.equal(open(url('Sarah Lévy')),true);
 assert.equal(opened.opener,null);
 assert.equal(open(url('David Cohen')),true);
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'about:blank');
 assert.equal(opened.location.href,url('David Cohen'));
 assert.equal(opened.focusCalls,2);
});

test('opens a replacement after the user closes the previous tab',()=>{
 const tabs=[tab(),tab()];let count=0;const open=setup(()=>tabs[count++]);
 assert.equal(open(url('Sarah')),true);tabs[0].closed=true;
 assert.equal(open(url('David')),true);assert.equal(count,2);
 assert.equal(tabs[1].location.href,url('David'));
});

test('popup blocking leaves the regular anchor as a fallback',()=>{
 assert.equal(setup(()=>null)(url('Sarah')),false);
 assert.equal(setup(()=>{throw Error('blocked');})(url('Sarah')),false);
});

test('unusable cross-origin references are replaced and focus failures do not duplicate navigation',()=>{
 const first=tab(),second=tab();let count=0;const open=setup(()=>count++===0?first:second);
 assert.equal(open(url('Sarah')),true);
 Object.defineProperty(first.location,'href',{set(){throw Error('isolated');}});
 second.focus=()=>{throw Error('focus blocked');};
 assert.equal(open(url('David')),true);assert.equal(count,2);
 assert.equal(second.location.href,url('David'));assert.equal(second.opener,null);
});
