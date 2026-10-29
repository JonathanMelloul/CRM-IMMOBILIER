export const saasEnabled=process.env.NEXT_PUBLIC_SAAS_MODE==='true';
type AgencyContext={mfa_ok:boolean;agency_id:string|null;active:boolean;role:'admin'|'employee'|null;platform_admin:boolean};
export function validAgencyContext(value:unknown):value is AgencyContext{
 if(!value||typeof value!=='object')return false;
 const context=value as Record<string,unknown>;
 return context.mfa_ok===true&&typeof context.active==='boolean'&&typeof context.platform_admin==='boolean'
  &&(context.agency_id===null||typeof context.agency_id==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(context.agency_id))
  &&(context.role===null||context.role==='admin'||context.role==='employee');
}
