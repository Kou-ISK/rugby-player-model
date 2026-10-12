import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, defaultRulesA, emptyMemory } from '../src/contracts';
import { makeWorld, sense, advance } from '../src/simulation';
import { think, capabilities } from '../src/cognition';
import { validate, validateSnapshot } from '../src/validation';
import { capture, compare, regressionCompare } from '../src/research';
const run=(bundle= sense(makeWorld('support',42)), memory=emptyMemory(), profile=defaultProfile(), rules=defaultRulesA())=>think(bundle,memory,profile,rules);

test('contracts round-trip multiple synthetic scenes and seeds',()=>{
  for(const scene of ['support','occluded','audio','heldout'] as const)for(const seed of [0,42,901,4294967295]){
    const snapshot=JSON.parse(JSON.stringify(capture(scene,seed,defaultRulesA(),'B0')));
    validateSnapshot(snapshot);assert.deepEqual(snapshot.bundle,sense(snapshot.world));
    const trace=run(snapshot.bundle);validate('Trace',JSON.parse(JSON.stringify(trace)));assert.ok(trace.intention.allowed);
  }
});
test('schema rejects world state, extra internal fields, future evidence and precise audio positions',()=>{
  const bundle=sense(makeWorld('support',42));
  assert.throws(()=>run({...bundle,world:makeWorld('support',42)} as any),/additional properties/);
  const internal=structuredClone(bundle);(internal.percepts[0] as any).opponentIntention='pass';
  assert.throws(()=>run(internal),/additional properties/);
  const future=structuredClone(bundle);future.percepts[0].observedAt=100;
  assert.throws(()=>run(future),/Future/);
  const audio=sense(makeWorld('audio',42));audio.percepts.find(p=>p.modality==='audio')!.position={x:1,z:1};
  assert.throws(()=>run(audio),/Bundle/);
  assert.throws(()=>validate('RulesA',{...defaultRulesA(),memoryHalfLife:0}));
  assert.throws(()=>run(bundle,emptyMemory(),{...defaultProfile(),tactics:{preferredAction:'pass',adherence:2}}));
});
test('occluded-world pair produces identical observation, memory, decision and commands',()=>{
  const one=makeWorld('occluded',42),two=structuredClone(one);
  two.entities.find(e=>e.id==='hidden')!.position.z=22;
  (two.entities.find(e=>e.id==='hidden') as any).internalIntention='secret';
  assert.notDeepEqual(one,two);assert.deepEqual(sense(one),sense(two));assert.deepEqual(run(sense(one)),run(sense(two)));
  assert.ok(!sense(one).percepts.some(p=>p.entityId==='hidden'));
});
test('behind-player ball cannot steer a first-person observation or decision',()=>{
  const one=makeWorld('audio',7);one.entities.find(e=>e.id==='ball')!.position={x:2,z:-10};
  const two=structuredClone(one);two.entities.find(e=>e.id==='ball')!.position={x:-20,z:-20};
  assert.deepEqual(run(sense(one)),run(sense(two)));
});
test('head scan retains past visual evidence with original time and confidence; retrieval cannot refresh it',()=>{
  const world=makeWorld('support',42);world.body.headYaw=-2;
  const first=run(sense(world));const original=first.longTermMemory.episodes.find(p=>p.entityId==='support-1')!;
  assert.ok(original);world.time=1;world.body.headYaw=0;
  const second=run(sense(world),first.longTermMemory);const remembered=second.beliefs.find(b=>b.entityId==='support-1')!;
  assert.equal(remembered.observedAt,0);assert.equal(remembered.confidence,original.confidence);assert.ok(remembered.currentConfidence<original.confidence);
  world.time=2;const third=run(sense(world),second.longTermMemory);const older=third.beliefs.find(b=>b.entityId==='support-1')!;
  assert.equal(older.observedAt,0);assert.ok(older.currentConfidence<remembered.currentConfidence);
  world.time=31;const forgotten=run(sense(world),third.longTermMemory);
  assert.ok(!forgotten.longTermMemory.episodes.some(p=>p.entityId==='support-1'));
});
test('audio direction survives in memory without exact position or identified receiver',()=>{
  const world=makeWorld('audio',42),first=run(sense(world));
  const call=first.beliefs.find(b=>b.kind==='call')!;assert.ok(call);assert.equal(call.position,undefined);
  world.calls=[];world.time=1;const second=run(sense(world),first.longTermMemory);
  assert.ok(second.beliefs.some(b=>b.kind==='call'&&b.observedAt===0));
  assert.equal(second.evaluation.find(e=>e.action==='pass')!.allowed,false);
});
test('preferences change individual judgment while ability and self-estimate remain distinct',()=>{
  const world=makeWorld('support',42);world.body.headYaw=-2;const bundle=sense(world);
  const carrier=defaultProfile();carrier.tactics.adherence=0;carrier.preference.carry=1;carrier.preference.pass=0;
  const passer=structuredClone(carrier);passer.preference.carry=0;passer.preference.pass=1;
  assert.equal(run(bundle,emptyMemory(),carrier).intention.action,'carry');
  const trace=run(bundle,emptyMemory(),passer);assert.equal(trace.intention.action,'pass');
  assert.deepEqual(carrier.ability,passer.ability);assert.deepEqual(carrier.selfEstimate,passer.selfEstimate);
  assert.equal(trace.output.find(o=>o.channel==='pass')!.status,'unsupported');
  assert.equal(advance(world,trace).body.hasBall,true);
});
test('tactical adherence cannot bypass fresh-receiver or physical capability constraints',()=>{
  const profile=defaultProfile();profile.tactics.adherence=1;
  assert.notEqual(run(undefined,undefined,profile).intention.action,'pass');
  assert.equal(capabilities.jointPose,'unsupported');assert.equal(capabilities.muscleEffort,'unsupported');
  const world=makeWorld('support',42);world.body.headYaw=-2;assert.equal(run(sense(world),emptyMemory(),profile).intention.action,'pass');
});
test('predictions use original observations and uncertainty, never hidden future velocity',()=>{
  const trace=run();
  for(const prediction of trace.predictions){assert.equal(prediction.method,'last-observation');assert.equal(prediction.basisObservedAt,0);assert.ok(prediction.uncertaintyRadius>0);}
});
test('same condition comparison is deterministic and heldout seeds are distinct',()=>{
  const snapshot=capture('support',42,defaultRulesA(),'B0');const before=JSON.stringify(snapshot);
  const changed={...defaultRulesA(),version:'A1',scanBias:2};const report=compare(snapshot,changed);
  assert.equal(report.before.intention.action,'carry');assert.equal(report.after.intention.action,'scan');
  assert.deepEqual(report.before.sensation,report.after.sensation);assert.equal(JSON.stringify(snapshot),before);
  assert.deepEqual(compare(snapshot,changed),report);
  const suite=regressionCompare(defaultRulesA(),changed,defaultProfile());assert.equal(new Set(suite.map(s=>s.seed)).size,8);
  for(const item of suite){assert.equal(item.scene,'heldout');assert.ok(item.before.intention.allowed&&item.after.intention.allowed);}
});
test('future memory and reverse time are rejected rather than silently refreshed',()=>{
  assert.throws(()=>run(undefined,{episodes:[],lastTime:10}),/future/);
});
