'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocale,useTranslations} from 'next-intl';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import AgencyInvitation from './AgencyInvitation';
import AgencyAdministrators,{type AgencyAdministrator} from './AgencyAdministrators';

type Agency={id:string;name:string;slug:string;status:string;subscription_status:string;access_until:string|null};
export default function Platform({userId,page}:{userId:string;page:boolean}) {
 const t=useTranslations(),locale=useLocale();
 const [allowed,setAllowed]=useState<boolean|null>(null),[target,setTarget]=useState<HTMLElement|null>(null);
 const [agencies,setAgencies]=useState<Agency[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [administrators,setAdministrators]=useState<AgencyAdministrator[]|null>(null),[administratorsError,setAdministratorsError]=useState(false);
 const [search,setSearch]=useState('');
 const [name,setName]=useState(''),[slug,setSlug]=useState(''),[created,setCreated]=useState(false);
 async function loadAdministrators(signal?:AbortSignal){
  setAdministrators(null);setAdministratorsError(false);
  try{
   const session=await supabase().auth.getSession();
   if(session.error||!session.data.session)throw Error();
   const response=await fetch('/api/platform/administrators',{headers:{Authorization:`Bearer ${session.data.session.access_token}`},cache:'no-store',signal});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.administrators))throw Error();
   if(!signal?.aborted)setAdministrators(result.administrators);
  }catch{if(!signal?.aborted)setAdministratorsError(true);}
 }
 useEffect(()=>{
  let live=true;const controller=new AbortController();setAllowed(null);setError('');setAgencies([]);setAdministrators(null);setAdministratorsError(false);
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
     if(live){setAgencies(result.data??[]);void loadAdministrators(controller.signal);}
    }
   }catch{if(live){setAllowed(false);setError(t('platformLoadError'));}}
  }
  void load();return()=>{live=false;controller.abort();};
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
 const navigation=allowed&&target?createPortal(<Link className={`navlink ${page?'active':''}`} href={`/${locale}/platform`} aria-current={page?'page':undefined}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V7h8v14M11 3h10v18M1 21h22M6 11h2M6 15h2M14 7h2M14 11h2M14 15h2M18 7h1M18 11h1M18 15h1"/></svg><span>{t('platformTitle')}</span></Link>,target):null;
 const visibleAgencies=agencies.filter(agency=>`${agency.name} ${agency.slug}`.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale).trim()));
 const activeCount=agencies.filter(agency=>agency.status==='active').length;
 const trialCount=agencies.filter(agency=>agency.subscription_status==='trialing').length;
 const subscriptions:Record<string,string>={legacy:'platformLegacy',trialing:'platformTrial',active:'platformActive',past_due:'platformPastDue',canceled:'platformCanceled'};
 return <>{navigation}{page&&<section className="agency-console">
  <header className="agency-hero">
   <div><span className="agency-eyebrow">{t('platformOverview')}</span><h1>{t('platformAgencies')}</h1><p>{t('platformIntro')}</p></div>
   {allowed&&<a className="agency-primary" href="#create-agency"><span aria-hidden="true">＋</span>{t('platformCreate')}</a>}
  </header>
  {error&&<p role="alert" className="error">{error}</p>}
  {allowed===null?<p role="status">{t('loading')}</p>:!allowed?<div className="agency-empty">{t('platformDenied')}</div>:<>
   <div className="agency-stats">
    <div><span className="agency-stat-icon" aria-hidden="true">▦</span><div><span>{t('platformTotal')}</span><strong>{agencies.length}</strong></div></div>
    <div><span className="agency-stat-icon agency-stat-green" aria-hidden="true">✓</span><div><span>{t('platformActiveAgencies')}</span><strong>{activeCount}</strong></div></div>
    <div><span className="agency-stat-icon agency-stat-amber" aria-hidden="true">◷</span><div><span>{t('platformTrials')}</span><strong>{trialCount}</strong></div></div>
   </div>
   <div className="agency-toolbar"><div><h2>{t('platformDirectory')}</h2><p>{t('platformResults',{count:visibleAgencies.length})}</p></div><label className="agency-search"><span>{t('platformSearch')}</span><input type="search" value={search} placeholder={t('platformSearchPlaceholder')} onChange={event=>setSearch(event.target.value)}/></label></div>
   {visibleAgencies.length===0?<div className="agency-empty"><span aria-hidden="true">▦</span><h3>{t(agencies.length?'platformNoResults':'platformEmpty')}</h3></div>:<div className="agency-grid">{visibleAgencies.map(agency=>{
    const enabled=agency.status==='active'&&(agency.subscription_status==='legacy'||(['trialing','active'].includes(agency.subscription_status)&&Date.parse(agency.access_until??'')>Date.now()));
    return <article className="agency-card" key={agency.id}>
     <div className="agency-card-heading"><div className="agency-avatar" aria-hidden="true">{Array.from(agency.name.trim())[0]?.toLocaleUpperCase(locale)||'A'}</div><span className={`agency-status ${agency.status==='suspended'?'agency-status-paused':''}`}><i aria-hidden="true"/>{t(agency.status==='suspended'?'platformSuspended':'platformActive')}</span></div>
     <h3 dir="auto">{agency.name}</h3><p className="agency-slug" dir="ltr">{agency.slug}</p>
     <div className="agency-card-meta"><div><span>{t('platformSubscription')}</span><strong className={`agency-plan ${agency.subscription_status==='trialing'?'agency-plan-trial':''}`}>{subscriptions[agency.subscription_status]?t(subscriptions[agency.subscription_status]):agency.subscription_status}</strong></div><div><span>{t('platformExpiry')}</span><strong>{agency.access_until?new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'Asia/Jerusalem'}).format(new Date(agency.access_until)):t('platformNoExpiry')}</strong></div></div>
     <AgencyAdministrators members={administrators?.filter(member=>member.agency_id===agency.id)??null} error={administratorsError}/>
     <AgencyInvitation onInvited={()=>{void loadAdministrators();}} agencyId={agency.id} agencyName={agency.name} enabled={enabled}/>
    </article>;
   })}</div>}
   <section id="create-agency" className="agency-create"><div className="agency-create-intro"><span className="agency-eyebrow">{t('platformGrow')}</span><h2>{t('platformCreate')}</h2><p>{t('platformHelp')}</p></div><div><form onSubmit={create} className="agency-create-form"><label>{t('name')}<input required maxLength={150} value={name} onChange={event=>setName(event.target.value)}/></label><label>{t('platformSlug')}<input required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9-]{1,62}" value={slug} onChange={event=>setSlug(event.target.value)} aria-describedby="agency-slug-help"/></label><p id="agency-slug-help">{t('platformSlugHelp')}</p><button disabled={busy}>{t(busy?'loading':'platformCreate')}</button></form>{created&&<p role="status" className="success">{t('platformCreated')}</p>}</div></section>
  </>}
 </section>}</>;
}
