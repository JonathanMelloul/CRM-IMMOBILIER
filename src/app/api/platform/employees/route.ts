import {createClient} from '@supabase/supabase-js';
import {NextRequest,NextResponse} from 'next/server';
import {boundedJson,hasRequiredMfa} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'configuration'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return NextResponse.json({error:'unauthorized'},{status:401});
 const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error}=await caller.auth.getUser(token);
 if(error||!auth.user)return NextResponse.json({error:'unauthorized'},{status:401});
 if(!hasRequiredMfa(auth.user,token))return NextResponse.json({error:'forbidden'},{status:403});
 const context=await caller.rpc('crm_saas_context');
 if(context.error||context.data?.mfa_ok!==true||context.data?.platform_admin!==true)return NextResponse.json({error:'forbidden'},{status:403});
 if(!secret)return NextResponse.json({error:'adminConfiguration'},{status:503});
 let body;try{body=await boundedJson(request,4096);}catch{return NextResponse.json({error:'invalid'},{status:400});}
 const agencyId=typeof body.agencyId==='string'?body.agencyId:'',name=typeof body.name==='string'?body.name.trim():'',email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(agencyId)||!name||name.length>100||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'invalid'},{status:400});
 const agency=await caller.from('agencies').select('id,status,subscription_status,access_until').eq('id',agencyId).single();
 if(agency.error||!agency.data)return NextResponse.json({error:'invalid'},{status:400});
 const enabled=agency.data.status==='active'&&(agency.data.subscription_status==='legacy'||['trialing','active'].includes(agency.data.subscription_status)&&Date.parse(agency.data.access_until??'')>Date.now());
 if(!enabled)return NextResponse.json({error:'invalid'},{status:400});
 const quota=await caller.rpc('crm_take_platform_invite_quota');
 if(quota.error)return NextResponse.json({error:'failed'},{status:503});
 if(quota.data!==true)return NextResponse.json({error:'failed'},{status:429,headers:{'Retry-After':'60'}});
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const existing=await service.from('crm_members').select('id').eq('email',email).limit(1);
 if(existing.error)return NextResponse.json({error:'failed'},{status:500});
 if(existing.data?.length)return NextResponse.json({error:'alreadyMember'},{status:409});
 const locale=['fr','he','en'].includes(body.locale)?body.locale:'fr';
 let site;try{site=new URL(process.env.CRM_SITE_URL||'https://crm-saas-test.vercel.app');if(site.protocol!=='https:'||site.username||site.password)throw Error();}catch{return NextResponse.json({error:'adminConfiguration'},{status:503});}
 const invitation=await service.auth.admin.inviteUserByEmail(email,{data:{full_name:name},redirectTo:`${site.origin}/${locale}`});
 if(invitation.error||!invitation.data.user)return NextResponse.json({error:'inviteFailed'},{status:400});
 const registration=await service.rpc('crm_register_invited_member',{invited:invitation.data.user.id,actor:auth.user.id,tenant:agencyId,member_name:name,member_email:email,member_role:'admin'});
 if(registration.error)return NextResponse.json({error:'provisionFailed'},{status:500});
 return NextResponse.json({ok:true},{status:201});
}
