import type { Page } from '@playwright/test';
/** Advanced workflow tests opt into the same disclosure controls as a researcher. */
export async function openResearchTools(page:Page){
  for(const id of ['research-tools','camera-settings']){
    const panel=page.locator(`#${id}`);
    if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
  }
}
