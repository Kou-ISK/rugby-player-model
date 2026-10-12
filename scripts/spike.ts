import { performance } from 'node:perf_hooks';
import { capture } from '../tools/workbench/research';
import { defaultRulesA } from '../src/contracts';
import { think } from '../models/player/reference/src/cognition';
const scene=capture('support',42,defaultRulesA(),'B0');
const start=performance.now();
let trace;
for(let i=0;i<1000;i++)trace=think(scene.bundle,scene.memoryBefore,scene.profile,scene.rulesA);
console.log(JSON.stringify({runtime:process.version,iterations:1000,elapsedMs:performance.now()-start,decision:trace!.intention.action,contract:1},null,2));
