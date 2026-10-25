import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const security={};vm.runInNewContext(compile('src/lib/request-security.ts'),{exports:security,Buffer});
const code=compile('src/app/api/platform/administrators/route.ts');
function handler(options={}){
 const calls={clients:0,queries:[]};
 const caller={auth:{getUser:async()=>({error:options.invalidToken?{}:null,data:{user:options.invalidToken?null:{id:'actor',factors:options.factors??[]}}})},rpc:async()=>({data:{mfa_ok:options.mfa!==false,platform_admin:options.platform!==false,active:false},error:options.contextError?{}:null})};
 const service={from:table=>({select:fields=>({eq:(field,value)=>({order:order=>({range:async(start,end)=>{calls.queries.push({table,fields,field,value,order,start,end});return {data:options.rows?.slice(start,end+1)??[],error:options.queryError?{}:null};}})})})})};
 const exports={};vm.runInNewContext(code,{exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:options.noSecret?undefined:'test-secret'}},require:name=>name==='@supabase/supabase-js'?{createClient:()=>++calls.clients===1?caller:service}:name==='@/lib/request-security'?security:{NextResponse:{json:(body,opts={})=>({body,status:opts.status??200,headers:opts.headers})}}});
 return {get:exports.GET,calls};
}
const request=(token='token')=>({headers:new Headers(token?{Authorization:`Bearer ${token}`}:{})});
test('anonymous or invalid sessions cannot read administrator contacts',async()=>{
 for(const [options,token] of [[{},null],[{invalidToken:true},'token']]){const h=handler(options);assert.equal((await h.get(request(token))).status,401);assert.ok(h.calls.clients<=1);assert.equal(h.calls.queries.length,0);}
});
test('agency administrators and missing MFA cannot read cross-agency contacts',async()=>{
 for(const options of [{platform:false},{mfa:false},{contextError:true},{factors:[{factor_type:'totp',status:'verified'}]}]){const h=handler(options);assert.equal((await h.get(request())).status,403);assert.equal(h.calls.clients,1);assert.equal(h.calls.queries.length,0);}
});
test('platform administrator without membership receives only administrator contact fields',async()=>{
 const rows=[{id:'a',agency_id:'one',full_name:'Alice',email:'alice@example.invalid',active:true},{id:'b',agency_id:'two',full_name:'Bob',email:'bob@example.invalid',active:false}];
 const h=handler({rows});const result=await h.get(request());assert.equal(result.status,200);assert.equal(result.body.administrators.length,2);
 assert.equal(result.headers['Cache-Control'],'private, no-store');const query=h.calls.queries[0];
 assert.equal(query.table,'crm_members');assert.equal(query.fields,'id,agency_id,full_name,email,active');assert.equal(query.field,'role');assert.equal(query.value,'admin');
});
test('administrator contacts are paginated without dropping results at the API limit',async()=>{
 const rows=Array.from({length:251},(_,id)=>({id:String(id),agency_id:'one',full_name:'Admin',email:'admin@example.invalid',active:true}));
 const h=handler({rows});const result=await h.get(request());assert.equal(result.body.administrators.length,251);assert.equal(h.calls.queries.length,2);assert.equal(h.calls.queries[1].start,250);
});
test('missing server configuration or query errors do not pretend the agency has no administrators',async()=>{
 for(const options of [{noSecret:true},{queryError:true}]){const h=handler(options);const result=await h.get(request());assert.equal(result.status,503);assert.equal(result.body.administrators,undefined);}
});
