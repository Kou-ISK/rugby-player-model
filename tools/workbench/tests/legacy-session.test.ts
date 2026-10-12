import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {Store,ConflictError} from '../server/store';

test('genuine ecc5c298 synthetic session reads without rewrites and preserves old hashes, B order, pending revisions, undo and restart',()=>{
 const base=new URL('../../../evaluation/baselines/',import.meta.url),bytes=readFileSync(new URL('legacy-session.ecc5c298.synthetic.json',base),'utf8'),original=JSON.parse(bytes),meta=JSON.parse(readFileSync(new URL('legacy-session.ecc5c298.provenance.json',base),'utf8'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),meta.stateSha256);assert.equal(meta.synthetic,true);assert.equal(original.format,1);
 const dir=mkdtempSync(join(tmpdir(),'rpm-legacy-fixture-')),file=join(dir,'state.json');writeFileSync(file,bytes,{mode:0o600});
 try{
  const store=new Store(dir),loaded=store.read();assert.equal(loaded.format,1);assert.equal(store.active().A.version,'A2');assert.equal(store.active().B.version,'B2');assert.deepEqual(store.exportBData(),meta.bExport);
  for(const key of ['snapshots','candidates','experiments','versionsA','versionsB','events'] as const)assert.deepEqual(loaded[key],original[key]);
  for(const e of Object.values(loaded.experiments)){assert.equal(e.engineFingerprint,meta.engineFingerprint);assert.equal(e.engineFingerprintFormat,undefined);assert.equal(e.candidate.context.executionMode,undefined);assert.equal(e.provenance.resultSha256,createHash('sha256').update(JSON.stringify(e.results)).digest('hex'));}
  assert.equal(readFileSync(file,'utf8'),bytes,'reads/export do not migrate historical bytes');
  assert.throws(()=>store.review(meta.pendingCandidateId,'A','approve','owner',2),ConflictError);assert.equal(readFileSync(file,'utf8'),bytes);
  store.undo('A','owner','A2');assert.equal(store.active().A.version,'A1');assert.deepEqual(store.exportBData(),meta.bExport);assert.equal(store.read().format,2);
  assert.deepEqual(store.read().experiments,original.experiments);assert.deepEqual(store.read().candidates,original.candidates);assert.deepEqual(store.read().versionsB,original.versionsB);
  store.undo('B','owner','B2');const restarted=new Store(dir);assert.equal(restarted.active().B.version,'B1');assert.deepEqual(restarted.active().B.principles,original.versionsB.B1.principles);assert.deepEqual(restarted.read().events.slice(0,original.events.length),original.events);
  assert.deepEqual(restarted.read().experiments,original.experiments);assert.equal(restarted.read().candidates[meta.pendingCandidateId].revision,1);
  // Optional exact-old-binary check for local migration acceptance, not a substitute for the assertions above.
  if(process.env.RPM_LEGACY_SOURCE){const before=readFileSync(file,'utf8'),p=spawnSync(process.execPath,['--import','tsx','server/cli.ts','status'],{cwd:process.env.RPM_LEGACY_SOURCE,env:{PATH:process.env.PATH,RPM_SESSION_DIR:dir,TSX_DISABLE_CACHE:'1'},encoding:'utf8',timeout:15000});assert.notEqual(p.status,0);assert.match(p.stderr,/Unsupported\/corrupt session format/);assert.equal(readFileSync(file,'utf8'),before);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
