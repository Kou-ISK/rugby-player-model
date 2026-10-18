import { openResearchTools } from './ui-helpers';
import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=fileURLToPath(new URL('../../../../',import.meta.url)),session=mkdtempSync(join(tmpdir(),'rpm-presentation-browser-'));
const base='http://127.0.0.1:5180',env={...process.env,PORT:'5180',RPM_SESSION_DIR:session};
let server:ChildProcess|undefined;
async function start(){
 server=spawn(process.execPath,['--import','tsx','tools/workbench/server/dev.ts'],{cwd:repo,env,stdio:['ignore','pipe','pipe']});
 const child=server;await new Promise<void>((done,fail)=>{
  let output='';const timer=setTimeout(()=>fail(Error('Dynamic server timeout: '+output)),15000);
  const exited=(code:number|null)=>{clearTimeout(timer);fail(Error(`Dynamic server exited ${code}: ${output}`));};
  child.once('exit',exited);child.once('error',e=>{clearTimeout(timer);fail(e);});
  child.stderr!.on('data',data=>{output+=data;});child.stdout!.on('data',data=>{output+=data;if(output.includes('Research workbench:')){clearTimeout(timer);child.off('exit',exited);done();}});
 });
}
async function stop(){if(server&&server.exitCode===null){const child=server;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>fail(Error('Owned dynamic server stop timeout')),10000);child.once('exit',()=>{clearTimeout(timer);done();});child.kill('SIGTERM');});}}
function cli(...args:string[]){const r=spawnSync(process.execPath,['--import','tsx','tools/workbench/server/cli.ts',...args],{cwd:repo,env,encoding:'utf8',maxBuffer:16*1024*1024});expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);}
const readState=()=>JSON.parse(readFileSync(join(session,'state.json'),'utf8'));
test.beforeAll(start);test.afterAll(async()=>{await stop();rmSync(session,{recursive:true,force:true});});
test('CLI presents and captures the acknowledged player view without browser coaching input',async({page,context},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const scene=cli('scene-create','--file',join(repo,'evaluation/fixtures/dynamic-support.scene.json'));
 const source=cli('scene-snapshot',scene.sceneId,'--revision','1','--tick','0');
 const before=cli('status').active;
 await page.goto(base);await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 await expect.poll(()=>cli('views').length).toBe(1);
 const first=cli('views')[0];
 const request=cli('view-request','present','--client',first.clientId,'--revision',String(first.display.revision),'--snapshot',source.snapshotId);
 await expect.poll(()=>cli('view-result',request.id).status).toBe('completed');
 const receipt=cli('view-result',request.id);
 // Saving/listing research records must not invalidate an unchanged displayed frame.
 cli('scene-create','--file',join(repo,'evaluation/fixtures/orientation-support.scene.json'));
 await expect(page.locator('#scene option')).toHaveCount(6);
 expect(cli('views').find((v:any)=>v.clientId===first.clientId).display.revision).toBe(receipt.result.display.revision);
 expect(receipt.result.display.sceneId).toBe(scene.sceneId);expect(receipt.result.display.tick).toBe(0);
 expect(receipt.result.previousSnapshotId).toBeTruthy();
 await expect(page.locator('#situation-self')).toContainText('味方：青');
 await expect(page.locator('canvas')).toHaveAttribute('data-mode','first-person');
 await page.locator('#head').fill('20');await page.locator('#head').dispatchEvent('input');
 await expect.poll(()=>cli('views')[0].display.revision).toBeGreaterThan(receipt.result.display.revision);
 const secondPage=await context.newPage();await secondPage.goto(base);
 await expect.poll(()=>cli('views').length).toBe(2);
 const current=cli('views').find((v:any)=>v.clientId===first.clientId);
 const capture=cli('view-request','capture','--client',first.clientId,'--revision',String(current.display.revision));
 await expect.poll(()=>{const r=cli('view-result',capture.id);return r.status==='failed'?r.error:r.status;}).toBe('completed');
 const saved=cli('view-result',capture.id).result.snapshotId,observed=cli('snapshot-context',saved);
 expect(observed.bundle.self.headYaw).toBeCloseTo(20*Math.PI/180);expect(observed.world).toBeUndefined();
 expect(observed.observationHistory.events.at(-1).trigger).toBe('head-turn');
 expect(cli('status').active).toEqual(before);
 expect(Object.keys(readState().candidates)).toHaveLength(0);
 const stale=spawnSync(process.execPath,['--import','tsx','tools/workbench/server/cli.ts','view-request','capture','--client',first.clientId,'--revision',String(first.display.revision)],{cwd:repo,env,encoding:'utf8'});
 expect(stale.status).not.toBe(0);expect(stale.stderr).toContain('changed');
 await page.screenshot({path:info.outputPath('player-conversation.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(errors).toEqual([]);await secondPage.close();
});

test('oriented attack and defense are presented, captured, replayed and restored with phase and orientation evidence',async({page},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 for(const [role,phase,label] of [['attack','attack-carrier','攻撃・自己保持'],['defense','defense','守備'],['approach','attack-carrier','攻撃・自己保持']]){
  let path=join(repo,`evaluation/fixtures/orientation-${role}.scene.json`);
  if(role==='approach'){const definition=JSON.parse(readFileSync(join(repo,'evaluation/fixtures/dynamic-support.scene.json'),'utf8'));definition.observationMode="oriented";definition.attachedBallFrame="body";definition.ownAttackDirection=1;path=join(session,'orientation-approach.json');writeFileSync(path,JSON.stringify(definition));}
  const scene=cli('scene-create','--file',path);
  const source=cli('scene-snapshot',scene.sceneId,'--revision','1','--tick','0');
  const authored=cli('snapshot-export',source.snapshotId);
  const browserBundle=await page.evaluate(async({world,modulePath})=>{const {sense}=await import(modulePath);return sense(world);},{world:authored.world,modulePath:'/@fs/'+repo+'tools/simulation/src/sensing.ts'});
  expect(browserBundle).toEqual(authored.bundle);
  await expect.poll(()=>cli('views').length).toBe(1);const view=cli('views')[0];
  const req=cli('view-request','present','--client',view.clientId,'--revision',String(view.display.revision),'--snapshot',source.snapshotId);
  await expect.poll(()=>{const r=cli('view-result',req.id);return r.status==='failed'?r.error:r.status;}).toBe('completed');
  await expect(page.locator('#situation-phase')).toContainText(label);
  await expect(page.locator('#situation-orientation')).toContainText('自己の身体 0°');
  const trace=JSON.parse((await page.locator('#trace').textContent())!);expect(trace.situation.phase).toBe(phase);expect(trace.situation.orientations.length).toBeGreaterThan(0);
  if(role==='defense'){expect(trace.evaluation.find((e:any)=>e.action==='support').allowed).toBe(false);expect(['scan','hold']).toContain(trace.intention.action);}
  const saved=cli('view-result',req.id).result.snapshotId,context=cli('snapshot-context',saved);expect(context.bundle.contractVersion).toBe(3);expect(context.bundle.percepts.some((p:any)=>p.bodyOrientation)).toBe(true);
  await page.locator('#head').fill('25');await page.locator('#head').dispatchEvent('input');await expect(page.locator('#situation-orientation')).toContainText('頭の相対角 25°');
  await page.locator('#replay-history').click();await expect(page.locator('#history-report')).toContainText('cognition-0.4.0');
  await page.screenshot({path:info.outputPath(`orientation-${role}.png`),fullPage:true});
  await page.reload();await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');await page.locator('#restore').click();await expect(page.locator('#situation-phase')).toContainText(label);
 }
 expect(Object.keys(readState().candidates)).toHaveLength(0);expect(cli('status').active.A.version).toBe('A0');expect(errors).toEqual([]);
});

test('oriented carrier body turns preserve acquired history through capture and next-scene presentation',async({page})=>{
 test.setTimeout(90000);await page.goto(base);await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 const scene=cli('scene-create','--file',join(repo,'evaluation/fixtures/orientation-attack.scene.json'));
 const source=cli('scene-snapshot',scene.sceneId,'--revision','1','--tick','0');
 const complete=async(id:string)=>{await expect.poll(()=>{const r=cli('view-result',id);return r.status==='failed'?r.error:r.status;}).toBe('completed');return cli('view-result',id);};
 await expect.poll(()=>cli('views').length).toBe(1);let view=cli('views')[0];
 await complete(cli('view-request','present','--client',view.clientId,'--revision',String(view.display.revision),'--snapshot',source.snapshotId).id);
 await page.locator('#step').click();await expect(page.locator('#clock')).toContainText('tick 1/10');
 const canvas=page.locator('canvas');await canvas.focus();await page.keyboard.press('Shift+ArrowLeft');
 await expect(page.locator('#body')).toHaveValue('5');
 await page.locator('#head').fill('137');await page.locator('#head').dispatchEvent('input');
 await canvas.focus();await page.keyboard.press('ArrowLeft');
 await expect(page.locator('#body')).toHaveValue('10');await expect(page.locator('#head')).toHaveValue('137');
 await expect.poll(()=>cli('views')[0].display.tick).toBe(1);view=cli('views')[0];
 const receipt=await complete(cli('view-request','capture','--client',view.clientId,'--revision',String(view.display.revision)).id);
 const captured=readState().snapshots[receipt.result.snapshotId],events=captured.observationHistory.events;
 expect(captured.bundle.time).toBe(.2);expect(captured.world.dynamic.tick).toBe(1);
 expect(events.filter((e:any)=>e.trigger==='body-turn')).toHaveLength(2);
 expect(events.at(-1).bundle).toEqual(captured.bundle);expect(captured.bundle.self.yaw).toBeCloseTo(10*Math.PI/180);
 const active=cli('status').active,candidates=Object.keys(readState().candidates);
 view=cli('views')[0];const next=await complete(cli('view-request','present','--client',view.clientId,'--revision',String(view.display.revision),'--snapshot',source.snapshotId).id);
 expect(readState().snapshots[next.result.previousSnapshotId]).toEqual(captured);
 await expect(page.locator('#clock')).toContainText('tick 0/10');
 expect(cli('status').active).toEqual(active);expect(Object.keys(readState().candidates)).toEqual(candidates);
});

test('motor live stepping, CLI comparison and durable presentation links survive a server restart',async({page},info)=>{
 test.setTimeout(150000);await page.goto(base);await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 const scene=cli('scene-create','--file',join(repo,'evaluation/fixtures/loop-defense.scene.json'));
 const source=cli('scene-snapshot',scene.sceneId,'--revision','1','--tick','0');
 await expect.poll(()=>cli('views').length).toBe(1);let view=cli('views')[0];
 let request=cli('view-request','present','--client',view.clientId,'--revision',String(view.display.revision),'--snapshot',source.snapshotId);
 const complete=async(id:string)=>{await expect.poll(()=>{const r=cli('view-result',id);return r.status==='failed'?r.error:r.status;}).toBe('completed');return cli('view-result',id);};
 await complete(request.id);await expect(page.locator('#situation-phase')).toContainText('抽象接触');
 for(let i=0;i<5;i++)await page.locator('#step').click();
 await page.locator('#head').fill('25');await page.locator('#head').dispatchEvent('input');
 await expect.poll(()=>cli('views')[0].display.tick).toBe(5);view=cli('views')[0];
 request=cli('view-request','capture','--client',view.clientId,'--revision',String(view.display.revision));
 const receipt=await complete(request.id),snapshot=receipt.result.snapshotId;
 const candidate=cli('propose',snapshot,'--feedback','Synthetic bounded-loop comparison');
 const editFile=join(session,'loop-edit.json');writeFileSync(editFile,JSON.stringify({patchA:{mechanisms:{motion:false,intention:true,local:true,tactics:true}},principle:{id:'synthetic-loop',condition:'Synthetic observed motion',criterion:'Compare mechanisms',priority:10,exceptions:'Unsupported mechanics',unknown:'Observe',evidence:'Test fixture'},notes:{rationale:'Remove velocity inference',expectedEffect:'Use last observations',counterexample:'No difference for stationary evidence'}}));cli('edit',candidate.id,'--revision','1','--file',editFile);
 const coached=cli('run',candidate.id,'--revision','2','--steps','4','--mode','preview');expect(coached.results.recorded.before.frames[0].time).toBe(0);
 const experiment=cli('run',candidate.id,'--revision','2','--steps','4','--mode','preview','--start','snapshot');
 expect(experiment.results.recordedInput.source).toBe('captured-snapshot');expect(experiment.results.recorded.after.frames[0].time).toBe(1);expect(experiment.results.recorded.after.frames[2].time).toBe(1.4);
 for(const arm of ['before','after']){view=cli('views')[0];const req=cli('view-request','compare','--client',view.clientId,'--revision',String(view.display.revision),'--experiment',experiment.id,'--arm',arm,'--frame','2');const r=await complete(req.id);expect(r.result.comparison.arm).toBe(arm);expect(r.result.display.tick).toBe(Math.round(experiment.results.recorded[arm].frames[2].time/.2));await expect(page.locator('#comparison-status')).toContainText(arm);}
 await page.screenshot({path:info.outputPath('closed-loop-comparison.png'),fullPage:true});
 view=cli('views')[0];const ret=cli('view-request','return','--client',view.clientId,'--revision',String(view.display.revision));const returned=await complete(ret.id);expect(returned.result.display.tick).toBe(5);
 const log=cli('research-log');expect(log.candidates.find((c:any)=>c.id===candidate.id).sourceSnapshotId).toBe(snapshot);
 const active=cli('status').active;await stop();await start();expect(cli('view-result',ret.id)).toEqual(returned);expect(cli('status').active).toEqual(active);
 expect(cli('export-player').markdown).toContain('memory_next');
});

test('compact view presents from spectator with exact history preservation and recorded wider optics',async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});await page.goto(base);
 await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 await expect(page.locator('#research-tools')).not.toHaveAttribute('open','');
 await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#patch')).toBeHidden();
 await expect(page.locator('#viewport #view')).toBeVisible();await expect(page.locator('#viewport #play')).toBeVisible();
 const bounds=(await page.locator('#viewport').boundingBox())!;expect(bounds.y).toBeLessThan(150);
 await page.locator('#step').click();await page.locator('canvas').focus();await page.keyboard.press('ArrowLeft');
 await expect(page.locator('#head')).toHaveValue('5');
 await openResearchTools(page);const response=page.waitForResponse(r=>r.url().endsWith('/api/snapshot'));
 await page.locator('#snapshot').click();const snapshotResponse=await (await response).json();
 const previous=readState().snapshots[snapshotResponse.id];expect(previous).toBeDefined();
 await page.locator('#research-tools > summary').click();await page.locator('#camera-settings > summary').click();
 const active=cli('status').active,candidates=Object.keys(readState().candidates);
 await page.locator('#view').click();await expect(page.locator('#view')).toHaveText('一人称へ');await expect(page.locator('canvas')).toHaveAttribute('data-mode','spectator');
 const box=(await page.locator('canvas').boundingBox())!;await page.mouse.move(box.x+100,box.y+200);await page.mouse.down();await page.mouse.move(box.x+160,box.y+220);await page.mouse.up();
 await expect.poll(()=>cli('views').find((v:any)=>v.display.mode==='spectator')?.display.mode).toBe('spectator');
 const view=cli('views').find((v:any)=>v.display.mode==='spectator');
 const rejected=spawnSync(process.execPath,['--import','tsx','tools/workbench/server/cli.ts','view-request','capture','--client',view.clientId,'--revision',String(view.display.revision)],{cwd:repo,env,encoding:'utf8'});
 expect(rejected.status).not.toBe(0);expect(rejected.stderr).toContain('player view');
 const definition=JSON.parse(readFileSync(join(repo,'evaluation/fixtures/orientation-attack.scene.json'),'utf8'));definition.horizontalFovDegrees=110;
 const file=join(session,'wide-view.json');writeFileSync(file,JSON.stringify(definition));const scene=cli('scene-create','--file',file),source=cli('scene-snapshot',scene.sceneId,'--revision','1','--tick','0');
 const current=cli('views').find((v:any)=>v.clientId===view.clientId);
 const req=cli('view-request','present','--client',view.clientId,'--revision',String(current.display.revision),'--snapshot',source.snapshotId);
 await expect.poll(()=>{const r=cli('view-result',req.id);return r.status==='failed'?r.error:r.status;},{timeout:15000}).toBe('completed');
 const receipt=cli('view-result',req.id),saved=readState();expect(saved.snapshots[receipt.result.previousSnapshotId]).toEqual(previous);
 expect(saved.snapshots[receipt.result.snapshotId].bundle).toEqual(saved.snapshots[source.snapshotId].bundle);
 expect(saved.snapshots[receipt.result.snapshotId].observationHistory).toEqual(saved.snapshots[source.snapshotId].observationHistory);
 await expect(page.locator('canvas')).toHaveAttribute('data-mode','first-person');await expect(page.locator('#view')).toHaveText('三人称へ');
 expect(Number(await page.locator('canvas').getAttribute('data-horizontal-fov'))).toBeCloseTo(110);
 await expect(page.locator('#field-of-view')).toContainText('110°');await expect(page.locator('canvas')).toHaveAttribute('data-projection','perspective');await expect(page.locator('#look-start')).toBeEnabled();
 expect(cli('status').active).toEqual(active);expect(Object.keys(saved.candidates)).toEqual(candidates);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath('compact-narrow.png'),fullPage:true});
 await page.setViewportSize({width:1280,height:1000});await page.locator('#viewport').scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('compact-desktop.png'),fullPage:true});
});
