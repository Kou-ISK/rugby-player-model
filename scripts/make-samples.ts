import { writeFileSync, mkdirSync } from 'node:fs';
import { capture } from '../src/research';
import { defaultRulesA } from '../src/contracts';
mkdirSync('examples',{recursive:true});
for(const [scene,seed] of [['support',42],['occluded',77],['audio',8]] as const){
  writeFileSync(`examples/${scene}-${seed}.snapshot.json`,JSON.stringify(capture(scene,seed,defaultRulesA(),'B0'),null,2)+'\n');
}
console.log('Wrote 3 wholly synthetic snapshots (no private session data).');
