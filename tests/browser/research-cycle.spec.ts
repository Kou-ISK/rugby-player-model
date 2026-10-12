import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Separate synthetic session and owned server: never reset another test or the owner's .rpm.
const repo=fileURLToPath(new URL('../../',import.meta.url));
const session=mkdtempSync(join(tmpdir(),'rpm-cycle-'));
const base='http://127.0.0.1:5176';
const env={...process.env,PORT:'5176',RPM_SESSION_DIR:session};
let server:ChildProcess|undefined;
async function start(){
 server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{cwd:repo,env,stdio:['ignore','pipe','pipe']});
 const child=server;
 await new Promise<void>((done,fail)=>{
  let output='';const timer=setTimeout(()=>fail(Error('Owned server startup timeout: '+output)),15000);
  const exited=(code:number|null)=>{clearTimeout(timer);fail(Error(`Owned server exited ${code}: ${output}`));};
  child.once('exit',exited);child.once('error',e=>{clearTimeout(timer);fail(e);});
  child.stderr!.on('data',data=>{output+=data;});
  child.stdout!.on('data',data=>{output+=data;if(output.includes('Research workbench:')){clearTimeout(timer);child.off('exit',exited);done();}});
 });
}
async function stop(){
 if(server&&server.exitCode===null){const child=server;await new Promise<void>((done,fail)=>{
  const timer=setTimeout(()=>fail(Error('Owned server did not stop')),10000);
  child.once('exit',()=>{clearTimeout(timer);done();});child.kill('SIGTERM');
 });}
}
function cli(...args:string[]){
 const result=spawnSync(process.execPath,['--import','tsx','server/cli.ts',...args],{cwd:repo,env,encoding:'utf8',maxBuffer:10*1024*1024});
 expect(result.status,result.stderr).toBe(0);return JSON.parse(result.stdout);
}
test.beforeAll(start);
test.afterAll(async()=>{await stop();rmSync(session,{recursive:true,force:true});});
test('synthetic coaching → return/revise → conditional transfer → independent A/B → two real server restarts → undo',async({page,request},info)=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const edit=JSON.parse(readFileSync(resolve(repo,'examples/conditional-coaching-edit.json'),'utf8'));
 const draft={criteria:'SYNTHETIC ONLY: check evidence bounds and exceptions',noveltyAttestation:'not-used-for-coaching',cases:[{label:'EVALUATOR_ONLY_AUDIO',snapshot:cli('snapshot-export',cli('snapshot','--scene','audio','--seed','8123').snapshotId)},{label:'EVALUATOR_ONLY_OCCLUDED',snapshot:cli('snapshot-export',cli('snapshot','--scene','occluded','--seed','7181').snapshotId)}]};
 writeFileSync(join(session,'frozen.json'),JSON.stringify(draft));const frozen=cli('freeze-evaluation','--file',join(session,'frozen.json'));
 await page.goto(base);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 await expect(page.locator('canvas')).toHaveAttribute('data-mode','first-person');
 await page.locator('#head').fill('-110');await page.locator('#head').dispatchEvent('input');
 await expect(page.locator('#beliefs')).toContainText('support-1');
 await page.locator('#head').fill('0');await page.locator('#head').dispatchEvent('input');
 await page.locator('#step').click();await expect(page.locator('#beliefs')).toContainText('観測 0.0s');
 await page.locator('#snapshot').click();await expect(page.locator('#status')).toContainText('snapshot保存');
 const [savedId,saved]=Object.entries(JSON.parse(readFileSync(join(session,'state.json'),'utf8')).snapshots).at(-1) as [string,any];
 const replayed=cli('history-replay',savedId);expect(replayed.frames).toHaveLength(4);
 await page.locator('#replay-history').click();await expect(page.locator('#history-report')).toContainText('static-study');
 expect(saved.observationHistory.mode).toBe('static-study');expect(saved.observationHistory.events.map((e:any)=>e.bundle.time)).toEqual([0,0,0,.2]);
 expect(saved.observationHistory.events.map((e:any)=>e.trigger)).toEqual(['initial','head-turn','head-turn','step']);
 await page.locator('#reset').click();
 await page.locator('#evaluation-sets').selectOption(frozen.id);
 await page.locator('#feedback').fill('[SYNTHETIC ONLY] 持っていて受け手が未確認なら外を見たい。実研究の本人承認ではない。');
 await page.locator('#propose').click();await expect(page.locator('#candidate-context')).toContainText('revision 1');
 const parent=await page.locator('#candidates').inputValue();const context=cli('context',parent);
 expect([context.scene,context.seed,context.bundle.time,context.bundle.playerId]).toEqual(['support',42,0,'self']);
 expect(context).not.toHaveProperty('world');expect(context.evaluationSetId).toBe(frozen.id);
 writeFileSync(join(session,'edit.json'),JSON.stringify(edit));cli('edit',parent,'--file',join(session,'edit.json'),'--revision','1');
 await expect(page.locator('#candidate-context')).toContainText('revision 2',{timeout:10000});
 await page.locator('#review-reason').fill('SYNTHETIC: 近い脅威は例外にして対照を残す');
 await page.locator('#owner').check();await page.locator('#return-a').click();await expect(page.locator('#candidate-context')).toContainText('A: returned');
 await expect(page.locator('#versions')).toHaveText('A0 / B0');
 await page.locator('#revise').click();await expect(page.locator('#candidate-context')).toContainText('親候補 '+parent);
 const child=await page.locator('#candidates').inputValue();expect(child).not.toBe(parent);
 // Exercise UI edit/save as well as the real CLI editor.
 await page.locator('#study-notes').fill(JSON.stringify({...edit.notes,rationale:edit.notes.rationale+' SYNTHETIC revision.'}));
 await page.locator('#save-edit').click();await expect(page.locator('#candidate-context')).toContainText('revision 2');
 const beforePreview=readFileSync(join(session,'state.json'),'utf8');cli('preview',child,'--revision','2');
 expect(readFileSync(join(session,'state.json'),'utf8')).toBe(beforePreview);
 await page.locator('#run-preview').click();await expect(page.locator('#status')).toContainText('実験記録を保存');
 await expect(page.locator('#versions')).toHaveText('A0 / B0');
 const previewId=await page.locator('#experiments').inputValue();const preview=cli('experiment',previewId);
 expect(preview.results.recorded.before.frames[0].trace.intention.action).toBe('carry');
 expect(preview.results.recorded.after.frames[0].trace.intention.action).toBe('scan');
 const actions=Object.fromEntries(preview.results.trials.map((t:any)=>[t.caseId,t.after.frames[0].trace.intention.action]));
 expect(actions).toMatchObject({'carrier-open':'scan','carrier-pressure':'hold','carrier-receiver':'pass','noncarrier-open':'support'});
 expect(preview.results.frozenTrials).toHaveLength(2);expect(preview.evaluation.status).toBe('first-recorded-use-owner-declared');
 expect(preview.results.diagnostic.homogeneousWarning).toBe(false);expect(preview.B.after.markdown).toContain('NOT approved');
 const conflict=await request.post(base+'/api/review',{headers:{'X-RPM-Local':'1'},data:{id:child,target:'A',decision:'approve',actor:'owner',expectedRevision:1}});
 expect(conflict.status()).toBe(409);expect(cli('status').active.A.version).toBe('A0');
 await page.locator('#owner').check();await page.locator('#approve-a').click();await expect(page.locator('#versions')).toHaveText('A1 / B0');
 await page.locator('#owner').check();await page.locator('#approve-b').click();await expect(page.locator('#versions')).toHaveText('A1 / B1');
 await page.locator('#run-active').click();await expect(page.locator('#experiment-report')).toContainText('"mode": "active"');
 const experimentId=await page.locator('#experiments').inputValue();const active=cli('experiment',experimentId);
 expect(active.evaluation.status).toBe('reused-not-unseen');
 const packet=cli('b-packet',experimentId,'--arm','after','--cases','frozen');expect(packet.cases).toHaveLength(2);
 for(const key of ['"world"','"scene"','"seed"','EVALUATOR_ONLY','carrier-pressure'])expect(JSON.stringify(packet)).not.toContain(key);
 expect(packet.structuredAmendments).toHaveLength(1);
 await page.locator('#b-arm').selectOption('after');await page.locator('#b-cases').selectOption('frozen');
 const downloadPromise=page.waitForEvent('download');await page.locator('#b-packet').click();const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('B-anonymous-input.json');
 expect(JSON.parse(readFileSync((await download.path())!,'utf8'))).toEqual(packet);
 await page.locator('#b-model').fill('Synthetic mock; no external AI called');
 await page.locator('#b-output').fill('Synthetic response: re-observe, except under nearby pressure.');
 await page.locator('#b-assessment').fill('Transport check only; owner rugby scoring pending.');
 await page.locator('#save-b-review').click();await expect(page.locator('#b-review-status')).toContainText('1件');
 const approved=JSON.parse(readFileSync(join(session,'state.json'),'utf8'));
 expect(approved.bReviews[0].humanValidated).toBe(false);expect(approved.bReviews[0].arm).toBe('after');expect(approved.bReviews[0].group).toBe('frozen');expect(approved.bReviews[0].inputSha256).toMatch(/^[0-9a-f]{64}$/);
 await stop();await start();expect(JSON.parse(readFileSync(join(session,'state.json'),'utf8'))).toEqual(approved);
 await page.reload();await expect(page.locator('#versions')).toHaveText('A1 / B1');
 await page.locator('#candidates').selectOption(child);await page.locator('#restore-candidate').click();await expect(page.locator('#intention')).toHaveText('scan');
 await page.locator('#experiments').selectOption(experimentId);await page.locator('#load-experiment').click();await expect(page.locator('#experiment-report')).toContainText(active.engineFingerprint);
 await page.locator('#owner').check();await page.locator('#undo-a').click();await expect(page.locator('#versions')).toHaveText('A0 / B1');
 await page.locator('#owner').check();await page.locator('#undo-b').click();await expect(page.locator('#versions')).toHaveText('A0 / B0');
 await page.locator('#restore-candidate').click();await expect(page.locator('#intention')).toHaveText('carry');
 const undone=JSON.parse(readFileSync(join(session,'state.json'),'utf8'));
 await stop();await start();await page.reload();await expect(page.locator('#versions')).toHaveText('A0 / B0');
 expect(JSON.parse(readFileSync(join(session,'state.json'),'utf8'))).toEqual(undone);
 expect(cli('experiment',experimentId)).toEqual(active);expect(cli('context',parent).decisions.A).toBe('returned');
 expect(errors).toEqual([]);
 await info.attach('synthetic-research-cycle.json',{body:JSON.stringify({syntheticOnly:true,ownerAcceptance:false,node:process.version,
  bridgeApiVersion:4,modelRevision:active.modelRevision,engineFingerprint:active.engineFingerprint,processRestarts:2,
  context:{scene:context.scene,seed:context.seed,time:context.bundle.time,playerId:context.bundle.playerId,worldOmitted:true},
  conditionalActions:actions,previewAdopted:false,independentApprovals:true,revisionConflict:409,
  returnedParentRetained:true,headHistoryEvents:saved.observationHistory.events.length,historyMode:saved.observationHistory.mode,frozenEvaluationCount:active.results.frozenTrials.length,repeatMarkedAsReused:active.evaluation.status==='reused-not-unseen',BPacketLabelsOmitted:true,BPacketCases:packet.cases.length,BResponse:'synthetic-mock-unverified',
  before:['A0','B0'],adopted:['A1','B1'],restored:['A0','B0'],pinnedResultsPreserved:true},null,2),contentType:'application/json'});
});
