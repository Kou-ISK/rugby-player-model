import {test} from 'node:test';
import assert from 'node:assert/strict';
import {think,thinkWithMode,validateEvidence,validate,defaultProfile,defaultRulesA,emptyMemory,finiteMode,execute,baselineMode} from '../reference/src/index.js';
import type {Bundle,Percept} from '../reference/src/contracts.js';
const player=(relation:'teammate'|'opponent',holding=false,yaw=Math.PI):Percept=>({id:'p@0',entityId:'p',kind:'player',relation,modality:'vision',evidenceVersion:2,observedAt:0,confidence:.9,position:{x:0,z:8},bodyOrientation:{yaw,halfWidth:Math.PI/24,confidence:.8},...(holding?{ballControl:{holding:true,confidence:.85}}:{})});
const bundle=(percepts:Percept[]=[],hasBall=false):Bundle=>({contractVersion:3,context:{ownAttackDirection:1},playerId:'self',time:0,self:{position:{x:0,z:0},yaw:0,headYaw:.2,eyeHeight:1.68,hasBall},vision:{horizontalFov:Math.PI/2,range:35},percepts});
const run=(b:Bundle)=>think(b,emptyMemory(),defaultProfile(),defaultRulesA());
test('one shared observation model distinguishes carrier, support, defense and unknown without treating no-ball as defense',()=>{
 for(const [b,phase] of [[bundle([],true),'attack-carrier'],[bundle([player('teammate',true)]),'attack-support'],[bundle([player('opponent',true)]),'defense'],[bundle([player('opponent')]),'unknown']] as const){
  const t=run(b);validate('Trace',t);assert.equal(t.situation?.phase,phase);assert.equal(t.traceVersion,4);
  if(phase==='defense'||phase==='unknown'){assert.ok(['scan','hold'].includes(t.intention.action));assert.equal(t.evaluation.find(e=>e.action==='support')?.allowed,false);assert.deepEqual(t.output.find(o=>o.channel==='locomotion')?.value,{x:0,z:0});}
 }
 const conflict=bundle([player('opponent',true)],true);assert.equal(run(conflict).situation?.phase,'unknown');
});
test('body, head and observed orientation are distinct; retrieval preserves evidence and increases angular uncertainty',()=>{
 const b=bundle([player('opponent',true)]),t=run(b),o=t.situation!.orientations[0];
 assert.equal(o.facingObserver,'toward');assert.ok(Math.abs(t.situation!.selfOrientation.viewYaw-.2)<1e-12);
 const turned=structuredClone(b);turned.percepts[0].bodyOrientation!.yaw=0;assert.equal(run(turned).situation!.orientations[0].facingObserver,'away');
 const ownTurn=structuredClone(b);ownTurn.self.yaw=1;assert.notEqual(run(ownTurn).situation!.orientations[0].bodyRelativeYaw,o.bodyRelativeYaw);
 const later=bundle();later.time=2;const remembered=think(later,t.longTermMemory,defaultProfile(),defaultRulesA());
 assert.deepEqual(remembered.longTermMemory.episodes[0],t.longTermMemory.episodes[0]);assert.equal(remembered.situation!.orientations[0].observedAt,0);assert.ok(remembered.situation!.orientations[0].angularHalfWidth>o.angularHalfWidth);assert.equal(remembered.situation!.orientations[0].facingObserver,'uncertain');assert.equal(remembered.situation!.phase,'unknown');
});
test('v2 rejects inappropriate/future features and implicit downgrade; attack direction mirrors pass eligibility',()=>{
 const original=bundle([player('opponent')]);
 for(const mutate of [(b:Bundle)=>{b.percepts[0].modality='audio';},(b:Bundle)=>{b.percepts[0].bodyOrientation!.confidence=1;},(b:Bundle)=>{b.percepts[0].observedAt=1;},(b:Bundle)=>{(b as any).contractVersion=99;}]){
  const b=structuredClone(original);mutate(b);assert.throws(()=>run(b));
 }
 const p=player('teammate');p.position={x:0,z:-3};const b=bundle([p],true),before=run(b);b.context!.ownAttackDirection=-1;b.percepts[0].position!.z=3;assert.equal(run(b).evaluation.find(e=>e.action==='pass')!.allowed,before.evaluation.find(e=>e.action==='pass')!.allowed);
 const unknown={...bundle()};delete unknown.context;validateEvidence(unknown,{episodes:original.percepts,lastTime:0});
 const result=execute({executionContractVersion:2,executionMode:baselineMode(),bundle:original,memory:emptyMemory(),profile:defaultProfile(),rules:defaultRulesA()});assert.equal(result.traceVersion,4);
 validate('Trace',thinkWithMode(original,emptyMemory(),defaultProfile(),defaultRulesA(),finiteMode(1)));
});
