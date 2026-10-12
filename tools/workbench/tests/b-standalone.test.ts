import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store';
import {capture} from '../research';
import {defaultRulesA} from '../../../models/player/reference/src/index.js';
import {fixedBDocument,standaloneInputHash} from '../../experiments/src/b-standalone';
const scores={principleConformance:{result:'insufficient-evidence',reason:'Synthetic software example'},rugbyValidity:{result:'insufficient-evidence',reason:'No human rugby validation'}};
function inputs(){const s=capture('support',42,defaultRulesA(),'B0');return [{id:'private-evaluator-label',bundle:s.bundle,memory:s.memoryBefore,profile:s.profile}];}
test('B-only none/old/new packets freeze actual subject input independently of later B adoption and restart',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-b-three-arms-'));try{
  const store=new Store(dir),cases=inputs(),document=fixedBDocument('# Synthetic proposed principles\nRetain uncertainty.');document.ref.id='urn:uuid:90bb3b98-8b05-47ee-b22c-88c9e2cd2c4f';document.ref.version=7;
  const none=store.standaloneBPacket(cases,{arm:'none'}),old=store.standaloneBPacket(cases,{arm:'old',bVersion:'B0'}),next=store.standaloneBPacket(cases,{arm:'new',document});
  assert(!('principles'in none.modelInput));assert.equal(none.documentRef,null);assert.equal(none.bVersion,null);assert.equal(old.modelInput.principles,store.exportB());assert.deepEqual(next.documentRef,document.ref);assert.equal(next.bVersion,null);
  for(const packet of [none,old,next]){assert.equal(packet.inputSha256,standaloneInputHash(packet.modelInput));assert.equal(packet.modelInput.cases[0].id,'case-1');assert(!('arm'in packet.modelInput));assert(!JSON.stringify(packet.modelInput).includes('private-evaluator-label'));}
  const same=store.standaloneBPacket(cases,{arm:'old',document});assert.equal(same.inputSha256,next.inputSha256,'blinded model input does not expose evaluator arm labels');
  const sid=store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),c=store.propose(sid,'Synthetic B-only state change');store.edit(c.id,{}, {id:'different',condition:'uncertain',criterion:'check',priority:1,exceptions:'urgent',unknown:'reobserve',evidence:'synthetic'},1);store.review(c.id,'B','approve','owner',2);assert.notEqual(store.exportB(),old.modelInput.principles);
  const records=[none,old,next].map(packet=>store.saveStandaloneBReview(packet,'Synthetic manual evaluator','Not a real AI result',scores));
  for(const [i,record] of records.entries()){assert.equal(record.inputSha256,[none,old,next][i].inputSha256);assert.deepEqual(record.packet,[none,old,next][i]);assert.equal(record.humanValidated,false);}
  const restarted=new Store(dir);assert.deepEqual(restarted.read().standaloneBReviews,records);assert.equal(Object.keys(restarted.read().experiments).length,0);assert.equal(restarted.active().A.version,'A0');assert.equal(restarted.active().B.version,'B1');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('standalone B rejects ambiguous arms, changed actual input, bad fixed refs and missing separate scores without writes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-b-invalid-'));try{
  const store=new Store(dir);store.initializeSynthetic();const before=readFileSync(join(dir,'state.json'),'utf8'),cases=inputs();
  for(const selection of [{},{arm:'unknown'},{arm:'none',bVersion:'B0'},{arm:'old'},{arm:'new',bVersion:'B0',document:fixedBDocument('text')},{arm:'new',document:{...fixedBDocument('text'),text:'different'}}])assert.throws(()=>store.standaloneBPacket(cases,selection));
  const none=store.standaloneBPacket(cases,{arm:'none'}),withText={...none,modelInput:{...none.modelInput,principles:'Not a none arm'}};withText.inputSha256=standaloneInputHash(withText.modelInput);assert.throws(()=>store.saveStandaloneBReview(withText,'manual','synthetic',scores),/none arm/);
  const altered=structuredClone(none);altered.modelInput.cases[0].bundle.time+=.1;assert.throws(()=>store.saveStandaloneBReview(altered,'manual','synthetic',scores),/input hash/);
  assert.throws(()=>store.saveStandaloneBReview(none,'manual','synthetic','one undifferentiated score'));
  assert.throws(()=>store.standaloneBPacket([{...cases[0],world:{}}],{arm:'none'}));
  assert.equal(readFileSync(join(dir,'state.json'),'utf8'),before);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
