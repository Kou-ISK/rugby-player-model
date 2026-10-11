import { test, expect } from '@playwright/test';

test('P2P view lifecycle is bounded and hidden truth cannot change first-person pixels', async ({ page }) => {
  test.setTimeout(90_000); // Software WebGL on a Mac running another research job.
  await page.goto('/');await expect(page.locator('#status')).toContainText('ローカルbridgeに接続');
  const report = await page.evaluate(async () => {
    const viewPath = '/src/ui/view.ts', worldPath = '/src/simulation.ts';
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
  });
  for (const sample of report) {
    expect(sample.after).toEqual(sample.first);expect(sample.hiddenUnchanged).toBe(true);
    expect(sample.idleDraws).toBe(0);expect(sample.remaining).toBe(0);
  }
});
