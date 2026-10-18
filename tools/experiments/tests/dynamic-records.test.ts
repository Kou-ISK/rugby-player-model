import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../../workbench/server/store';
import { validateSceneDefinition, sceneWorld, type SceneDefinition } from '../../simulation/src/scene';

export const definition = ():SceneDefinition=>({sceneSchemaVersion:3,simulationMode:'kinematic',observationMode:'positions',attachedBallFrame:'world',tickSeconds:.2,durationTicks:30,controlledPlayerId:'carrier-author-name',
  actors:[{id:'carrier-author-name',team:'blue',initial:{position:{x:0,z:0},yaw:0},motion:{kind:'controlled'}},
    {id:'future-run-left',team:'blue',initial:{position:{x:5,z:8},yaw:0},motion:{kind:'scripted',keyframes:[{tick:0,position:{x:5,z:8},yaw:0},{tick:30,position:{x:-4,z:12},yaw:-1}]}},
    {id:'future-pressure',team:'red',initial:{position:{x:-8,z:12},yaw:0},motion:{kind:'scripted',keyframes:[{tick:0,position:{x:-8,z:12},yaw:0},{tick:30,position:{x:2,z:6},yaw:1}]}}],
  ball:{kind:'attached',carrierId:'carrier-author-name'},calls:[{startTick:5,endTick:8,sourceActorId:'future-run-left',cue:'support-call'}]});
