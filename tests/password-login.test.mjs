import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('src/components/Workspace.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
async function mount({user={id:'user-1',email:'user@example.invalid',factors:[{factor_type:'totp',status:'verified'}]},recovery=false,path=[]}={}){
 const state=[],effects=[];let cursor=0,initial=true,mfaCalls=0;
 const jsx=(type,props)=>({type,props});
 const db={auth:{getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),mfa:new Proxy({},{get(){mfaCalls++;throw Error('MFA must not be called');}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'employee',active:true}})})})})};
 const exports={};
 const modules={react:{useCallback:fn=>fn,useState:value=>{const index=cursor++;if(initial)state[index]=value;return [state[index],next=>{state[index]=next;}];},useEffect:fn=>{if(initial)effects.push(fn);}},'react-dom':{createPortal:node=>node},'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'next-intl':{useTranslations:()=>key=>key,useLocale:()=> 'fr'},'next/navigation':{useRouter:()=>({replace(){}})},'next/link':{default:'link'},'@/lib/supabase':{configured:()=>true,supabase:()=>db},'@/lib/model':{isEntity:()=>false}};
 vm.runInNewContext(code,{exports,require:name=>modules[name]??{default:name},document:{getElementById:()=>({})},window:{location:{hash:recovery?'#type=invite':''}}});
 const render=()=>{cursor=0;const tree=exports.default({path});initial=false;return tree;};
 render();effects.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));
 return {tree:render(),mfaCalls:()=>mfaCalls};
}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
test('password session with an enrolled factor opens the dashboard without an MFA challenge or security link',async()=>{
 const app=await mount();const all=nodes(app.tree);
 assert.ok(all.some(n=>n.type?.name==='Dashboard'));
 assert.equal(all.some(n=>n.props?.href==='/fr/security'),false);
 assert.equal(app.mfaCalls(),0);
});
test('anonymous visitor still needs to sign in',async()=>{
 const app=await mount({user:null});assert.equal(app.tree.type.name,'Auth');assert.equal(nodes(app.tree).some(n=>n.type?.name==='Dashboard'),false);
});
test('password recovery is accessible without a second factor',async()=>{
 const app=await mount({recovery:true});assert.equal(app.tree.type.name,'Auth');assert.equal(app.tree.props.recovery,true);assert.equal(app.mfaCalls(),0);
});
test('removed security page no longer offers enrollment',async()=>{
 const app=await mount({path:['security']});assert.ok(nodes(app.tree).some(n=>n.props?.children==='notFound'));assert.equal(app.mfaCalls(),0);
});
