import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../../workbench/server/store';
import {captureSceneAt} from '../src/capture';
import {importSnapshot,importCandidate} from '../src/import';
import {assertSnapshotHistory,continueObservationHistory} from '../src/history';
import {validateSnapshot} from '../src/validation';
import {exposureReasons} from '../src/evaluation';
import {contentDigest,canonicalJson} from '../../simulation/src/content';
import {sceneContent,importSceneRevision,validateSceneDefinition} from '../../simulation/src/scene';
import {sense} from '../../simulation/src/sensing';
import {importBundle,importTrace,think,defaultProfile,defaultRulesA,emptyMemory,validate,importExecutionMode,baselineMode} from '../../../models/player/reference/src/index.js';

test('portable scene digest agrees with SHA-256 including Unicode and block boundaries',()=>{
 for(const value of [null,[],{},'日本語 🏉',...Array.from({length:140},(_,i)=>'x'.repeat(i)),{é:1,z:-0,a:[true,1e-9],none:undefined}])
  assert.equal(contentDigest(value),createHash('sha256').update(canonicalJson(value)).digest('hex'));
});

test('archived scene and coaching become one current view without rewriting source evidence or approvals',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-current-format-'));
 try{
  const store=new Store(dir),definition=JSON.parse(readFileSync('evaluation/fixtures/orientation-attack.scene.json','utf8'));
  const scene=store.createScene(definition),snapshot=captureSceneAt(scene,defaultRulesA(),'B0',3),id=store.saveSnapshot(snapshot),candidate=store.propose(id,'Synthetic original coaching');
  const archived:any=store.read(),source=archived.scenes[scene.sceneId][0];
  source.definition.sceneSchemaVersion=2;
  for(const key of ['simulationMode','observationMode','attachedBallFrame'])delete source.definition[key];
  source.contentHash=contentDigest(sceneContent(source.definition));
  for(const s of [archived.snapshots[id],archived.candidates[candidate.id].context]){
   s.world.dynamic.scene=structuredClone(source);s.bundle.contractVersion=2;
   for(const e of s.observationHistory.events)e.bundle.contractVersion=2;
   s.observationHistory.sceneRef.contentHash=source.contentHash;
  }
  archived.candidates[candidate.id].coaching.contentHash=source.contentHash;
  const bytes=JSON.stringify(archived);writeFileSync(join(dir,'state.json'),bytes);
  const current=store.current(),normalized=current.snapshots[id];validateSnapshot(normalized);assertSnapshotHistory(normalized);
  assert.equal(normalized.bundle.contractVersion,3);assert.equal(normalized.world.dynamic!.scene.definition.sceneSchemaVersion,3);
  assert.equal(normalized.world.dynamic!.scene.sourceContentHash,source.contentHash);
  assert.deepEqual(normalized.bundle.percepts,snapshot.bundle.percepts);assert.deepEqual(normalized.memoryBefore,snapshot.memoryBefore);
  assert.deepEqual(sense(normalized.world),normalized.bundle);assert.deepEqual(importSnapshot(normalized),normalized);
  assert.deepEqual(importCandidate(current.candidates[candidate.id]),current.candidates[candidate.id]);
  assert.equal(current.candidates[candidate.id].coaching!.contentHash,normalized.world.dynamic!.scene.contentHash);
  assert.equal(readFileSync(join(dir,'state.json'),'utf8'),bytes);
  assert.ok(exposureReasons(normalized,archived.snapshots[id]).includes('same-input'));
  assert.ok(exposureReasons(normalized,archived.snapshots[id]).includes('shared-acquired-observation'));
  store.saveSnapshot(normalized);
  const continued={...structuredClone(normalized),observationHistory:continueObservationHistory(normalized.observationHistory!,normalized),observationPredecessor:{snapshotId:id,sha256:contentDigest(archived.snapshots[id])},observationAnchor:structuredClone(normalized.world)};
  store.saveSnapshot(continued);assert.throws(()=>store.saveSnapshot({...continued,observationPredecessor:{snapshotId:id,sha256:contentDigest(normalized)}}),/predecessor/);
  const next=store.propose(id,'Synthetic follow-up');assert.equal(next.context.bundle.contractVersion,3);
  const after=store.read();assert.deepEqual(after.snapshots[id],archived.snapshots[id]);assert.deepEqual(after.candidates[candidate.id],archived.candidates[candidate.id]);assert.deepEqual(after.versionsA,archived.versionsA);assert.deepEqual(after.versionsB,archived.versionsB);
  const corrupt=structuredClone(source);corrupt.definition.actors[0].initial.yaw+=.1;assert.throws(()=>importSceneRevision(corrupt),/hash mismatch/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('import preserves unknown evidence and original trace engine, rejecting mixed or unknown formats',()=>{
 const source:any={contractVersion:1,playerId:'self',time:0,self:{position:{x:0,z:0},yaw:0,headYaw:0,eyeHeight:1.68,hasBall:true},vision:{horizontalFov:Math.PI/2,range:35},percepts:[{id:'p',entityId:'p',kind:'player',relation:'teammate',modality:'vision',observedAt:0,confidence:.9,position:{x:2,z:-2}}]};
 const bytes=JSON.stringify(source),bundle=importBundle(source);assert.equal(bundle.context,undefined);assert.equal(bundle.self.motor,undefined);assert.equal(bundle.percepts[0].bodyOrientation,undefined);assert.equal(JSON.stringify(source),bytes);
 const trace:any=think(bundle,emptyMemory(),defaultProfile(),defaultRulesA());delete trace.traceVersion;trace.modelRevision='cognition-0.3';trace.sensation=source;
 const archived=JSON.stringify(trace),view=importTrace(trace);validate('Trace',view);
 assert.equal(view.traceVersion,4);assert.equal(view.modelRevision,'cognition-0.3');assert.equal(view.sourceTraceVersion,1);assert.equal(JSON.stringify(trace),archived);
 assert.deepEqual(importTrace(view),view);assert.deepEqual(importExecutionMode({mode:'legacy',policyVersion:'legacy-ecc5c298-v1'}),baselineMode());
 for(const broken of [{...source,contractVersion:99},{...source,context:{ownAttackDirection:1}},{...source,percepts:[{...source.percepts[0],bodyOrientation:{yaw:0,confidence:.8,halfWidth:.1}}]}])assert.throws(()=>importBundle(broken));
 assert.throws(()=>think({...bundle,world:{}} as any,emptyMemory(),defaultProfile(),defaultRulesA()),/additional properties/);
});

test('one scene contract rejects incompatible motor capabilities before execution',()=>{
 const motor=JSON.parse(readFileSync('evaluation/fixtures/loop-attack.scene.json','utf8'));
 validateSceneDefinition(motor);
 for(const change of [{observationMode:'positions'},{attachedBallFrame:'world'}])assert.throws(()=>validateSceneDefinition({...motor,...change}),/Motor simulation/);
});
