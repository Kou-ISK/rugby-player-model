import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { capture, experimentRun, regressionCases } from '../src/research';
import { defaultProfile, defaultRulesA, emptyMemory, type Snapshot } from '../src/contracts';
import { sense } from '../src/simulation';
import { think } from '../src/cognition';
import { newHistory, appendObservation, replayObservationHistory, assertSnapshotHistory, HISTORY_LIMIT } from '../src/observation-history';
import { conditionDigest, type EvaluationDraft } from '../server/evaluation';
const edit=JSON.parse(readFileSync('examples/conditional-coaching-edit.json','utf8'));
function scope(fn:(store:Store,dir:string)=>void){const dir=mkdtempSync(join(tmpdir(),'rpm-evaluation-'));try{fn(new Store(dir),dir);}finally{rmSync(dir,{recursive:true,force:true});}}
const selectedProfile=()=>({...defaultProfile(),preference:{carry:.9,pass:.1,support:.2},tactics:{preferredAction:'hold' as const,adherence:1}});
function draft():EvaluationDraft {
 const first=capture('audio',8123,defaultRulesA(),'B0'),second=capture('occluded',7181,defaultRulesA(),'B0');
 first.profile=selectedProfile();second.profile=selectedProfile();
 return {criteria:'SYNTHETIC protocol only; inspect eligibility, uncertainty and conditional exceptions.',noveltyAttestation:'not-used-for-coaching',cases:[{label:'EVALUATOR_ONLY_PRESSURE_SENTINEL',snapshot:first},{label:'EVALUATOR_ONLY_OCCLUSION_SENTINEL',snapshot:second}]};
}
function propose(store:Store,setId?:string){const s=capture('support',42,defaultRulesA(),'B0');s.profile=selectedProfile();const c=store.propose(store.saveSnapshot(s),'Synthetic coaching, not owner acceptance',setId);return store.edit(c.id,edit.patchA,edit.principle,1,edit.notes);}

