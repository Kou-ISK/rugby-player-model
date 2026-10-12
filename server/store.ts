import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defaultRulesA, type Candidate, type Principle, type RulesA, type RulesB, type Snapshot, type StudyNotes } from '../src/contracts';
import { validate, validateSnapshot } from '../src/validation';
import { candidateDraft, compare, unseen, experimentRun } from '../src/research';
import { sense } from '../src/simulation';
import type { Experiment, BReview, BMaterial } from './experiment-types';
const fingerprint = () => createHash('sha256').update(['src/contracts.ts','src/cognition.ts','src/simulation.ts','src/research.ts','src/validation.ts','schemas/contracts.schema.json'].map(path => readFileSync(new URL('../'+path, import.meta.url))).reduce((a,b)=>Buffer.concat([a,b]),Buffer.alloc(0))).digest('hex');
const loadedFingerprint = fingerprint();
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function gitProvenance(){
  const options={cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8' as const,timeout:2000,stdio:['ignore','pipe','ignore'] as ['ignore','pipe','ignore']};
  try{return {gitCommit:execFileSync('git',['rev-parse','HEAD'],options).trim(),gitDirty:!!execFileSync('git',['status','--porcelain'],options).trim()};}
  catch{return {gitCommit:null,gitDirty:null};}
}
export type Target = 'A' | 'B';
type Event = { id: string; at: string; action: string; target?: Target; candidateId?: string; actor: string; version?: string;
  candidateRevision?: number; reviewedContent?: { patchA: Candidate['patchA']; principle: Principle; notes?: StudyNotes }; confirmedVersion?: string; reason?: string; parentCandidateId?: string };
export class ConflictError extends Error { readonly statusCode = 409; }
function checkRevision(c: Candidate, expected: number) {
  if (!Number.isInteger(expected) || expected < 1) throw new Error('expectedRevision is required');
  if (c.revision !== expected) throw new ConflictError('Candidate revision changed; reload and confirm the displayed content again');
}
export type State = { format: 1; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string, Candidate>;
  versionsA: Record<string, RulesA>; versionsB: Record<string, RulesB>; activeA: string[]; activeB: string[]; events: Event[];
  experiments: Record<string, Experiment>; bReviews: BReview[] };
const initial = (): State => ({ format: 1, revision: 0, snapshots: {}, candidates: {}, versionsA: { A0: defaultRulesA() },
  versionsB: { B0: { version: 'B0', principles: [] } }, activeA: ['A0'], activeB: ['B0'], events: [], experiments: {}, bReviews: [] });
export class Store {
  readonly dir: string;
  constructor(directory = process.env.RPM_SESSION_DIR || '.rpm') { this.dir = resolve(directory); mkdirSync(this.dir, { recursive: true, mode: 0o700 }); }
  read(): State {
    const file = join(this.dir, 'state.json');
    const state: State = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : initial();
    if (state.format !== 1 || !Number.isInteger(state.revision)) throw new Error('Unsupported/corrupt session format');
    // Legacy sessions retain their data. Historical events are not retroactively attested.
    for (const c of Object.values(state.candidates)) c.revision ??= 1;
    state.experiments ??= {};state.bReviews ??= [];
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
  saveSnapshot(snapshot: unknown): string {
    validateSnapshot(snapshot);
    if (JSON.stringify(sense(snapshot.world)) !== JSON.stringify(snapshot.bundle)) throw new Error('Snapshot perception does not match sensor adapter');
    return this.transact(s => { const id = randomUUID(); s.snapshots[id] = structuredClone(snapshot); return id; });
  }
  propose(snapshotId: string, feedback: string): Candidate {
    if (!feedback.trim() || feedback.length > 4000) throw new Error('Feedback must be 1–4000 characters');
    return this.transact(s => {
      const context = s.snapshots[snapshotId]; if (!context) throw new Error('Unknown snapshot');
      const c = candidateDraft(randomUUID(), feedback, context); s.candidates[c.id] = c;
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
      const child=candidateDraft(randomUUID(),reason,context);child.parentCandidateId=id;
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
      staleBase: c.context.rulesA.version !== active.A.version, recorded: compare(c.context, after), unseen: unseen(c.context.rulesA, after),
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
      const results=experimentRun(c.context,afterA,steps);
      const B:Experiment['B']={before:this.bMaterial(beforeB),after:this.bMaterial(afterB,mode==='preview'),status:mode==='preview'?'proposed':'approved-version'};
      const e:Experiment={id:randomUUID(),at:new Date().toISOString(),candidateId:id,candidateRevision:c.revision,mode,
        modelRevision:results.recorded.after.frames[0].trace.modelRevision,engineFingerprint:loadedFingerprint,
        provenance:{node:process.version,platform:process.platform,arch:process.arch,...gitProvenance(),
          lockSha256:hash(readFileSync(new URL('../package-lock.json',import.meta.url))),snapshotSha256:hash(JSON.stringify(c.context)),
          resultSha256:hash(JSON.stringify(results)),beforeBSha256:hash(B.before.markdown),afterBSha256:hash(B.after.markdown)},
        candidate:structuredClone(c),beforeA:structuredClone(beforeA),afterA:structuredClone(afterA),
        B,results};
      s.experiments[e.id]=e;return e;
    });
  }
  bPacket(experimentId: string) {
    const e=this.read().experiments[experimentId];if(!e)throw new Error('Unknown experiment');
    return { experimentId:e.id,candidateRevision:e.candidateRevision,B:e.B,cases:e.results.observationCases,
      instructions:'Use separate fresh conversations for no-principles / before B / after B. Give each conversation only its assigned B material (none for baseline) and the same observation-only cases, not this whole multi-arm packet or A results. Return decision, principle IDs, uncertainty, counterexample and self-review. Do not infer hidden world state. Human rugby assessment is separate from principle compliance.',
      externalExecution:'Manual in an existing AI conversation; no service called or result inferred by this export.' };
  }
  saveBReview(experimentId: string, model: string, output: string, assessment: string) {
    for(const [name,value,max] of [['model',model,400],['output',output,40000],['assessment',assessment,4000]] as const)
      if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${name} requires 1–${max} characters`);
    return this.transact(s=>{
      if(!s.experiments[experimentId])throw new Error('Unknown experiment');
      const review:BReview={id:randomUUID(),at:new Date().toISOString(),experimentId,model,output,assessment,status:'unverified-external-response',humanValidated:false};
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
