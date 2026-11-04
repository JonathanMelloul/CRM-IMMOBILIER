-- Remove the CRM second-factor requirement without changing membership, roles or RLS.
-- Apply after existing migrations, including supabase/saas/001..003 when enabled.
-- Existing Supabase Auth factors are retained; no user records are deleted.
begin;
do $migration$
begin
 if to_regprocedure('public.crm_mfa_ok()') is not null then
  -- Compatibility function used by SaaS policies and RPCs: require a signed-in user.
  execute $sql$create or replace function public.crm_mfa_ok() returns boolean
   language sql stable security definer set search_path='' as
   'select auth.uid() is not null'$sql$;
 else
  -- Legacy schema: retain the active-member requirement used by every CRM policy.
  execute $sql$create or replace function public.crm_active() returns boolean
   language sql stable security definer set search_path='' as
   'select exists(select 1 from public.crm_members where id=auth.uid() and active)'$sql$;
 end if;
end $migration$;
commit;
