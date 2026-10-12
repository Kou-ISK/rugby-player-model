import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,ConflictError} from '../server/store';
import {capture} from '../research';
import {defaultRulesA} from '../../../models/player/reference/src/index.js';
import {textHash} from '../../experiments/src/judgment';
test('B replacement creates a new immutable baseline, explicit ordered amendments; undo/restart preserves old B and A',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-b-replace-synthetic-'));
 try{
  const s=new Store(dir),snapshot=capture('support',42,defaultRulesA(),'B0'),sid=s.saveSnapshot(snapshot),c=s.propose(sid,'Synthetic B text revision');
  const original=s.exportB(),a=structuredClone(s.active().A);
  const p={id:'synthetic-first',condition:'stale visual observation',criterion:'retain uncertainty',priority:1,exceptions:'urgent pressure',unknown:'seek fresh evidence',evidence:'synthetic software test; unvalidated'};
  const old=s.edit(c.id,{},p,1);s.review(c.id,'B','approve','owner',old.revision);
  const b1=s.exportB(),oldVersion=structuredClone(s.active().B);assert.notEqual(textHash(b1),textHash(original));
  const second=s.propose(s.saveSnapshot(capture('support',42,a,s.active().B.version)),'Synthetic new baseline');
  const edited=s.edit(second.id,{},second.principle,1,undefined,undefined,{text:'# Synthetic B baseline\n\nAsk what was observed.\n',principles:[{...p,id:'second'},p]});
  assert.equal(s.exportB(),b1);assert(edited.replacementB!.baseline.id.startsWith('urn:uuid:'));const saved=readFileSync(join(dir,'state.json'),'utf8');
  assert.throws(()=>s.review(second.id,'B','approve','owner',1),ConflictError);assert.equal(readFileSync(join(dir,'state.json'),'utf8'),saved);
  s.review(second.id,'B','approve','owner',2);const after=s.exportB();assert.match(after,/Synthetic B baseline/);assert(after.indexOf('### second')<after.indexOf('### synthetic-first'));assert.deepEqual(s.active().A,a);assert.deepEqual(s.read().versionsB.B1,oldVersion);
  const restart=new Store(dir);assert.equal(textHash(restart.exportB()),textHash(after));assert.equal(restart.active().B.baseline!.sha256,textHash(edited.replacementB!.baseline.text));
  restart.undo('B','owner','B2');assert.equal(restart.exportB(),b1);assert.deepEqual(restart.active().B,oldVersion);assert.deepEqual(restart.active().A,a);restart.undo('B','owner','B1');assert.equal(new Store(dir).exportB(),original);assert.equal(restart.read().versionsB.B2.baseline!.id,edited.replacementB!.baseline.id);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
