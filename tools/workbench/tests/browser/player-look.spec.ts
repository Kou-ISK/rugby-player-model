import { openResearchTools } from './ui-helpers';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function ready(page: Page) {
  await page.goto('/');await openResearchTools(page);await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
}
async function drag(page: Page, dx: number, shift = false) {
  const canvas = page.locator('canvas');await canvas.scrollIntoViewIfNeeded();
  const b = (await canvas.boundingBox())!,x=b.x+b.width/2,y=b.y+b.height/2;
  await page.mouse.move(x,y);if(shift)await page.keyboard.down('Shift');
  await page.mouse.down();await page.mouse.move(x+dx,y,{steps:5});await page.mouse.up();
  if(shift)await page.keyboard.up('Shift');
}
async function save(page: Page) {
  const response=page.waitForResponse(r=>r.url().endsWith('/api/snapshot'));
  await page.locator('#snapshot').click();const r=await response;expect(r.ok(),await r.text()).toBe(true);
  return r.request().postDataJSON().snapshot;
}

test('view recenter preserves movement and a scene restart can restore the exact prior moment',async({page})=>{
  await ready(page);
  const response=await page.request.post('/api/scene-create',{headers:{'X-RPM-Local':'1'},data:{definition:JSON.parse(readFileSync('evaluation/fixtures/loop-attack.scene.json','utf8'))}});
  expect(response.ok(),await response.text()).toBe(true);const scene=await response.json();
  await expect(page.locator('#scene')).toContainText(scene.sceneId.slice(0,8));
  await page.locator('#scene').selectOption(`${scene.sceneId}:1`);await page.locator('#reset').click();await expect(page.locator('#clock')).toContainText('tick 0/40');
  for(let i=1;i<=7;i++){await page.locator('#step').click();await expect(page.locator('#clock')).toContainText(`tick ${i}/40`);}
  await drag(page,70);const before=await save(page);
  await page.locator('#look-center').click();const centered=await save(page);
  expect(centered.bundle.time).toBe(1.4);expect(centered.world.dynamic.tick).toBe(7);
  expect(centered.bundle.self.position).toEqual(before.bundle.self.position);expect(centered.bundle.self.motor).toEqual(before.bundle.self.motor);
  expect(centered.bundle.self.yaw).toBe(before.bundle.self.yaw);expect(centered.bundle.self.headYaw).toBe(0);
  const resetSave=page.waitForResponse(r=>r.url().endsWith('/api/snapshot'));
  await page.locator('#reset').click();const savedId=(await (await resetSave).json()).id;
  await expect(page.locator('#clock')).toContainText('tick 0/40');await expect(page.locator('#restore-point')).toHaveValue(savedId);
  await page.locator('#restore').click();await expect(page.locator('#clock')).toContainText('tick 7/40');
  expect(await save(page)).toEqual(centered);
});

