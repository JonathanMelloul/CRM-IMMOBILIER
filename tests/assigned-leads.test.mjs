import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {extractAssignedLeads,cellText} from '../scripts/extract-assigned-leads.mjs';
import {parseLeads,importLeadPayload,sourceProject} from '../src/lib/prospect-import.ts';

test('extracts the assignee column across sheets, retains comments and marks repeated contacts without dropping rows',()=>{
 const wb=new ExcelJS.Workbook();
 const a=wb.addWorksheet('JLM aout');a.addRows([['date','Nom','email','telephone','משווק מטפל','commentaire'],['3 aout','A Test','a@example.test','+33612345678','Yonathan','Rappeler\nAprès-midi'],['4 aout','Jonathan Client','','','Arie','not assigned to Jonathan']]);
 const b=wb.addWorksheet('Ashdod octobre');b.addRows([['date','Nom','email','משווק מטפל','commentaire'],[new Date('2026-10-09'),'A Test','a@example.test','Jonathan','Autre projet'],['','B Test','','Yonathan','Date inconnue']]);
 const leads=extractAssignedLeads(wb,2026);assert.equal(leads.length,3);
 assert.equal(leads[0].received_on,'2026-08-03');assert.equal(leads[0].project,'JLM');assert.equal(leads[0].comment,'Rappeler\nAprès-midi');
 assert.equal(leads[1].project,'Ashdod');assert.equal(leads[1].duplicate,true);assert.equal(leads[1].sourceLine,'2');
 assert.equal(leads[2].received_on,'');assert.equal(leads[2].issue,'date');
});

test('LinkedIn full names and mailing layouts preserve source details',()=>{
 const wb=new ExcelJS.Workbook();const a=wb.addWorksheet('JLM Linkedin');a.addRows([['date','prenom','nom','email','tel','projet','משווק מטפל','הערות','commentaire'],['2026-07-23','Anne','Test','a@example.test',{formula:'+33612345678',result:33612345678},'Investissement','Yonathan','À rappeler','En soirée']]);
 const b=wb.addWorksheet('JLM - Mailing');b.addRows([['Horodateur','Adresse e-mail','1. Quel est votre projet immobilier ?','2. Dans quel délai souhaitez-vous acheter ?','3. Quel type de bien recherchez-vous ?','Nom complet','Adresse e-mail 2','Téléphone','משווק מטפל','הערות','commentaire'],[new Date('2026-07-13T19:05:50Z'),'old@example.test','Habiter','Dans un an','3 pièces','B Test',{text:{richText:[{text:'b@example.test'}]},hyperlink:'mailto:b@example.test'},'+33698765432','Yonathan','','Contacté']]);
 const leads=extractAssignedLeads(wb,2026),linked=leads.find(l=>l.sourceSheet==='JLM Linkedin'),mail=leads.find(l=>l.sourceSheet==='JLM - Mailing');
 assert.equal(linked.name,'Anne Test');assert.equal(linked.phone,'+33612345678');assert.equal(linked.objective,'Investissement');assert.equal(linked.project,'JLM');
 assert.equal(mail.name,'B Test');assert.equal(mail.email,'b@example.test');assert.equal(mail.received_on,'2026-07-13');assert.equal(mail.deadline,'Dans un an');assert.match(mail.comment,/3 pièces/);assert.match(mail.comment,/19:05:50/);assert.match(mail.comment,/old@example.test/);
 assert.throws(()=>cellText({formula:'SUM(A1:A2)',result:3}),/manual review/);assert.throws(()=>cellText({formula:'+33612345678',result:5}),/manual review/);
});

test('project label, original comment, status and source coordinates survive the existing import payload',()=>{
 const [lead]=parseLeads([['Nom','date','commercial','projet','commentaire','onglet source','ligne source','statut source'],['A Test','2026-10-09','Yonathan','Ashdod','Rappeler\nDemain','Ashdod octobre','4','À contacter']],2026,'');
 const payload=importLeadPayload(lead,'member-id');assert.equal(payload.assigned_to,'member-id');assert.equal(sourceProject('Objectif: '+payload.objective),'Ashdod');assert.match(payload.objective,/Commentaire du fichier:\nRappeler\nDemain/);assert.match(payload.objective,/Onglet source: Ashdod octobre/);assert.match(payload.objective,/Ligne source: 4/);assert.match(payload.objective,/Statut dans le fichier: À contacter/);
 assert.equal(sourceProject('Un ancien commentaire sans projet'), '');
 assert.equal(parseLeads([['Nom','date'],['Sans date','Date à vérifier']],2026,'2026-11-01')[0].issue,'date');
});
