import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,ConflictError} from '../server/store';
import {capture} from '../research';
import {defaultRulesA,finiteMode} from '../../../models/player/reference/src/index.js';
import {canonicalWire} from '../../experiments/src/strict-json';
import {payloadDigest} from '../../experiments/src/proposal';
const scope={confirmation:'explicitly-authorized-synthetic-entries-only' as const,author:'Synthetic software test',rightsBasis:'Explicitly authorized authored synthetic fixtures under MIT',targets:['A','B'] as ('A'|'B')[]};
function create(store:Store){const sid=store.saveSnapshot(capture('support',42,defaultRulesA(),'B0')),c=store.propose(sid,'Synthetic exchange');store.edit(c.id,{scanBias:.4},{id:'principle',condition:'stale observations',criterion:'retain uncertainty',priority:10,exceptions:'urgent pressure',unknown:'seek new evidence',evidence:'engineering hypothesis'},1,{rationale:'Software acceptance',expectedEffect:'Different receiver comparison',counterexample:'Risk remains outside capacity'},finiteMode(1),{text:'# Synthetic B\n\nRetain uncertainty.\n',principles:[]});return c.id;}
test('proposal import is inert/idempotent, reproduction is independent, approvals and undo are A/B separate with revision conflicts',()=>{
 const root=mkdtempSync(join(tmpdir(),'rpm-proposal-synthetic-'));
 try{
  const source=new Store(join(root,'source')),receiver=new Store(join(root,'receiver')),id=create(source),before=source.active();
  const pkg=source.exportProposal(id,2,scope),exportedRevision=source.read().revision;assert.deepEqual(source.active(),before);
  assert.equal(canonicalWire(source.exportProposal(id,2,scope)),canonicalWire(pkg));assert.equal(source.read().revision,exportedRevision);
  const raw=canonicalWire(pkg),result=receiver.validateProposal(raw);assert.equal(result.readiness,'ready');assert.equal(receiver.read().revision,0);
  const p=receiver.importProposal(raw),importedState=canonicalWire(receiver.read());assert.equal(p.status,'import-inert');assert.notEqual(p.localCandidateId,p.proposalId);assert.equal(receiver.active().A.version,'A0');assert.equal(receiver.read().events.length,0);
  receiver.importProposal(raw);assert.equal(canonicalWire(receiver.read()),importedState,'idempotence does not increment session revision');
  const run=receiver.reproduceProposal(p.localCandidateId,p.manifestSha256);assert.equal(run.matches,true);assert.equal(receiver.active().B.version,'B0');
  const review=receiver.researchReview(p.localCandidateId,run.run.id,'restrict','Synthetic fixed-observation software result','No human validity or real owner adoption','Counterexamples remain untested',true);const graph=receiver.evidence();assert(graph.links.some(e=>e.to.id===review.id&&e.relation==='review'));assert(graph.links.some(e=>e.from.id===review.id&&e.relation==='artifact'));const hypothesis=graph.nodes.find(n=>n.ref.kind==='hypothesis')!;const nodes=canonicalWire(graph.nodes);receiver.withdrawEvidence(hypothesis.ref.id,hypothesis.ref.version,'Synthetic withdrawal retains negative evidence');assert.equal(canonicalWire(receiver.evidence().nodes),nodes);assert.equal(receiver.evidence().decisions.length,1);
  const revision=receiver.read().revision,stateBytes=readFileSync(join(receiver.dir,'state.json'),'utf8');
  assert.throws(()=>receiver.reviewProposal(p.localCandidateId,'A','approve','owner',revision-1,p.manifestSha256,run.run.id,'Synthetic approval only'),ConflictError);assert.equal(readFileSync(join(receiver.dir,'state.json'),'utf8'),stateBytes);
  receiver.reviewProposal(p.localCandidateId,'A','approve','owner',revision,p.manifestSha256,run.run.id,'Synthetic approval only');assert.equal(receiver.active().A.version,'A1');assert.equal(receiver.active().B.version,'B0');
  receiver.reviewProposal(p.localCandidateId,'B','approve','owner',receiver.read().revision,p.manifestSha256,run.run.id,'Synthetic B approval only');assert.equal(receiver.active().B.version,'B1');assert.match(receiver.exportB(),/Synthetic B/);
  receiver.undo('A','owner','A1');assert.equal(receiver.active().B.version,'B1');receiver.undo('B','owner','B1');const restart=new Store(receiver.dir);assert.equal(restart.active().A.version,'A0');assert.equal(restart.active().B.version,'B0');assert.equal(restart.read().importedProposals[p.localCandidateId].runs[0].run.resultDigest.sha256,run.run.resultDigest.sha256);assert.equal(restart.read().artifactLinks.length,2);
  const corrupt=structuredClone(pkg);corrupt.manifest.title+=' changed';corrupt.manifest.payloadDigest=payloadDigest(corrupt.manifest);const snapshot=canonicalWire(restart.read());assert.throws(()=>restart.importProposal(canonicalWire(corrupt)),ConflictError);assert.equal(canonicalWire(restart.read()),snapshot);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('B standalone packet/review requires observations but no A experiment or AI connection',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rpm-b-only-'));try{
  const store=new Store(dir),snapshot=capture('support',42,defaultRulesA(),'B0'),cases=[{id:'anonymous-case',bundle:snapshot.bundle,memory:snapshot.memoryBefore,profile:snapshot.profile}];
  const packet=store.standaloneBPacket(cases);assert(!('rulesA' in packet));assert(!('world' in packet));const record=store.saveStandaloneBReview(cases,'B0','manual synthetic test','Hypothetical response','Not validated');assert.equal(record.humanValidated,false);assert.equal(Object.keys(store.read().experiments).length,0);assert.equal(store.read().standaloneBReviews.length,1);assert.throws(()=>store.standaloneBPacket([{...cases[0],world:snapshot.world}]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('stale imported base is 409 and explicit rebase creates a new pending revision without replacing history',()=>{
 const root=mkdtempSync(join(tmpdir(),'rpm-rebase-synthetic-'));try{
  const source=new Store(join(root,'source')),receiver=new Store(join(root,'receiver')),id=create(source),pkg=source.exportProposal(id,2,scope),p=receiver.importProposal(canonicalWire(pkg)),run=receiver.reproduceProposal(p.localCandidateId,p.manifestSha256);
  const own=create(receiver);receiver.review(own,'A','approve','owner',2);const before=canonicalWire(receiver.read());
  assert.throws(()=>receiver.reviewProposal(p.localCandidateId,'A','approve','owner',receiver.read().revision,p.manifestSha256,run.run.id,'Synthetic stale adoption'),ConflictError);assert.equal(canonicalWire(receiver.read()),before);
  const rebased=receiver.rebaseProposal(p.localCandidateId,receiver.read().revision,'Explicit synthetic rebase; review proposed B text and amendment order again',scope);assert.equal(rebased.revision,2);assert.equal(rebased.proposalId,p.proposalId);assert.equal(rebased.decisions.A,'pending');assert.equal(rebased.runs.length,0);assert.equal(receiver.active().A.version,'A1');assert(receiver.read().importedProposals[p.localCandidateId]);
  const nextRun=receiver.reproduceProposal(rebased.localCandidateId,rebased.manifestSha256);assert.equal(nextRun.matches,true);receiver.reviewProposal(rebased.localCandidateId,'A','approve','owner',receiver.read().revision,rebased.manifestSha256,nextRun.run.id,'Synthetic rebased adoption');assert.equal(receiver.active().A.version,'A2');assert.equal(receiver.active().B.version,'B0');
 }finally{rmSync(root,{recursive:true,force:true});}
});
