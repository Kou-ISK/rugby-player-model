import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {Store} from '../../workbench/server/store';
import {captureSceneAt,replay,coachingReplayInput} from '../../workbench/research';
import {think,defaultRulesA,defaultProfile,emptyMemory,validate} from '../../../models/player/reference/src/index.js';
import {sense} from '../../simulation/src/sensing';
import {advance} from '../../simulation/src/body';
import {sceneWorld} from '../../simulation/src/scene';
import {recordedWorld} from '../../simulation/src/playback';
import {senseActor,motorLimits} from '../../simulation/src/skills';
import {canonicalWire} from '../src/strict-json';
import {validateProposal,reproduceProposal} from '../src/proposal';
import {currentEngineDescriptor} from '../../workbench/server/artifact-resolver';
const def=(name='attack')=>JSON.parse(readFileSync(`evaluation/fixtures/loop-${name}.scene.json`,'utf8'));
function fixture(t:any,d=def()){const dir=mkdtempSync('/tmp/rpm-loop-test-');t.after(()=>rmSync(dir,{recursive:true,force:true}));const store=new Store(dir);return {store,scene:store.createScene(d)};}
const cognition=(world:any,memory=emptyMemory(),rules=defaultRulesA())=>think(sense(world),memory,defaultProfile(),rules);
test('loop motor bounds acceleration/turning, all agents sense before movement, and actor update order is immaterial',t=>{
 const {scene}=fixture(t),world=sceneWorld(scene),trace=cognition(world);trace.output=[{channel:'locomotion',status:'supported',value:{x:5,z:0}},{channel:'heading',status:'supported',value:Math.PI/2}];
 const next=advance(world,trace);assert.ok(next.body.motor!.velocity.x<=motorLimits.acceleration*.2+1e-9);assert.ok(next.body.yaw<=motorLimits.turnRate*.2+1e-9);
 assert.ok(next.runtime!.decisions.every(d=>d.trace.sensation.time===0));assert.equal(next.runtime!.decisions.length,3);
 const permuted=structuredClone(world);permuted.runtime!.actors.reverse();const reversed=advance(permuted,trace);
 for(const a of next.runtime!.actors)assert.deepEqual(reversed.runtime!.actors.find(b=>b.id===a.id),a);
 for(const d of next.runtime!.decisions.filter(d=>d.id!=='self')){assert.equal(d.trace.sensation.playerId,scene.trackingIds[scene.definition.actors.findIndex(a=>a.id===d.id)]);assert.equal(JSON.stringify(d.trace.sensation).includes('keyframes'),false);}
});
test('release, flight, reception and interception are outcomes; contact cancels release at the same time',t=>{
 const d=def();d.actors[1].initial.position={x:0,z:-3};d.actors[1].motion={kind:'scripted',keyframes:[{tick:0,...d.actors[1].initial},{tick:40,...d.actors[1].initial}]};d.actors[2].initial.position={x:25,z:25};
 const {scene}=fixture(t,d);let w=sceneWorld(scene),tr=cognition(w);tr.intention={action:'pass',score:1,allowed:true,reason:'Synthetic motor request'};tr.output=[{channel:'pass',status:'supported',value:{x:0,z:-3}}];w=advance(w,tr);assert.equal(w.runtime!.ball.mode,'flight');assert.ok(w.runtime!.events.some(e=>e.kind==='release'));
 tr=cognition(w);tr.output=[];w=advance(w,tr);assert.equal(w.runtime!.ball.carrierId,'support');assert.ok(w.runtime!.events.some(e=>e.kind==='catch'));
 const blocked=structuredClone(d);blocked.actors[2].initial={position:{x:0,z:.8},yaw:Math.PI};const contact=fixture(t,blocked);let cw=sceneWorld(contact.scene),ct=cognition(cw);ct.intention={action:'pass',score:1,allowed:true,reason:'Synthetic motor request'};ct.output=[{channel:'pass',status:'supported',value:{x:0,z:-3}}];cw=advance(cw,ct);assert.ok(cw.runtime!.events.some(e=>e.kind==='contact'));assert.ok(!cw.runtime!.events.some(e=>e.kind==='release'));
 const intercept=structuredClone(d);intercept.actors[1].team='red';const intercepted=fixture(t,intercept);let iw=sceneWorld(intercepted.scene),it=cognition(iw);it.intention={action:'pass',score:1,allowed:true,reason:'Synthetic motor request'};it.output=[{channel:'pass',status:'supported',value:{x:0,z:-3}}];iw=advance(iw,it);it=cognition(iw);it.output=[];iw=advance(iw,it);assert.equal(iw.runtime!.ball.carrierId,'support');assert.equal(iw.body.hasBall,false);
});
test('motion uses acquired time-separated observations, intent retains/reviews plans, and hidden changes cannot alter input',t=>{
 const {scene}=fixture(t,def('defense'));let w=sceneWorld(scene),tr=cognition(w),memory=tr.longTermMemory;validate('Trace',tr);
 const next=advance(w,tr),later=cognition(next,memory);assert.ok(later.loop!.estimates.some(e=>e.method==='two-observations'));assert.equal(later.longTermMemory.intent!.startedAt,tr.longTermMemory.intent!.startedAt);
 const ablated=cognition(next,memory,{...defaultRulesA(),mechanisms:{motion:false,intention:false,local:false,tactics:false}});assert.ok(ablated.loop!.estimates.every(e=>e.method==='last-observation'));assert.equal(ablated.loop!.transition,'switched');assert.deepEqual(ablated.loop!.goalConstraints,[]);
 const hidden=structuredClone(w);hidden.runtime!.actors.find(a=>a.id==='support')!.memory={episodes:[],lastTime:0,intent:{action:'tackle',startedAt:0,reviewAt:1,goal:{x:30,z:20},phase:'defense',basis:[]}};assert.deepEqual(sense(w),sense(hidden));assert.deepEqual(cognition(w),cognition(hidden));
 assert.equal(senseActor(w,'defender').context!.ownAttackDirection,-1);
});
test('v3 snapshot, coaching rewind, runtime comparison frames and portable A/B proposal reproduction share one pipeline',t=>{
 const {scene,store}=fixture(t),snapshot=captureSceneAt(scene,defaultRulesA(),'B0',3),sid=store.saveSnapshot(snapshot),candidate=store.propose(sid,'SYNTHETIC mechanism comparison',undefined,{fromTick:1,toTick:3,playerId:'observer-0'});
 const principle={id:'test',condition:'Uncertain approach',criterion:'Review evidence',priority:10,exceptions:'Unsupported mechanics',unknown:'Observe',evidence:'Synthetic test'};
 store.edit(candidate.id,{mechanisms:{motion:false,intention:false,local:true,tactics:true}},principle,1,{rationale:'Ablation',expectedEffect:'Remove velocity estimates and plan persistence',counterexample:'Static evidence should not invent motion'});
 const experiment=store.runExperiment(candidate.id,2,3,'preview');assert.ok(experiment.results.recorded.after.frames[0].runtime);
 const input=coachingReplayInput(snapshot,candidate.coaching);assert.equal(input.snapshot.world.dynamic!.tick,1);
 const run=replay(input.snapshot,input.snapshot.rulesA,3);for(const frame of run.frames)assert.deepEqual(recordedWorld(input.snapshot,frame).runtime,frame.runtime);
 const pkg=store.exportProposal(candidate.id,2,{confirmation:'explicitly-authorized-synthetic-entries-only',author:'Test',rightsBasis:'Authored synthetic fixture',targets:['A','B']});const v=validateProposal(canonicalWire(pkg),currentEngineDescriptor());assert.equal(reproduceProposal(v).resultDigest.sha256,v.read<any>(pkg.manifest.runRefs[0]).resultDigest.sha256);
 assert.equal(store.active().A.version,'A0');assert.equal(store.active().B.version,'B0');
});

