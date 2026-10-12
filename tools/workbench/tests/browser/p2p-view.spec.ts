import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const moduleRoot='/@fs/'+fileURLToPath(new URL('../../../../',import.meta.url));

test('P2P view lifecycle is bounded and hidden truth cannot change first-person pixels', async ({ page }) => {
  test.setTimeout(90_000); // Software WebGL on a Mac running another research job.
  await page.goto('/');await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
  const report = await page.evaluate(async (moduleRoot) => {
    const viewPath = '/src/rendering/view.ts', worldPath = moduleRoot+'tools/simulation/src/index.ts';
    const { View } = await import(viewPath), { makeWorld } = await import(worldPath);
    const samples = [];
    for (let mount = 0; mount < 3; mount++) {
      const container = document.createElement('div');
      container.style.cssText = 'width:400px;height:300px;position:absolute;left:-500px';document.body.append(container);
      const view = new View(container), world = makeWorld('audio', 7);
      view.draw(world);
      await new Promise(resolve => setTimeout(resolve, 50));
      const first = { ...view.renderer.info.memory };
      for (let cycle = 0; cycle < 2; cycle++) {
        view.draw({ ...world, entities: [] });view.draw(world);
      }
      const after = { ...view.renderer.info.memory };
      world.entities.find((e: { id: string }) => e.id === 'ball').position = { x: 2, z: -10 };
      view.draw(world);const pixels = view.renderer.domElement.toDataURL();
      world.entities.find((e: { id: string }) => e.id === 'ball').position = { x: -20, z: -20 };
      view.draw(world);const hiddenUnchanged = pixels === view.renderer.domElement.toDataURL();
      let idleDraws = 0;const original = view.renderer.render.bind(view.renderer);
      view.renderer.render = (...args: unknown[]) => { idleDraws++;original(...args); };
      await new Promise(resolve => setTimeout(resolve, 100));
      view.dispose();view.dispose();
      samples.push({ first, after, hiddenUnchanged, idleDraws, remaining: container.querySelectorAll('canvas').length });
      container.remove();
    }
    return samples;
  }, moduleRoot);
  for (const sample of report) {
    expect(sample.after).toEqual(sample.first);expect(sample.hiddenUnchanged).toBe(true);
    expect(sample.idleDraws).toBe(0);expect(sample.remaining).toBe(0);
  }
});

test('same actor id updates team/kind/appearance across stored revisions and frees geometry',async({page,request})=>{
 test.setTimeout(90000);
 const definition=JSON.parse(readFileSync(new URL('../../../../evaluation/fixtures/dynamic-support.scene.json',import.meta.url),'utf8'));
 const post=async(path:string,data:unknown)=>{const r=await request.post(path,{headers:{'X-RPM-Local':'1'},data});expect(r.ok()).toBe(true);return r.json();};
 const r1=await post('/api/scene-create',{definition});definition.actors[1].team='red';
 const r2=await post('/api/scene-revise',{id:r1.sceneId,expectedRevision:1,definition});
 [definition.actors[1],definition.actors[2]]=[definition.actors[2],definition.actors[1]];
 const r3=await post('/api/scene-revise',{id:r1.sceneId,expectedRevision:2,definition});
 await page.goto('/');await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
 const result=await page.evaluate(async({r1,r2,r3,moduleRoot})=>{
  const viewPath='/src/rendering/view.ts',simulationPath=moduleRoot+'tools/simulation/src/index.ts',scenePath=moduleRoot+'tools/simulation/src/scene.ts';const {View}=await import(viewPath),{sense}=await import(simulationPath),{sceneWorld}=await import(scenePath);
  const container=()=>{const c=document.createElement('div');c.style.cssText='width:400px;height:300px;position:absolute;left:-500px';document.body.append(c);return c;};
  const c=container(),view=new View(c),one=sceneWorld(r1),two=sceneWorld(r2),three=sceneWorld(r3),id=r1.definition.actors[1].id;
  const color=(obj:any)=>{const values:number[]=[];obj.traverse((o:any)=>{const attr=o.geometry?.getAttribute('color');if(attr)values.push(...Array.from(attr.array) as number[]);});return JSON.stringify(values);};
  const freshFrame=(world:any)=>{const target=container(),fresh=new View(target);fresh.draw(world);const data={pixels:fresh.renderer.domElement.toDataURL(),color:color(fresh.actors.get(id))};fresh.dispose();target.remove();return data;};
  view.draw(one);const firstMemory={...view.renderer.info.memory},bluePixels=view.renderer.domElement.toDataURL(),blueObject=view.actors.get(id),blueColor=color(blueObject);
  let disposed=0;blueObject.traverse((o:any)=>{o.geometry?.addEventListener('dispose',()=>disposed++);});
  view.draw(two);const redPixels=view.renderer.domElement.toDataURL(),redColor=color(view.actors.get(id)),freshRed=freshFrame(two),redObject=view.actors.get(id);
  const relation=sense(two).percepts.find((p:any)=>p.entityId===r2.trackingIds[1]).relation;
  view.draw(three);const appearanceChanged=view.actors.get(id)!==redObject,appearanceMatchesFresh=view.renderer.domElement.toDataURL()===freshFrame(three).pixels;
  view.draw(one);const blueRestored=view.renderer.domElement.toDataURL()===bluePixels,after={...view.renderer.info.memory};
  const restoredObject=view.actors.get(id);one.entities.find((e:any)=>e.id===id).kind='ball';view.draw(one);const kindChanged=view.actors.get(id)!==restoredObject;
  view.dispose();c.remove();
  return {colorsDiffer:blueColor!==redColor,redMatchesFresh:redPixels===freshRed.pixels,redColorMatchesFresh:redColor===freshRed.color,appearanceChanged,appearanceMatchesFresh,blueRestored,relation,disposed,firstMemory,after,kindChanged};
 },{r1,r2,r3,moduleRoot});
 expect(result.colorsDiffer).toBe(true);expect(result.redMatchesFresh).toBe(true);expect(result.redColorMatchesFresh).toBe(true);expect(result.appearanceChanged).toBe(true);expect(result.appearanceMatchesFresh).toBe(true);expect(result.blueRestored).toBe(true);expect(result.relation).toBe('opponent');expect(result.disposed).toBeGreaterThan(0);expect(result.after).toEqual(result.firstMemory);expect(result.kindChanged).toBe(true);
});
