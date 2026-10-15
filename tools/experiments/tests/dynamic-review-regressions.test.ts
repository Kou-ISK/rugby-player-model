import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../../workbench/server/store';
import { captureSceneAt } from '../../workbench/research';
import { defaultRulesA, type Snapshot } from '../../../src/contracts';
import { think } from '../../../models/player/reference/src/cognition';
import { sense } from '../../simulation/src/index';
import { appendObservation } from '../src/history';
import type { SceneDefinition } from '../../simulation/src/scene';
const definition=():SceneDefinition=>JSON.parse(readFileSync('evaluation/fixtures/dynamic-support.scene.json','utf8'));
const edit=JSON.parse(readFileSync('tools/workbench/examples/conditional-coaching-edit.json','utf8'));
function fixture(t:any){const dir=mkdtempSync(join(tmpdir(),'rpm-review-fix-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return new Store(dir);}
function headTurn(s:Snapshot){const copy=structuredClone(s);copy.memoryBefore=think(copy.bundle,copy.memoryBefore,copy.profile,copy.rulesA).longTermMemory;copy.world.body.headYaw=2;copy.bundle=sense(copy.world);appendObservation(copy.observationHistory!,copy.bundle,copy.profile,copy.rulesA,'head-turn');return copy;}
function candidate(store:Store,s:Snapshot,set?:string,fromTick=0){const c=store.propose(store.saveSnapshot(s),'SYNTHETIC: stop and re-observe',set,{fromTick,toTick:s.world.dynamic!.tick,playerId:'observer-0'});return store.edit(c.id,{scanBias:2},edit.principle,1,edit.notes);}
function frozen(store:Store,s:Snapshot){return store.freezeEvaluation({criteria:'SYNTHETIC frozen transfer',noveltyAttestation:'not-used-for-coaching',cases:[{label:'private-case',snapshot:s}]});}

test('R1: coaching 0–30 saved at scene end replays from tick 0 instead of the terminal snapshot',t=>{
 const store=fixture(t),scene=store.createScene(definition()),end=captureSceneAt(scene,defaultRulesA(),'B0',30),c=candidate(store,end);
 const e=store.runExperiment(c.id,c.revision,20,'preview');
 assert.equal(e.results.recorded.before.frames[0].time,0);
 assert.equal(e.results.recorded.before.frames.length,20);
 assert.notDeepEqual(e.results.recorded.before.finalSelf.position,e.results.recorded.after.finalSelf.position);
 assert.equal(store.active().A.version,'A0');
});
test('R2: a later coached tick or extra head turn cannot reuse a frozen observation prefix as unseen',t=>{
 for(const turn of [false,true]){
  const store=fixture(t),scene=store.createScene(definition()),at5=captureSceneAt(scene,defaultRulesA(),'B0',5),set=frozen(store,at5);
  const coached=turn?headTurn(at5):captureSceneAt(scene,defaultRulesA(),'B0',6);
  assert.throws(()=>candidate(store,coached,set.id),/cannot be used/);
 }
});
test('R2: later unlinked coaching invalidates a frozen condition, and cannot be refrozen under another name',t=>{
 const store=fixture(t),scene=store.createScene(definition()),at5=captureSceneAt(scene,defaultRulesA(),'B0',5),set=frozen(store,at5);
 const other=definition();other.actors[1].initial.position={x:12,z:-8};(other.actors[1].motion as any).keyframes[0].position={x:12,z:-8};
 const training=store.createScene(other),c=candidate(store,captureSceneAt(training,defaultRulesA(),'B0',3),set.id);
 candidate(store,captureSceneAt(scene,defaultRulesA(),'B0',6));
 assert.throws(()=>store.runExperiment(c.id,c.revision,5,'preview'),/became coaching data/);
 assert.throws(()=>frozen(store,at5),/already used for coaching/);
});

test('R1: a nonzero start reconstructs only its acquired prefix, never end memory, and freezes both branches',t=>{
 const store=fixture(t),d=definition();d.calls.push({startTick:12,endTick:12,sourceActorId:d.actors[2].id,cue:'warning-call'});
 const scene=store.createScene(d),at5=captureSceneAt(scene,defaultRulesA(),'B0',5),end=captureSceneAt(scene,defaultRulesA(),'B0',30);
 const c=candidate(store,end,undefined,5),e=store.runExperiment(c.id,c.revision,20,'preview'),initial=e.results.recordedInput.snapshot;
 assert.equal(initial.bundle.time,1);assert.deepEqual(initial.world.body,at5.world.body);assert.deepEqual(initial.memoryBefore,at5.memoryBefore);
 assert.notDeepEqual(initial.memoryBefore,end.memoryBefore);assert.ok(initial.memoryBefore.episodes.every(p=>p.observedAt<1));
 assert.equal(e.results.recordedInput.sourceSequence,5);assert.equal(e.results.recorded.before.frames[0].time,1);
 assert.deepEqual(e.results.recorded.before.frames[0].trace.sensation,e.results.recorded.after.frames[0].trace.sensation);
 assert.ok(!JSON.stringify(initial.memoryBefore).includes('warning-call'));
 const state=JSON.stringify(store.read());const again=store.runExperiment(c.id,c.revision,20,'preview');
 assert.deepEqual(again.results.recorded,e.results.recorded);assert.deepEqual(new Store(store.dir).read().experiments[e.id].results.recordedInput,e.results.recordedInput);
 assert.ok(state.includes('coaching-window-first-acquisition'));
});
test('R1: replay bounds stop at the coached end and do not execute the captured later state',t=>{
 const store=fixture(t),scene=store.createScene(definition()),at6=captureSceneAt(scene,defaultRulesA(),'B0',6),c=candidate(store,at6,undefined,2);
 const e=store.runExperiment(c.id,c.revision,20,'preview');
 for(const run of [e.results.recorded.before,e.results.recorded.after]){
  assert.equal(run.frames[0].time,.4);assert.equal(run.finalTick,6);assert.equal(run.termination,'coaching-window-end');assert.ok(run.frames.every(f=>f.time<=1.2));
 }
});
test('R2: new IDs, a changed future revision, or a changed profile do not erase already acquired evidence',t=>{
 for(const variant of ['copy','future','profile'] as const){
  const store=fixture(t),scene=store.createScene(definition()),at5=captureSceneAt(scene,defaultRulesA(),'B0',5);frozen(store,at5);
  const d=definition();d.actors[1].id='renamed';d.calls[0].sourceActorId='renamed';
  if(variant==='future')(d.actors[1].motion as any).keyframes=[(d.actors[1].motion as any).keyframes[0],{tick:6,position:{x:3.2,z:8.8},yaw:-.2},{tick:30,position:{x:20,z:25},yaw:1}];
  const copy=store.createScene(d),known=captureSceneAt(copy,defaultRulesA(),'B0',6);
  if(variant==='profile'){known.profile.preference.carry=.6;known.observationHistory!.events.at(-1)!.profile=structuredClone(known.profile);}
  candidate(store,known);
  assert.throws(()=>frozen(store,at5),/already used for coaching/);
 }
});
test('R2: prior evaluation at a different tick is reused, with persisted exposure reasons',t=>{
 const store=fixture(t),scene=store.createScene(definition()),set5=frozen(store,captureSceneAt(scene,defaultRulesA(),'B0',5)),set6=frozen(store,captureSceneAt(scene,defaultRulesA(),'B0',6));
 const other=definition();other.actors[1].initial.position={x:12,z:-8};(other.actors[1].motion as any).keyframes[0].position={x:12,z:-8};
 const training=store.createScene(other),s=captureSceneAt(training,defaultRulesA(),'B0',3),a=candidate(store,s,set5.id),b=candidate(store,s,set6.id);
 const first=store.runExperiment(a.id,a.revision,5,'preview'),second=store.runExperiment(b.id,b.revision,5,'preview');
 assert.equal(first.evaluation!.status,'first-recorded-use-owner-declared');assert.equal(second.evaluation!.status,'reused-not-unseen');
 assert.ok(second.evaluation!.exposure!.matches.some(m=>m.experimentId===first.id&&m.reasons.includes('same-dynamic-stimulus')));
 assert.deepEqual(new Store(store.dir).read().experiments[second.id].evaluation,second.evaluation);
});

import { recordedWorld } from '../../simulation/src/playback';
test('R4: saved-frame reconstruction is read-only and uses the frozen frame body/time',t=>{
 const store=fixture(t),scene=store.createScene(definition()),c=candidate(store,captureSceneAt(scene,defaultRulesA(),'B0',30)),e=store.runExperiment(c.id,c.revision,20,'preview');
 const source=e.results.recordedInput.snapshot,before=JSON.stringify(e),frame=e.results.recorded.after.frames[9];
 const world=recordedWorld(source,frame,e.results.recorded.after.emittedCalls);
 assert.equal(world.dynamic!.tick,9);assert.deepEqual(world.body,frame.body);assert.equal(world.time,frame.time);assert.equal(JSON.stringify(e),before);
 assert.throws(()=>recordedWorld(source,{time:0}),/legacy experiment/);
});

test('R1: prefix reconstruction retains only calls actually applied before the replay start',t=>{
 const store=fixture(t),scene=store.createScene(definition()),rules=defaultRulesA();
 rules.contextRules=[{id:'synthetic-call',when:{possession:'has-ball',evidence:'no-fresh-receiver',unlessCloseThreat:false},action:'carry',weight:1,call:'support-call'}];
 const at6=captureSceneAt(scene,rules,'B0',6),end=captureSceneAt(scene,rules,'B0',30),c=candidate(store,end,undefined,6);
 const e=store.runExperiment(c.id,c.revision,5,'preview'),initial=e.results.recordedInput.snapshot;
 assert.deepEqual(initial.world.emittedCalls,at6.world.emittedCalls);assert.ok(initial.world.emittedCalls!.length>0);
 assert.ok(initial.world.emittedCalls!.every(call=>call.at<initial.world.time));assert.notDeepEqual(initial.world.emittedCalls,end.world.emittedCalls);
});


test('explicit snapshot continuation preserves acquired memory and leaves coaching replay and approvals unchanged',t=>{
 const store=fixture(t),scene=store.createScene(definition()),at6=captureSceneAt(scene,defaultRulesA(),'B0',6),c=candidate(store,at6,undefined,2);
 const original=JSON.stringify(store.read().candidates[c.id]),active=store.active();
 const e=store.runExperiment(c.id,c.revision,5,'preview','snapshot');
 assert.equal(e.results.recordedInput.source,'captured-snapshot');assert.equal(e.results.recordedInput.window,null);
 assert.deepEqual(e.results.recordedInput.snapshot,at6);
 for(const run of [e.results.recorded.before,e.results.recorded.after]){
  assert.equal(run.frames[0].time,1.2);assert.equal(run.frames[1].time,1.4);assert.equal(run.finalTick,11);assert.equal(run.termination,'step-budget');
 }
 assert.deepEqual(e.candidate.coaching,c.coaching);assert.equal(JSON.stringify(store.read().candidates[c.id]),original);assert.deepEqual(store.active(),active);
 assert.deepEqual(new Store(store.dir).read().experiments[e.id].results.recordedInput,e.results.recordedInput);
 assert.throws(()=>store.runExperiment(c.id,c.revision,5,'preview','invalid' as any),/Invalid experiment start/);
});
