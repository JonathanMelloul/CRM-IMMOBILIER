import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const security={};vm.runInNewContext(compile('src/lib/request-security.ts'),{exports:security,TextDecoder,Uint8Array,Buffer});
const code=compile('src/app/api/platform/employees/route.ts');
const agencyId='00000000-0000-4000-8000-000000000001';
function handler(options={}){
 const calls={clients:0,invites:[],registrations:[]};
 const caller={auth:{getUser:async()=>({error:options.invalidToken?{}:null,data:{user:options.invalidToken?null:{id:'actor',factors:options.factors??[]}}})},rpc:async name=>({data:name==='crm_saas_context'?{platform_admin:options.platform!==false,mfa_ok:options.mfa!==false,active:false}:options.quota!==false,error:options.contextError?{}:null}),from:()=>({select:()=>({eq:()=>({single:async()=>({error:options.agencyError?{}:null,data:{id:agencyId,status:options.suspended?'suspended':'active',subscription_status:options.subscription??'active',access_until:options.expired?'2000-01-01T00:00:00Z':'2200-01-01T00:00:00Z'}})})})})};
 const service={auth:{admin:{inviteUserByEmail:async(email,params)=>{calls.invites.push({email,params});return {error:options.emailError?{}:null,data:{user:{id:'invited'}}};}}},rpc:async(name,args)=>{calls.registrations.push({name,args});return {error:options.registrationError?{}:null};},from:()=>({select:()=>({eq:()=>({limit:async()=>({data:options.existing?[{id:'existing'}]:[],error:null})})})})};
 const exports={};
 vm.runInNewContext(code,{exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:options.noSecret?undefined:'test-secret',CRM_SITE_URL:options.site}},require:name=>name==='@supabase/supabase-js'?{createClient:()=>++calls.clients===1?caller:service}:name==='@/lib/request-security'?security:{NextResponse:{json:(body,opts={})=>({body,status:opts.status??200})}},Date,URL});
 return {post:exports.POST,calls};
}
function request(body={agencyId,name:' New administrator ',email:'NEW@example.invalid',locale:'fr'},token='token'){
 return {headers:new Headers({'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}),body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify(body)));controller.close();}})};
}
test('anonymous and invalid sessions never create a privileged client',async()=>{
 for(const [options,token] of [[{},null],[{invalidToken:true},'token']]){const h=handler(options);assert.equal((await h.post(request(undefined,token))).status,401);assert.ok(h.calls.clients<=1);assert.equal(h.calls.invites.length,0);}
});
test('ordinary admins, incomplete MFA and failed context cannot invite',async()=>{
 for(const options of [{platform:false},{mfa:false},{contextError:true},{factors:[{factor_type:'totp',status:'verified'}]}]){const h=handler(options);assert.equal((await h.post(request())).status,403);assert.equal(h.calls.clients,1);assert.equal(h.calls.invites.length,0);}
});
test('target agency must exist and have active access',async()=>{
 for(const options of [{agencyError:true},{suspended:true},{expired:true},{subscription:'canceled'}]){const h=handler(options);assert.equal((await h.post(request())).status,400);assert.equal(h.calls.clients,1);assert.equal(h.calls.invites.length,0);}
});
test('quota, missing server key and duplicate membership prevent outgoing email',async()=>{
 for(const [options,status] of [[{quota:false},429],[{noSecret:true},503],[{existing:true},409]]){const h=handler(options);assert.equal((await h.post(request())).status,status);assert.equal(h.calls.invites.length,0);assert.equal(h.calls.registrations.length,0);}
});
test('malformed requests cannot invite',async()=>{
 for(const body of [null,[],{agencyId:'bad',name:'Name',email:'new@example.invalid'},{agencyId,name:'',email:'new@example.invalid'},{agencyId,name:'Name',email:'bad'}]){const h=handler();assert.equal((await h.post(request(body))).status,400);assert.equal(h.calls.invites.length,0);}
});
test('super admin without agency membership invites and atomically registers the target agency admin',async()=>{
 const h=handler();assert.equal((await h.post(request())).status,201);
 assert.equal(h.calls.invites[0].email,'new@example.invalid');
 assert.equal(h.calls.invites[0].params.redirectTo,'https://crm-saas-test.vercel.app/fr');
 const registration=h.calls.registrations[0];assert.equal(registration.name,'crm_register_invited_member');
 assert.equal(registration.args.tenant,agencyId);assert.equal(registration.args.actor,'actor');assert.equal(registration.args.invited,'invited');assert.equal(registration.args.member_name,'New administrator');assert.equal(registration.args.member_role,'admin');
});
test('redirect uses a trusted configured origin and validated locale',async()=>{
 const h=handler({site:'https://crm.example.invalid/path'});assert.equal((await h.post(request({agencyId,name:'Name',email:'new@example.invalid',locale:'https://evil.invalid'}))).status,201);assert.equal(h.calls.invites[0].params.redirectTo,'https://crm.example.invalid/fr');
 const invalid=handler({site:'http://unsafe.invalid'});assert.equal((await invalid.post(request())).status,503);assert.equal(invalid.calls.invites.length,0);
});
test('email failure does not register membership; registration failure reports partial completion',async()=>{
 const email=handler({emailError:true});assert.equal((await email.post(request())).body.error,'inviteFailed');assert.equal(email.calls.registrations.length,0);
 const registration=handler({registrationError:true});const result=await registration.post(request());assert.equal(result.status,500);assert.equal(result.body.error,'provisionFailed');assert.equal(registration.calls.invites.length,1);
});
