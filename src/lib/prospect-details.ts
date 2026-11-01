import type {Row} from './model';

type Details={comment?:string;statusOverride?:string};
const block=/(?:^|\n)\[CRM_PROSPECT_DETAILS_V1\]\n([^\r\n]*)\n\[\/CRM_PROSPECT_DETAILS_V1\](?=\n|$)/g;

function parsedDetails(notes:string):{details:Details;start:number;end:number}|null {
 let result:null|{details:Details;start:number;end:number}=null;
 for(const match of notes.matchAll(block)){
  try{
   const data=JSON.parse(match[1]);
   if(!data||typeof data!=='object'||Array.isArray(data))continue;
   const details:Details={};
   if(typeof data.comment==='string')details.comment=data.comment;
   if(typeof data.statusOverride==='string')details.statusOverride=data.statusOverride;
   result={details,start:match.index!,end:match.index!+match[0].length};
  }catch{/* An unrecognized block remains untouched. */}
 }
 return result;
}

export function originalProspectNotes(notes:string) {
 const parsed=parsedDetails(notes);
 return parsed?notes.slice(0,parsed.start)+notes.slice(parsed.end):notes;
}

export function withProspectDetails(notes:string,changes:Details) {
 const parsed=parsedDetails(notes),details={...parsed?.details,...changes};
 const original=originalProspectNotes(notes);
 return `${original}\n[CRM_PROSPECT_DETAILS_V1]\n${JSON.stringify(details)}\n[/CRM_PROSPECT_DETAILS_V1]`;
}

export function prospectStatus(row:Row):string {
 const notes=String(row.notes??''),stored=String(row.status??'');
 if(parsedDetails(notes)?.details.statusOverride===stored)return stored;
 if(stored.trim()&&stored.trim().toLowerCase()!=='nouveau')return stored;
 const source=originalProspectNotes(notes).match(/(?:^|\n)(?:Objectif: )?Statut dans le fichier: ([^\r\n]+)/)?.[1];
 return source??stored;
}

export function prospectComment(row:Row):string {
 const notes=String(row.notes??''),details=parsedDetails(notes)?.details;
 if(details?.comment!==undefined)return details.comment;
 const original=originalProspectNotes(notes);
 const marker=/(?:^|\n)(?:Objectif: )?Commentaire du fichier:\n/.exec(original);
 if(marker){
  const tail=original.slice(marker.index+marker[0].length);
  return tail.split(/\n(?:Délai: |Commercial dans le fichier: )/)[0];
 }
 // Imported metadata is not a comment. Unstructured CRM notes are comments.
 return /(?:^|\n)(?:Objectif: )?(?:Projet du fichier: |Onglet source: |Statut dans le fichier: )/.test(original)?'':original;
}
