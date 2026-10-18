import { importSnapshot, importCandidate } from '../../experiments/src/import';
import type {Command} from './presentation';
import {validateBSelection,makeStandaloneBPacket,fixedBDocument,validateStandaloneBPacket,validateBAssessment,standaloneInputHash} from '../../experiments/src/judgment-evaluation';
import type {World} from '../../simulation/src/contracts';
import {emptyGraph,indexProposal,indexRun,addReview,withdraw,validateGraph,type EvidenceGraph} from '../../experiments/src/lineage';
import { buildProposal,type ExportScope,type ProposalCandidate } from '../../experiments/src/proposal-export';
import { validateProposal,reproduceProposal,proposalReviewMaterial,selectSemantic,wireHash,freshId,payloadDigest,type ProposalCase,type ProposalRun,type AArtifact,type BArtifact,type Config } from '../../experiments/src/proposal';
import { canonicalWire } from '../../experiments/src/strict-json';
import type { ImportedProposal,PublicExport,ArtifactLink,StandaloneBReview } from '../../experiments/src/proposal-records';
import { replacementB,judgmentMarkdown,textHash,type BReplacement } from '../../experiments/src/judgment';
import { execute, finiteMode, importExecutionMode, baselineMode, unlimitedMode, validateMode, type ExecutionMode } from '../../../models/player/reference/src/index.js';
import { engineFingerprint as fingerprint, engineFingerprintFormat, readJudgmentBaseline, repositoryRoot, currentEngineDescriptor, playerArtifactFingerprint } from './artifact-resolver';
import { importSceneDefinition, importSceneRevision, validateSceneDefinition, sceneContent, sceneWorld, sceneRef, type SceneRevision } from '../../simulation/src/scene';
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultRulesA } from '../../../models/player/reference/src/defaults.js';
import type { RulesA } from '../../../models/player/reference/src/contracts.js';
import type { Candidate, Principle, RulesB, Snapshot, StudyNotes, CoachingWindow, ApplicationPoint } from '../../experiments/src/contracts';
import { validate, validateSnapshot, validateEvidence } from '../../experiments/src/validation';
import { candidateDraft, compare, regressionCompare, experimentRun, replay } from '../research';
import { sense } from '../../simulation/src/index';
import { assertSnapshotHistory } from '../../experiments/src/history';
import type { Experiment, BReview, BMaterial, ReplayResult } from '../../experiments/src/records';
import { canonical, digest, conditionDigest, stimulusDigest, exposureReasons, EXPOSURE_POLICY, checkEvaluationDraft, anonymizeCases, type FrozenEvaluation, type BArm, type CaseGroup } from '../../experiments/src/evaluation';
const loadedFingerprint = fingerprint();
// Opaque slot identities are stable across copies/renames. Never hash author text or future paths.
// This also keeps A's existing ID tie-breaks reproducible across independent scene imports.
const trackingId=(index:number)=>{const h=createHash('sha256').update(`rpm-observation-slot-v1:${index}`).digest('hex');return `track-${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function gitProvenance(){
  const options={cwd:fileURLToPath(new URL('../../../',import.meta.url)),encoding:'utf8' as const,timeout:2000,stdio:['ignore','pipe','ignore'] as ['ignore','pipe','ignore']};
  try{return {gitCommit:execFileSync('git',['rev-parse','HEAD'],options).trim(),gitDirty:!!execFileSync('git',['status','--porcelain'],options).trim()};}
  catch{return {gitCommit:null,gitDirty:null};}
}
export type Target = 'A' | 'B';
type Event = { id: string; at: string; action: string; target?: Target; candidateId?: string; actor: string; version?: string;
  candidateRevision?: number; reviewedContent?: { patchA: Candidate['patchA']; principle: Principle; notes?: StudyNotes; executionMode?:ExecutionMode; replacementB?:BReplacement }; confirmedVersion?: string; reason?: string; parentCandidateId?: string; sceneId?:string; sceneRevision?:number; application?:ApplicationPoint };
export class ConflictError extends Error { readonly statusCode = 409; }
function checkRevision(c: Candidate, expected: number) {
  if (!Number.isInteger(expected) || expected < 1) throw new Error('expectedRevision is required');
  if (c.revision !== expected) throw new ConflictError('Candidate revision changed; reload and confirm the displayed content again');
}
export type SceneComparison = {id:string;at:string;kind:'changed-scene-fixed-rules';sameConditions:false;rulesA:RulesA;before:{snapshotId:string;snapshot:Snapshot;run:ReplayResult};after:{snapshotId:string;snapshot:Snapshot;run:ReplayResult}};
export type ModeStudy={format?:'rpm.mode-study';version?:2;inputHashFormat?:'rpm-canonical-json-v1';inputManifest?:{protocol:'fixed-observation-three-arm-v1';modelArtifact:{id:string;version:2;sha256:string};bundleSha256:string;memorySha256:string;profileSha256:string;rulesSha256:string;modeSha256:string[];engineFingerprintFormat:string;time:number;playerId:string;scene:string;seed:number|null};id:string;at:string;candidateId:string;candidateRevision:number;engineFingerprint:string;inputSha256:string;arms:{name:string;result:ReturnType<typeof execute>}[]};
export type State = { snapshotRequests?:Record<string,{snapshotId:string;sha256:string}>; presentationReceipts?:Record<string,Command>;snapshotLinks?:Record<string,string>; sessionDeclaration?:{purpose:'synthetic-tutorial';createdAt:string}; evidenceGraph:EvidenceGraph; importedProposals:Record<string,ImportedProposal>; publicExports:PublicExport[]; artifactLinks:ArtifactLink[]; standaloneBReviews:StandaloneBReview[]; modesA:Record<string,ExecutionMode>; modeStudies:Record<string,ModeStudy>; sceneComparisons:Record<string,SceneComparison>; scenes:Record<string,SceneRevision[]>; format: 2; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string, Candidate>;
  versionsA: Record<string, RulesA>; versionsB: Record<string, RulesB>; activeA: string[]; activeB: string[]; events: Event[];
  experiments: Record<string, Experiment>; bReviews: BReview[]; evaluationSets:Record<string,FrozenEvaluation> };
const initial = (): State => ({ evidenceGraph:emptyGraph(),importedProposals:{},publicExports:[],artifactLinks:[],standaloneBReviews:[],modesA:{},modeStudies:{},sceneComparisons:{}, scenes:{}, format: 2, revision: 0, snapshots: {}, candidates: {}, versionsA: { A0: defaultRulesA() },
  versionsB: { B0: { version: 'B0', principles: [] } }, activeA: ['A0'], activeB: ['B0'], events: [], experiments: {}, bReviews: [], evaluationSets:{} });
export class Store {
  readonly dir: string;
  constructor(directory = process.env.RPM_SESSION_DIR || '.rpm') { this.dir = resolve(directory); mkdirSync(this.dir, { recursive: true, mode: 0o700 }); }
  read(): State {
    const file = join(this.dir, 'state.json');
    const state: State = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : initial();
    if (![1,2].includes(state.format) || !Number.isInteger(state.revision)) throw new Error('Unsupported/corrupt session format');
    // Archived sessions retain their data. Historical events are not retroactively attested.
    for (const c of Object.values(state.candidates)) c.revision ??= 1;
    state.evidenceGraph??=emptyGraph();state.importedProposals??={};state.publicExports??=[];state.artifactLinks??=[];state.standaloneBReviews??=[];state.modesA??={};state.modeStudies??={};state.experiments ??= {};state.bReviews ??= [];state.evaluationSets??={};state.scenes??={};state.sceneComparisons??={};
    state.format=2;return state;
  }
  private transact<T>(fn: (s: State) => T): T {
    const lock = join(this.dir, '.lock');
    try { mkdirSync(lock); } catch { throw new Error('Session busy; retry. After a crashed writer, follow docs/LOCAL_BRIDGE.md.'); }
    try {
      const s = this.read(), previous=JSON.stringify(s), result = fn(s);if(JSON.stringify(s)===previous)return result;s.format=2;s.revision++;
      const temp = join(this.dir, `state-${randomUUID()}.tmp`);
      writeFileSync(temp, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 }); renameSync(temp, join(this.dir, 'state.json'));
      return result;
    } finally { rmSync(lock, { recursive: true }); }
  }
  initializeSynthetic(){return this.transact(s=>{if(existsSync(join(this.dir,'state.json')))throw new Error('Session already exists; do not relabel or overwrite it');s.sessionDeclaration={purpose:'synthetic-tutorial',createdAt:new Date().toISOString()};return {directory:this.dir,purpose:s.sessionDeclaration.purpose};});}
  /** Current runtime view. Stored evidence/results remain unchanged in read(). */
  current(s=this.read()):State {
    return {...s,scenes:Object.fromEntries(Object.entries(s.scenes).map(([id,versions])=>[id,versions.map(importSceneRevision)])),
      snapshots:Object.fromEntries(Object.entries(s.snapshots).map(([id,v])=>[id,importSnapshot(v)])),
      candidates:Object.fromEntries(Object.entries(s.candidates).map(([id,v])=>[id,importCandidate(v)])),
      modesA:Object.fromEntries(Object.entries(s.modesA).map(([id,v])=>[id,importExecutionMode(v)]))};
  }
  getSnapshot(id:string,s=this.read()):Snapshot {const v=s.snapshots[id];if(!v)throw new Error('Unknown snapshot');return importSnapshot(v);}
  getCandidate(id:string,s=this.read()):Candidate {const v=s.candidates[id];if(!v)throw new Error('Unknown candidate');return importCandidate(v);}
  active(s = this.read()) { return { A: s.versionsA[s.activeA.at(-1)!], executionMode:importExecutionMode(s.modesA[s.activeA.at(-1)!]??baselineMode()), B: s.versionsB[s.activeB.at(-1)!] }; }
  getScene(id:string, revision:number):SceneRevision {
    const scene=this.read().scenes[id]?.find(x=>x.revision===revision);if(!scene)throw new Error('Unknown scene revision');return importSceneRevision(scene);
  }
  createScene(definition:unknown,generationSeed:number|null=null):SceneRevision {
    definition=importSceneDefinition(definition);validateSceneDefinition(definition);this.checkSeed(generationSeed);
    return this.transact(s=>{
      const scene:SceneRevision={sceneId:randomUUID(),revision:1,contentHash:digest(sceneContent(definition)),definition:structuredClone(definition),generationSeed,
        trackingIds:definition.actors.map((_,i)=>trackingId(i)),createdAt:new Date().toISOString()};
      s.scenes[scene.sceneId]=[scene];s.events.push({id:randomUUID(),at:scene.createdAt,action:'scene-create',actor:'local',sceneId:scene.sceneId,sceneRevision:1});return scene;
    });
  }
  reviseScene(id:string,expectedRevision:number,definition:unknown):SceneRevision {
    definition=importSceneDefinition(definition);validateSceneDefinition(definition);
    return this.transact(s=>{
      const versions=s.scenes[id],previous=versions?.at(-1);if(!previous)throw new Error('Unknown scene');
      if(previous.revision!==expectedRevision)throw new ConflictError('Scene revision conflict; reread the authoring scene');
      const next:SceneRevision={...previous,revision:previous.revision+1,definition:structuredClone(definition),contentHash:digest(sceneContent(definition)),
        trackingIds:definition.actors.map((_,i)=>previous.trackingIds[i]??trackingId(i)),createdAt:new Date().toISOString()};
      versions.push(next);s.events.push({id:randomUUID(),at:next.createdAt,action:'scene-revise',actor:'local',sceneId:id,sceneRevision:next.revision});return next;
    });
  }
  private checkSeed(seed:number|null){if(seed!==null&&(!Number.isInteger(seed)||seed<0||seed>0xffffffff))throw new Error('seed must be uint32 or null');}
  private assertSceneBinding(snapshot:Snapshot,s=this.read()){
    const r=snapshot.world.dynamic?.scene;if(!r)return;
    const stored=s.scenes[r.sceneId]?.find(x=>x.revision===r.revision);
    if(!stored||canonical(importSceneRevision(stored))!==canonical(importSceneRevision(r)))throw new Error('Snapshot must use an imported immutable scene revision');
  }
  recordApplication(point:ApplicationPoint){
    validate('ApplicationPoint',point);
    return this.transact(s=>{
      const existing=s.events.find(e=>e.application?.receiptId===point.receiptId);
      if(existing){if(canonical(existing.application)!==canonical(point))throw new ConflictError('Application receipt conflict');return existing;}
      const scene=s.scenes[point.sceneId]?.find(r=>r.revision===point.revision);
      if(!scene||importSceneRevision(scene).contentHash!==point.contentHash||point.tick>scene.definition.durationTicks||!s.versionsA[point.fromA]||!s.versionsA[point.toA]||!s.versionsB[point.fromB]||!s.versionsB[point.toB])throw new Error('Invalid application point');
      const event:Event={id:randomUUID(),at:new Date().toISOString(),action:'apply-at-tick',actor:'ui-self-reported',application:structuredClone(point)};
      s.events.push(event);return event;
    });
  }
  compareScenes(beforeId:string,afterId:string,rulesVersion:string,steps:number){
    return this.transact(s=>{
      const before=this.getSnapshot(beforeId,s),after=this.getSnapshot(afterId,s),rules=s.versionsA[rulesVersion];
      if(!before?.world.dynamic||!after?.world.dynamic||!rules)throw new Error('Two dynamic snapshots and a known A version are required');
      if(canonical(before.profile)!==canonical(after.profile))throw new Error('Scene comparison must keep the same profile');
      this.assertSceneBinding(before,s);this.assertSceneBinding(after,s);
      const result:SceneComparison={id:randomUUID(),at:new Date().toISOString(),kind:'changed-scene-fixed-rules',sameConditions:false,rulesA:structuredClone(rules),
        before:{snapshotId:beforeId,snapshot:structuredClone(before),run:replay(before,rules,steps,undefined,s.modesA[rules.version]??baselineMode())},after:{snapshotId:afterId,snapshot:structuredClone(after),run:replay(after,rules,steps,undefined,s.modesA[rules.version]??baselineMode())}};
      s.sceneComparisons[result.id]=result;return result;
    });
  }
  recordPresentation(receipt:Command){
    if(receipt.status!=='completed'||!receipt.result)throw new Error('Only acknowledged presentations are durable');
    return this.transact(s=>{s.presentationReceipts??={};const old=s.presentationReceipts[receipt.id];if(old){if(canonical(old)!==canonical(receipt))throw new Error('Presentation receipt conflict');return old;}s.presentationReceipts[receipt.id]=structuredClone(receipt);return receipt;});
  }
  researchLog(){const s=this.read();return {observationContinuations:Object.entries(s.snapshots).filter(([,v])=>v.observationPredecessor).map(([id,v])=>({snapshotId:id,predecessor:v.observationPredecessor,fromTime:v.observationHistory?.events[0]?.bundle.time,toTime:v.bundle.time})),presentations:s.presentationReceipts??{},candidates:Object.values(s.candidates).map(c=>({id:c.id,sourceSnapshotId:s.snapshotLinks?.[c.id]??null,parentCandidateId:c.parentCandidateId??null,revision:c.revision,coaching:c.coaching,decisions:c.decisions,experiments:Object.values(s.experiments).filter(e=>e.candidateId===c.id).map(e=>({id:e.id,candidateRevision:e.candidateRevision,mode:e.mode}))})),humanValidation:'Not inferred from UI acknowledgement or synthetic tests'};}
  private assertObservationPredecessor(snapshot:Snapshot,s:State){
    const ref=snapshot.observationPredecessor;if(!ref)return;
    const source=s.snapshots[ref.snapshotId],history=snapshot.observationHistory;
    if(!source||digest(source)!==ref.sha256)throw new Error('Unknown or changed observation predecessor');
    const previous=importSnapshot(source);
    if(!history?.events.length||canonical(snapshot.observationAnchor)!==canonical(previous.world))throw new Error('Unknown or changed observation predecessor');
    const last=previous.observationHistory?.events.at(-1);
    if(!last||canonical(history.initialMemory)!==canonical(previous.memoryBefore)||canonical(history.events[0])!==canonical({...last,sequence:0,trigger:'initial'}))throw new Error('Observation continuation boundary mismatch');
  }
  saveSnapshot(snapshot: unknown,requestId?:string): string {
    validateSnapshot(snapshot);
    assertSnapshotHistory(snapshot);this.assertSceneBinding(snapshot);
    if (canonical(sense(snapshot.world)) !== canonical(snapshot.bundle)) throw new Error('Snapshot perception does not match sensor adapter');
    if(requestId!==undefined&&!/^[a-zA-Z0-9-]{1,128}$/.test(requestId))throw new Error('Invalid snapshot request ID');
    return this.transact(s => {
      this.assertObservationPredecessor(snapshot,s);
      const sha256=digest(snapshot),previous=requestId?s.snapshotRequests?.[requestId]:undefined;
      if(previous){if(previous.sha256!==sha256)throw new ConflictError('Snapshot request ID reused with different content');return previous.snapshotId;}
      const id=randomUUID();s.snapshots[id]=structuredClone(snapshot);
      if(requestId){s.snapshotRequests??={};s.snapshotRequests[requestId]={snapshotId:id,sha256};}
      return id;
    });
  }
  freezeEvaluation(draft:unknown):FrozenEvaluation {
    checkEvaluationDraft(draft);for(const c of draft.cases)this.assertSceneBinding(c.snapshot);
    return this.transact(s=>{
      if(draft.cases.some(c=>Object.values(s.candidates).some(candidate=>exposureReasons(c.snapshot,candidate.context).length)))throw new Error('Evaluation observations were already used for coaching in this session');
      const set:FrozenEvaluation={id:randomUUID(),at:new Date().toISOString(),frozenAtRevision:s.revision,
        digest:digest(draft),profile:structuredClone(draft.cases[0].snapshot.profile),draft:structuredClone(draft),novelty:'owner-declared-not-independently-verified',stimuli:draft.cases.map(c=>({stimulusDigest:stimulusDigest(c.snapshot),observationDigest:conditionDigest(c.snapshot)}))};
      s.evaluationSets[set.id]=set;return set;
    });
  }
  propose(snapshotId: string, feedback: string, evaluationSetId?:string, window?:{fromTick:number;toTick:number;playerId:string}): Candidate {
    if (!feedback.trim() || feedback.length > 4000) throw new Error('Feedback must be 1–4000 characters');
    return this.transact(s => {
      const context = this.getSnapshot(snapshotId,s);
      if(evaluationSetId){
        const set=s.evaluationSets[evaluationSetId];if(!set)throw new Error('Freeze evaluation conditions before proposing feedback');
        if(canonical(set.profile)!==canonical(context.profile))throw new Error('Candidate profile differs from the frozen evaluation profile');
        if(set.draft.cases.some(c=>exposureReasons(c.snapshot,context).length))throw new Error('Frozen evaluation evidence cannot be used as the coaching scene');
      }
      const c = candidateDraft(randomUUID(), feedback, context);
      s.snapshotLinks??={};s.snapshotLinks[c.id]=snapshotId;
      if(context.world.dynamic){
        const d=context.world.dynamic,firstTick=Math.round((context.observationHistory?.events[0].bundle.time??context.bundle.time)/.2);
        c.coaching={...sceneRef(d.scene),playerId:'observer-0',fromTick:window?.fromTick??firstTick,toTick:window?.toTick??d.tick};
        validate('CoachingWindow',c.coaching);
        if((window&&window.playerId!=='observer-0')||c.coaching.toTick!==d.tick||c.coaching.fromTick<firstTick||c.coaching.fromTick>c.coaching.toTick)throw new Error('Coaching must pin the observed player and an acquired interval ending at the snapshot tick');
      }else if(window)throw new Error('Tick windows require a dynamic scene');if(evaluationSetId)c.evaluationSetId=evaluationSetId;s.candidates[c.id] = c;
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: 'propose', candidateId: c.id, actor: 'local' }); return c;
    });
  }
  edit(id: string, patchA: Candidate['patchA'], principle: Principle, expectedRevision: number, notes?: StudyNotes,executionMode?:ExecutionMode,replaceB?:{text:string;principles:Principle[]}|null): Candidate {
    if(executionMode!==undefined)validateMode(executionMode);
    validate('PatchA', patchA); validate('Principle', principle);
    if(notes!==undefined)validate('StudyNotes',notes);
    return this.transact(s => {
      const c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
      checkRevision(c, expectedRevision);
      if (c.decisions.A !== 'pending' || c.decisions.B !== 'pending') throw new Error('Reviewed candidate is immutable; create another candidate');
      c.patchA = structuredClone(patchA); c.principle = structuredClone(principle); c.revision++;
      if(replaceB===null)delete c.replacementB;else if(replaceB!==undefined)c.replacementB=replacementB(replaceB,c.replacementB);
      if(notes)c.notes=structuredClone(notes);if(executionMode)c.executionMode=structuredClone(executionMode);
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: 'edit', candidateId: id, candidateRevision: c.revision, actor: 'local' }); return c;
    });
  }
  review(id: string, target: Target, decision: 'approve' | 'reject' | 'return', actor: string, expectedRevision: number, reason?: string): State {
    if (actor !== 'owner') throw new Error('Explicit owner approval required (--by owner)');
    if (!['A','B'].includes(target) || !['approve','reject','return'].includes(decision)) throw new Error('Invalid review');
    if(reason!==undefined&&(typeof reason!=='string'||reason.length>4000))throw new Error('Review reason must be a string up to 4000 characters');
    if(decision==='return' && !reason?.trim())throw new Error('Return requires a reason (1–4000 characters)');
    return this.transact(s => {
      const c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
      checkRevision(c, expectedRevision);
      if (c.decisions[target] !== 'pending') throw new Error('Already reviewed');
      let version: string | undefined;
      if (decision === 'approve' && target === 'A') {
        if (!Object.keys(c.patchA).length&&!c.executionMode) throw new Error('Edit explicit A patch first');
        if(c.patchA.contextRules?.length&&!c.notes)throw new Error('Conditional principles require rationale, expected effect and counterexample notes');
        if (c.context.rulesA.version !== this.active(s).A.version || canonical(importExecutionMode(c.context.executionMode??baselineMode()))!==canonical(this.active(s).executionMode)) throw new ConflictError('Stale A base: capture a new snapshot and propose again');
        version = `A${Object.keys(s.versionsA).length}`;
        const rules = { ...this.active(s).A, ...c.patchA, version }; validate('RulesA', rules);
        s.versionsA[version] = rules;s.modesA[version]=importExecutionMode(c.executionMode??c.context.executionMode??baselineMode()); s.activeA.push(version);
      }
      if (decision === 'approve' && target === 'B') {
        if (!c.replacementB&&Object.values(c.principle).some(v => typeof v === 'string' && v.includes('TODO:'))) throw new Error('Complete B principle fields first');
        if (c.context.rulesBVersion !== this.active(s).B.version) throw new ConflictError('Stale B base: capture a new snapshot and propose again');
        version = `B${Object.keys(s.versionsB).length}`;
        s.versionsB[version] = c.replacementB?{version,...structuredClone(c.replacementB),outputFormat:2}:{...structuredClone(this.active(s).B),version,principles:[...this.active(s).B.principles.filter(p=>p.id!==c.principle.id),structuredClone(c.principle)]}; s.activeB.push(version);
      }
      c.decisions[target] = decision === 'approve' ? 'approved' : decision==='return'?'returned':'rejected';
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: decision, candidateId: id, target, actor,
        candidateRevision: expectedRevision, reviewedContent: structuredClone({ patchA: c.patchA, principle: c.principle, ...(c.notes?{notes:c.notes}:{}),...(c.executionMode?{executionMode:c.executionMode}:{}),...(c.replacementB?{replacementB:c.replacementB}:{}) }),
        ...(reason?{reason}:{}),
        ...(version ? { version } : {}) }); return s;
    });
  }
  revise(id: string, reason: string, expectedRevision: number): Candidate {
    if(!reason?.trim()||reason.length>4000)throw new Error('Revision reason is required (1–4000 characters)');
    return this.transact(s=>{
      const parent=this.getCandidate(id,s);checkRevision(parent,expectedRevision);
      const active=this.active(s), context=structuredClone(parent.context);
      context.rulesA=structuredClone(active.A);context.rulesBVersion=active.B.version;context.executionMode=structuredClone(active.executionMode);
      const child=candidateDraft(randomUUID(),reason,context);child.parentCandidateId=id;if(parent.coaching)child.coaching=structuredClone(parent.coaching);
      if(parent.evaluationSetId)child.evaluationSetId=parent.evaluationSetId;
      if(parent.replacementB)child.replacementB=structuredClone(parent.replacementB);if(parent.executionMode)child.executionMode=structuredClone(parent.executionMode);child.patchA=structuredClone(parent.patchA);child.principle=structuredClone(parent.principle);
      if(parent.notes)child.notes=structuredClone(parent.notes);
      s.candidates[child.id]=child;if(s.snapshotLinks?.[id])s.snapshotLinks[child.id]=s.snapshotLinks[id];s.events.push({id:randomUUID(),at:new Date().toISOString(),action:'revise',actor:'local',candidateId:child.id,parentCandidateId:id,reason});
      return child;
    });
  }
  undo(target: Target, actor: string, expectedVersion: string) {
    if (actor !== 'owner' || !['A','B'].includes(target)) throw new Error('Explicit owner and target required');
    return this.transact(s => {
      if (!expectedVersion) throw new Error('expectedVersion is required');
      const stack = target === 'A' ? s.activeA : s.activeB;
      if (stack.at(-1) !== expectedVersion) throw new ConflictError('Active version changed; reload and confirm undo again');
      if (stack.length === 1) throw new Error('Nothing to undo');
      const version = stack.pop()!;
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: 'undo', target, actor, version, confirmedVersion: expectedVersion }); return s;
    });
  }
  comparison(id: string, options: { mode: 'active' | 'preview'; expectedRevision?: number } = { mode: 'active' }) {
    const s = this.read(), c = this.getCandidate(id,s);
    const active = this.active(s);
    if (!['active', 'preview'].includes(options.mode)) throw new Error('Invalid comparison mode');
    if (options.mode === 'preview') checkRevision(c, options.expectedRevision!);
    const after = options.mode === 'preview' ? { ...c.context.rulesA, ...c.patchA, version: `preview:${c.id}:r${c.revision}` } : active.A;
    validate('RulesA', after);
    const beforeB=s.versionsB[c.context.rulesBVersion];if(!beforeB)throw new Error('Missing captured B base');
    const previewB:RulesB=c.replacementB?{version:`preview:${c.id}:r${c.revision}`,...structuredClone(c.replacementB),outputFormat:2}:{...structuredClone(beforeB),version:`preview:${c.id}:r${c.revision}`,principles:[...beforeB.principles.filter(p=>p.id!==c.principle.id),c.principle]};
    return { mode: options.mode, candidateRevision: c.revision, activeVersion: active.A.version,
      staleBase: c.context.rulesA.version !== active.A.version, executionModes:{before:c.context.executionMode??baselineMode(),after:options.mode==='preview'?c.executionMode??c.context.executionMode??baselineMode():active.executionMode},recorded: compare(c.context, after,options.mode==='preview'?c.executionMode??c.context.executionMode??baselineMode():active.executionMode), regressionKind:'published-fixed-regression', regression: regressionCompare(c.context.rulesA, after,c.context.profile,c.context.executionMode??baselineMode(),options.mode==='preview'?c.executionMode??c.context.executionMode??baselineMode():active.executionMode),
      B: { before: c.context.rulesBVersion, after: active.B,documents:{status:options.mode==='preview'?'proposed-not-approved':'active',before:this.bMarkdown(beforeB),after:this.bMarkdown(options.mode==='preview'?previewB:active.B,options.mode==='preview')},evaluation: 'Manual standalone-model review required; no AI service called.' } };
  }
  runExperiment(id: string, expectedRevision: number, steps: number, mode: 'preview'|'active', start: 'coaching'|'snapshot' = 'coaching') {
    if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart the dev server before recording an experiment');
    if(!['preview','active'].includes(mode))throw new Error('Invalid experiment mode');
    if(!['coaching','snapshot'].includes(start))throw new Error('Invalid experiment start');
    return this.transact(s=>{
      const c=this.getCandidate(id,s);checkRevision(c,expectedRevision);
      if(!c.notes)throw new Error('Save rationale, expected effect and counterexample before recording an experiment');
      const active=this.active(s), beforeA=c.context.rulesA;
      const afterA=mode==='preview'?{...beforeA,...c.patchA,version:`preview:${id}:r${c.revision}`}:active.A;
      const beforeB=s.versionsB[c.context.rulesBVersion];if(!beforeB)throw new Error('Missing captured B version');
      const afterB:RulesB=mode==='preview'?(c.replacementB?{version:`preview:${id}:r${c.revision}`,...structuredClone(c.replacementB),outputFormat:2}:{...structuredClone(beforeB),version:`preview:${id}:r${c.revision}`,principles:[...beforeB.principles.filter(p=>p.id!==c.principle.id),c.principle]}):active.B;
      const set=c.evaluationSetId?s.evaluationSets[c.evaluationSetId]:undefined;
      if(c.evaluationSetId&&!set)throw new Error('Missing frozen evaluation set');
      if(set&&(digest(set.draft)!==set.digest||canonical(set.profile)!==canonical(c.context.profile)))throw new Error('Frozen evaluation digest/profile mismatch');
      if(set&&Object.values(s.candidates).some(candidate=>set.draft.cases.some(test=>exposureReasons(test.snapshot,candidate.context).length)))throw new Error('Frozen evaluation observations became coaching data');
      const results=experimentRun(c.context,afterA,steps,set?.draft.cases.map((test,i)=>({id:`frozen-${i+1}`,snapshot:test.snapshot})),start==='snapshot'?undefined:c.coaching,mode==='preview'?c.executionMode??c.context.executionMode??baselineMode():active.executionMode);
      const useIndex=set?Object.values(s.experiments).filter(e=>e.evaluation?.set.id===set.id).length+1:0;
      const exposureMatches=Object.values(s.experiments).flatMap(e=>{
        const evidence=[e.candidate.context,...(e.evaluation?.set.draft.cases.map(c=>c.snapshot)??[]),...e.results.observationCases];
        return (set?.draft.cases??[]).flatMap((test,index)=>{
          const reasons=[...new Set(evidence.flatMap(known=>exposureReasons(test.snapshot,known)))];
          return reasons.length?[{experimentId:e.id,frozenCaseIndex:index,reasons}]:[];
        });
      });
      const previouslyEvaluated=exposureMatches.length>0;
      const B:Experiment['B']={before:this.bMaterial(beforeB),after:this.bMaterial(afterB,mode==='preview'),status:mode==='preview'?'proposed':'approved-version'};
      const e:Experiment={id:randomUUID(),at:new Date().toISOString(),candidateId:id,candidateRevision:c.revision,mode,
        modelRevision:results.recorded.after.frames[0].trace.modelRevision,engineFingerprint:loadedFingerprint,engineFingerprintFormat,
        provenance:{node:process.version,platform:process.platform,arch:process.arch,...gitProvenance(),
          lockSha256:hash(readFileSync(new URL('../../../package-lock.json',import.meta.url))),snapshotSha256:hash(JSON.stringify(c.context)),
          resultSha256:hash(JSON.stringify(results)),beforeBSha256:hash(B.before.markdown),afterBSha256:hash(B.after.markdown)},
        candidate:structuredClone(c),beforeA:structuredClone(beforeA),afterA:structuredClone(afterA),
        B,results,bInputs:anonymizeCases(results.observationCases),
        ...(set?{evaluation:{set:structuredClone(set),useIndex,exposure:{policy:EXPOSURE_POLICY,matches:exposureMatches},status:!previouslyEvaluated&&useIndex===1?'first-recorded-use-owner-declared' as const:'reused-not-unseen' as const}}:{})};
      s.experiments[e.id]=e;return e;
    });
  }
  modeStudy(id:string,expectedRevision:number,k:number){
    const finite=finiteMode(k);if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart before recording');
    return this.transact(s=>{
      const c=this.getCandidate(id,s);checkRevision(c,expectedRevision);
      const input={bundle:c.context.bundle,memory:c.context.memoryBefore,profile:c.context.profile,rules:c.context.rulesA};
      const study:ModeStudy={format:'rpm.mode-study',version:2,inputHashFormat:'rpm-canonical-json-v1',inputManifest:{protocol:'fixed-observation-three-arm-v1',modelArtifact:{id:'urn:uuid:4a479e32-6727-487e-bae3-e9c37415da3c',version:2,sha256:playerArtifactFingerprint()},bundleSha256:wireHash(input.bundle),memorySha256:wireHash(input.memory),profileSha256:wireHash(input.profile),rulesSha256:wireHash(input.rules),modeSha256:[baselineMode(),unlimitedMode(),finite].map(wireHash),engineFingerprintFormat,time:input.bundle.time,playerId:input.bundle.playerId,scene:c.context.scene,seed:c.context.seed},id:randomUUID(),at:new Date().toISOString(),candidateId:id,candidateRevision:c.revision,engineFingerprint:loadedFingerprint,inputSha256:wireHash(input),arms:[['baseline',baselineMode()],['unlimited',unlimitedMode()],['finite',finite]].map(([name,executionMode])=>({name:name as string,result:execute({...input,executionContractVersion:2,executionMode})}))};
      s.modeStudies[study.id]=study;return study;
    });
  }
  bPacket(experimentId: string, arm:BArm, group:CaseGroup) {
    const e=this.read().experiments[experimentId];if(!e)throw new Error('Unknown experiment');
    if(!['none','before','after'].includes(arm)||!['regression','frozen'].includes(group))throw new Error('Select one B arm (none/before/after) and case group (regression/frozen)');
    if(!e.bInputs)throw new Error('Legacy experiment lacks anonymous B inputs; keep its history and record a new experiment');
    const ids=new Set(e.bInputs.evaluatorMap.filter(c=>c.group===group).map(c=>c.id));
    if(!ids.size)throw new Error('No frozen evaluation conditions were linked before coaching');
    const material=arm==='none'?undefined:e.B[arm];
    return { instructions:'Judge each anonymous case only from the supplied observations and memory. Return its id, decision, uncertainty, alternatives and self-review; cite a principle only if one is supplied. Do not infer hidden world state.',
      principles:material?.markdown??null,structuredAmendments:material?.structuredAmendments??[],cases:e.bInputs.modelCases.filter(c=>ids.has(c.id)) };
  }
  bEvaluatorMap(experimentId:string){
    const e=this.read().experiments[experimentId];if(!e?.bInputs)throw new Error('Unknown or legacy experiment without anonymous inputs');
    return {experimentId:e.id,evaluation:e.evaluation??null,BVersions:[e.B.before.version,e.B.after.version],
      mapping:e.bInputs.evaluatorMap,warning:'Evaluator-only. Never give this mapping, its labels/seeds, scoring criteria or A results to the evaluated model.'};
  }
  saveBReview(experimentId: string, model: string, output: string, assessment: string, arm:BArm, group:CaseGroup) {
    const inputSha256=digest(this.bPacket(experimentId,arm,group));
    for(const [name,value,max] of [['model',model,400],['output',output,40000],['assessment',assessment,4000]] as const)
      if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${name} requires 1–${max} characters`);
    return this.transact(s=>{
      if(!s.experiments[experimentId])throw new Error('Unknown experiment');
      const review:BReview={id:randomUUID(),at:new Date().toISOString(),experimentId,model,output,assessment,status:'unverified-external-response',humanValidated:false,arm,group,inputSha256};
      s.bReviews.push(review);return review;
    });
  }
  exportProposal(id:string,expectedRevision:number,scope:ExportScope){
    if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart before exporting');
    return this.transact(s=>{
      const c=this.getCandidate(id,s);checkRevision(c,expectedRevision);
      const scopeHash=wireHash({scope,engineFingerprint:loadedFingerprint}),existing=s.publicExports.find(e=>e.candidateId===id&&e.candidateRevision===expectedRevision&&e.scopeHash===scopeHash);if(existing)return existing.package;
      const beforeB=s.versionsB[c.context.rulesBVersion];if(!beforeB)throw new Error('Missing B base');
      const schemaHash=hash(readFileSync(resolve(repositoryRoot,'models/player/spec/execution.schema.json')));
      const pkg=buildProposal(c,beforeB,readJudgmentBaseline(),currentEngineDescriptor(),schemaHash,scope);
      s.publicExports.push({candidateId:id,candidateRevision:expectedRevision,scopeHash,package:pkg});return pkg;
    });
  }
  validateProposal(raw:string){const v=validateProposal(raw,currentEngineDescriptor());return {status:'valid',proposalId:v.package.manifest.proposalId,revision:v.package.manifest.revision,manifestSha256:v.manifestSha256,readiness:v.readiness,targets:v.package.manifest.targets.map(t=>t.kind)};}
  importProposal(raw:string){
    const v=validateProposal(raw,currentEngineDescriptor());
    return this.transact(s=>{
      const m=v.package.manifest,prior=Object.values(s.importedProposals).find(p=>p.proposalId===m.proposalId&&p.revision===m.revision);
      if(prior){if(prior.manifestSha256!==v.manifestSha256)throw new ConflictError('Same proposal ID/revision has different content');return prior;}
      const localCandidateId=randomUUID(),entry:ImportedProposal={localCandidateId,proposalId:m.proposalId,revision:m.revision,manifestSha256:v.manifestSha256,status:'import-inert',package:structuredClone(v.package),decisions:{A:'pending',B:'pending'},runs:[]};
      indexProposal(s.evidenceGraph,v);s.importedProposals[localCandidateId]=entry;return entry;
    });
  }
  reproduceProposal(id:string,manifestSha256:string,targets?:('A'|'B')[]){
    if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart before reproducing');
    return this.transact(s=>{
      const p=s.importedProposals[id];if(!p)throw new Error('Unknown imported proposal');if(p.manifestSha256!==manifestSha256)throw new ConflictError('Confirm the displayed manifest hash');
      const v=validateProposal(canonicalWire(p.package),currentEngineDescriptor()),run=reproduceProposal(v,targets),expected=run.reproduces;
      const result={run,matches:expected?run.resultDigest.sha256===wireHash(selectSemantic(v.read<ProposalRun>(expected).semantic,run.executedTargets)):null};indexRun(s.evidenceGraph,v,run);p.runs.push(result);return {...result,review:proposalReviewMaterial(v,run.executedTargets)};
    });
  }
  reviewProposal(id:string,target:Target,decision:'approve'|'reject',actor:string,expectedSessionRevision:number,manifestSha256:string,runId:string,reason:string){
    if(actor!=='owner'||!['A','B'].includes(target)||!['approve','reject'].includes(decision))throw new Error('Explicit owner, A/B target and decision required');
    if(typeof reason!=='string'||!reason.trim()||reason.length>4000)throw new Error('Decision reason is required');
    return this.transact(s=>{
      if(s.revision!==expectedSessionRevision)throw new ConflictError('Session revision changed; reload and confirm');
      const p=s.importedProposals[id];if(!p||p.manifestSha256!==manifestSha256)throw new ConflictError('Confirm the displayed proposal and manifest hash');
      const v=validateProposal(canonicalWire(p.package),currentEngineDescriptor()),proposalTarget=p.package.manifest.targets.find(t=>t.kind===target);if(!proposalTarget)throw new Error('Target not included');
      if(p.decisions[target]!=='pending')throw new Error('Already reviewed');let version:string|undefined;
      if(decision==='approve'){
        const preview=p.runs.find(r=>r.run.id===runId);if(!preview||preview.matches===false||!preview.run.executedTargets.includes(target))throw new Error('Explicit successful local preview/reproduction required');
        if(target==='A'&&v.readiness!=='ready')throw new Error('engine-unavailable');
        const active=this.active(s);
        if(proposalTarget.kind==='A'){
          if(proposalTarget.change.kind!=='a-configuration')throw new Error('Code review references cannot be adopted by the data importer');
          const baseRules=v.read<RulesA>(proposalTarget.base.rules),baseConfig=v.read<Config>(proposalTarget.base.config);
          if(canonicalWire(baseRules)!==canonicalWire(active.A)||canonicalWire(baseConfig.executionMode)!==canonicalWire(active.executionMode))throw new ConflictError('Stale A base; create an explicit rebased proposal and preview again');
          const artifact=v.read<AArtifact>(proposalTarget.proposedArtifact);version=`A${Object.keys(s.versionsA).length}`;
          s.versionsA[version]={...structuredClone(v.read<RulesA>(artifact.rules)),version};s.modesA[version]=structuredClone(v.read<Config>(artifact.config).executionMode);s.activeA.push(version);
        }else{
          if(textHash(this.bMarkdown(active.B))!==proposalTarget.change.beforeSha256)throw new ConflictError('Stale B base; create an explicit rebased proposal and preview again');
          const artifact=v.read<BArtifact>(proposalTarget.proposedArtifact),text=v.read<string>(artifact.baseline);version=`B${Object.keys(s.versionsB).length}`;
          const next:RulesB={version,baseline:{id:artifact.baseline.id,version:artifact.baseline.version,sha256:textHash(text),text},principles:artifact.amendments.map(r=>structuredClone(v.read<Principle>(r))),outputFormat:2};
          if(textHash(this.bMarkdown(next))!==proposalTarget.change.afterSha256)throw new Error('Imported B artifact output differs from proposed hash');
          s.versionsB[version]=next;s.activeB.push(version);
        }
        s.artifactLinks.push({target,localVersion:version,artifact:structuredClone(proposalTarget.proposedArtifact),proposalId:p.proposalId,manifestSha256:p.manifestSha256,runId});
      }
      p.decisions[target]=decision==='approve'?'approved':'rejected';s.events.push({id:randomUUID(),at:new Date().toISOString(),action:decision,target,candidateId:id,actor,reason,...(version?{version}:{})});return this.active(s);
    });
  }
  rebaseProposal(id:string,expectedSessionRevision:number,reason:string,scope:ExportScope){
    if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart before rebasing');
    if(typeof reason!=='string'||!reason.trim()||reason.length>4000)throw new Error('Explicit rebase reason required');
    return this.transact(s=>{
      if(s.revision!==expectedSessionRevision)throw new ConflictError('Session revision changed; reload before rebase');const p=s.importedProposals[id];if(!p)throw new Error('Unknown imported proposal');
      const v=validateProposal(canonicalWire(p.package),currentEngineDescriptor()),m=p.package.manifest;
      if(m.caseRefs.length!==1)throw new Error('This manual rebase supports one fixed-observation case; preserve all cases in a reviewed multi-case proposal');
      if(scope.targets.some(t=>!m.targets.some(x=>x.kind===t)))throw new Error('Rebase cannot invent a target');
      const active=this.active(s),source=v.read<ProposalCase>(m.caseRefs[0]),a=m.targets.find(t=>t.kind==='A'),b=m.targets.find(t=>t.kind==='B');if(a?.change.kind==='code-review-ref')throw new Error('Code-review proposal needs a reviewed code change; no data-only rebase');
      const pending:ProposalCandidate={feedback:m.title,patchA:a?.change.kind==='a-configuration'?a.change.patch:{},executionMode:a?.change.kind==='a-configuration'?a.change.executionMode:active.executionMode,
        notes:{rationale:reason,expectedEffect:m.expected.description,counterexample:m.counterexamples.map(c=>c.criterion).join('\n').slice(0,4000)},
        principle:{id:freshId(),condition:'Full B replacement only',criterion:'Use the explicitly listed text and ordered amendments',priority:50,exceptions:'No automatic merge',unknown:'Review current B changes before adopting',evidence:'Explicit local rebase'},
        context:{seed:m.provenance.seed,bundle:source.input.bundle,memoryBefore:source.input.memory,profile:source.input.profile,rulesA:active.A,rulesBVersion:active.B.version,executionMode:active.executionMode,...(source.evaluatorOnly?{world:v.data.get(source.evaluatorOnly) as World}:{})}};
      if(b){const artifact=v.read<BArtifact>(b.proposedArtifact),text=v.read<string>(artifact.baseline);pending.replacementB={baseline:{id:artifact.baseline.id,version:artifact.baseline.version,sha256:textHash(text),text},principles:artifact.amendments.map(r=>v.read<Principle>(r))};}
      const pkg=buildProposal(pending,active.B,readJudgmentBaseline(),currentEngineDescriptor(),hash(readFileSync(resolve(repositoryRoot,'models/player/spec/execution.schema.json'))),scope);
      pkg.manifest.proposalId=m.proposalId;pkg.manifest.revision=m.revision+1;pkg.manifest.supersedes={id:m.proposalId,revision:m.revision,sha256:p.manifestSha256};pkg.manifest.payloadDigest=payloadDigest(pkg.manifest);
      if(Object.values(s.importedProposals).some(x=>x.proposalId===m.proposalId&&x.revision===pkg.manifest.revision))throw new ConflictError('A rebased revision already exists; inspect it before revising further');
      const checked=validateProposal(canonicalWire(pkg),currentEngineDescriptor()),localCandidateId=randomUUID();
      const next:ImportedProposal={localCandidateId,proposalId:m.proposalId,revision:pkg.manifest.revision,manifestSha256:checked.manifestSha256,status:'import-inert',package:pkg,decisions:{A:'pending',B:'pending'},runs:[]};
      indexProposal(s.evidenceGraph,checked);s.importedProposals[localCandidateId]=next;return next;
    });
  }
  researchReview(id:string,runId:string,status:'support'|'restrict'|'reject',scope:string,limits:string,reason:string,synthetic:boolean){
    return this.transact(s=>{const p=s.importedProposals[id];if(!p||!p.runs.some(r=>r.run.id===runId))throw new Error('Choose an actual local run of this proposal');const v=validateProposal(canonicalWire(p.package),currentEngineDescriptor());const ref=addReview(s.evidenceGraph,v,runId,status,scope,limits,reason,synthetic);validateGraph(s.evidenceGraph);return ref;});
  }
  withdrawEvidence(id:string,version:number,reason:string){return this.transact(s=>{const event=withdraw(s.evidenceGraph,id,version,reason);validateGraph(s.evidenceGraph);return event;});}
  evidence(){const graph=this.read().evidenceGraph;validateGraph(graph);return graph;}
  standaloneBPacket(cases:unknown,selection:unknown){
    validateBSelection(selection);
    if(selection.arm==='none')return makeStandaloneBPacket(cases,'none',null,null);
    if(selection.document)return makeStandaloneBPacket(cases,selection.arm,selection.document,null);
    const B=this.read().versionsB[selection.bVersion!];if(!B)throw new Error('Unknown B version');
    return makeStandaloneBPacket(cases,selection.arm,fixedBDocument(this.bMarkdown(B)),B.version);
  }
  saveStandaloneBReview(packet:unknown,model:string,output:string,assessment:unknown){
    validateStandaloneBPacket(packet);validateBAssessment(assessment);
    for(const value of [model,output])if(typeof value!=='string'||!value.trim()||value.length>40000)throw new Error('Nonempty bounded model/output required');
    // Preserve the actual subject input, even after active B changes. Never regenerate it here.
    const captured=structuredClone(packet),scores=structuredClone(assessment);
    return this.transact(s=>{const record:StandaloneBReview={id:freshId(),at:new Date().toISOString(),kind:'b-standalone-review',formatVersion:2,arm:captured.arm,bVersion:captured.bVersion,documentRef:captured.documentRef,inputSha256:captured.inputSha256,packetSha256:standaloneInputHash(captured),packet:captured,model,output,assessment:scores,status:'unverified-external-or-manual-response',humanValidated:false};s.standaloneBReviews.push(record);return record;});
  }
  exportBData(){return this.bMaterial(this.active().B);}
  private bMaterial(B:RulesB,proposed=false):BMaterial{return {version:B.version,markdown:this.bMarkdown(B,proposed),structuredAmendments:structuredClone(B.principles),outputFormat:2,...(B.baseline?{baseline:structuredClone(B.baseline)}:{})};}
  exportB() { return this.bMarkdown(this.active().B); }
  private bMarkdown(B:RulesB,proposed=false) {return judgmentMarkdown(B,readJudgmentBaseline(),proposed);}
}
