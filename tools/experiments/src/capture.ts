import { sceneWorld, type SceneRevision } from '../../simulation/src/scene';
import { makeWorld } from '../../simulation/src/world';
import { sense } from '../../simulation/src/sensing';
import { advance } from '../../simulation/src/body';
import { defaultProfile, emptyMemory } from '../../../models/player/reference/src/defaults.js';
import { think } from '../../../models/player/reference/src/cognition.js';
import type { RulesA } from '../../../models/player/reference/src/contracts.js';
import type { SceneId } from '../../simulation/src/contracts';
import type { Snapshot } from './contracts';
import { newHistory, appendObservation } from './history';
export function capture(scene: SceneId, seed: number, rulesA: RulesA, rulesBVersion: string): Snapshot {
  const world = makeWorld(scene, seed);
  return { contractVersion: 1, scene, seed, world, bundle: sense(world), memoryBefore: emptyMemory(), profile: defaultProfile(), rulesA, rulesBVersion };
}
export function captureScene(scene:SceneRevision,rulesA:RulesA,rulesBVersion:string):Snapshot {
  const world=sceneWorld(scene);return {contractVersion:2,scene:'dynamic',seed:scene.generationSeed,world,bundle:sense(world),memoryBefore:emptyMemory(),profile:defaultProfile(),rulesA,rulesBVersion};
}
export function captureSceneAt(scene:SceneRevision,rulesA:RulesA,rulesBVersion:string,tick=0):Snapshot {
  if(!Number.isInteger(tick)||tick<0||tick>scene.definition.durationTicks)throw new Error('Tick outside scene');
  const snapshot=captureScene(scene,rulesA,rulesBVersion),history=newHistory(snapshot.memoryBefore,snapshot.world);
  for(let i=0;i<=tick;i++){
    snapshot.bundle=sense(snapshot.world);appendObservation(history,snapshot.bundle,snapshot.profile,rulesA,i?'step':'initial');
    if(i<tick){const trace=think(snapshot.bundle,snapshot.memoryBefore,snapshot.profile,rulesA);snapshot.memoryBefore=trace.longTermMemory;snapshot.world=advance(snapshot.world,trace);}
  }
  snapshot.observationHistory=history;return snapshot;
}
