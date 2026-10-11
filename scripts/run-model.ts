import { readFileSync } from 'node:fs';
import { capture } from '../src/research';
import { defaultRulesA, type SceneId, type Snapshot } from '../src/contracts';
import { sense, advance } from '../src/simulation';
import { think } from '../src/cognition';
import { validateSnapshot } from '../src/validation';
const args=process.argv.slice(2);
const flag=(name:string,fallback:string)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
try{
  const scene=flag('--scene','support') as SceneId;
  if(!['support','occluded','audio','heldout'].includes(scene))throw new Error('Unknown scene');
  const snapshot:Snapshot=args.includes('--input')?JSON.parse(readFileSync(flag('--input',''),'utf8')):capture(scene,Number(flag('--seed','42')),defaultRulesA(),'B0');
  validateSnapshot(snapshot);
  if(JSON.stringify(sense(snapshot.world))!==JSON.stringify(snapshot.bundle))throw new Error('Snapshot bundle does not match sensor adapter');
  const steps=Number(flag('--steps','10'));if(!Number.isInteger(steps)||steps<1||steps>1000)throw new Error('steps must be 1–1000');
  let world=structuredClone(snapshot.world),memory=structuredClone(snapshot.memoryBefore);
  const frames=[];
  for(let i=0;i<steps;i++){
    const trace=think(sense(world),memory,snapshot.profile,snapshot.rulesA);
    frames.push({time:world.time,trace});memory=trace.longTermMemory;world=advance(world,trace);
  }
  console.log(JSON.stringify({contractVersion:1,scene:snapshot.scene,seed:snapshot.seed,rulesVersion:snapshot.rulesA.version,frames},null,2));
}catch(e){console.error(e instanceof Error?e.message:String(e));process.exitCode=1;}
