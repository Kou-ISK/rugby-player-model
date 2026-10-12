import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, ConflictError } from '../server/store';
import { capture } from '../research';
import { defaultRulesA,finiteMode,legacyMode,execute } from '../../../models/player/reference/src/index.js';
test('H-WM-1 candidate, saved 3 arms, A-only adoption, 409, undo and restart retain explicit policy/capacity',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-mode-synthetic-'));
 try{
  const store=new Store(dir),snapshot=capture('support',42,defaultRulesA(),'B0'),id=store.saveSnapshot(snapshot),c=store.propose(id,'Synthetic receiver-capacity probe');
  const notes={rationale:'Synthetic software test',expectedEffect:'Only receiver deliberation changes',counterexample:'An excluded threat must retain its risk'};
  store.edit(c.id,{},c.principle,1,notes,finiteMode(1));
  const before=store.read(),preview=store.comparison(c.id,{mode:'preview',expectedRevision:2});
  assert.deepEqual(store.read(),before);assert.equal(preview.recorded.after.modelRevision,'cognition-h-wm-1-v1');assert.equal(preview.recorded.before.modelRevision,'cognition-0.3');
  const study=store.modeStudy(c.id,2,1);assert.deepEqual(study.arms.map(a=>a.name),['legacy','unlimited','finite']);
  assert.deepEqual(study.arms[1].result.trace.beliefs,study.arms[2].result.trace.beliefs);assert.deepEqual(store.active().executionMode,legacyMode());
  const saved=readFileSync(join(dir,'state.json'),'utf8');assert.throws(()=>store.review(c.id,'A','approve','owner',1),ConflictError);assert.equal(readFileSync(join(dir,'state.json'),'utf8'),saved);
  store.review(c.id,'A','approve','owner',2);assert.deepEqual(store.active().executionMode,finiteMode(1));assert.equal(store.active().B.version,'B0');
  const recorded=store.runExperiment(c.id,2,2,'active');assert.equal(recorded.results.recorded.after.frames[0].trace.modelRevision,'cognition-h-wm-1-v1');
  assert.equal(recorded.results.trials[0].after.frames[0].trace.modelRevision,'cognition-h-wm-1-v1');
  const restart=new Store(dir);assert.deepEqual(restart.read().modeStudies[study.id],study);assert.deepEqual(restart.active().executionMode,finiteMode(1));
  const next=capture('support',42,restart.active().A,'B0',restart.active().executionMode);assert.equal(execute({executionContractVersion:2,executionMode:next.executionMode,bundle:next.bundle,memory:next.memoryBefore,profile:next.profile,rules:next.rulesA}).traceVersion,2);
  restart.saveSnapshot(next);restart.undo('A','owner','A1');assert.deepEqual(new Store(dir).active().executionMode,legacyMode());assert.equal(restart.active().B.version,'B0');assert.equal(restart.read().modeStudies[study.id].arms.length,3);assert.deepEqual(restart.read().snapshots[id],snapshot,'old snapshot gains no invented mode metadata');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
