import { validateSceneDefinition, sceneContent, sceneWorld, sceneRef, type SceneRevision, type CoachingWindow, type ApplicationPoint } from '../src/scene';
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultRulesA, type Candidate, type Principle, type RulesA, type RulesB, type Snapshot, type StudyNotes } from '../src/contracts';
import { validate, validateSnapshot } from '../src/validation';
import { candidateDraft, compare, regressionCompare, experimentRun, replay } from '../src/research';
import { sense } from '../src/simulation';
import { assertSnapshotHistory } from '../src/observation-history';
import type { Experiment, BReview, BMaterial } from './experiment-types';
import { canonical, digest, conditionDigest, stimulusDigest, checkEvaluationDraft, anonymizeCases, type FrozenEvaluation, type BArm, type CaseGroup } from './evaluation';
const fingerprint = () => createHash('sha256').update(['src/contracts.ts','src/scene.ts','src/cognition.ts','src/simulation.ts','src/research.ts','src/observation-history.ts','src/validation.ts','server/evaluation.ts','schemas/contracts.schema.json'].map(path => readFileSync(new URL('../'+path, import.meta.url))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex');
const loadedFingerprint = fingerprint();
// Opaque slot identities are stable across copies/renames. Never hash author text or future paths.
// This also keeps A's existing ID tie-breaks reproducible across independent scene imports.
const trackingId=(index:number)=>{const h=createHash('sha256').update(`rpm-observation-slot-v1:${index}`).digest('hex');return `track-${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;};
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function gitProvenance(){
  const options={cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8' as const,timeout:2000,stdio:['ignore','pipe','ignore'] as ['ignore','pipe','ignore']};
  try{return {gitCommit:execFileSync('git',['rev-parse','HEAD'],options).trim(),gitDirty:!!execFileSync('git',['status','--porcelain'],options).trim()};}
  catch{return {gitCommit:null,gitDirty:null};}
}
export type Target = 'A' | 'B';
type Event = { id: string; at: string; action: string; target?: Target; candidateId?: string; actor: string; version?: string;
  candidateRevision?: number; reviewedContent?: { patchA: Candidate['patchA']; principle: Principle; notes?: StudyNotes }; confirmedVersion?: string; reason?: string; parentCandidateId?: string; sceneId?:string; sceneRevision?:number; application?:ApplicationPoint };
export class ConflictError extends Error { readonly statusCode = 409; }
function checkRevision(c: Candidate, expected: number) {
  if (!Number.isInteger(expected) || expected < 1) throw new Error('expectedRevision is required');
  if (c.revision !== expected) throw new ConflictError('Candidate revision changed; reload and confirm the displayed content again');
}
export type SceneComparison = {id:string;at:string;kind:'changed-scene-fixed-rules';sameConditions:false;rulesA:RulesA;before:{snapshotId:string;snapshot:Snapshot;run:ReturnType<typeof replay>};after:{snapshotId:string;snapshot:Snapshot;run:ReturnType<typeof replay>}};
export type State = { sceneComparisons:Record<string,SceneComparison>; scenes:Record<string,SceneRevision[]>; format: 1; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string, Candidate>;
  versionsA: Record<string, RulesA>; versionsB: Record<string, RulesB>; activeA: string[]; activeB: string[]; events: Event[];
  experiments: Record<string, Experiment>; bReviews: BReview[]; evaluationSets:Record<string,FrozenEvaluation> };
const initial = (): State => ({ sceneComparisons:{}, scenes:{}, format: 1, revision: 0, snapshots: {}, candidates: {}, versionsA: { A0: defaultRulesA() },
  versionsB: { B0: { version: 'B0', principles: [] } }, activeA: ['A0'], activeB: ['B0'], events: [], experiments: {}, bReviews: [], evaluationSets:{} });
export class Store {
  readonly dir: string;
  constructor(directory = process.env.RPM_SESSION_DIR || '.rpm') { this.dir = resolve(directory); mkdirSync(this.dir, { recursive: true, mode: 0o700 }); }
  read(): State {
    const file = join(this.dir, 'state.json');
    const state: State = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : initial();
    if (state.format !== 1 || !Number.isInteger(state.revision)) throw new Error('Unsupported/corrupt session format');
    // Legacy sessions retain their data. Historical events are not retroactively attested.
    for (const c of Object.values(state.candidates)) c.revision ??= 1;
    state.experiments ??= {};state.bReviews ??= [];state.evaluationSets??={};state.scenes??={};state.sceneComparisons??={};
    return state;
  }
  private transact<T>(fn: (s: State) => T): T {
    const lock = join(this.dir, '.lock');
    try { mkdirSync(lock); } catch { throw new Error('Session busy; retry. After a crashed writer, follow docs/LOCAL_BRIDGE.md.'); }
    try {
      const s = this.read(), result = fn(s); s.revision++;
      const temp = join(this.dir, `state-${randomUUID()}.tmp`);
      writeFileSync(temp, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 }); renameSync(temp, join(this.dir, 'state.json'));
      return result;
    } finally { rmSync(lock, { recursive: true }); }
  }
  active(s = this.read()) { return { A: s.versionsA[s.activeA.at(-1)!], B: s.versionsB[s.activeB.at(-1)!] }; }
  getScene(id:string, revision:number):SceneRevision {
    const scene=this.read().scenes[id]?.find(x=>x.revision===revision);if(!scene)throw new Error('Unknown scene revision');return structuredClone(scene);
  }
  createScene(definition:unknown,generationSeed:number|null=null):SceneRevision {
    validateSceneDefinition(definition);this.checkSeed(generationSeed);
    return this.transact(s=>{
      const scene:SceneRevision={sceneId:randomUUID(),revision:1,contentHash:digest(sceneContent(definition)),definition:structuredClone(definition),generationSeed,
        trackingIds:definition.actors.map((_,i)=>trackingId(i)),createdAt:new Date().toISOString()};
      s.scenes[scene.sceneId]=[scene];s.events.push({id:randomUUID(),at:scene.createdAt,action:'scene-create',actor:'local',sceneId:scene.sceneId,sceneRevision:1});return scene;
    });
  }
  reviseScene(id:string,expectedRevision:number,definition:unknown):SceneRevision {
    validateSceneDefinition(definition);
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
    if(!stored||canonical(stored)!==canonical(r)||r.contentHash!==digest(sceneContent(r.definition)))throw new Error('Snapshot must use an imported immutable scene revision');
  }
  recordApplication(point:ApplicationPoint){
    validate('ApplicationPoint',point);
    return this.transact(s=>{
      const existing=s.events.find(e=>e.application?.receiptId===point.receiptId);
      if(existing){if(canonical(existing.application)!==canonical(point))throw new ConflictError('Application receipt conflict');return existing;}
      const scene=s.scenes[point.sceneId]?.find(r=>r.revision===point.revision);
      if(!scene||scene.contentHash!==point.contentHash||point.tick>scene.definition.durationTicks||!s.versionsA[point.fromA]||!s.versionsA[point.toA]||!s.versionsB[point.fromB]||!s.versionsB[point.toB])throw new Error('Invalid application point');
      const event:Event={id:randomUUID(),at:new Date().toISOString(),action:'apply-at-tick',actor:'ui-self-reported',application:structuredClone(point)};
      s.events.push(event);return event;
    });
  }
  compareScenes(beforeId:string,afterId:string,rulesVersion:string,steps:number){
    return this.transact(s=>{
      const before=s.snapshots[beforeId],after=s.snapshots[afterId],rules=s.versionsA[rulesVersion];
      if(!before?.world.dynamic||!after?.world.dynamic||!rules)throw new Error('Two dynamic snapshots and a known A version are required');
      if(canonical(before.profile)!==canonical(after.profile))throw new Error('Scene comparison must keep the same profile');
      this.assertSceneBinding(before,s);this.assertSceneBinding(after,s);
      const result:SceneComparison={id:randomUUID(),at:new Date().toISOString(),kind:'changed-scene-fixed-rules',sameConditions:false,rulesA:structuredClone(rules),
        before:{snapshotId:beforeId,snapshot:structuredClone(before),run:replay(before,rules,steps)},after:{snapshotId:afterId,snapshot:structuredClone(after),run:replay(after,rules,steps)}};
      s.sceneComparisons[result.id]=result;return result;
    });
  }
  saveSnapshot(snapshot: unknown): string {
    validateSnapshot(snapshot);
    assertSnapshotHistory(snapshot);this.assertSceneBinding(snapshot);
    if (JSON.stringify(sense(snapshot.world)) !== JSON.stringify(snapshot.bundle)) throw new Error('Snapshot perception does not match sensor adapter');
    return this.transact(s => { const id = randomUUID(); s.snapshots[id] = structuredClone(snapshot); return id; });
  }
  freezeEvaluation(draft:unknown):FrozenEvaluation {
    checkEvaluationDraft(draft);for(const c of draft.cases)this.assertSceneBinding(c.snapshot);
    return this.transact(s=>{
      const known=new Set(Object.values(s.candidates).map(c=>conditionDigest(c.context)));
      if(draft.cases.some(c=>known.has(conditionDigest(c.snapshot))))throw new Error('Evaluation observations were already used for coaching in this session');
      const set:FrozenEvaluation={id:randomUUID(),at:new Date().toISOString(),frozenAtRevision:s.revision,
        digest:digest(draft),profile:structuredClone(draft.cases[0].snapshot.profile),draft:structuredClone(draft),novelty:'owner-declared-not-independently-verified',stimuli:draft.cases.map(c=>({stimulusDigest:stimulusDigest(c.snapshot),observationDigest:conditionDigest(c.snapshot)}))};
      s.evaluationSets[set.id]=set;return set;
    });
  }
  propose(snapshotId: string, feedback: string, evaluationSetId?:string, window?:{fromTick:number;toTick:number;playerId:string}): Candidate {
    if (!feedback.trim() || feedback.length > 4000) throw new Error('Feedback must be 1–4000 characters');
    return this.transact(s => {
      const context = s.snapshots[snapshotId]; if (!context) throw new Error('Unknown snapshot');
      if(evaluationSetId){
        const set=s.evaluationSets[evaluationSetId];if(!set)throw new Error('Freeze evaluation conditions before proposing feedback');
        if(canonical(set.profile)!==canonical(context.profile))throw new Error('Candidate profile differs from the frozen evaluation profile');
        if(set.draft.cases.some(c=>conditionDigest(c.snapshot)===conditionDigest(context)))throw new Error('Frozen evaluation evidence cannot be used as the coaching scene');
      }
      const c = candidateDraft(randomUUID(), feedback, context);
      if(context.world.dynamic){
        const d=context.world.dynamic,firstTick=Math.round((context.observationHistory?.events[0].bundle.time??context.bundle.time)/.2);
        c.coaching={...sceneRef(d.scene),playerId:'observer-0',fromTick:window?.fromTick??firstTick,toTick:window?.toTick??d.tick};
        validate('CoachingWindow',c.coaching);
        if((window&&window.playerId!=='observer-0')||c.coaching.toTick!==d.tick||c.coaching.fromTick<firstTick||c.coaching.fromTick>c.coaching.toTick)throw new Error('Coaching must pin the observed player and an acquired interval ending at the snapshot tick');
      }else if(window)throw new Error('Tick windows require a dynamic scene');if(evaluationSetId)c.evaluationSetId=evaluationSetId;s.candidates[c.id] = c;
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: 'propose', candidateId: c.id, actor: 'local' }); return c;
    });
  }
  edit(id: string, patchA: Candidate['patchA'], principle: Principle, expectedRevision: number, notes?: StudyNotes): Candidate {
    validate('PatchA', patchA); validate('Principle', principle);
    if(notes!==undefined)validate('StudyNotes',notes);
    return this.transact(s => {
      const c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
      checkRevision(c, expectedRevision);
      if (c.decisions.A !== 'pending' || c.decisions.B !== 'pending') throw new Error('Reviewed candidate is immutable; create another candidate');
      c.patchA = structuredClone(patchA); c.principle = structuredClone(principle); c.revision++;
      if(notes)c.notes=structuredClone(notes);
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
        if (!Object.keys(c.patchA).length) throw new Error('Edit explicit A patch first');
        if(c.patchA.contextRules?.length&&!c.notes)throw new Error('Conditional principles require rationale, expected effect and counterexample notes');
        if (c.context.rulesA.version !== this.active(s).A.version) throw new ConflictError('Stale A base: capture a new snapshot and propose again');
        version = `A${Object.keys(s.versionsA).length}`;
        const rules = { ...this.active(s).A, ...c.patchA, version }; validate('RulesA', rules);
        s.versionsA[version] = rules; s.activeA.push(version);
      }
      if (decision === 'approve' && target === 'B') {
        if (Object.values(c.principle).some(v => typeof v === 'string' && v.includes('TODO:'))) throw new Error('Complete B principle fields first');
        if (c.context.rulesBVersion !== this.active(s).B.version) throw new ConflictError('Stale B base: capture a new snapshot and propose again');
        version = `B${Object.keys(s.versionsB).length}`;
        s.versionsB[version] = { version, principles: [...this.active(s).B.principles.filter(p=>p.id!==c.principle.id), structuredClone(c.principle)] }; s.activeB.push(version);
      }
      c.decisions[target] = decision === 'approve' ? 'approved' : decision==='return'?'returned':'rejected';
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: decision, candidateId: id, target, actor,
        candidateRevision: expectedRevision, reviewedContent: structuredClone({ patchA: c.patchA, principle: c.principle, ...(c.notes?{notes:c.notes}:{}) }),
        ...(reason?{reason}:{}),
        ...(version ? { version } : {}) }); return s;
    });
  }
  revise(id: string, reason: string, expectedRevision: number): Candidate {
    if(!reason?.trim()||reason.length>4000)throw new Error('Revision reason is required (1–4000 characters)');
    return this.transact(s=>{
      const parent=s.candidates[id];if(!parent)throw new Error('Unknown candidate');checkRevision(parent,expectedRevision);
      const active=this.active(s), context=structuredClone(parent.context);
      context.rulesA=structuredClone(active.A);context.rulesBVersion=active.B.version;
      const child=candidateDraft(randomUUID(),reason,context);child.parentCandidateId=id;if(parent.coaching)child.coaching=structuredClone(parent.coaching);
      if(parent.evaluationSetId)child.evaluationSetId=parent.evaluationSetId;
      child.patchA=structuredClone(parent.patchA);child.principle=structuredClone(parent.principle);
      if(parent.notes)child.notes=structuredClone(parent.notes);
      s.candidates[child.id]=child;s.events.push({id:randomUUID(),at:new Date().toISOString(),action:'revise',actor:'local',candidateId:child.id,parentCandidateId:id,reason});
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
    const s = this.read(), c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
    const active = this.active(s);
    if (!['active', 'preview'].includes(options.mode)) throw new Error('Invalid comparison mode');
    if (options.mode === 'preview') checkRevision(c, options.expectedRevision!);
    const after = options.mode === 'preview' ? { ...c.context.rulesA, ...c.patchA, version: `preview:${c.id}:r${c.revision}` } : active.A;
    validate('RulesA', after);
    return { mode: options.mode, candidateRevision: c.revision, activeVersion: active.A.version,
      staleBase: c.context.rulesA.version !== active.A.version, recorded: compare(c.context, after), regressionKind:'published-fixed-regression', regression: regressionCompare(c.context.rulesA, after,c.context.profile),
      B: { before: c.context.rulesBVersion, after: active.B, evaluation: 'Manual standalone-model review required; no AI service called.' } };
  }
  runExperiment(id: string, expectedRevision: number, steps: number, mode: 'preview'|'active') {
    if(fingerprint()!==loadedFingerprint)throw new Error('Engine source changed; restart the dev server before recording an experiment');
    if(!['preview','active'].includes(mode))throw new Error('Invalid experiment mode');
    return this.transact(s=>{
      const c=s.candidates[id];if(!c)throw new Error('Unknown candidate');checkRevision(c,expectedRevision);
      if(!c.notes)throw new Error('Save rationale, expected effect and counterexample before recording an experiment');
      const active=this.active(s), beforeA=c.context.rulesA;
      const afterA=mode==='preview'?{...beforeA,...c.patchA,version:`preview:${id}:r${c.revision}`}:active.A;
      const beforeB=s.versionsB[c.context.rulesBVersion];if(!beforeB)throw new Error('Missing captured B version');
      const afterB=mode==='preview'?{version:`preview:${id}:r${c.revision}`,principles:[...beforeB.principles.filter(p=>p.id!==c.principle.id),c.principle]}:active.B;
      const set=c.evaluationSetId?s.evaluationSets[c.evaluationSetId]:undefined;
      if(c.evaluationSetId&&!set)throw new Error('Missing frozen evaluation set');
      if(set&&(digest(set.draft)!==set.digest||canonical(set.profile)!==canonical(c.context.profile)))throw new Error('Frozen evaluation digest/profile mismatch');
      const frozenEvidence=new Set(set?.draft.cases.map(test=>conditionDigest(test.snapshot))??[]);
      if(set&&Object.values(s.candidates).some(candidate=>frozenEvidence.has(conditionDigest(candidate.context))))throw new Error('Frozen evaluation observations became coaching data');
      const results=experimentRun(c.context,afterA,steps,set?.draft.cases.map((test,i)=>({id:`frozen-${i+1}`,snapshot:test.snapshot})));
      const useIndex=set?Object.values(s.experiments).filter(e=>e.evaluation?.set.id===set.id).length+1:0;
      const frozenStimuli=new Set(set?.draft.cases.map(test=>stimulusDigest(test.snapshot)).filter((x):x is string=>x!==null)??[]);
      const previouslyEvaluated=Object.values(s.experiments).some(e=>e.results.observationCases.some(test=>frozenEvidence.has(conditionDigest(test)))||
        [e.candidate.context,...(e.evaluation?.set.draft.cases.map(c=>c.snapshot)??[])].some(snapshot=>{const id=stimulusDigest(snapshot);return id!==null&&frozenStimuli.has(id);}));
      const B:Experiment['B']={before:this.bMaterial(beforeB),after:this.bMaterial(afterB,mode==='preview'),status:mode==='preview'?'proposed':'approved-version'};
      const e:Experiment={id:randomUUID(),at:new Date().toISOString(),candidateId:id,candidateRevision:c.revision,mode,
        modelRevision:results.recorded.after.frames[0].trace.modelRevision,engineFingerprint:loadedFingerprint,
        provenance:{node:process.version,platform:process.platform,arch:process.arch,...gitProvenance(),
          lockSha256:hash(readFileSync(new URL('../package-lock.json',import.meta.url))),snapshotSha256:hash(JSON.stringify(c.context)),
          resultSha256:hash(JSON.stringify(results)),beforeBSha256:hash(B.before.markdown),afterBSha256:hash(B.after.markdown)},
        candidate:structuredClone(c),beforeA:structuredClone(beforeA),afterA:structuredClone(afterA),
        B,results,bInputs:anonymizeCases(results.observationCases),
        ...(set?{evaluation:{set:structuredClone(set),useIndex,status:!previouslyEvaluated&&useIndex===1?'first-recorded-use-owner-declared' as const:'reused-not-unseen' as const}}:{})};
      s.experiments[e.id]=e;return e;
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
  exportBData(){return this.bMaterial(this.active().B);}
  private bMaterial(B:RulesB,proposed=false):BMaterial{return {version:B.version,markdown:this.bMarkdown(B,proposed),structuredAmendments:structuredClone(B.principles)};}
  exportB() { return this.bMarkdown(this.active().B); }
  private bMarkdown(B:RulesB,proposed=false) {
    // A repository draft edit must not silently change an already reviewed local B export.
    const base = readFileSync(new URL('../docs/versions/RUGBY_JUDGMENT-B0.md', import.meta.url), 'utf8');
    return base + `\n\n## ${proposed?'Proposed amendments — NOT approved':'Local owner-approved amendments'} (${B.version})\n` + B.principles.map(p =>
      `\n### ${p.id}\n- Condition: ${p.condition}\n- Criterion: ${p.criterion}\n- Priority: ${p.priority}\n- Exceptions: ${p.exceptions}\n- Unknown: ${p.unknown}\n- Evidence: ${p.evidence}\n`).join('');
  }
}
