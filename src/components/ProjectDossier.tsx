'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {supabase} from '@/lib/supabase';
import {saveFile} from '@/lib/save-file';
import ProjectFilePreview,{type PreviewFile} from './ProjectFilePreview';
import {fetchAll} from '@/lib/data';
import {creationPayload,legacyMode,table} from '@/lib/model';
import {apartmentRows,validateApartments,hasApartmentConflict,validProjectFile,type ApartmentDraft} from '@/lib/apartment-import';
import {splitDelimited} from '@/lib/prospect-import';

type DocumentRow={id:string;name:string;file_url:string};
export default function ProjectDossier({projectId,userId,canManage,onImported,onDraftChange}:{projectId:string;userId:string;canManage:boolean;onImported:()=>void;onDraftChange?:(rows:ApartmentDraft[])=>void}){
 const t=useTranslations();
 const [open,setOpen]=useState(true),[files,setFiles]=useState<File[]>([]),[documents,setDocuments]=useState<DocumentRow[]>([]),[draft,setDraft]=useState<ApartmentDraft[]>([]),[filename,setFilename]=useState(''),[pdfReview,setPdfReview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [sheets,setSheets]=useState<{name:string;rows:ApartmentDraft[]|null}[]>([]),[sheetName,setSheetName]=useState('');
 useEffect(()=>{onDraftChange?.(draft);},[draft,onDraftChange]);
 const [preview,setPreview]=useState<PreviewFile|null>(null);
 const lock=useRef(false);const folder=useRef<HTMLInputElement>(null);
 const loadDocuments=useCallback(async()=>{
  const {data,error}=await supabase().from('documents').select('id,name,file_url').eq('project_id',projectId).eq('document_type','project_dossier').order('created_at',{ascending:false});
  if(error)throw error;return (data??[]).map(d=>({...d,id:String(d.id)})) as DocumentRow[];
 },[projectId]);
 useEffect(()=>{if(!legacyMode||!canManage)return;let live=true;loadDocuments().then(data=>{if(live)setDocuments(data);}).catch(()=>{if(live)setError(t('dossierLoadError'));});return()=>{live=false;};},[canManage,loadDocuments,t]);
 function selectFiles(selected:FileList|null){
  setError('');setMessage('');if(!selected)return;const incoming=Array.from(selected);
  if(incoming.length>30||incoming.some(f=>!validProjectFile(f))){setError(t('dossierFileError'));return;}
  setFiles(incoming);
 }
 async function upload(){
  if(lock.current||!files.length)return;lock.current=true;setBusy(true);setError('');setMessage('');let count=0;
  try{
   for(const file of files){
    const extension=file.name.split('.').pop()!.toLowerCase();const path=`projects/${projectId}/${crypto.randomUUID()}.${extension}`;
    const mime=extension==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':extension==='xls'?'application/vnd.ms-excel':extension==='pdf'?'application/pdf':extension==='jpg'||extension==='jpeg'?'image/jpeg':`image/${extension}`;
    const storage=supabase().storage.from('documents');const sent=await storage.upload(path,file,{contentType:mime,upsert:false});if(sent.error)throw sent.error;
    const saved=await supabase().from('documents').insert({name:file.name,document_type:'project_dossier',file_url:path,project_id:projectId,created_by:userId});
    if(saved.error){const removed=await storage.remove([path]);if(removed.error)throw Error('cleanup');throw saved.error;}
    count++;setFiles(previous=>previous.filter(f=>f!==file));
   }
   setMessage(t('dossierUploaded',{count}));
  }catch(e){setError(t(e instanceof Error&&e.message==='cleanup'?'dossierCleanupError':'dossierUploadError',{count}));}
  finally{try{setDocuments(await loadDocuments());}catch{setError(previous=>previous||t('dossierLoadError'));}lock.current=false;setBusy(false);}
 }
 async function documentBlob(document:DocumentRow){
  if(!document.file_url.startsWith(`projects/${projectId}/`)||document.file_url.includes('..'))throw Error('path');
  const {data,error}=await supabase().storage.from('documents').download(document.file_url);if(error)throw error;return data;
 }
 async function download(document:DocumentRow){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(!document.file_url.startsWith(`projects/${projectId}/`)||document.file_url.includes('..'))throw Error('path');
   const outcome=await saveFile(()=>documentBlob(document),document.name);
   if(outcome!=='cancelled')setMessage(t(outcome==='saved'?'dossierFileSaved':'dossierDownloadStarted'));
  }catch{setError(t('dossierDownloadError'));}finally{lock.current=false;setBusy(false);}
 }
 async function readApartments(file:File|undefined){
  if(!file||lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');setDraft([]);setFilename('');setPdfReview('');setSheets([]);setSheetName('');
  try{
   if(file.size>5*1024*1024)throw Error('size');let input:unknown;
   if(/\.pdf$/i.test(file.name)){
    const {readApartmentPdf}=await import('@/lib/read-apartment-pdf');const result=await readApartmentPdf(file);input=result.rows;setPdfReview(t('dossierPdfReview',{pages:result.pages,tablePages:result.tablePages}));
   }else if(/\.json$/i.test(file.name)){
    const value=JSON.parse(await file.text());input=Array.isArray(value)?value:value?.apartments;
   }else{
    let matrix:string[][];
    if(/\.xlsx$/i.test(file.name)){
     const {readApartmentWorkbook}=await import('@/lib/apartment-import');
     const loaded=await readApartmentWorkbook(await file.arrayBuffer());setSheets(loaded);
     const selected=loaded.find(sheet=>sheet.rows);if(!selected?.rows)throw Error('headers');
     setSheetName(selected.name);setDraft(selected.rows);setFilename(file.name);return;
    }else if(/\.(csv|tsv)$/i.test(file.name)){
     const text=await file.text();const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0];matrix=splitDelimited(text.replace(/^\uFEFF/,''),first.includes('\t')?'\t':first.includes(';')?';':',');
    }else throw Error('format');
    if(matrix.length>1001||matrix.some(row=>row.length>30))throw Error('size');input=apartmentRows(matrix);
   }
   const rows=validateApartments(input);setDraft(rows);setFilename(file.name);
  }catch(e){setError(t(e instanceof Error&&e.message==='duplicate'?'dossierDuplicate':/\.pdf$/i.test(file.name)?'dossierPdfError':'dossierImportError'));}finally{lock.current=false;setBusy(false);}
 }
 async function readDocumentApartments(document:DocumentRow){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');setOpen(true);
  let file:File;
  try{const blob=await documentBlob(document);file=new File([blob],document.name,{type:blob.type});}
  catch{setError(t('dossierDownloadError'));return;}
  finally{lock.current=false;setBusy(false);}
  await readApartments(file);
 }
 async function importApartments(){
  if(lock.current||!draft.length)return;lock.current=true;setBusy(true);setError('');setMessage('');
  try{
   const rows=validateApartments(draft);const existing=await fetchAll('apartments',userId,{project_id:projectId});if(hasApartmentConflict(rows,existing))throw Error('duplicate');
   // One INSERT keeps the batch atomic. Only whitelisted fields from validated drafts are sent.
   const {error}=await supabase().from(table('apartments')).insert(rows.map(row=>creationPayload('apartments',{...row,project_id:projectId},userId)));if(error)throw error;
   setDraft([]);setFilename('');setMessage(t('dossierImported',{count:rows.length}));onImported();
  }catch(e){setError(t(e instanceof Error&&e.message==='duplicate'?'dossierDuplicate':'dossierSaveError'));}finally{lock.current=false;setBusy(false);}
 }
 function template(){
  const url=URL.createObjectURL(new Blob(['\uFEFFapartment_number;reference;floor;rooms;area;terrace;garden;price;direction;status;notes\n'],{type:'text/csv;charset=utf-8'}));const a=window.document.createElement('a');a.href=url;a.download='appartements-modele.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 if(!legacyMode||!canManage)return null;
 return <section className="panel project-dossier"><div className="flex flex-wrap justify-between items-center gap-3"><h2>{t('dossierTitle')}</h2><button type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{t(open?'dossierClose':'dossierAdd')}</button></div>{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status" className="success">{message}</p>}{open&&<div className="grid gap-5 mt-5"><p className="muted">{t('dossierHelp')}</p><fieldset className="grid gap-3" disabled={busy}><legend><h3>{t('dossierApartments')}</h3></legend><p className="muted">{t('dossierApartmentsHelp')}</p><button type="button" onClick={template}>{t('dossierTemplate')}</button><label>{t('dossierChooseTable')}<input type="file" accept=".csv,.tsv,.xlsx,.json,.pdf" onChange={e=>{void readApartments(e.target.files?.[0]);e.target.value='';}}/></label>{sheets.length>1&&<label>{t('dossierSheet')}<select value={sheetName} onChange={e=>{const selected=sheets.find(sheet=>sheet.name===e.target.value);setSheetName(e.target.value);setDraft(selected?.rows??[]);setError(selected?.rows?'':t('dossierImportError'));}}>{sheets.map(sheet=><option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label>}{draft.length>0&&<>{pdfReview&&<p role="status" className="muted">{pdfReview}</p>}<p role="status">{t('dossierPreviewOnly')}</p><p>{filename} · {t('results',{count:draft.length})}</p><p className="muted">{t('dossierTableBelow')}</p><button type="button" onClick={importApartments}>{t('dossierConfirm',{count:draft.length})}</button><button type="button" onClick={()=>{setDraft([]);setFilename('');}}>{t('cancel')}</button></>}</fieldset><fieldset className="grid gap-3" disabled={busy}><legend><h3>{t('dossierFiles')}</h3></legend><p className="muted">{t('dossierFilesHelp')}</p><label>{t('dossierChooseFiles')}<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls" onChange={e=>{selectFiles(e.target.files);e.target.value='';}}/></label><input ref={element=>{folder.current=element;element?.setAttribute('webkitdirectory','');}} type="file" multiple hidden onChange={e=>{selectFiles(e.target.files);e.target.value='';}}/><button type="button" onClick={()=>folder.current?.click()}>{t('dossierChooseFolder')}</button>{files.length>0&&<><ul>{files.map((f,i)=><li key={i}>{f.name} · {(f.size/1024/1024).toFixed(1)} Mo {!/\.xlsx?$/i.test(f.name)&&<button type="button" onClick={()=>setPreview({name:f.name,load:async()=>f})}>{t('dossierView')}</button>}</li>)}</ul><button type="button" onClick={upload}>{t('dossierUpload',{count:files.length})}</button></>}</fieldset></div>}{busy&&<p role="status">{t('saving')}</p>}{documents.length>0&&<ul className="grid gap-2 mt-4">{documents.map(doc=><li key={doc.id} className="flex flex-wrap items-center gap-3"><span style={{overflowWrap:'anywhere'}}>{doc.name}</span>{!/\.xlsx?$/i.test(doc.name)&&<button type="button" disabled={busy} onClick={()=>setPreview({name:doc.name,load:()=>documentBlob(doc)})}>{t('dossierView')}</button>}{/\.(xlsx|csv|tsv|json|pdf)$/i.test(doc.name)&&<button type="button" disabled={busy} onClick={()=>void readDocumentApartments(doc)}>{t('dossierReadApartments')}</button>}<button type="button" disabled={busy} onClick={()=>void download(doc)}>{t('dossierDownload')} : {doc.name}</button></li>)}</ul>}{preview&&<ProjectFilePreview file={preview} onClose={()=>setPreview(null)}/>}</section>;
}