test('mechanism arms reproduce, keep body capabilities fixed and separate evaluator outcomes from player inputs',async t=>{
 const {mechanismStudy}=await import('../src/mechanism-study');const {scene}=fixture(t,def('defense')),snapshot=captureSceneAt(scene,defaultRulesA(),'B0',0);
 const a=mechanismStudy(snapshot,8),b=mechanismStudy(snapshot,8);assert.deepEqual(a,b);assert.equal(a.arms.length,6);
 assert.ok(a.arms.every(r=>r.run.frames.every(f=>f.trace.loop!.ability.maxSpeed===snapshot.profile.ability.maxSpeed)));
 assert.ok(a.arms.find(r=>r.name==='without-motion')!.run.frames.every(f=>f.trace.loop!.estimates.every(e=>e.method==='last-observation')));
 assert.ok(a.arms.find(r=>r.name==='full')!.run.frames.some(f=>f.trace.loop!.estimates.some(e=>e.method==='two-observations')));
 assert.ok(a.arms.every(r=>r.metrics.observedThrough===r.run.frames.at(-1)!.time));
 assert.ok(a.contrasts.some(c=>c.differentActions||c.differentOutcome));
 const fast=structuredClone(snapshot);fast.profile.ability.maxSpeed=1;const limited=replay(fast,fast.rulesA,8);assert.ok(limited.frames.every(f=>Math.hypot(f.body.motor!.velocity.x,f.body.motor!.velocity.z)<=1+1e-8));
});
