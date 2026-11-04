// Isolated PostgreSQL checks; never connects to Supabase.
// PGLITE_MODULE must point to an external @electric-sql/pglite/dist/index.js.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
if(!process.env.PGLITE_MODULE)throw Error('Set PGLITE_MODULE to an isolated @electric-sql/pglite/dist/index.js installation.');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const migration=await fs.readFile(new URL('../supabase/migrations/202611040001_remove_mfa.sql',import.meta.url),'utf8');
const user='00000000-0000-4000-8000-000000000001';
for(const mode of ['legacy','saas']){
 const db=new PGlite();
 try{
  await db.exec(`create role authenticated; create schema auth;
   create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
   create table auth.mfa_factors(user_id uuid, factor_type text, status text);
   create table public.crm_members(id uuid, active boolean, role text, agency_id text);
   create table public.agencies(id text, enabled boolean);
   insert into public.agencies values('a',true),('b',true);
   insert into public.crm_members values('${user}',true,'employee','a');
   insert into auth.mfa_factors values('${user}','totp','verified');
   create table public.records(id int,agency_id text);
   insert into public.records values(1,'a'),(2,'b');
   grant usage on schema auth to authenticated;
   grant select on public.records to authenticated;
   alter table public.records enable row level security;`);
  const secondFactor=`auth.uid() is not null and (auth.jwt()->>'aal'='aal2' or not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified'))`;
  if(mode==='saas')await db.exec(`create function public.crm_mfa_ok() returns boolean language sql stable security definer set search_path='' as $$select ${secondFactor}$$;`);
  await db.exec(`create function public.crm_active() returns boolean language sql stable security definer set search_path='' as $$
   select ${mode==='saas'?'public.crm_mfa_ok()':secondFactor} and exists(select 1 from public.crm_members m ${mode==='saas'?'join public.agencies a on a.id=m.agency_id and a.enabled':''} where m.id=auth.uid() and m.active)$$;
   create function public.crm_admin() returns boolean language sql stable security definer set search_path='' as $$select public.crm_active() and exists(select 1 from public.crm_members where id=auth.uid() and role='admin')$$;
   create function public.crm_agency_id() returns text language sql stable security definer set search_path='' as $$select agency_id from public.crm_members where id=auth.uid()$$;
   create policy records_access on public.records to authenticated using(public.crm_active() and agency_id=public.crm_agency_id());`);
  async function session(id,fn){
   await db.exec('begin;set local role authenticated;');
   await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,aal:'aal1'})]);
   try{await fn();}finally{await db.exec('rollback;');}
  }
  await session(user,async()=>assert.equal((await db.query('select public.crm_active() as ok')).rows[0].ok,false));
  const policies=(await db.query('select * from pg_policies')).rows;
  await db.exec(migration);await db.exec(migration);
  assert.deepEqual((await db.query('select * from pg_policies')).rows,policies);
  await session(user,async()=>{
   assert.equal((await db.query('select public.crm_active() as ok')).rows[0].ok,true);
   assert.equal((await db.query('select public.crm_admin() as ok')).rows[0].ok,false);
   assert.deepEqual((await db.query('select id from public.records')).rows,[{id:1}]);
  });
  await session(null,async()=>assert.equal((await db.query('select id from public.records')).rows.length,0));
  await db.exec('update public.crm_members set active=false;');
  await session(user,async()=>assert.equal((await db.query('select id from public.records')).rows.length,0));
  if(mode==='saas'){
   await db.exec("update public.crm_members set active=true;update public.agencies set enabled=false where id='a';");
   await session(user,async()=>assert.equal((await db.query('select id from public.records')).rows.length,0));
  }
  assert.equal((await db.query('select count(*)::int as n from auth.mfa_factors')).rows[0].n,1);
  console.log(`${mode}: password-only access, membership, roles, tenant isolation, anonymous denial and repeatability verified`);
 }finally{await db.close();}
}
