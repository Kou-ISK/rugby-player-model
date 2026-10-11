import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../server/store';
import { capture } from '../src/research';
import { defaultRulesA, type Principle } from '../src/contracts';
const principle:Principle={id:'freshness',condition:'When location is stale',criterion:'Look before asserting availability',priority:20,exceptions:'If looking causes greater immediate risk, preserve possession',unknown:'Retain uncertainty',evidence:'Engineering hypothesis; owner to validate'};
function session(){const dir=mkdtempSync(join(tmpdir(),'rpm-'));return {dir,store:new Store(dir),cleanup:()=>rmSync(dir,{recursive:true,force:true})};}
test('full loop: propose/edit/independent approval/compare/undo/restart persists audit history',()=>{
  const {dir,store,cleanup}=session();try{
    const snapshot=capture('support',42,defaultRulesA(),'B0');const sid=store.saveSnapshot(snapshot);
    const candidate=store.propose(sid,'More scanning when unsure');
    store.edit(candidate.id,{scanBias:2},principle,1);
    assert.equal(store.active().A.version,'A0');assert.equal(store.active().B.version,'B0');
    assert.equal(store.comparison(candidate.id).recorded.after.intention.action,'carry');
    assert.throws(()=>store.review(candidate.id,'A','approve','codex',2),/owner/);
    store.review(candidate.id,'A','approve','owner',2);
    assert.equal(store.active().A.version,'A1');assert.equal(store.active().B.version,'B0');
    assert.equal(store.comparison(candidate.id).recorded.after.intention.action,'scan');
    assert.throws(()=>store.edit(candidate.id,{},principle,2),/immutable/);
    store.review(candidate.id,'B','approve','owner',2);assert.equal(store.active().B.version,'B1');
    assert.ok(store.exportB().includes('Local owner-approved amendments (B1)'));
    const restart=new Store(dir);assert.equal(restart.active().A.version,'A1');assert.equal(restart.active().B.version,'B1');
    restart.undo('A','owner','A1');assert.equal(restart.active().A.version,'A0');assert.equal(restart.active().B.version,'B1');
    assert.equal(restart.comparison(candidate.id).recorded.after.intention.action,'carry');
    restart.undo('B','owner','B1');assert.equal(new Store(dir).active().B.version,'B0');
    assert.equal(restart.read().events.filter(e=>e.action==='undo').length,2);
    assert.ok(restart.read().versionsA.A1);assert.ok(restart.read().versionsB.B1);
    const second=restart.propose(sid,'Second trial');restart.edit(second.id,{scanBias:1},principle,1);restart.review(second.id,'A','approve','owner',2);
    assert.equal(restart.active().A.version,'A2');
    assert.deepEqual(restart.read().snapshots[sid],snapshot);
  }finally{cleanup();}
});
test('reject and failed approvals do not mutate versions; independent decisions remain possible',()=>{
  const {store,cleanup}=session();try{
    const sid=store.saveSnapshot(capture('support',42,defaultRulesA(),'B0'));const c=store.propose(sid,'Draft');
    assert.throws(()=>store.review(c.id,'A','approve','owner',1),/patch/);
    assert.throws(()=>store.review(c.id,'B','approve','owner',1),/fields/);
    store.review(c.id,'A','reject','owner',1);store.review(c.id,'B','reject','owner',1);
    assert.equal(store.active().A.version,'A0');assert.equal(store.active().B.version,'B0');
    assert.throws(()=>store.review(c.id,'A','approve','owner',1),/Already reviewed/);
    assert.throws(()=>store.undo('A','owner','A0'),/Nothing/);
  }finally{cleanup();}
});
test('stale candidates, unvalidated patch and inconsistent snapshots fail closed',()=>{
  const {store,cleanup}=session();try{
    const snapshot=capture('support',42,defaultRulesA(),'B0'),sid=store.saveSnapshot(snapshot);
    const first=store.propose(sid,'first'),second=store.propose(sid,'second');
    assert.throws(()=>store.edit(first.id,{scanBias:100},principle,1));
    assert.throws(()=>store.edit(first.id,{world:{}} as any,principle,1));
    store.edit(first.id,{scanBias:1},principle,1);store.edit(second.id,{scanBias:2},principle,1);
    store.review(first.id,'A','approve','owner',2);assert.throws(()=>store.review(second.id,'A','approve','owner',2),/Stale/);
    assert.equal(store.read().candidates[second.id].decisions.A,'pending');
    snapshot.bundle.self.position.x=10;assert.throws(()=>store.saveSnapshot(snapshot),/match sensor/);
  }finally{cleanup();}
});
test('single writer lock preserves state rather than losing concurrent edits',()=>{
  const {dir,store,cleanup}=session();try{
    const id=store.saveSnapshot(capture('audio',2,defaultRulesA(),'B0'));const before=readFileSync(join(dir,'state.json'),'utf8');
    mkdirSync(join(dir,'.lock'));assert.throws(()=>store.propose(id,'collision'),/busy/);
    assert.equal(readFileSync(join(dir,'state.json'),'utf8'),before);
  }finally{cleanup();}
});
test('existing Codex file/CLI bridge runs offline across separate processes',()=>{
  const {dir,cleanup}=session();try{
    const cli=(...args:string[])=>{const run=spawnSync(process.execPath,['--import','tsx','server/cli.ts',...args],{encoding:'utf8',env:{...process.env,RPM_SESSION_DIR:dir}});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);};
    const sid=cli('snapshot','--scene','audio','--seed','8').snapshotId;
    const c=cli('propose',sid,'--feedback','Observe before inferring');
    const context=cli('context',c.id);assert.ok(context.bundle);assert.equal(context.world,undefined);
    assert.equal(cli('status').candidates.length,1);assert.equal(cli('compare',c.id).recorded.sameConditions,true);
  }finally{cleanup();}
});
test('public synthetic snapshot runs headlessly with deterministic staged JSON output',()=>{
  const invoke=()=>spawnSync(process.execPath,['--import','tsx','scripts/run-model.ts','--input','examples/support-42.snapshot.json','--steps','4'],{encoding:'utf8'});
  const first=invoke(),second=invoke();assert.equal(first.status,0,first.stderr);assert.equal(first.stdout,second.stdout);
  const result=JSON.parse(first.stdout);assert.equal(result.frames.length,4);assert.equal(result.frames[3].time,.6);
  assert.ok(result.frames.every((f:any)=>f.trace.sensation&&f.trace.longTermMemory&&f.trace.output));
});