test('all fixed regression cases inherit the selected player profile rather than silently using defaults',()=>{
 const snapshot=capture('support',42,defaultRulesA(),'B0');snapshot.profile=selectedProfile();
 const after={...defaultRulesA(),...edit.patchA,version:'trial'};
 const report=experimentRun(snapshot,after,3);
 assert.equal(report.regressionKind,'published-fixed-regression');
 for(const c of report.observationCases)assert.deepEqual(c.profile,snapshot.profile);
 for(const trial of report.trials){assert.equal(trial.before.frames[0].trace.intention.action,'hold');assert.equal(trial.after.frames[0].trace.intention.action,'hold');}
 const baseline=capture('support',42,defaultRulesA(),'B0');assert.notEqual(experimentRun(baseline,after,1).trials[0].before.frames[0].trace.intention.action,'hold');
 const cases=regressionCases(defaultRulesA(),snapshot.profile);cases[0].snapshot.profile.preference.carry=0;
 assert.equal(cases[1].snapshot.profile.preference.carry,.9);assert.equal(snapshot.profile.preference.carry,.9);
});
test('freeze before coaching pins criteria/profile/cases, rejects known evidence, and records reuse even under a second set id',()=>scope((store,dir)=>{
 const input=draft(),frozen=store.freezeEvaluation(input),copy=store.freezeEvaluation(input);
 input.criteria='mutated caller';assert.notEqual(store.read().evaluationSets[frozen.id].draft.criteria,input.criteria);
 assert.throws(()=>store.propose(store.saveSnapshot(frozen.draft.cases[0].snapshot),'leaked coaching',frozen.id),/cannot be used/);
 const wrong=capture('support',19,defaultRulesA(),'B0');assert.throws(()=>store.propose(store.saveSnapshot(wrong),'wrong profile',frozen.id),/profile differs/);
 const c=propose(store,frozen.id);assert.equal(c.evaluationSetId,frozen.id);
 for(const regression of store.comparison(c.id).regression){assert.deepEqual(regression.profile,c.context.profile);assert.equal(regression.before.intention.action,'hold');}
 const first=store.runExperiment(c.id,2,2,'preview');assert.equal(first.evaluation!.status,'first-recorded-use-owner-declared');
 assert.equal(first.evaluation!.set.digest,frozen.digest);assert.equal(first.results.frozenTrials.length,2);
 for(const trial of first.results.frozenTrials)assert.equal(trial.after.frames[0].trace.intention.action,'hold');
 const repeated=store.runExperiment(c.id,2,2,'preview');assert.equal(repeated.evaluation!.status,'reused-not-unseen');
 const alternative=propose(store,copy.id);assert.equal(store.runExperiment(alternative.id,2,1,'preview').evaluation!.status,'reused-not-unseen');
 const restarted=new Store(dir);assert.deepEqual(restarted.read().evaluationSets[frozen.id],frozen);
 assert.deepEqual(restarted.read().experiments[first.id],first);
 const known=structuredClone(frozen.draft);known.cases=[{label:'renamed training',snapshot:c.context}];
 known.cases[0].snapshot.seed=999;known.cases[0].snapshot.world.seed=999;
 assert.throws(()=>store.freezeEvaluation(known),/already used for coaching/);
 const state=store.read();state.evaluationSets[frozen.id].draft.criteria='tampered on disk';writeFileSync(join(dir,'state.json'),JSON.stringify(state));
 assert.throws(()=>store.runExperiment(c.id,2,1,'preview'),/digest\/profile mismatch/);
}));
test('later unlinked coaching on a frozen condition invalidates its evaluation instead of claiming unseen transfer',()=>scope(store=>{
 const frozen=store.freezeEvaluation(draft()),c=propose(store,frozen.id);
 store.propose(store.saveSnapshot(frozen.draft.cases[0].snapshot),'coaching in an unlinked candidate');
 assert.throws(()=>store.runExperiment(c.id,2,1,'preview'),/became coaching data/);
}));
test('model-facing B payload has anonymous ids only; arm, world, labels, scene/seed and the evaluator map stay outside',()=>scope((store,dir)=>{
 const frozen=store.freezeEvaluation(draft()),c=propose(store,frozen.id),e=store.runExperiment(c.id,2,2,'preview');
 const packets=(['none','before','after'] as const).map(arm=>store.bPacket(e.id,arm,'frozen'));
 assert.deepEqual(packets[0].cases,packets[1].cases);assert.deepEqual(packets[1].cases,packets[2].cases);
 assert.equal(packets[0].principles,null);assert.deepEqual(packets[0].structuredAmendments,[]);
 assert.ok(packets[2].principles!.includes('NOT approved'));assert.equal(packets[2].cases.length,2);
 for(const packet of packets){
  const text=JSON.stringify(packet);for(const forbidden of ['EVALUATOR_ONLY','carrier-pressure','"scene"','"seed"','"caseId"','"world"','"evaluation"','"candidateRevision"','"experimentId"','unlocated-call','defender-1'])assert.ok(!text.includes(forbidden),forbidden);
  for(const testCase of packet.cases){assert.match(testCase.id,/^[0-9a-f-]{36}$/);assert.deepEqual(Object.keys(testCase),['id','bundle','memoryBefore','profile']);}
 }
 const mapping=store.bEvaluatorMap(e.id);assert.ok(JSON.stringify(mapping).includes('EVALUATOR_ONLY'));assert.ok(mapping.mapping.some(c=>c.seed===8123));
 assert.deepEqual(new Store(dir).bPacket(e.id,'after','frozen'),packets[2]);
 assert.throws(()=>store.bPacket(e.id,undefined as any,'frozen'),/Select one B arm/);
 const legacy=store.read();delete legacy.experiments[e.id].bInputs;writeFileSync(join(dir,'state.json'),JSON.stringify(legacy));
 assert.throws(()=>store.bPacket(e.id,'after','frozen'),/Legacy experiment/);
}));

