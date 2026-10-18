import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { capture, regressionCompare } from '../research';
import { defaultProfile, defaultRulesA, emptyMemory, type Memory, type Principle } from '../../../src/contracts';
import { makeWorld, sense } from '../../simulation/src/index';
import { think } from '../../../models/player/reference/src/cognition';
const principle:Principle={id:'review',condition:'synthetic',criterion:'synthetic',priority:20,exceptions:'synthetic',unknown:'retain uncertainty',evidence:'engineering assumption'};
test('confirmed candidate revision cannot approve a later unseen edit',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rpm-cas-'));const store=new Store(dir);
  try{
    const c=store.propose(store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),'review');
    const seen=store.edit(c.id,{scanBias:1},principle,1);
    const path=join(dir,'edit.json');writeFileSync(path,JSON.stringify({patchA:{scanBias:2},principle}));
    const edit=spawnSync(process.execPath,['--import','tsx','tools/workbench/server/cli.ts','edit',c.id,'--file',path,'--revision',String(seen.revision)],{encoding:'utf8',env:{...process.env,RPM_SESSION_DIR:dir}});
    assert.equal(edit.status,0,edit.stderr);
    assert.throws(()=>store.review(c.id,'A','approve','owner',seen.revision),/revision|changed/i);
    assert.equal(store.active().A.version,'A0');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('pending candidate preview evaluates its patch without activating it',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rpm-preview-'));const store=new Store(dir);
  try{
    const c=store.propose(store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),'preview');
    const edited=store.edit(c.id,{scanBias:2},principle,1);
    const stateBefore=store.read();const report=store.comparison(c.id,{mode:'preview',expectedRevision:edited.revision});
    assert.equal(report.recorded.after.intention.action,'scan');assert.equal(store.active().A.version,'A0');
    assert.equal(store.read().candidates[c.id].decisions.A,'pending');
    assert.deepEqual(store.read(),stateBefore);assert.equal(report.mode,'preview');
    assert.equal(store.comparison(c.id).recorded.after.intention.action,'carry');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('fixed current input: uncertain nearby enemy memory changes judgment without refreshing facts',()=>{
  const world=makeWorld('support',42);world.time=1;const bundle=sense(world);
  const memory:Memory={lastTime:0,episodes:[{id:'old-threat@0',entityId:'old-threat',kind:'player',relation:'opponent',modality:'vision',evidenceVersion:2,observedAt:0,confidence:.9,position:{x:0,z:3}}]};
  const without=think(bundle,emptyMemory(),defaultProfile(),defaultRulesA());
  const withMemory=think(bundle,memory,defaultProfile(),defaultRulesA());
  assert.notEqual(withMemory.intention.action,without.intention.action);
  assert.equal(withMemory.beliefs.find(b=>b.entityId==='old-threat')!.observedAt,0);
  assert.equal(withMemory.beliefs.find(b=>b.entityId==='old-threat')!.confidence,.9);
  assert.ok(withMemory.beliefs.find(b=>b.entityId==='old-threat')!.currentConfidence<.9);
});
test('paired audio direction and absence change head output with profile and visuals fixed',()=>{
  const base=sense(makeWorld('audio',42));
  const left=structuredClone(base);left.percepts.find(p=>p.modality==='audio')!.bearing=-1;
  const right=structuredClone(base);right.percepts.find(p=>p.modality==='audio')!.bearing=1;
  const muted=structuredClone(base);muted.percepts=muted.percepts.filter(p=>p.modality!=='audio');
  const run=(b:typeof base)=>think(b,emptyMemory(),defaultProfile(),defaultRulesA());
  const l=run(left),r=run(right),m=run(muted);
  assert.notDeepEqual(l.output,r.output);assert.notEqual(l.intention.action,m.intention.action);
  assert.ok(!l.beliefs.find(b=>b.modality==='audio')!.position);
});
test('evaluation suite includes possession, pressure, missing observation, memory and audio',()=>{
  const suite=regressionCompare(defaultRulesA(),defaultRulesA(),defaultProfile());
  assert.ok(suite.some(s=>s.before.sensation.self.hasBall));assert.ok(suite.some(s=>!s.before.sensation.self.hasBall));
  assert.ok(suite.some(s=>s.before.evaluation.some(e=>e.action==='pass'&&e.allowed)));
  assert.ok(suite.some(s=>s.before.beliefs.some(b=>b.age>.5)));
  assert.ok(suite.some(s=>s.before.sensation.percepts.some(p=>p.modality==='audio')));
  assert.ok(suite.some(s=>!s.before.sensation.percepts.some(p=>p.modality==='vision')));
  assert.ok(suite.some(s=>s.strata.includes('pressure')));
});
test('edit CAS rejects lost updates and review receipts pin exactly the confirmed content',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rpm-edit-cas-'));const store=new Store(dir);
  try{
    const c=store.propose(store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),'review');
    const edited=store.edit(c.id,{scanBias:1},principle,1);
    assert.throws(()=>store.edit(c.id,{scanBias:2},principle,1),/revision changed/);
    assert.throws(()=>store.review(c.id,'B','approve','owner',1),/revision changed/);
    assert.throws(()=>store.review(c.id,'A','approve','owner',undefined as any),/required/);
    store.review(c.id,'A','approve','owner',edited.revision);
    const event=new Store(dir).read().events.find(e=>e.action==='approve')!;
    assert.equal(event.candidateRevision,2);assert.equal(event.reviewedContent!.patchA.scanBias,1);
    assert.deepEqual(event.reviewedContent!.principle,principle);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('undo CAS rejects an active version different from the one the owner confirmed',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rpm-undo-cas-'));const store=new Store(dir);
  try{
    for(const bias of [1,2]){
      const active=store.active();const c=store.propose(store.saveSnapshot(capture('support',42,active.A,active.B.version)),'revision');
      const edited=store.edit(c.id,{scanBias:bias},principle,c.revision);store.review(c.id,'A','approve','owner',edited.revision);
    }
    assert.equal(store.active().A.version,'A2');assert.throws(()=>store.undo('A','owner','A1'),/version changed/);
    assert.equal(store.active().A.version,'A2');store.undo('A','owner','A2');assert.equal(store.active().A.version,'A1');
    assert.equal(store.active().B.version,'B0');assert.equal(store.read().events.at(-1)!.confirmedVersion,'A2');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('remembered audio keeps its yaw frame and decays; cue meaning influences information value',()=>{
  const world=makeWorld('audio',42);world.calls[0].position={x:-8,z:4};const bundle=sense(world);
  const first=think(bundle,emptyMemory(),defaultProfile(),defaultRulesA());
  world.calls=[];world.time=1;world.body.yaw=.4;
  const remembered=think(sense(world),first.longTermMemory,defaultProfile(),defaultRulesA());
  assert.equal(remembered.assessment.scanTarget!.modality,'audio');
  assert.equal(remembered.assessment.scanTarget!.observedAt,0);
  assert.ok(remembered.assessment.informationValue<first.assessment.informationValue);
  assert.ok(remembered.assessment.scanTarget!.headYaw<first.assessment.scanTarget!.headYaw);
  const noise=structuredClone(bundle);noise.percepts.find(p=>p.modality==='audio')!.cue='ambient-noise';
  const ignored=think(noise,emptyMemory(),defaultProfile(),defaultRulesA());
  assert.notEqual(ignored.intention.action,first.intention.action);
  world.time=31;const forgotten=think(sense(world),remembered.longTermMemory,defaultProfile(),defaultRulesA());
  assert.equal(forgotten.assessment.scanTarget,undefined);
});
test('uncertain memory changes risk and scores without enabling a stale pass or inventing exact motion',()=>{
  const world=makeWorld('support',42);world.time=1;const bundle=sense(world);
  const memory:Memory={lastTime:0,episodes:[{id:'mate@0',entityId:'mate',kind:'player',relation:'teammate',modality:'vision',evidenceVersion:2,observedAt:0,confidence:.9,position:{x:-5,z:-2}}]};
  const trace=think(bundle,memory,defaultProfile(),defaultRulesA());
  assert.equal(trace.evaluation.find(e=>e.action==='pass')!.allowed,false);
  assert.equal(trace.assessment.scanTarget!.sourceId,'mate@0');assert.equal(trace.predictions.find(p=>p.entityId==='mate')!.basisObservedAt,0);
  memory.episodes[0].relation='opponent';memory.episodes[0].position={x:0,z:3};
  const nearby=think(bundle,memory,defaultProfile(),defaultRulesA());
  memory.episodes[0].position={x:0,z:25};const far=think(bundle,memory,defaultProfile(),defaultRulesA());
  assert.ok(nearby.assessment.uncertainThreat>far.assessment.uncertainThreat);
  assert.ok(nearby.evaluation.find(e=>e.action==='carry')!.score<far.evaluation.find(e=>e.action==='carry')!.score);
});
test('revising the judgment reading edition does not replace the frozen session baseline',()=>{
  const dir=mkdtempSync(join(tmpdir(),'rpm-b-baseline-'));const store=new Store(dir);
  try{
    assert.ok(readFileSync('models/judgment/RUGBY_JUDGMENT.md','utf8').includes('| TRAJECTORY / 27 |'));
    const exported=store.exportB();assert.ok(exported.startsWith('# Rugby judgment principles — B0\n'));
    assert.ok(!exported.includes('| TRAJECTORY / 27 |'));assert.equal(store.active().B.version,'B0');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
