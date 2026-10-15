import type {Snapshot} from './contracts';
import {replay} from './compare';
import {defaultMechanisms} from '../../../models/player/reference/src/loop.js';
import {canonicalJson} from './canonical';
import {validateSnapshot} from './validation';
import {wireHash} from './proposal';
export function mechanismStudy(snapshot:Snapshot,steps=40){
 validateSnapshot(snapshot);
 if(!snapshot.world.runtime)throw new Error('Mechanism study requires scene v3');
 const full=defaultMechanisms(),arms=[['full',full],...Object.keys(full).map(key=>['without-'+key,{...full,[key]:false}]),['without-local-and-tactics',{...full,local:false,tactics:false}] ] as const;
 const runs=arms.map(([name,mechanisms])=>{const rules={...snapshot.rulesA,mechanisms:mechanisms as typeof full},run=replay(snapshot,rules,steps);const last=run.frames.at(-1)!,r=last.runtime!;
 const own=snapshot.world.dynamic!.scene.definition.actors.find(a=>a.id===snapshot.world.dynamic!.scene.definition.controlledPlayerId)!;
 const peers=r.actors.filter(a=>a.id!==own.id&&snapshot.world.dynamic!.scene.definition.actors.find(p=>p.id===a.id)!.team===own.team);
 return {name,rules,run,metrics:{observedThrough:last.time,progress:(last.body.position.z-snapshot.bundle.self.position.z)*snapshot.bundle.context!.ownAttackDirection,releases:r.events.filter(e=>e.kind==='release').length,catches:r.events.filter(e=>e.kind==='catch').length,contacts:r.events.filter(e=>e.kind==='contact').length,intentionSwitches:run.frames.filter(f=>f.trace.loop?.transition==='switched').length,meanTeammateDistance:peers.length?peers.reduce((sum,p)=>sum+Math.hypot(p.body.position.x-last.body.position.x,p.body.position.z-last.body.position.z),0)/peers.length:null}};});
 return {format:'rpm.mechanism-study',version:1,inputSha256:wireHash(snapshot),input:snapshot,arms:runs,contrasts:runs.slice(1).map(r=>({arm:r.name,differentActions:canonicalJson(r.run.frames.map(f=>f.trace.intention))!==canonicalJson(runs[0].run.frames.map(f=>f.trace.intention)),differentOutcome:canonicalJson(r.metrics)!==canonicalJson(runs[0].metrics)})),interpretation:'Development stimuli; mechanism differences are not tactical improvement, human validation or owner adoption.'};
}
