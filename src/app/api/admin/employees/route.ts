import {createClient} from '@supabase/supabase-js';
import {NextRequest,NextResponse} from 'next/server';
import {boundedJson} from '@/lib/request-security';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'configuration'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return NextResponse.json({error:'unauthorized'},{status:401});
 const caller=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await caller.auth.getUser(token);
 if(authError||!auth.user)return NextResponse.json({error:'unauthorized'},{status:401});
 const {data:member,error}=await caller.from('crm_members').select('role,active').eq('id',auth.user.id).single();
 if(error||member?.role!=='admin'||!member.active)return NextResponse.json({error:'forbidden'},{status:403});
 let body;try{body=await boundedJson(request,4096);}catch{return NextResponse.json({error:'invalid'},{status:400});}
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!name||name.length>100||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'invalid'},{status:400});
 if(!secret)return NextResponse.json({error:'adminConfiguration'},{status:503});
 const quota=await caller.rpc('crm_take_api_quota',{action_name:'invite'});
 if(quota.error)return NextResponse.json({error:'failed'},{status:503});
 if(quota.data!==true)return NextResponse.json({error:'failed'},{status:429,headers:{'Retry-After':'60'}});
 const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:existing,error:lookupError}=await service.from('crm_members').select('id').eq('email',email).limit(1);
 if(lookupError)return NextResponse.json({error:'failed'},{status:500});
 if(existing?.length)return NextResponse.json({error:'alreadyMember'},{status:409});
 const locale=['fr','he','en'].includes(body.locale)?body.locale:'fr';
 const {data:invitation,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{data:{full_name:name},redirectTo:`https://crm-immo-yonathan.vercel.app/${locale}`});
 if(inviteError||!invitation.user)return NextResponse.json({error:'inviteFailed'},{status:400});
 const id=invitation.user.id;
 const profile=await service.from('profiles').upsert({id,full_name:name,role:'agent'});
 if(profile.error)return NextResponse.json({error:'provisionFailed'},{status:500});
 const membership=await service.from('crm_members').insert({id,full_name:name,email,role:'employee',active:true});
 if(membership.error)return NextResponse.json({error:'provisionFailed'},{status:500});
 return NextResponse.json({ok:true},{status:201});
}
