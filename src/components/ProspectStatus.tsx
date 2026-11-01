'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {supabase} from '@/lib/supabase';
import {legacyMode,table,label,type Row} from '@/lib/model';
import {prospectStatus,withProspectDetails} from '@/lib/prospect-details';

export default function ProspectStatus({row,userId,statuses,disabled,onSaved}:{row:Row;userId:string;statuses:string[];disabled:boolean;onSaved:(changes:{status:string;notes:string})=>void}) {
 const t=useTranslations();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 function cancel(){setEditing(false);setError('');}
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving||disabled)return;
  setSaving(true);setError('');
  try{
   const status=draft.trim(),notes=withProspectDetails(String(row.notes??''),{statusOverride:status});
   let query=supabase().from(table('prospects')).update({status,notes}).eq('id',row.id);
   if(!legacyMode)query=query.eq('owner_id',userId);
   query=row.status===null||row.status===undefined?query.is('status',null):query.eq('status',String(row.status));
   query=row.notes===null||row.notes===undefined?query.is('notes',null):query.eq('notes',String(row.notes));
   const result=await query.select('id,status,notes').single();
   if(result.error||!result.data||String(result.data.id)!==row.id||result.data.status!==status||typeof result.data.notes!=='string')throw Error();
   onSaved({status:result.data.status,notes:result.data.notes});setEditing(false);
  }catch{setError(t('prospectStatusSaveError'));}finally{setSaving(false);}
 }
 return <div className="prospect-status-cell">{editing?<form onSubmit={save} className="prospect-status-form"><label className="sr-only" htmlFor={`status-${row.id}`}>{t('editProspectStatus',{name:label(row)})}</label><input id={`status-${row.id}`} list={`statuses-${row.id}`} autoFocus maxLength={500} value={draft} disabled={saving||disabled} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&!saving)cancel();}}/><datalist id={`statuses-${row.id}`}>{[...new Set(statuses.filter(Boolean))].map(status=><option key={status} value={status}/>)}</datalist><div className="prospect-comment-actions"><button type="submit" disabled={saving||disabled}>{t(saving?'saving':'save')}</button><button type="button" disabled={saving} onClick={cancel}>{t('cancel')}</button></div></form>:<><span className="status-pill" dir="auto">{prospectStatus(row)||'—'}</span><button type="button" className="prospect-comment-edit" disabled={disabled} title={t('editProspectStatus',{name:label(row)})} aria-label={t('editProspectStatus',{name:label(row)})} onClick={()=>{setDraft(prospectStatus(row));setError('');setEditing(true);}}><span aria-hidden="true">✏️</span> {t('edit')}</button></>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
