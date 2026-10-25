'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocale,useTranslations} from 'next-intl';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import AgencyInvitation from './AgencyInvitation';

type Agency={id:string;name:string;slug:string;status:string;subscription_status:string;access_until:string|null};
export default function Platform({userId,page}:{userId:string;page:boolean}) {
 const t=useTranslations(),locale=useLocale();
 const [allowed,setAllowed]=useState<boolean|null>(null),[target,setTarget]=useState<HTMLElement|null>(null);
 const [agencies,setAgencies]=useState<Agency[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [name,setName]=useState(''),[slug,setSlug]=useState(''),[created,setCreated]=useState(false);
 useEffect(()=>{
  let live=true;setAllowed(null);setError('');setAgencies([]);
  setTarget(document.getElementById('platform-navigation'));
  async function load(){
   try{
    const context=await supabase().rpc('crm_saas_context');
    if(!live)return;
    if(context.error)throw Error();
    const authorized=context.data?.mfa_ok===true&&context.data?.platform_admin===true;
    setAllowed(authorized);
    if(authorized&&page){
     const result=await supabase().from('agencies').select('id,name,slug,status,subscription_status,access_until').order('name');
     if(result.error)throw Error();
     if(live)setAgencies(result.data??[]);
    }
   }catch{if(live){setAllowed(false);setError(t('platformLoadError'));}}
  }
  void load();return()=>{live=false;};
 },[userId,page,t]);
 async function create(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setCreated(false);
  try{
   const result=await supabase().rpc('crm_platform_create_agency',{agency_name:name.trim(),agency_slug:slug.trim()});
   if(result.error)throw Error();
   setName('');setSlug('');setCreated(true);
   const list=await supabase().from('agencies').select('id,name,slug,status,subscription_status,access_until').order('name');
   if(list.error){setError(t('platformLoadError'));return;}
   setAgencies(list.data??[]);
  }catch{setError(t('platformCreateError'));}finally{setBusy(false);}
 }
 const navigation=allowed&&target?createPortal(<Link className={`navlink ${page?'active':''}`} href={`/${locale}/platform`} aria-current={page?'page':undefined}>{t('platformTitle')}</Link>,target):null;
 return <>{navigation}{page&&<section className="panel"><h1>{t('platformTitle')}</h1>{error&&<p role="alert" className="error">{error}</p>}{allowed===null?<p role="status">{t('loading')}</p>:!allowed?<p>{t('platformDenied')}</p>:<><p>{t('platformHelp')}</p><h2>{t('platformCreate')}</h2><form onSubmit={create} className="grid gap-4 max-w-lg"><label>{t('name')}<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)}/></label><label>{t('platformSlug')}<input required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" value={slug} onChange={e=>setSlug(e.target.value)} aria-describedby="agency-slug-help"/></label><p id="agency-slug-help">{t('platformSlugHelp')}</p><button disabled={busy}>{t(busy?'loading':'platformCreate')}</button></form>{created&&<p role="status">{t('platformCreated')}</p>}<h2>{t('platformAgencies')}</h2>{agencies.length===0?<p>{t('platformEmpty')}</p>:<ul>{agencies.map(agency=><li key={agency.id}><strong dir="auto">{agency.name}</strong> — {agency.slug}<p>{t('platformStatus')}: {t(agency.status==='suspended'?'platformSuspended':'platformActive')} · {t('platformSubscription')}: {agency.subscription_status}{agency.access_until&&<> · {t('platformExpiry')}: {new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Asia/Jerusalem'}).format(new Date(agency.access_until))}</>}</p><AgencyInvitation agencyId={agency.id} agencyName={agency.name} enabled={agency.status==='active'&&(agency.subscription_status==='legacy'||(['trialing','active'].includes(agency.subscription_status)&&Date.parse(agency.access_until??'')>Date.now()))}/></li>)}</ul>}</>}</section>}</>;
}
