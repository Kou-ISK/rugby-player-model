import type { Candidate, RulesA, RulesB } from '../src/contracts';
import type { experimentRun } from '../src/research';
export type BMaterial = { version: string; markdown: string; structuredAmendments: RulesB['principles'] };
export type Experiment = {
  id: string; at: string; candidateId: string; candidateRevision: number; mode: 'preview' | 'active';
  modelRevision: string; engineFingerprint: string; candidate: Candidate;
  provenance: { node: string; platform: string; arch: string; gitCommit: string | null; gitDirty: boolean | null;
    lockSha256: string; snapshotSha256: string; resultSha256: string; beforeBSha256: string; afterBSha256: string };
  beforeA: RulesA; afterA: RulesA; B: { before: BMaterial; after: BMaterial; status: 'proposed' | 'approved-version' };
  results: ReturnType<typeof experimentRun>;
};
export type BReview = { id: string; at: string; experimentId: string; model: string; output: string; assessment: string;
  status: 'unverified-external-response'; humanValidated: false };
export const experimentSummary = (e: Experiment) => ({ id: e.id, at: e.at, candidateId: e.candidateId, candidateRevision: e.candidateRevision,
  mode: e.mode, steps: e.results.steps, modelRevision: e.modelRevision, versions: [e.beforeA.version, e.afterA.version],
  BVersions: [e.B.before.version, e.B.after.version], diagnostic: e.results.diagnostic });
