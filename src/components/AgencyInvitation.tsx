'use client';
import {useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {supabase} from '@/lib/supabase';

export default function AgencyInvitation({agencyId,agencyName,enabled}:{agencyId:string;agencyName:string;enabled:boolean}) {
 const t=useTranslations(),locale=useLocale();
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[sent,setSent]=useState(''),[provisionFailed,setProvisionFailed]=useState(false);
 async function invite(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!enabled||provisionFailed)return;
  setBusy(true);setError('');setSent('');
  try{
   const session=await supabase().auth.getSession();
   if(session.error||!session.data.session){setError(t('platformInviteSession'));return;}
   const response=await fetch('/api/platform/employees',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session.access_token}`},body:JSON.stringify({agencyId,name:name.trim(),email:email.trim(),locale})});
   const result=await response.json();
   if(!response.ok){
    const messages:Record<string,string>={configuration:'platformInviteSetup',adminConfiguration:'platformInviteSetup',unauthorized:'platformInviteSession',forbidden:'platformDenied',invalid:'platformInviteInvalid',alreadyMember:'platformInviteExists',inviteFailed:'platformInviteEmailError',provisionFailed:'platformInviteProvision'};
    if(result.error==='provisionFailed')setProvisionFailed(true);
    setError(t(response.status===429?'platformInviteLimit':messages[result.error]??'platformInviteError'));return;
   }
   setSent(email.trim());setName('');setEmail('');
  }catch{setError(t('platformInviteUncertain'));}finally{setBusy(false);}
 }
 if(!enabled)return <p>{t('platformInviteDisabled')}</p>;
 return <section aria-label={t('platformInviteFor',{agency:agencyName})}><h3>{t('platformInviteAdmin')}</h3><p>{t('platformInviteHelp')}</p><form onSubmit={invite} className="grid gap-4 max-w-lg"><label>{t('name')}<input required maxLength={100} autoComplete="name" value={name} disabled={busy||provisionFailed} onChange={event=>setName(event.target.value)}/></label><label>{t('email')}<input required type="email" maxLength={254} autoComplete="email" value={email} disabled={busy||provisionFailed} onChange={event=>setEmail(event.target.value)}/></label><button disabled={busy||provisionFailed}>{t(busy?'loading':'platformInviteAdmin')}</button></form>{error&&<p role="alert" className="error">{error}</p>}{sent&&<p role="status">{t('platformInviteSent',{email:sent,agency:agencyName})}</p>}</section>;
}
