import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { Store } from '../server/store';
import { capture, experimentRun, observationContext, regressionCompare } from '../src/research';
import { defaultRulesA, defaultProfile, emptyMemory, type ContextRule, type RulesA } from '../src/contracts';
import { think } from '../src/cognition';
import { makeWorld, sense, advance } from '../src/simulation';
const edit=JSON.parse(readFileSync('examples/conditional-coaching-edit.json','utf8'));
const rules=():RulesA=>({...defaultRulesA(),...edit.patchA,version:'trial'});
function scope(fn:(store:Store,dir:string)=>void){const dir=mkdtempSync(join(tmpdir(),'rpm-readiness-'));try{fn(new Store(dir),dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function transferChecks(results:ReturnType<typeof regressionCompare>){
 const get=(id:string)=>results.find(r=>r.caseId===id)!;
 return [get('carrier-open').before.intention.action==='carry'&&get('carrier-open').after.intention.action==='scan',
  get('carrier-pressure').after.intention.action==='hold',get('carrier-receiver').after.intention.action==='pass',get('noncarrier-open').after.intention.action==='support'];
}
test('conditional coaching transfers to a different scene and preserves pressure/receiver/noncarrier controls; constant stubs fail',()=>{
 const valid=regressionCompare(defaultRulesA(),rules(),defaultProfile());assert.ok(transferChecks(valid).every(Boolean));
 const trained=experimentRun(capture('support',42,defaultRulesA(),'B0'),rules(),5);
 assert.equal(trained.recorded.before.frames[0].trace.intention.action,'carry');assert.equal(trained.recorded.after.frames[0].trace.intention.action,'scan');
 assert.equal(trained.diagnostic.homogeneousWarning,false);assert.ok(trained.diagnostic.distinctFirstActions.length>=4);
 // Negative controls: every constant-action stub, and the old global scanBias demo, must fail this acceptance gate.
 for(const action of ['scan','hold','carry','pass','support'] as const){
  const stub=structuredClone(valid);for(const r of stub)r.after.intention.action=action;
  assert.ok(!transferChecks(stub).every(Boolean),`constant ${action} incorrectly passed`);
 }
 assert.ok(!transferChecks(regressionCompare(defaultRulesA(),{...defaultRulesA(),scanBias:2},defaultProfile())).every(Boolean));
 for(const seed of [17,811,9876]){
  const s=capture('support',seed,defaultRulesA(),'B0');assert.equal(experimentRun(s,rules(),3).recorded.after.frames[0].trace.intention.action,'scan');
 }
});
test('conditional rules only use evidence, preserve hard pass eligibility, and reject scene/seed selectors',()=>{
 const r=rules(),a=makeWorld('occluded',42),b=structuredClone(a);b.entities.find(e=>e.id==='hidden')!.position.z=22;
 assert.deepEqual(think(sense(a),emptyMemory(),defaultProfile(),r),think(sense(b),emptyMemory(),defaultProfile(),r));
 const pass={...r,contextRules:[{...r.contextRules![0],action:'pass' as const,weight:2}]};
 assert.equal(think(sense(makeWorld('support',42)),emptyMemory(),defaultProfile(),pass).evaluation.find(e=>e.action==='pass')!.allowed,false);
 assert.throws(()=>think(sense(a),emptyMemory(),defaultProfile(),{...r,contextRules:[{...r.contextRules![0],seed:42}]} as any),/additional/);
 assert.throws(()=>think(sense(a),emptyMemory(),defaultProfile(),{...r,contextRules:[r.contextRules![0],r.contextRules![0]]}),/Duplicate/);
});
test('semantic call selection differs by possession and observations; emitted events are bounded and never fresh self-evidence',()=>{
 const rule:ContextRule={id:'offer-support',when:{possession:'no-ball',evidence:'observed-ball',unlessCloseThreat:true},action:'support',weight:1,call:'support-call'};
 const r={...defaultRulesA(),contextRules:[rule]};let world=makeWorld('support',42);world.body.hasBall=false;
 const trace=think(sense(world),emptyMemory(),defaultProfile(),r);assert.equal(trace.intention.action,'support');assert.equal(trace.output.find(o=>o.channel==='call')!.value,'support-call');
 const next=advance(world,trace);assert.equal(next.emittedCalls?.length,1);assert.ok(!sense(next).percepts.some(p=>p.modality==='audio'));
 assert.equal(advance(next,trace).emittedCalls?.length,1,'same cue has a one-second cooldown');
 const long={...world,time:100,emittedCalls:Array.from({length:32},(_,i)=>({at:i,playerId:'self',cue:'support-call' as const}))};
 assert.equal(advance(long,trace).emittedCalls?.length,32,'event history remains bounded');
 const carried=makeWorld('support',42);assert.ok(!think(sense(carried),emptyMemory(),defaultProfile(),r).output.some(o=>o.channel==='call'));
 world.entities=world.entities.filter(e=>e.kind!=='ball');assert.ok(!think(sense(world),emptyMemory(),defaultProfile(),r).output.some(o=>o.channel==='call'));
});
test('return, revise, independent adoption, durable runs, B replacement and undo survive store restart',()=>scope((store,dir)=>{
 const c=store.propose(store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),'SYNTHETIC: recheck before assuming a receiver');
 store.edit(c.id,edit.patchA,edit.principle,1,edit.notes);
 assert.throws(()=>store.review(c.id,'A','return','owner',2,''),/reason/);
 store.review(c.id,'A','return','owner',2,'Use a close-threat exception');
 assert.throws(()=>store.edit(c.id,edit.patchA,edit.principle,2,edit.notes),/immutable/);
 const child=store.revise(c.id,'SYNTHETIC: revised hypothesis',2);assert.equal(child.parentCandidateId,c.id);assert.equal(child.decisions.A,'pending');
 assert.equal(observationContext(child).bundle.playerId,'self');assert.equal((observationContext(child) as any).world,undefined);
 const preview=store.runExperiment(child.id,1,5,'preview');assert.equal(store.active().A.version,'A0');assert.equal(store.active().B.version,'B0');
 assert.ok(preview.B.after.markdown.includes('NOT approved'));
 assert.equal(preview.results.trials.find(t=>t.caseId==='carrier-pressure')!.after.frames[0].trace.intention.action,'hold');
 assert.throws(()=>store.runExperiment(child.id,0,5,'preview'),/required/);
 assert.throws(()=>store.runExperiment(child.id,1,21,'preview'),/steps/);
 store.review(child.id,'A','approve','owner',1);assert.equal(store.active().B.version,'B0');store.review(child.id,'B','approve','owner',1);
 const run=store.runExperiment(child.id,1,5,'active');assert.equal(run.B.after.version,'B1');assert.equal(run.B.after.structuredAmendments[0].id,edit.principle.id);
 assert.ok(run.engineFingerprint.length===64);const pinned=JSON.stringify(run);
 assert.equal(run.provenance.node,process.version);assert.equal(run.provenance.resultSha256,createHash('sha256').update(JSON.stringify(run.results)).digest('hex'));
 const packet=store.bPacket(run.id,'after','regression');assert.ok(!JSON.stringify(packet).includes('"world"'));assert.equal(packet.cases.length,8);
 store.saveBReview(run.id,'Synthetic mock response; not an AI evaluation','Needs another observation; alternatives retained','Transport test only, no human scoring','after','regression');
 const changed=store.revise(child.id,'Revise the same B principle',1);store.edit(changed.id,{}, {...edit.principle,criterion:'Revised wording'},1,edit.notes);
 store.review(changed.id,'B','approve','owner',2);assert.equal(store.active().B.principles.length,1);assert.equal(store.active().B.principles[0].criterion,'Revised wording');
 store.undo('B','owner','B2');assert.equal(store.active().B.principles[0].criterion,edit.principle.criterion);
 store.undo('A','owner','A1');assert.equal(store.active().B.version,'B1');store.undo('B','owner','B1');
 const restarted=new Store(dir);assert.equal(restarted.active().A.version,'A0');assert.equal(restarted.active().B.version,'B0');
 assert.equal(JSON.stringify(restarted.read().experiments[run.id]),pinned);assert.equal(restarted.read().bReviews.length,1);
 assert.equal(restarted.read().bReviews[0].humanValidated,false);assert.equal(restarted.read().candidates[c.id].decisions.A,'returned');
 assert.equal(restarted.comparison(child.id).recorded.after.intention.action,'carry');
}));
test('legacy sessions retain their candidates and initialize new research record collections without silently adopting rules',()=>scope((store,dir)=>{
 const original=store.read();delete (original as any).experiments;delete (original as any).bReviews;delete (original as any).evaluationSets;
 writeFileSync(join(dir,'state.json'),JSON.stringify(original));const restarted=new Store(dir);assert.deepEqual(restarted.read().experiments,{});assert.deepEqual(restarted.read().bReviews,[]);assert.deepEqual(restarted.read().evaluationSets,{});assert.equal(restarted.active().A.contextRules,undefined);
}));
