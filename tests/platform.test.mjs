import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/Platform.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function mount(context,{contextError=false,createError=false}={}){
 const state=[],effects=[],calls=[];let cursor=0,initial=true;
 const rows=[{id:'agency-1',name:'Agence Paris',slug:'paris',status:'active',subscription_status:'legacy',access_until:null}];
 const db={rpc:async(name,args)=>{calls.push({name,args});return name==='crm_saas_context'?{data:context,error:contextError}:{data:'agency-2',error:createError};},from:name=>{calls.push({table:name});return {select:()=>({order:async()=>({data:rows,error:null})})};}};
 const jsx=(type,props)=>({type,props});const exports={};
 const translations=key=>key;
 vm.runInNewContext(source,{exports,require:name=>({react:{useState:value=>{const index=cursor++;if(initial)state[index]=value;return [state[index],next=>{state[index]=next;}];},useEffect:effect=>{if(initial)effects.push(effect);}},'react-dom':{createPortal:child=>child},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'next-intl':{useLocale:()=> 'fr',useTranslations:()=>translations},'next/link':{default:'a'},'./AgencyInvitation':{default:'agency-invitation'},'@/lib/supabase':{supabase:()=>db}}[name]),document:{getElementById:()=>({})},Intl,Date});
 const render=()=>{cursor=0;const tree=exports.default({userId:'user-1',page:true});initial=false;return tree;};
 render();effects.forEach(effect=>effect());
 return {calls,render,settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
function find(tree,predicate){
 if(!tree||typeof tree!=='object')return null;
 if(Array.isArray(tree)){for(const child of tree){const match=find(child,predicate);if(match)return match;}return null;}
 if(predicate(tree))return tree;
 return find(tree.props?.children,predicate);
}
test('ordinary members cannot list agencies or see a creation form',async()=>{
 const app=mount({mfa_ok:true,platform_admin:false,active:true});await app.settle();
 assert.equal(app.calls.some(call=>call.table),false);
 assert.equal(find(app.render(),node=>node.type==='form'),null);
});
test('platform access fails closed when MFA or context is unavailable',async()=>{
 for(const [context,options] of [[{platform_admin:true,mfa_ok:false},{}],[null,{contextError:true}]]){
  const app=mount(context,options);await app.settle();
  assert.equal(app.calls.some(call=>call.table),false);
  assert.equal(find(app.render(),node=>node.type==='form'),null);
 }
});
test('platform administrator can create through the authenticated RPC without agency membership',async()=>{
 const app=mount({mfa_ok:true,platform_admin:true,active:false});await app.settle();
 let tree=app.render();
 const inputs=[];function collect(node){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(collect);return;}if(node.type==='input'&&node.props.type!=='search')inputs.push(node);collect(node.props?.children);}collect(tree);
 inputs[0].props.onChange({target:{value:' Agence Paris '}});
 inputs[1].props.onChange({target:{value:' paris-agency '}});
 tree=app.render();await find(tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});
 const call=app.calls.find(call=>call.name==='crm_platform_create_agency');
 assert.equal(call.args.agency_name,'Agence Paris');assert.equal(call.args.agency_slug,'paris-agency');
 assert.equal(app.calls.filter(call=>call.table==='agencies').length,2);
});