test('mouse/shift turns record exactly the displayed pose, pause time and replay acquired evidence',async({page})=>{
  await ready(page);const canvas=page.locator('canvas'),clock=await page.locator('#clock').textContent();
  await drag(page,80);expect(Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(-.48);
  await drag(page,60,true);expect(Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(-.84);
  await expect(page.locator('#clock')).toHaveText(clock!);
  const saved=await save(page),events=saved.observationHistory.events;
  expect(saved.bundle.self.headYaw).toBeCloseTo(-.48);expect(saved.bundle.self.yaw).toBeCloseTo(-.36);
  expect(saved.world.body.yaw+saved.world.body.headYaw).toBeCloseTo(Number(await canvas.getAttribute('data-heading')));
  expect(events.at(-1).bundle).toEqual(saved.bundle);
  expect(events.some((e:any)=>e.trigger==='head-turn')).toBe(true);expect(events.some((e:any)=>e.trigger==='body-turn')).toBe(true);
  expect(events.every((e:any)=>e.bundle.time===0)).toBe(true);
  await page.locator('#replay-history').click();await expect(page.locator('#history-report')).toContainText('"trigger": "body-turn"');
  await page.locator('#look-center').click();expect(Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(-.36);
  await canvas.focus();await page.keyboard.press('ArrowLeft');await expect.poll(async()=>Number(await page.locator('#head').inputValue())).toBe(5);
  await page.keyboard.press('r');await expect(page.locator('#head')).toHaveValue('0');
  await page.locator('#feedback').fill('synthetic text');const history=await page.locator('#history-status').textContent();
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('r');await expect(page.locator('#history-status')).toHaveText(history!);
  await page.locator('#view').click();await expect(page.locator('#look-start')).toBeDisabled();
  await canvas.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#history-status')).toHaveText(history!);
  await page.locator('#view').click();await expect(page.locator('#look-start')).toBeEnabled();
});

test('pointer lock uses mouse motion, releases on Escape/blur and supports unavailable-lock fallback',async({page})=>{
  await ready(page);const canvas=page.locator('canvas');
  await page.locator('#look-start').click();await expect(canvas).toHaveAttribute('data-look-mode','locked');
  // Pointer-lock motion is relative to the frozen cursor. Browser-event injection avoids
  // a headless driver's own absolute-cursor bookkeeping, while using the real lock API.
  await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointermove',{movementX:100})));
  await expect.poll(async()=>Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(-.6);
  await page.keyboard.down('Shift');
  await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointermove',{movementX:100,shiftKey:true})));
  await expect.poll(async()=>Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(-1.2);
  await page.keyboard.up('Shift');await page.keyboard.press('Escape');await expect(canvas).toHaveAttribute('data-look-mode','ready');
  const stopped=await canvas.getAttribute('data-heading');
  await page.evaluate(()=>document.dispatchEvent(new PointerEvent('pointermove',{movementX:100})));
  expect(await canvas.getAttribute('data-heading')).toBe(stopped);
  // Exercise window blur even on embedded browsers where pointer lock cannot be granted.
  await canvas.focus();await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('ArrowRight');
  await expect(canvas).toHaveAttribute('data-look-mode','ready');
  await page.evaluate(()=>{HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new DOMException('Synthetic unavailable lock','NotSupportedError'));});
  await page.locator('#look-start').click();await expect(page.locator('#look-status')).toContainText('ドラッグ');
  const before=Number(await canvas.getAttribute('data-heading'));await drag(page,-60);
  expect(Number(await canvas.getAttribute('data-heading'))).toBeCloseTo(before+.36);
});

test('continuous observation archives without losing poses, time or earlier evidence',async({page})=>{
  test.setTimeout(60000);await ready(page);const clock=await page.locator('#clock').textContent();
  for(let batch=0;batch<2;batch++){
    await page.evaluate(()=>{const input=document.querySelector<HTMLInputElement>('#head')!;for(let i=0;i<230;i++){input.value=String(i%2?10:20);input.dispatchEvent(new Event('input'));}});
    await expect.poll(async()=>Number((await page.locator('#history-status').textContent())!.match(/観測 (\d+)/)![1])).toBeLessThan(224);
  }
  await expect(page.locator('#look-start')).toBeEnabled();await expect(page.locator('#clock')).toHaveText(clock!);
  const current=await save(page),state=(await (await page.request.get('/api/state')).json()).state;
  let part=current,total=part.observationHistory.events.length,segments=1;
  while(part.observationPredecessor){
    const parent=state.snapshots[part.observationPredecessor.snapshotId];
    expect(part.observationHistory.initialMemory).toEqual(parent.memoryBefore);
    expect(part.observationHistory.events[0]).toEqual({...parent.observationHistory.events.at(-1),sequence:0,trigger:'initial'});
    total+=parent.observationHistory.events.length-1;part=parent;segments++;
  }
  expect(total).toBe(461);expect(segments).toBe(3);
  expect(current.bundle.self.headYaw).toBeCloseTo(10*Math.PI/180);
  await page.locator('#replay-history').click();await expect(page.locator('#history-report')).toContainText('head-turn');
});

test('a lost save response retries the same archive without reset or duplicate evidence',async({page})=>{
  test.setTimeout(60000);await ready(page);let lost=false;
  await page.route('**/api/snapshot',async route=>{
    const data=route.request().postDataJSON();
    if(data.requestId&&!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();
  });
  await page.evaluate(()=>{const input=document.querySelector<HTMLInputElement>('#head')!;for(let i=0;i<255;i++){input.value=String(i%2?10:20);input.dispatchEvent(new Event('input'));}});
  await expect(page.locator('#history-retry')).toBeVisible();await expect(page.locator('#look-start')).toBeDisabled();
  const before=await save(page),heading=await page.locator('canvas').getAttribute('data-heading');
  const requestsBefore=Object.keys((await (await page.request.get('/api/state')).json()).state.snapshotRequests).length;
  await page.locator('#history-retry').click();await expect(page.locator('#look-start')).toBeEnabled();
  const after=await save(page);expect(after.world).toEqual(before.world);expect(after.memoryBefore).toEqual(before.memoryBefore);
  expect(after.bundle).toEqual(before.bundle);expect(await page.locator('canvas').getAttribute('data-heading')).toBe(heading);
  expect(Object.keys((await (await page.request.get('/api/state')).json()).state.snapshotRequests)).toHaveLength(requestsBefore);
});

test('narrow panel supports turning beyond the neck bound with recorded body follow',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await ready(page);
  await page.locator('#head').fill('137');await page.locator('#head').dispatchEvent('input');
  const history=await page.locator('#history-status').textContent();await drag(page,-90);
  await expect(page.locator('#head')).toHaveValue('137');expect(await page.locator('#history-status').textContent()).not.toBe(history);
  expect(Number(await page.locator('#body').inputValue())).toBe(Math.round(.54*180/Math.PI));
  const recorded=await save(page);expect(recorded.bundle.self.yaw+recorded.bundle.self.headYaw).toBeCloseTo(Number(await page.locator('canvas').getAttribute('data-heading')));
  await page.locator('#look-start').scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('player-look-narrow.png')});
  await page.setViewportSize({width:1280,height:1100});await page.locator('#look-start').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('player-look-desktop.png')});
});
