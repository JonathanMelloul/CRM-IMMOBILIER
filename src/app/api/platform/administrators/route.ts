import {createClient} from '@supabase/supabase-js';
import {NextRequest,NextResponse} from 'next/server';
import {hasRequiredMfa} from '@/lib/request-security';

export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return NextResponse.json({error:'configuration'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return NextResponse.json({error:'unauthorized'},{status:401});
 try{
  const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await caller.auth.getUser(token);
  if(error||!data.user)return NextResponse.json({error:'unauthorized'},{status:401});
  if(!hasRequiredMfa(data.user,token))return NextResponse.json({error:'forbidden'},{status:403});
  const context=await caller.rpc('crm_saas_context');
  if(context.error||context.data?.mfa_ok!==true||context.data?.platform_admin!==true)return NextResponse.json({error:'forbidden'},{status:403});
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)return NextResponse.json({error:'adminConfiguration'},{status:503});
  const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const administrators=[];
  for(let offset=0;offset<10000;offset+=250){
   const result=await service.from('crm_members').select('id,agency_id,full_name,email,active').eq('role','admin').order('id').range(offset,offset+249);
   if(result.error)return NextResponse.json({error:'failed'},{status:503});
   administrators.push(...(result.data??[]));
   if((result.data?.length??0)<250)return NextResponse.json({administrators},{headers:{'Cache-Control':'private, no-store'}});
  }
  return NextResponse.json({error:'tooManyResults'},{status:503});
 }catch{return NextResponse.json({error:'failed'},{status:503});}
}
