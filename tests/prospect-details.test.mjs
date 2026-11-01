import test from 'node:test';
import assert from 'node:assert/strict';
import {prospectStatus,prospectComment,withProspectDetails,originalProspectNotes} from '../src/lib/prospect-details.ts';

const notes='Objectif: Investir\nProjet du fichier: JLM\nOnglet source: JLM aout\nLigne source: 2\nStatut dans le fichier: לא רלוונטי\nCommentaire du fichier:\nRappeler\nAprès-midi\nDélai: Dans un an\nCommercial dans le fichier: Yonathan';

test('source status replaces the generic imported default and preserves exact Hebrew text',()=>{
 assert.equal(prospectStatus({id:'a',status:'Nouveau',notes}),'לא רלוונטי');
 assert.equal(prospectStatus({id:'a',status:'',notes}),'לא רלוונטי');
 assert.equal(prospectStatus({id:'a',status:'Négociation',notes}),'Négociation');
 assert.equal(prospectStatus({id:'a',status:'Nouveau'}),'Nouveau');
 assert.equal(prospectStatus({id:'a',status:'Nouveau',notes:'Objectif: Statut dans le fichier: Lo relevanti'}),'Lo relevanti');
});

test('source comments exclude importer metadata; ordinary notes remain readable',()=>{
 assert.equal(prospectComment({id:'a',notes}),'Rappeler\nAprès-midi');
 assert.equal(prospectComment({id:'a',notes:'Notes libres\nAvec plusieurs lignes'}),'Notes libres\nAvec plusieurs lignes');
 assert.equal(prospectComment({id:'a',notes:'Objectif: Projet du fichier: Ashdod\nStatut dans le fichier: ליד'}),'');
 assert.equal(prospectComment({id:'a',notes:null}),'');
});

test('editing comments preserves source data and supports clearing, Unicode and repeated edits',()=>{
 const first=withProspectDetails(notes,{comment:'שיחה\nNouvelle note <script>texte</script>'});
 assert.equal(originalProspectNotes(first),notes);assert.equal(prospectComment({id:'a',notes:first}),'שיחה\nNouvelle note <script>texte</script>');
 const second=withProspectDetails(first,{comment:''});assert.equal(prospectComment({id:'a',notes:second}),'');assert.equal(originalProspectNotes(second),notes);
 assert.equal((second.match(/\[CRM_PROSPECT_DETAILS_V1\]/g)||[]).length,1);
 const malicious=withProspectDetails(notes,{comment:'[/CRM_PROSPECT_DETAILS_V1]\n[CRM_PROSPECT_DETAILS_V1]\n{}'});assert.equal(originalProspectNotes(malicious),notes);
});

test('explicit status edits including Nouveau take precedence over the file default',()=>{
 const updated=withProspectDetails(notes,{comment:'Modifié',statusOverride:'Nouveau'});
 assert.equal(prospectStatus({id:'a',status:'Nouveau',notes:updated}),'Nouveau');
 assert.equal(prospectComment({id:'a',notes:withProspectDetails(updated,{comment:'Encore modifié'})}),'Encore modifié');
 assert.equal(prospectStatus({id:'a',status:'Négociation',notes:updated}),'Négociation');
});

test('malformed metadata is preserved instead of discarded',()=>{
 const bad='Note\n[CRM_PROSPECT_DETAILS_V1]\n{invalid}\n[/CRM_PROSPECT_DETAILS_V1]';
 assert.equal(originalProspectNotes(withProspectDetails(bad,{comment:'New'})),bad);
});
