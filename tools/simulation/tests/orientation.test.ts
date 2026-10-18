import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSnapshot} from '../../experiments/src/validation';
import {makeWorld} from '../src/world';
import {sampleMotion,validateSceneDefinition} from '../src/scene';
import type {SceneDefinition} from '../src/contracts';
const facingDot=(yaw:number,dx:number,dz:number)=>Math.sin(yaw)*dx+Math.cos(yaw)*dz;
test('authored dynamic approach faces travel throughout; explicit back-facing poses remain legal',()=>{
 const definition=JSON.parse(readFileSync(new URL('../../../evaluation/fixtures/dynamic-support.scene.json',import.meta.url),'utf8')) as SceneDefinition;
 validateSceneDefinition(definition);
 for(const actor of definition.actors){
  if(actor.motion.kind!=='scripted')continue;
  const frames=actor.motion.keyframes,a=frames[0].position,b=frames.at(-1)!.position;
  for(let tick=0;tick<=definition.durationTicks;tick++){
   const pose=sampleMotion(frames,tick);assert.ok(facingDot(pose.yaw,b.x-a.x,b.z-a.z)>0);
  }
 }
 const defender=definition.actors.find(a=>a.team==='red')!;
 assert.ok(facingDot(defender.initial.yaw,-defender.initial.position.x,-defender.initial.position.z)>0);
 if(defender.motion.kind!=='scripted')throw Error('Expected scripted defender');
 defender.initial.yaw=0;for(const frame of defender.motion.keyframes)frame.yaw=0;
 validateSceneDefinition(definition);assert.equal(sampleMotion(defender.motion.keyframes,15).yaw,0);
 assert.ok(facingDot(0,-defender.initial.position.x,-defender.initial.position.z)<0);
});
test('built-in static setup assigns opponent facing before rendering, with no team-based renderer flip',()=>{
 for(const scene of ['support','occluded','audio','heldout'] as const){
  const world=makeWorld(scene,42);
  for(const entity of world.entities.filter(e=>e.kind==='player')){
   if(entity.team==='red')assert.ok(facingDot(entity.yaw!,world.body.position.x-entity.position.x,world.body.position.z-entity.position.z)>0);
   else assert.equal(entity.yaw,world.body.yaw);
  }
 }
});

test('authored field of view changes acquired evidence while legacy scenes retain 90 degrees',async()=>{
 const {randomUUID}=await import('node:crypto');
 const {contentDigest}=await import('../src/content');
 const {sceneWorld,sceneContent}=await import('../src/scene');
 const {sense,visible}=await import('../src/sensing');
 const {horizontalFov}=await import('../src/world');
 const {captureSceneAt}=await import('../../experiments/src/capture');
 const {defaultRulesA}=await import('../../../models/player/reference/src/defaults');
 const {assertSnapshotHistory}=await import('../../experiments/src/history');
 const definition=JSON.parse(readFileSync('evaluation/fixtures/orientation-attack.scene.json','utf8')) as SceneDefinition;
 const scene={sceneId:randomUUID(),revision:1,contentHash:contentDigest(sceneContent(definition)),definition,generationSeed:null,trackingIds:definition.actors.map(()=>`track-${randomUUID()}`),createdAt:new Date().toISOString()};
 const baseline=sceneWorld(scene),old=sense(baseline),originalContent=JSON.stringify(sceneContent(definition));
 const wide=structuredClone(scene);wide.definition.horizontalFovDegrees=110;wide.contentHash=contentDigest(sceneContent(wide.definition));validateSceneDefinition(wide.definition);
 assert.notEqual(JSON.stringify(sceneContent(wide.definition)),originalContent);
 const world=sceneWorld(wide),p={id:'edge',kind:'player' as const,team:'red' as const,position:{x:10*Math.sin(50*Math.PI/180),z:10*Math.cos(50*Math.PI/180)},radius:.45,yaw:0};
 // Isolate angular gating from occlusion in this sensor unit test.
 baseline.entities=[p];world.entities=[p];
 assert.equal(visible(baseline,p),false);assert.equal(visible(world,p),true);
 assert.equal(sense(world).vision.horizontalFov,horizontalFov(world));assert.equal(old.vision.horizontalFov,Math.PI/2);
 p.position={x:10*Math.sin(60*Math.PI/180),z:10*Math.cos(60*Math.PI/180)};
 assert.equal(visible(world,p),false);
 const snapshot=captureSceneAt(wide,defaultRulesA(),'B0',2);validateSnapshot(snapshot);assertSnapshotHistory(snapshot);
 const corrupted=structuredClone(snapshot);corrupted.bundle.vision.horizontalFov=Math.PI/2;
 assert.throws(()=>validateSnapshot(corrupted),/field of view/);
 for(const value of [null,59,121,NaN,'110'])assert.throws(()=>validateSceneDefinition({...definition,horizontalFovDegrees:value}));
 assert.equal(JSON.stringify(sceneContent(definition)),originalContent);assert.equal(sense(sceneWorld(scene)).vision.horizontalFov,old.vision.horizontalFov);
});
