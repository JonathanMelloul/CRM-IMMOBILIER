import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../src/lib/model.ts';
import * as details from '../src/lib/prospect-details.ts';
import * as months from '../src/lib/prospect-months.ts';
import * as sort from '../src/lib/prospect-sort.ts';
import * as importer from '../src/lib/prospect-import.ts';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/Workspace.tsx',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText+'\nexports.TestRecords=Records;exports.TestRelations=ProspectRelations;';
const prospects=[{id:'1',first_name:'Alice',last_name:'Test'},{id:'2',first_name:'Bob',last_name:'Test'}];
const oldTask={id:'91',title:'Existing task',prospect_id:'1',due_date:'2026-10-30',completed:true,description:'Existing description'};
function mount(props,component='TestRecords'){
 const state=[],effects=[],calls=[];let cursor=0,initial=true;
 const jsx=(type,props)=>({type,props});const exports={};
 const react={useState:value=>{const i=cursor++;if(initial)state[i]=value;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useEffect:effect=>{if(initial)effects.push(effect);},useCallback:fn=>fn};
 const db={fetchAll:async(entity,userId,filters)=>{calls.push({entity,userId,filters});return entity==='prospects'?prospects:entity==='tasks'?[oldTask]:[];}};
 vm.runInNewContext(source,{exports,require:name=>({react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'react-dom':{createPortal:child=>child},'next-intl':{useTranslations:()=>key=>key,useLocale:()=> 'fr'},'next/navigation':{useRouter:()=>({})},'@/lib/data':db,'@/lib/model':model,'@/lib/prospect-details':details,'@/lib/prospect-months':months,'@/lib/prospect-sort':sort,'@/lib/prospect-import':importer}[name]??{default:name}),Intl,Date,encodeURIComponent});
 const render=()=>{cursor=0;const tree=exports[component]({...props,user:{id:'user'},canManage:false});initial=false;return tree;};
 render();effects.forEach(effect=>effect());return {calls,render,settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
function find(tree,predicate){
 if(!tree||typeof tree!=='object')return null;
 if(Array.isArray(tree)){for(const child of tree){const found=find(child,predicate);if(found)return found;}return null;}
 return predicate(tree)?tree:find(tree.props?.children,predicate);
}
const field=(tree,name)=>find(tree,node=>node.props?.name===name);

test('creating a task never reads or copies an existing task',async()=>{
 const app=mount({entity:'tasks',id:'new',edit:false});await app.settle();const tree=app.render();
 assert.equal(app.calls.some(call=>call.entity==='tasks'),false);
 for(const key of ['title','description','due_date','prospect_id'])assert.equal(field(tree,key).props.defaultValue,'',key);
 assert.equal(field(tree,'completed').props.defaultChecked,false);
});
test('creation from a prospect selects that accessible prospect and keeps task fields empty',async()=>{
 const app=mount({entity:'tasks',id:'new',edit:false,initialProspectId:'2'});await app.settle();const tree=app.render();
 assert.ok(field(tree,'prospect_id'),'prospect selector should be rendered');assert.equal(field(tree,'prospect_id').props.defaultValue,'2');assert.equal(field(tree,'title').props.defaultValue,'');
 assert.equal(field(tree,'description').props.defaultValue,'');assert.equal(app.calls.some(call=>call.entity==='tasks'),false);
});
test('an unavailable prospect does not silently select another one or expose a save form',async()=>{
 const app=mount({entity:'tasks',id:'new',edit:false,initialProspectId:'999'});await app.settle();const tree=app.render();
 assert.equal(find(tree,node=>node.type==='form'),null);assert.ok(find(tree,node=>node.props?.role==='alert'&&node.props.children==='prospectUnavailable'));
});
test('editing an existing task still loads the requested task and keeps its values',async()=>{
 const app=mount({entity:'tasks',id:'91',edit:true,initialProspectId:'2'});await app.settle();const tree=app.render();
 assert.equal(field(tree,'title').props.defaultValue,oldTask.title);assert.equal(field(tree,'prospect_id').props.defaultValue,'1');assert.equal(field(tree,'completed').props.defaultChecked,true);
 assert.equal(app.calls.find(call=>call.entity==='tasks').filters.id,'91');
});
test('appointments and activities also receive the prospect creation context',async()=>{
 for(const entity of ['appointments','activities']){const app=mount({entity,id:'new',edit:false,initialProspectId:'2'});await app.settle();assert.equal(field(app.render(),'prospect_id').props.defaultValue,'2');assert.equal(app.calls.some(call=>call.entity===entity),false);}
 const app=mount({id:'2',user:{id:'user'},revision:0},'TestRelations');await app.settle();const tree=app.render();
 for(const entity of ['appointments','activities','tasks'])assert.ok(find(tree,node=>node.props?.href===`/fr/${entity}/new?prospect_id=2`));
});
