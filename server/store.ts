import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultRulesA, type Candidate, type Principle, type RulesA, type RulesB, type Snapshot } from '../src/contracts';
import { validate, validateSnapshot } from '../src/validation';
import { candidateDraft, compare, unseen } from '../src/research';
import { sense } from '../src/simulation';
export type Target = 'A' | 'B';
type Event = { id: string; at: string; action: string; target?: Target; candidateId?: string; actor: string; version?: string;
  candidateRevision?: number; reviewedContent?: { patchA: Candidate['patchA']; principle: Principle }; confirmedVersion?: string };
export class ConflictError extends Error { readonly statusCode = 409; }
function checkRevision(c: Candidate, expected: number) {
  if (!Number.isInteger(expected) || expected < 1) throw new Error('expectedRevision is required');
  if (c.revision !== expected) throw new ConflictError('Candidate revision changed; reload and confirm the displayed content again');
}
export type State = { format: 1; revision: number; snapshots: Record<string, Snapshot>; candidates: Record<string, Candidate>;
  versionsA: Record<string, RulesA>; versionsB: Record<string, RulesB>; activeA: string[]; activeB: string[]; events: Event[] };
const initial = (): State => ({ format: 1, revision: 0, snapshots: {}, candidates: {}, versionsA: { A0: defaultRulesA() },
  versionsB: { B0: { version: 'B0', principles: [] } }, activeA: ['A0'], activeB: ['B0'], events: [] });
export class Store {
  readonly dir: string;
  constructor(directory = process.env.RPM_SESSION_DIR || '.rpm') { this.dir = resolve(directory); mkdirSync(this.dir, { recursive: true, mode: 0o700 }); }
  read(): State {
    const file = join(this.dir, 'state.json');
    const state: State = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : initial();
    if (state.format !== 1 || !Number.isInteger(state.revision)) throw new Error('Unsupported/corrupt session format');
    // Legacy sessions retain their data. Historical events are not retroactively attested.
    for (const c of Object.values(state.candidates)) c.revision ??= 1;
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
  edit(id: string, patchA: Candidate['patchA'], principle: Principle, expectedRevision: number): Candidate {
    validate('PatchA', patchA); validate('Principle', principle);
    return this.transact(s => {
      const c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
      checkRevision(c, expectedRevision);
      if (c.decisions.A !== 'pending' || c.decisions.B !== 'pending') throw new Error('Reviewed candidate is immutable; create another candidate');
      c.patchA = structuredClone(patchA); c.principle = structuredClone(principle); c.revision++;
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: 'edit', candidateId: id, candidateRevision: c.revision, actor: 'local' }); return c;
    });
  }
  review(id: string, target: Target, decision: 'approve' | 'reject', actor: string, expectedRevision: number): State {
    if (actor !== 'owner') throw new Error('Explicit owner approval required (--by owner)');
    if (!['A','B'].includes(target) || !['approve','reject'].includes(decision)) throw new Error('Invalid review');
    return this.transact(s => {
      const c = s.candidates[id]; if (!c) throw new Error('Unknown candidate');
      checkRevision(c, expectedRevision);
      if (c.decisions[target] !== 'pending') throw new Error('Already reviewed');
      let version: string | undefined;
      if (decision === 'approve' && target === 'A') {
        if (!Object.keys(c.patchA).length) throw new Error('Edit explicit A patch first');
        if (c.context.rulesA.version !== this.active(s).A.version) throw new ConflictError('Stale A base: capture a new snapshot and propose again');
        version = `A${Object.keys(s.versionsA).length}`;
        const rules = { ...this.active(s).A, ...c.patchA, version }; validate('RulesA', rules);
        s.versionsA[version] = rules; s.activeA.push(version);
      }
      if (decision === 'approve' && target === 'B') {
        if (Object.values(c.principle).some(v => typeof v === 'string' && v.includes('TODO:'))) throw new Error('Complete B principle fields first');
        if (c.context.rulesBVersion !== this.active(s).B.version) throw new ConflictError('Stale B base: capture a new snapshot and propose again');
        version = `B${Object.keys(s.versionsB).length}`;
        s.versionsB[version] = { version, principles: [...this.active(s).B.principles, structuredClone(c.principle)] }; s.activeB.push(version);
      }
      c.decisions[target] = decision === 'approve' ? 'approved' : 'rejected';
      s.events.push({ id: randomUUID(), at: new Date().toISOString(), action: decision, candidateId: id, target, actor,
        candidateRevision: expectedRevision, reviewedContent: structuredClone({ patchA: c.patchA, principle: c.principle }),
        ...(version ? { version } : {}) }); return s;
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
  exportB() {
    const { B } = this.active();
    // A repository draft edit must not silently change an already reviewed local B export.
    const base = readFileSync(new URL('../docs/versions/RUGBY_JUDGMENT-B0.md', import.meta.url), 'utf8');
    return base + `\n\n## Local owner-approved amendments (${B.version})\n` + B.principles.map(p =>
      `\n### ${p.id}\n- Condition: ${p.condition}\n- Criterion: ${p.criterion}\n- Priority: ${p.priority}\n- Exceptions: ${p.exceptions}\n- Unknown: ${p.unknown}\n- Evidence: ${p.evidence}\n`).join('');
  }
}
