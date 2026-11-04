import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {prospectFollowUpMessage} from '../src/lib/prospect-follow-up.ts';
import {whatsappNumber} from '../src/lib/phone-links.ts';

const exports={};
const code=ts.transpileModule(fs.readFileSync('src/components/PhoneLink.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx=(type,props)=>({type,props});
vm.runInNewContext(code,{exports,require:name=>({
 'next-intl':{useTranslations:()=>key=>key},
 'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},
 '@/lib/phone-links':{whatsappNumber}
}[name])});
function links(tree){
 if(!tree||typeof tree!=='object')return [];
 if(Array.isArray(tree))return tree.flatMap(links);
 return [...(tree.type==='a'?[tree]:[]),...links(tree.props?.children)];
}

test('follow-up names the prospect and explains the attempted contact and Israel property search',()=>{
 const message=prospectFollowUpMessage('  Sarah   Lévy  ');
 assert.ok(message.startsWith('Bonjour Sarah Lévy,\n\n'));
 assert.ok(message.includes('Nous avons essayé de vous joindre'));
 assert.ok(message.includes('projet immobilier en Israël'));
 assert.ok(message.includes('Quand seriez-vous disponible'));
 assert.ok(message.endsWith('L’équipe Yonathan Immobilier'));
 assert.ok(prospectFollowUpMessage('   ').startsWith('Bonjour,\n'));
});

test('message icon targets the right prospect and preserves accents and URL-sensitive characters',()=>{
 const message=prospectFollowUpMessage('Élodie & David #1');
 const anchors=links(exports.default({value:'06 12 34 56 78',country:'France',message}));
 const messageLink=anchors.find(a=>a.props.className.includes('phone-whatsapp'));
 const url=new URL(messageLink.props.href);
 assert.equal(url.protocol,'whatsapp:');
 assert.equal(url.hostname,'send');
 assert.equal(url.searchParams.get('phone'),'33612345678');
 assert.equal(url.searchParams.get('text'),message);
 assert.equal(url.hash,'');
 assert.equal(messageLink.props.title,'prepareWhatsAppMessage');
 assert.equal(messageLink.props.target,undefined);
 const numberLink=anchors.find(a=>a.props.className==='phone-link');
 assert.equal(new URL(numberLink.props.href).searchParams.get('text'),message);
 assert.equal(numberLink.props.href,messageLink.props.href);
 assert.equal(numberLink.props.title,'prepareWhatsAppMessage');
 assert.ok(anchors.some(a=>a.props.href==='tel:0612345678'));
});

test('other phone links keep an empty WhatsApp conversation and unknown destinations are not guessed',()=>{
 const anchors=links(exports.default({value:'+972541234567'}));
 const messageLink=anchors.find(a=>a.props.className.includes('phone-whatsapp'));
 assert.equal(new URL(messageLink.props.href).searchParams.has('text'),false);
 assert.equal(messageLink.props.title,'sendWhatsAppMessage');
 const unknown=links(exports.default({value:'0612345678',message:prospectFollowUpMessage('Sarah')}));
 assert.equal(unknown.some(a=>a.props.href.startsWith('whatsapp:')),false);
});

test('both message entry points use the installed app without a new browser tab',()=>{
 const anchors=links(exports.default({value:'+33612345678',message:prospectFollowUpMessage('Sarah')}));
 const messages=anchors.filter(a=>a.props.href.startsWith('whatsapp:'));
 assert.equal(messages.length,2);
 for(const anchor of messages){assert.equal(anchor.props.target,undefined);assert.equal(anchor.props.onClick,undefined);}
});
