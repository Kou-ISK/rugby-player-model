import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../../workbench/server/store';
import {captureSceneAt,observationContext,replay} from '../../workbench/research';
import {defaultRulesA,think} from '../../../models/player/reference/src/index.js';
import {replayObservationHistory} from '../src/history';
import {sense} from '../../simulation/src/sensing';
import {sceneWorld,updateSceneFrame} from '../../simulation/src/scene';
import {canonicalWire} from '../src/strict-json';
import {validateProposal,reproduceProposal} from '../src/proposal';
import {currentEngineDescriptor} from '../../workbench/server/artifact-resolver';
const definition=(role:string)=>JSON.parse(readFileSync(`evaluation/fixtures/orientation-${role}.scene.json`,'utf8'));
function fixture(t:any){const dir=mkdtempSync(join(tmpdir(),'rpm-orientation-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return new Store(dir);}
test('v2 attack/support/defense use the same persistent snapshot, history, preview and portable reproduction path',t=>{
 const store=fixture(t);
 for(const [role,phase] of [['attack','attack-carrier'],['support','attack-support'],['defense','defense']]){
  const scene=store.createScene(definition(role)),snapshot=captureSceneAt(scene,defaultRulesA(),'B0');
  const trace=think(snapshot.bundle,snapshot.memoryBefore,snapshot.profile,snapshot.rulesA);assert.equal(trace.situation?.phase,phase);assert.ok(trace.situation!.orientations.length);
  const sid=store.saveSnapshot(snapshot),candidate=store.propose(sid,'SYNTHETIC: verify observed orientation before choosing');
  assert.equal(replayObservationHistory(snapshot.observationHistory!).finalTrace.situation?.phase,phase);
  const context=JSON.stringify(observationContext(candidate));for(const secret of ['keyframes','carrierId','"world"','"actors"'])assert.ok(!context.includes(secret));
  store.edit(candidate.id,{}, {id:"orientation-check",condition:"Orientation evidence is old",criterion:"Retain uncertainty",priority:10,exceptions:"No supported response",unknown:"Observe again",evidence:"Synthetic engineering hypothesis"},1,{rationale:'Synthetic contract exercise',expectedEffect:'Identical actions with identical configuration',counterexample:'Hidden orientation must not become new evidence'});
  const run=store.runExperiment(candidate.id,2,3,'preview');assert.ok(run);
  assert.deepEqual(new Store(store.dir).read().snapshots[sid],snapshot);
  assert.deepEqual(replay(snapshot,snapshot.rulesA,3),replay(snapshot,snapshot.rulesA,3));
  const pkg=store.exportProposal(candidate.id,2,{confirmation:'explicitly-authorized-synthetic-entries-only',author:'Synthetic test',rightsBasis:'Authored synthetic software fixture under MIT',targets:['A','B']});
  const verified=validateProposal(canonicalWire(pkg),currentEngineDescriptor()),reproduced=reproduceProposal(verified),saved=verified.read<any>(pkg.manifest.runRefs[0]);
  assert.equal(reproduced.resultDigest.sha256,saved.resultDigest.sha256);
 }
 assert.equal(store.active().A.version,'A0');assert.equal(store.active().B.version,'B0');
});
test('v2 sensor does not expose hidden yaw, unseen ball control, future paths or sound-source posture',t=>{
 const store=fixture(t),scene=store.createScene(definition('defense')),world=sceneWorld(scene);
 const observation=sense(world),opponent=observation.percepts.find(p=>p.relation==='opponent')!;
 assert.ok(opponent.bodyOrientation);assert.ok(opponent.ballControl);assert.equal(opponent.bodyOrientation!.halfWidth,Math.PI/24);
 const loose=structuredClone(world),ball=world.entities.find(e=>e.kind==='ball')!;loose.dynamic!.scene.definition.ball={kind:'scripted',keyframes:[{tick:0,position:{...ball.position},yaw:0},{tick:10,position:{x:20,z:20},yaw:0}]};updateSceneFrame(loose);assert.deepEqual(sense(loose),observation,'same visible geometry cannot disclose hidden carrier binding or future ball path');
 const turned=structuredClone(world);turned.body.headYaw=Math.PI;
 const unseen=sense(turned);assert.equal(unseen.percepts.filter(p=>p.kind==='player').length,0);
 const changed=structuredClone(turned),red=changed.dynamic!.scene.definition.actors[2];red.initial.yaw=0;if(red.motion.kind==='scripted')for(const f of red.motion.keyframes)f.yaw=0;
 updateSceneFrame(changed);assert.deepEqual(sense(changed),unseen);
 const back=structuredClone(world),actor=back.dynamic!.scene.definition.actors[2];actor.initial.yaw=0;if(actor.motion.kind==='scripted')for(const f of actor.motion.keyframes)f.yaw=0;
 updateSceneFrame(back);assert.ok(sense(back).percepts.find(p=>p.relation==='opponent')!.bodyOrientation);assert.equal(sense(back).percepts.find(p=>p.relation==='opponent')!.ballControl,undefined);
 const future=structuredClone(world),motion=future.dynamic!.scene.definition.actors[2].motion;if(motion.kind==='scripted')motion.keyframes[1].yaw=0;updateSceneFrame(future);assert.deepEqual(sense(future),observation);
 world.calls=[{id:'anonymous',position:{x:0,z:-5},cue:'warning-call'}];const audio=sense(world).percepts.find(p=>p.modality==='audio')!;assert.equal(audio.evidenceVersion,2);assert.equal(audio.bodyOrientation,undefined);assert.equal(audio.ballControl,undefined);
 const snapshot=captureSceneAt(scene,defaultRulesA(),'B0',1),history=structuredClone(snapshot.observationHistory!);history.events[1].bundle.context!.ownAttackDirection=-1;assert.throws(()=>replayObservationHistory(history),/context changed/);
 const forged=structuredClone(snapshot);forged.bundle.context!.ownAttackDirection=-1;assert.throws(()=>store.saveSnapshot(forged));
});
