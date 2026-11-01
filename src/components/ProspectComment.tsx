'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {supabase} from '@/lib/supabase';
import {legacyMode,table,type Row,label} from '@/lib/model';
import {prospectComment,withProspectDetails} from '@/lib/prospect-details';

export default function ProspectComment({row,userId,disabled,onSaved}:{row:Row;userId:string;disabled:boolean;onSaved:(notes:string)=>void}) {
 const t=useTranslations();
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(saving||disabled)return;
  setSaving(true);setError('');
  try{
   const notes=withProspectDetails(String(row.notes??''),{comment:draft});
   let query=supabase().from(table('prospects')).update({notes}).eq('id',row.id);
   if(!legacyMode)query=query.eq('owner_id',userId);
   // Do not overwrite notes changed by another user after this list loaded.
   query=row.notes===null||row.notes===undefined?query.is('notes',null):query.eq('notes',String(row.notes));
   const result=await query.select('id,notes').single();
   if(result.error||!result.data||String(result.data.id)!==row.id||typeof result.data.notes!=='string')throw Error();
   onSaved(result.data.notes);setEditing(false);
  }catch{setError(t('prospectCommentSaveError'));}finally{setSaving(false);}
 }
 return <div className="prospect-comment-cell">{editing?<form onSubmit={save} className="prospect-comment-form"><label className="sr-only" htmlFor={`comment-${row.id}`}>{t('editProspectComment',{name:label(row)})}</label><textarea id={`comment-${row.id}`} autoFocus rows={4} maxLength={10000} value={draft} disabled={saving||disabled} onChange={e=>setDraft(e.target.value)}/><div className="prospect-comment-actions"><button type="submit" disabled={saving||disabled}>{t(saving?'saving':'save')}</button><button type="button" disabled={saving} onClick={()=>{setEditing(false);setError('');}}>{t('cancel')}</button></div></form>:<><p className="prospect-comment-text" dir="auto">{prospectComment(row)||'—'}</p><button type="button" className="prospect-comment-edit" disabled={disabled} title={t('editProspectComment',{name:label(row)})} aria-label={t('editProspectComment',{name:label(row)})} onClick={()=>{setDraft(prospectComment(row));setError('');setEditing(true);}}><span aria-hidden="true">✏️</span> {t('edit')}</button></>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
