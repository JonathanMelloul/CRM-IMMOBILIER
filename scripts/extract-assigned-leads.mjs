// Local extraction only. Never writes to Supabase or includes lead data in source.
import ExcelJS from 'exceljs';
import {mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseLeads} from '../src/lib/prospect-import.ts';

export function cellText(value) {
 if(value==null)return '';
 if(value instanceof Date)return value.toISOString();
 if(typeof value==='object') {
  if('formula' in value||'sharedFormula' in value){
   // Excel stores some +international phone literals as formulas. Accept only
   // a digits-only literal whose cached numeric result agrees; never evaluate.
   if(typeof value.formula==='string'&&/^\+\d{5,15}$/.test(value.formula)&&Number(value.formula)===value.result)return value.formula;
   throw new Error('Formula cells require manual review');
  }
  if(value.richText)return value.richText.map(part=>part.text).join('');
  return cellText(value.text??'');
 }
 return String(value);
}
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export function extractAssignedLeads(workbook,year) {
 if(!Number.isInteger(year)||year<1900||year>2200)throw new Error('Explicit source year required');
 const leads=[];
 for(const sheet of workbook.worksheets){
  const originalHeader=sheet.getRow(1).values.slice(1).map(cellText);
  const aliases={'nom complet':'Nom','horodateur':'date','adresse e-mail 2':'email','adresse e-mail':'email secondaire','1. quel est votre projet immobilier ?':'objectif','2. dans quel delai souhaitez-vous acheter ?':'delai'};
  const header=originalHeader.map(h=>aliases[normalize(h)]??h);
  // LinkedIn's "projet" column describes purchase intent, not a CRM project.
  if(sheet.name==='JLM Linkedin')header[5]='objectif';
  const commercial=header.findIndex(h=>['משווק מטפל','commercial','responsable'].includes(normalize(h)));
  if(commercial<0)throw new Error(`Missing assignee header: ${sheet.name}`);
  const comment=header.findIndex(h=>normalize(h)==='commentaire');
  const status=header.findIndex(h=>normalize(h)==='הערות');
  const time=header.findIndex(h=>['heure','time'].includes(normalize(h)));
  sheet.eachRow((row,line)=>{
   if(line===1)return;
   const assignee=cellText(row.getCell(commercial+1).value);
   if(!['jonathan','yonathan','יונתן','יהונתן'].includes(normalize(assignee)))return;
   const values=Array.from({length:header.length},(_,i)=>cellText(row.getCell(i+1).value));
   if(time>=0&&values[time].includes('T'))values[time]=values[time].slice(11,19);
   else if(time>=0&&values[time]!==''&&Number(values[time])>=0&&Number(values[time])<1){
    const seconds=Math.round(Number(values[time])*86400)%86400;
    values[time]=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
   }
   const firstName=header.findIndex(h=>normalize(h)==='prenom'),lastName=header.findIndex(h=>normalize(h)==='nom');
   if(firstName>=0&&lastName>=0)values[lastName]=[values[firstName],values[lastName]].filter(Boolean).join(' ');
   const lead=parseLeads([header,values],year,'')[0];
   if(!lead)throw new Error(`Empty assigned row: ${sheet.name}:${line}`);
   // Preserve the sheet label; only remove the campaign suffix from known labels.
   const project=/\bJLM\b/i.test(sheet.name)?'JLM':/^Ashdod(?:\s|$)/i.test(sheet.name)?'Ashdod':/^Tsfat(?:\s|$)/i.test(sheet.name)?'Tsfat':sheet.name;
   const extra=originalHeader.flatMap((h,i)=>normalize(h)==='horodateur'||normalize(h)==='adresse e-mail'||/^3\./.test(h)?[`${h}: ${values[i]}`]:[]);
   leads.push({...lead,project,sourceSheet:sheet.name,sourceLine:String(line),sourceStatus:status>=0?values[status]:'',comment:[comment>=0?values[comment]:'',...extra].filter(Boolean).join('\n')});
  });
 }
 // Mark repeated contacts, retain every source row and every comment for review.
 const emails=new Set(),phones=new Set();
 for(const lead of leads){const email=lead.email.toLowerCase(),phone=lead.phone.replace(/\D/g,'').replace(/^00/,'');lead.duplicate=!!((email&&emails.has(email))||(phone&&phones.has(phone)));if(email)emails.add(email);if(phone)phones.add(phone);}
 return leads.sort((a,b)=>(a.received_on||'9999').localeCompare(b.received_on||'9999')||a.sourceSheet.localeCompare(b.sourceSheet)||Number(a.sourceLine)-Number(b.sourceLine));
}

export async function writeLeadWorkbook(leads,output) {
 const wb=new ExcelJS.Workbook();
 const columns=[['Nom','name'],['email','email'],['telephone','phone'],['pays','country'],['date','received_on'],['heure','received_time'],['commercial','commercial'],['projet','project'],['commentaire','comment'],['objectif','objective'],['delai','deadline'],['onglet source','sourceSheet'],['ligne source','sourceLine'],['statut source','sourceStatus'],['Doublon à vérifier','duplicate'],['Erreur à vérifier','issue']].map(([header,key])=>({header,key,width:['comment','objective'].includes(key)?50:24}));
 const add=(name,rows)=>{const sheet=wb.addWorksheet(name);sheet.columns=columns;sheet.addRows(rows.map(row=>({...row,received_on:row.received_on||'Date à vérifier',duplicate:row.duplicate?'Oui':''})));sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'P1'};sheet.getRow(1).font={bold:true};sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});};
 add('Tous les prospects',leads);
 for(const month of [...new Set(leads.map(lead=>lead.received_on.slice(0,7)||'Date à vérifier'))])add(month,leads.filter(lead=>(lead.received_on.slice(0,7)||'Date à vérifier')===month));
 const summary=wb.addWorksheet('Synthèse');summary.columns=[{header:'Mois',key:'month',width:25},{header:'Projet (fichier)',key:'project',width:25},{header:'Lignes',key:'count',width:12}];
 const counts=new Map();for(const lead of leads){const key=(lead.received_on.slice(0,7)||'Date à vérifier')+'|'+lead.project;counts.set(key,(counts.get(key)||0)+1);}for(const [key,count] of counts){const [month,project]=key.split('|');summary.addRow({month,project,count});}
 await mkdir(dirname(output),{recursive:true});await wb.xlsx.writeFile(output);
 return {rows:leads.length,duplicates:leads.filter(l=>l.duplicate).length,undated:leads.filter(l=>!l.received_on).length,invalid:leads.filter(l=>l.issue&&l.received_on).length,counts:Object.fromEntries(counts)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output,year]=process.argv.slice(2);if(!input||!output||!year)throw new Error('Usage: node scripts/extract-assigned-leads.mjs input.xlsx output.xlsx source-year');
 const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(input);console.log(JSON.stringify(await writeLeadWorkbook(extractAssignedLeads(wb,Number(year)),output),null,2));
}