function scannedSnapshot(){
 const snapshot=capture('support',42,defaultRulesA(),'B0');snapshot.profile.tactics.adherence=0;snapshot.profile.preference.carry=0;snapshot.profile.preference.pass=1;
 const history=newHistory(emptyMemory());let memory=emptyMemory();
 const record=(trigger:'initial'|'head-turn'|'step')=>{const bundle=sense(snapshot.world);appendObservation(history,bundle,snapshot.profile,snapshot.rulesA,trigger);snapshot.memoryBefore=structuredClone(memory);const trace=think(bundle,memory,snapshot.profile,snapshot.rulesA);memory=trace.longTermMemory;snapshot.bundle=bundle;return trace;};
 record('initial');snapshot.world.body.headYaw=-2;record('head-turn');snapshot.world.body.headYaw=0;record('head-turn');
 snapshot.observationHistory=history;return {snapshot,record};
}
test('ordered paused head-turn observations replay the full decision and memory; last frame alone loses acquired evidence',()=>{
 const {snapshot}=scannedSnapshot();const history=snapshot.observationHistory!;
 assert.deepEqual(history.events.map(e=>[e.sequence,e.bundle.time,e.bundle.self.headYaw]),[[0,0,0],[1,0,-2],[2,0,0]]);
 const replay=replayObservationHistory(history);assert.equal(replay.mode,'static-study');
 assert.equal(replay.finalTrace.intention.action,'pass');assert.notEqual(think(snapshot.bundle,emptyMemory(),snapshot.profile,snapshot.rulesA).intention.action,'pass');
 assert.ok(replay.finalTrace.beliefs.some(b=>b.entityId==='support-1'&&b.observedAt===0));
 assert.deepEqual(replay.memoryBeforeLast,snapshot.memoryBefore);assertSnapshotHistory(snapshot);
 assert.deepEqual(replayObservationHistory(JSON.parse(JSON.stringify(history))),replay);
});
test('static observation order is distinct from simulated time; realtime claims, wrong step clocks and missing sequence are rejected',()=>{
 const {snapshot,record}=scannedSnapshot();
 for(let i=1;i<=5;i++){snapshot.world.time=Math.round(i*.2*1000)/1000;record('step');}
 assert.ok(replayObservationHistory(snapshot.observationHistory!).finalTrace.beliefs.some(b=>b.entityId==='support-1'&&b.age===1));
 const base=scannedSnapshot().snapshot.observationHistory!;
 assert.throws(()=>replayObservationHistory({...base,mode:'realtime'} as any),/ObservationHistory/);
 const wrong=structuredClone(base);wrong.events[1].bundle.time=1;assert.throws(()=>replayObservationHistory(wrong),/clock mismatch/);
 const missing=structuredClone(base);missing.events[1].sequence=7;assert.throws(()=>replayObservationHistory(missing),/sequence/);
 const capacity=structuredClone(base);while(capacity.events.length<HISTORY_LIMIT)appendObservation(capacity,snapshot.bundle,snapshot.profile,snapshot.rulesA,'head-turn');
 assert.throws(()=>appendObservation(capacity,snapshot.bundle,snapshot.profile,snapshot.rulesA,'head-turn'),/256/);assert.equal(capacity.events.length,HISTORY_LIMIT);
});
test('snapshot, candidate and saved comparison preserve observation tape across restart without world truth in that tape',()=>scope((store,dir)=>{
 const {snapshot}=scannedSnapshot();const sid=store.saveSnapshot(snapshot),c=store.propose(sid,'SYNTHETIC scan history');
 store.edit(c.id,edit.patchA,edit.principle,1,edit.notes);const e=store.runExperiment(c.id,2,2,'preview');
 assert.equal(e.results.observedHistory!.before.frames.length,3);assert.deepEqual(e.results.observedHistory!.before.frames.map(f=>f.trace.sensation),e.results.observedHistory!.after.frames.map(f=>f.trace.sensation));
 assert.deepEqual(new Store(dir).read().snapshots[sid].observationHistory,snapshot.observationHistory);
 assert.deepEqual(new Store(dir).read().experiments[e.id],e);
 assert.ok(!JSON.stringify(snapshot.observationHistory).includes('"world"'));
 const corrupt:Snapshot=structuredClone(snapshot);corrupt.memoryBefore=emptyMemory();assert.throws(()=>store.saveSnapshot(corrupt),/does not match/);
 const original=conditionDigest(snapshot),renamed=structuredClone(snapshot);renamed.scene='heldout';renamed.seed=34;
 assert.equal(conditionDigest(renamed),original,'labels and seed alone cannot make an observation new');
}));
