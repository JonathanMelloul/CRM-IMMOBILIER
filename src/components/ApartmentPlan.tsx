'use client';
import {useEffect,useState} from 'react';
import {useTranslations} from 'next-intl';
import {label,type Row} from '@/lib/model';

export function apartmentPlanUrl(apartment:Row){
 const value=String(apartment.notes??'').match(/^Plan\s*:\s*(https:\/\/\S+)\s*$/m)?.[1];
 if(!value)return null;
 try{const url=new URL(value);return url.hostname==='elihaddad-agents.com'&&url.pathname.startsWith('/wp-content/uploads/')&&/\.(jpg|jpeg|png|webp)$/i.test(url.pathname)?url.href:null;}catch{return null;}
}
export default function ApartmentPlan({apartment}:{apartment:Row}){
 const t=useTranslations();const [failed,setFailed]=useState(false);const url=apartmentPlanUrl(apartment);
 const [file,setFile]=useState<File|null>(null),[shareError,setShareError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!url)return;const controller=new AbortController();setFile(null);fetch(`/api/plan-image?url=${encodeURIComponent(url)}`,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('image');const blob=await response.blob();const extension=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';if(!controller.signal.aborted)setFile(new File([blob],`Yonathan-plan-${String(apartment.reference??apartment.id).replace(/[^a-zA-Z0-9-]/g,'')}.${extension}`,{type:blob.type}));}).catch(()=>{if(!controller.signal.aborted)setShareError(t('photoError'));});return()=>controller.abort();},[url,apartment.id,apartment.reference,t]);
 if(!url)return null;
 const subject=t('planFor',{name:label(apartment)});
 async function sharePhoto(){if(!file)return;setShareError('');if(navigator.canShare?.({files:[file]})){setBusy(true);try{await navigator.share({files:[file],title:subject});}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setShareError(t('photoError'));}finally{setBusy(false);}}else{const objectUrl=URL.createObjectURL(file);const anchor=document.createElement('a');anchor.href=objectUrl;anchor.download=file.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),60000);setShareError(t('photoDownloaded'));}}
 return <section className="panel apartment-plan"><div className="gallery-heading"><h2>{t('apartmentPlan')}</h2><div className="plan-actions"><a className="button" href={url} target="_blank" rel="noopener noreferrer">{t('openPlan')}</a><button className="share-whatsapp" disabled={!file||busy} onClick={sharePhoto}>{t(busy?'saving':'sharePhoto')}</button><button className="share-email" disabled={!file||busy} onClick={sharePhoto}>{t('shareEmail')}</button></div></div><p className="muted plan-share-help">{t('photoShareHelp')}</p>{shareError&&<p role="status" className="muted">{shareError}</p>}{failed?<p className="muted">{t('planLoadError')}</p>:<a href={url} target="_blank" rel="noopener noreferrer" aria-label={t('openPlan')}><img src={url} alt={t('planFor',{name:label(apartment)})} onError={()=>setFailed(true)}/></a>}</section>;
}