export function fixture(t:any){const dir=mkdtempSync(join(tmpdir(),'rpm-dynamic-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return new Store(dir);}

test('T01/T06: new scene revisions are immutable, names do not define content, and stale edits conflict',t=>{
  const store=fixture(t),one=store.createScene(definition()),changed=definition();changed.actors[1].id='renamed-with-another-intention';changed.calls[0].sourceActorId=changed.actors[1].id;
  const two=store.reviseScene(one.sceneId,1,changed);
  assert.equal(two.contentHash,one.contentHash);assert.equal(two.revision,2);
  assert.deepEqual(store.getScene(one.sceneId,1),one);assert.throws(()=>store.reviseScene(one.sceneId,1,definition()),/conflict/i);
  assert.deepEqual(new Store(store.dir).getScene(one.sceneId,2),two);assert.equal(store.active().A.version,'A0');
});
test('T01/T02: scene rejects ambiguous control, scripted self calls, invalid times and unknown fields',()=>{
  validateSceneDefinition(definition());
  const cases:SceneDefinition[]=[];
  let s=definition();s.calls[0].sourceActorId=s.controlledPlayerId;cases.push(s);
  s=definition();s.actors[0].motion=s.actors[1].motion;cases.push(s);
  s=definition();(s.actors[1].motion as any).keyframes[1].tick=0;cases.push(s);
  s=definition();(s as any).script='arbitrary code';cases.push(s);
  s=definition();s.actors[1].id=s.actors[0].id;cases.push(s);
  for(const c of cases)assert.throws(()=>validateSceneDefinition(c));
});

import { defaultRulesA, emptyMemory } from '../../../src/contracts';
import { captureSceneAt, observationContext, replay, compare } from '../../workbench/research';
import { sense, advance } from '../../simulation/src/index';
import { think } from '../../../models/player/reference/src/cognition';
import { conditionDigest, stimulusDigest } from '../src/evaluation';
import { appendObservation, replayObservationHistory } from '../src/history';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const edit=JSON.parse(readFileSync('tools/workbench/examples/conditional-coaching-edit.json','utf8'));

test('T02/T05: one clock drives scripts, A owns its body, and replay stops deterministically at the last frame',t=>{
  const store=fixture(t),scene=store.createScene(definition()),s=captureSceneAt(scene,defaultRulesA(),'B0',15);
  assert.equal(s.world.time,3);assert.equal(s.world.dynamic!.tick,15);
  assert.deepEqual(s.world.entities[0].position,{x:.5,z:10});
  const initial=captureSceneAt(scene,defaultRulesA(),'B0');
  const trace=think(initial.bundle,emptyMemory(),initial.profile,initial.rulesA);
  const next=advance(initial.world,trace);
  const movement=trace.output.find(c=>c.channel==='locomotion'&&c.status==='supported')!.value as {x:number;z:number};
  assert.deepEqual(next.body.position,{x:movement.x*.2,z:movement.z*.2});
  assert.deepEqual(replay(s,s.rulesA,20),replay(s,s.rulesA,20));
  const run=replay(s,s.rulesA,20);assert.equal(run.termination,'scene-end');assert.equal(run.frames.at(-1)!.time,6);
  const end=captureSceneAt(scene,defaultRulesA(),'B0',30);assert.throws(()=>advance(end.world,trace),/ended/);
  assert.throws(()=>advance(initial.world,trace,.3),/clock/);
  const history=s.observationHistory!,before=JSON.stringify(history),reconstructed=replayObservationHistory(history);
  assert.equal(reconstructed.frames.at(-1)!.time,3);assert.equal(JSON.stringify(history),before);
  const tiny=structuredClone(s);tiny.world.entities[0].yaw!+=1e-15;store.saveSnapshot(tiny);
  const displaced=structuredClone(s);displaced.world.entities[0].position.x+=.01;displaced.bundle=sense(displaced.world);assert.throws(()=>store.saveSnapshot(displaced),/frozen scene/);
  const savedId=store.saveSnapshot(s);assert.equal(store.read().snapshots[savedId].contractVersion,2);
  const red=definition();red.actors[0].team='red';red.actors[1].team='red';red.actors[2].team='blue';red.ball={kind:'attached',carrierId:red.actors[1].id};
  const redScene=store.createScene(red),redSnapshot=captureSceneAt(redScene,defaultRulesA(),'B0');
  assert.equal(redSnapshot.bundle.percepts.find(p=>p.entityId===redScene.trackingIds[1])!.relation,'teammate');
  assert.equal(redSnapshot.bundle.percepts.find(p=>p.entityId===redScene.trackingIds[2])!.relation,'opponent');assert.equal(redSnapshot.world.body.hasBall,false);
  const invalid=structuredClone(s);invalid.observationHistory!.sceneRef!.revision++;assert.throws(()=>store.saveSnapshot(invalid),/revision mismatch/);
});
test('T03/T08: author names and unseen future motion cannot influence A or its observation context',t=>{
  const store=fixture(t),d=definition();d.actors[2].initial.position={x:-8,z:-12};(d.actors[2].motion as any).keyframes[0].position={x:-8,z:-12};
  const one=store.createScene(d),s=captureSceneAt(one,defaultRulesA(),'B0');
  const renamed=structuredClone(d);renamed.actors[1].id='PASS_TO_ME_IN_FUTURE';renamed.calls[0].sourceActorId=renamed.actors[1].id;
  (renamed.actors[2].motion as any).keyframes[1].position={x:30,z:-40};
  const two=store.reviseScene(one.sceneId,1,renamed),other=captureSceneAt(two,defaultRulesA(),'B0');
  assert.deepEqual(s.bundle,other.bundle);
  assert.deepEqual(think(s.bundle,s.memoryBefore,s.profile,s.rulesA),think(other.bundle,other.memoryBefore,other.profile,other.rulesA));
  const c=store.propose(store.saveSnapshot(s),'SYNTHETIC: look again');const text=JSON.stringify(observationContext(c));
  for(const forbidden of ['carrier-author-name','future-run-left','future-pressure','PASS_TO_ME_IN_FUTURE','keyframes','trackingIds','"world"'])assert.ok(!text.includes(forbidden),forbidden);
  const sameNames=store.createScene(d);assert.deepEqual(sameNames.trackingIds,one.trackingIds);assert.equal(conditionDigest(captureSceneAt(sameNames,defaultRulesA(),'B0')),conditionDigest(s));
  assert.notEqual(stimulusDigest(other),stimulusDigest(s));
  const forged=structuredClone(s);forged.world.dynamic!.scene.definition.calls=[];assert.throws(()=>store.saveSnapshot(forged),/immutable scene|content hash mismatch/);
});
test('T04/T05: acquired moving-player memory keeps its observation time; calls arrive on schedule and contain no source identity',t=>{
  const store=fixture(t),scene=store.createScene(definition()),s=captureSceneAt(scene,defaultRulesA(),'B0',4);
  assert.equal(s.bundle.percepts.filter(p=>p.modality==='audio').length,0);
  const first=think(s.bundle,s.memoryBefore,s.profile,s.rulesA),id=scene.trackingIds[1];
  const away=structuredClone(s.world);away.body.headYaw=2.4;
  const acquired=first.longTermMemory,turned=sense(away);
  const remembered=think(turned,acquired,s.profile,s.rulesA),unseen=think(turned,emptyMemory(),s.profile,s.rulesA);
  assert.ok(remembered.beliefs.some(b=>b.entityId===id&&b.observedAt<=.8));assert.ok(!unseen.beliefs.some(b=>b.entityId===id));
  const history=structuredClone(s.observationHistory!);appendObservation(history,turned,s.profile,s.rulesA,'head-turn');
  assert.equal(replayObservationHistory(history).frames.at(-1)!.time,.8);
  const atCall=captureSceneAt(scene,defaultRulesA(),'B0',5),audio=atCall.bundle.percepts.find(p=>p.modality==='audio')!;
  assert.ok(audio);assert.ok(!('position' in audio));assert.ok(!JSON.stringify(audio).includes('future-run-left'));
  const silent=structuredClone(atCall.bundle);silent.percepts=silent.percepts.filter(p=>p.modality!=='audio');
  assert.notDeepEqual(think(atCall.bundle,emptyMemory(),s.profile,s.rulesA),think(silent,emptyMemory(),s.profile,s.rulesA));
  const opposite=structuredClone(atCall.bundle);opposite.percepts.find(p=>p.modality==='audio')!.bearing! += 2;
  assert.notDeepEqual(think(opposite,emptyMemory(),s.profile,s.rulesA),think(atCall.bundle,emptyMemory(),s.profile,s.rulesA));
  const expired=captureSceneAt(scene,defaultRulesA(),'B0',9);assert.equal(expired.bundle.percepts.filter(p=>p.modality==='audio').length,0);
});
test('T06/T07/T09/T10: short coaching pins scene/player/interval; preview paths, scene edits and independent adoption stay separate',t=>{
  const store=fixture(t),scene=store.createScene(definition()),s=captureSceneAt(scene,defaultRulesA(),'B0',3),sid=store.saveSnapshot(s);
  const c=store.propose(sid,'SYNTHETIC: いったん止まって確認',undefined,{fromTick:1,toTick:3,playerId:'observer-0'});
  assert.equal(c.coaching!.revision,1);assert.equal(c.coaching!.fromTick,1);assert.deepEqual(c.patchA,{});
  assert.throws(()=>store.propose(sid,'bad interval',undefined,{fromTick:1,toTick:4,playerId:'observer-0'}),/acquired interval/);
  assert.throws(()=>store.propose(sid,'wrong target',undefined,{fromTick:1,toTick:3,playerId:'future-run-left'}),/observed player/);
  const edited=store.edit(c.id,{scanBias:2},edit.principle,1,edit.notes);
  const active=store.active(),bytes=readFileSync(join(store.dir,'state.json'),'utf8');const preview=store.comparison(c.id,{mode:'preview',expectedRevision:2});
  assert.equal(preview.recorded.comparisonKind,'fixed-observation');assert.equal(readFileSync(join(store.dir,'state.json'),'utf8'),bytes);
  const experiment=store.runExperiment(c.id,2,5,'preview');assert.equal(experiment.results.recorded.comparisonKind,'same-scene-closed-loop');
  assert.notDeepEqual(experiment.results.recorded.before.finalSelf.position,experiment.results.recorded.after.finalSelf.position);assert.deepEqual(store.active(),active);
  const d=definition();(d.actors[1].motion as any).keyframes[1].position={x:15,z:20};const r2=store.reviseScene(scene.sceneId,1,d);
  const sid2=store.saveSnapshot(captureSceneAt(r2,defaultRulesA(),'B0',3));const changed=store.compareScenes(sid,sid2,'A0',5);
  assert.equal(changed.sameConditions,false);assert.equal(changed.kind,'changed-scene-fixed-rules');assert.deepEqual(store.read().candidates[c.id],edited);
  assert.throws(()=>store.review(c.id,'A','approve','owner',1),/revision changed/);
  store.review(c.id,'A','approve','owner',2);assert.equal(store.active().B.version,'B0');
  const point={sceneId:scene.sceneId,revision:1,contentHash:scene.contentHash,playerId:'observer-0',tick:3,fromA:'A0',toA:store.active().A.version,fromB:'B0',toB:'B0',receiptId:randomUUID()};
  store.recordApplication(point);store.recordApplication(point);assert.equal(store.read().events.filter(e=>e.application).length,1);
  assert.throws(()=>store.recordApplication({...point,tick:4}),/conflict/);
  store.review(c.id,'B','return','owner',2,'SYNTHETIC: clarify exception');const child=store.revise(c.id,'SYNTHETIC revision',2);assert.deepEqual(child.coaching,c.coaching);
  store.undo('A','owner',store.active().A.version);assert.equal(store.active().A.version,'A0');
  const restart=new Store(store.dir);assert.deepEqual(restart.read().sceneComparisons[changed.id],changed);assert.deepEqual(restart.read().experiments[experiment.id],experiment);
});
test('T08/T09: B gets anonymous acquired timelines, and renaming/refreezing cannot restore unseen status',t=>{
  const store=fixture(t),scene=store.createScene(definition()),s=captureSceneAt(scene,defaultRulesA(),'B0',5);
  const draft={criteria:'SYNTHETIC criteria',noveltyAttestation:'not-used-for-coaching',cases:[{label:'EVALUATOR_SECRET',snapshot:s}]};
  const frozen=store.freezeEvaluation(draft);
  const other=definition();other.actors[1].initial.position={x:12,z:-8};(other.actors[1].motion as any).keyframes[0].position={x:12,z:-8};
  const training=store.createScene(other),cs=captureSceneAt(training,defaultRulesA(),'B0',3),c=store.propose(store.saveSnapshot(cs),'Synthetic feedback',frozen.id);
  store.edit(c.id,edit.patchA,edit.principle,1,edit.notes);const e=store.runExperiment(c.id,2,3,'preview');
  const packets=(['none','before','after'] as const).map(a=>store.bPacket(e.id,a,'frozen'));
  assert.deepEqual(packets[0].cases,packets[2].cases);assert.equal(packets[0].cases[0].observations!.length,6);
  const payload=JSON.stringify(packets[0]);for(const forbidden of ['keyframes','EVALUATOR_SECRET','future-run-left','future-pressure','carrier-author-name','track-','"world"','"rulesA"','"scene"','"seed"','"trace"'])assert.ok(!payload.includes(forbidden),forbidden);
  const copy=store.createScene(definition()),clone=store.freezeEvaluation({...draft,cases:[{label:'renamed',snapshot:captureSceneAt(copy,defaultRulesA(),'B0',5)}]});
  assert.equal(clone.stimuli![0].stimulusDigest,frozen.stimuli![0].stimulusDigest);
  const c2=store.propose(store.saveSnapshot(cs),'second',clone.id);store.edit(c2.id,edit.patchA,edit.principle,1,edit.notes);
  assert.equal(store.runExperiment(c2.id,2,3,'preview').evaluation!.status,'reused-not-unseen');
});
