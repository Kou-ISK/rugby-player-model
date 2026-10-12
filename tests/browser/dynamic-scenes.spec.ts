import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const repo=fileURLToPath(new URL('../../',import.meta.url)),session=mkdtempSync(join(tmpdir(),'rpm-dynamic-browser-'));
const base='http://127.0.0.1:5177',env={...process.env,PORT:'5177',RPM_SESSION_DIR:session};
let server:ChildProcess|undefined;
async function start(){
 server=spawn(process.execPath,['--import','tsx','server/dev.ts'],{cwd:repo,env,stdio:['ignore','pipe','pipe']});
 const child=server;await new Promise<void>((done,fail)=>{
  let output='';const timer=setTimeout(()=>fail(Error('Dynamic server timeout: '+output)),15000);
  const exited=(code:number|null)=>{clearTimeout(timer);fail(Error(`Dynamic server exited ${code}: ${output}`));};
  child.once('exit',exited);child.once('error',e=>{clearTimeout(timer);fail(e);});
  child.stderr!.on('data',data=>{output+=data;});child.stdout!.on('data',data=>{output+=data;if(output.includes('Research workbench:')){clearTimeout(timer);child.off('exit',exited);done();}});
 });
}
async function stop(){if(server&&server.exitCode===null){const child=server;await new Promise<void>((done,fail)=>{const timer=setTimeout(()=>fail(Error('Owned dynamic server stop timeout')),10000);child.once('exit',()=>{clearTimeout(timer);done();});child.kill('SIGTERM');});}}
function cli(...args:string[]){const r=spawnSync(process.execPath,['--import','tsx','server/cli.ts',...args],{cwd:repo,env,encoding:'utf8',maxBuffer:16*1024*1024});expect(r.status,r.stderr).toBe(0);return JSON.parse(r.stdout);}
const readState=()=>JSON.parse(readFileSync(join(session,'state.json'),'utf8'));
test.beforeAll(start);test.afterAll(async()=>{await stop();rmSync(session,{recursive:true,force:true});});
test('T01–T11: synthetic dynamic scene → coaching → preview paths → UI adoption tick → independent undo → process restart',async({page,request},info)=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const scene=cli('scene-create','--file',join(repo,'examples/dynamic-support.scene.json'));
 expect(scene.generationSeed).toBeNull();expect(cli('scenes')).toHaveLength(1);
 await page.goto(base);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 const pixels=await page.evaluate(async scene=>{
   const viewPath='/src/ui/view.ts',scenePath='/src/scene.ts';const {View}=await import(viewPath),{sceneWorld}=await import(scenePath);
   const container=document.createElement('div');container.style.cssText='width:400px;height:300px;position:absolute;left:-500px';document.body.append(container);
   const view=new View(container),world=sceneWorld(scene);view.draw(world);const original=view.renderer.domElement.toDataURL(),heading=view.renderer.domElement.dataset.heading;
   const renamed=structuredClone(scene);renamed.definition.actors[1].id='FUTURE_INTENTION_RENAMED';renamed.definition.calls[0].sourceActorId='FUTURE_INTENTION_RENAMED';renamed.definition.actors[1].motion.keyframes[1].position={x:20,z:20};
   view.draw(sceneWorld(renamed));const unchanged=original===view.renderer.domElement.toDataURL(),headingUnchanged=heading===view.renderer.domElement.dataset.heading;view.dispose();container.remove();return {unchanged,headingUnchanged};
 },scene);expect(pixels).toEqual({unchanged:true,headingUnchanged:true});
 await page.locator('#scene').selectOption(`${scene.sceneId}:1`);await page.locator('#reset').click();await expect(page.locator('#clock')).toContainText('tick 0/30');
 await expect(page.locator('canvas')).toHaveAttribute('data-mode','first-person');
 for(let i=1;i<=3;i++){await page.locator('#step').click();await expect(page.locator('#clock')).toContainText(`tick ${i}/30`);}
 await page.locator('#head').fill('70');const clock=await page.locator('#clock').textContent();
 // Different wall-clock delay must not advance paused simulation time.
 await expect.poll(async()=>{await new Promise(r=>setTimeout(r,250));return page.locator('#clock').textContent();}).toBe(clock);
 await page.locator('#head').fill('0');await page.locator('#from-tick').fill('1');await page.locator('#feedback').fill('SYNTHETIC: いったん止まって確認');
 await page.locator('#propose').click();await expect(page.locator('#candidate-context')).toContainText('tick 1–3');
 const id=await page.locator('#candidates').inputValue(),context=cli('context',id);
 expect(context.coaching).toMatchObject({sceneId:scene.sceneId,revision:1,fromTick:1,toTick:3,playerId:'observer-0'});
 for(const forbidden of ['future-run-left','carrier-author-name','keyframes','"world"'])expect(JSON.stringify(context)).not.toContain(forbidden);
 const edit=JSON.parse(readFileSync(join(repo,'examples/conditional-coaching-edit.json'),'utf8'));edit.patchA={scanBias:2};const editPath=join(session,'edit.json');writeFileSync(editPath,JSON.stringify(edit));
 cli('edit',id,'--file',editPath,'--revision','1');await expect(page.locator('#candidate-context')).toContainText('revision 2');
 await page.locator('#run-preview').click();await expect(page.locator('#status')).toContainText('実験記録を保存');
 const experimentId=await page.locator('#experiments').inputValue(),experiment=cli('experiment',experimentId);
 expect(experiment.results.recorded.before.finalSelf.position).not.toEqual(experiment.results.recorded.after.finalSelf.position);
 await expect(page.locator('#versions')).toHaveText('A0 / B0');
 // Revise future script during a paused r1 run: no silent scene switch or candidate mutation.
 await page.locator('#patch').fill('{"scanBias":1}');
 const next=structuredClone(scene.definition);next.actors[1].motion.keyframes[1].position={x:15,z:20};const scenePath=join(session,'scene.json');writeFileSync(scenePath,JSON.stringify(next));
 cli('scene-revise',scene.sceneId,'--revision','1','--file',scenePath);
 await expect(page.locator('#scene option')).toHaveCount(6);await expect(page.locator('#clock')).toContainText('r1');
 await expect(page.locator('#patch')).toHaveValue('{"scanBias":1}');await page.locator('#patch').fill('{"scanBias":2}');
 const conflict=await request.post(base+'/api/scene-revise',{headers:{'X-RPM-Local':'1'},data:{id:scene.sceneId,expectedRevision:1,definition:next}});expect(conflict.status()).toBe(409);
 const candidateConflict=await request.post(base+'/api/review',{headers:{'X-RPM-Local':'1'},data:{id,target:'A',decision:'approve',actor:'owner',expectedRevision:1}});expect(candidateConflict.status()).toBe(409);
 // Synthetic owner control only: does not represent the real owner's research approval.
 await page.locator('#owner').check();await page.locator('#play').click();await page.locator('#approve-a').click();await expect(page.locator('#versions')).toHaveText('A1 / B0');
 await expect(page.locator('#play')).toHaveText('再生');await expect(page.locator('#status')).toContainText('適用tick');
 const approved=readState(),receipt=approved.events.find((e:any)=>e.application?.toA==='A1').application;
 expect(receipt).toMatchObject({sceneId:scene.sceneId,revision:1,fromA:'A0',toA:'A1',fromB:'B0',toB:'B0'});
 expect(receipt.tick).toBeGreaterThanOrEqual(3);expect(await page.locator('#clock').textContent()).toContain(`tick ${receipt.tick}/30`);
 await page.locator('#owner').check();await page.locator('#approve-b').click();await expect(page.locator('#versions')).toHaveText('A1 / B1');
 await page.locator('#owner').check();await page.locator('#undo-a').click();await expect(page.locator('#versions')).toHaveText('A0 / B1');
 await page.locator('#owner').check();await page.locator('#undo-b').click();await expect(page.locator('#versions')).toHaveText('A0 / B0');
 await page.locator('#snapshot').click();await expect(page.locator('#status')).toContainText('snapshot保存');
 const persisted=readState();await stop();await start();expect(readState()).toEqual(persisted);
 await page.reload();await expect(page.locator('#versions')).toHaveText('A0 / B0');await page.locator('#restore').click();await expect(page.locator('#clock')).toContainText(`tick ${receipt.tick}/30`);
 expect(cli('experiment',experimentId)).toEqual(experiment);expect(cli('context',id).coaching).toEqual(context.coaching);
 await page.locator('#replay-history').click();await expect(page.locator('#history-report')).toContainText('fixed-step-study');
 await page.screenshot({path:info.outputPath('synthetic-dynamic-mac.png'),fullPage:true});
 await info.attach('synthetic-evidence',{body:JSON.stringify({scope:'Mac headless synthetic; not owner acceptance or real B evaluation',sceneId:scene.sceneId,coaching:context.coaching,application:receipt,experimentId,processRestart:true,errors},null,2),contentType:'application/json'});
 expect(errors).toEqual([]);
});
