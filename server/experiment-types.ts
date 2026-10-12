import type { Candidate, RulesA, RulesB } from '../src/contracts';
import type { experimentRun } from '../src/research';
import type { anonymizeCases, FrozenEvaluation, BArm, CaseGroup, ExposureReason } from './evaluation';
export type BMaterial = { version: string; markdown: string; structuredAmendments: RulesB['principles'] };
export type Experiment = {
  id: string; at: string; candidateId: string; candidateRevision: number; mode: 'preview' | 'active';
  modelRevision: string; engineFingerprint: string; candidate: Candidate;
  provenance: { node: string; platform: string; arch: string; gitCommit: string | null; gitDirty: boolean | null;
    lockSha256: string; snapshotSha256: string; resultSha256: string; beforeBSha256: string; afterBSha256: string };
  beforeA: RulesA; afterA: RulesA; B: { before: BMaterial; after: BMaterial; status: 'proposed' | 'approved-version' };
  results: ReturnType<typeof experimentRun>;
  evaluation?: {set:FrozenEvaluation;useIndex:number;exposure?:{policy:'dynamic-lineage-and-acquired-observations-v1';matches:{experimentId:string;frozenCaseIndex:number;reasons:ExposureReason[]}[]};status:'first-recorded-use-owner-declared'|'reused-not-unseen'};
  bInputs?:ReturnType<typeof anonymizeCases>;
};
export type BReview = { id: string; at: string; experimentId: string; model: string; output: string; assessment: string;
  status: 'unverified-external-response'; humanValidated: false; arm?:BArm; group?:CaseGroup; inputSha256?:string };
export const experimentSummary = (e: Experiment) => ({ id: e.id, at: e.at, candidateId: e.candidateId, candidateRevision: e.candidateRevision,
  mode: e.mode, steps: e.results.steps, modelRevision: e.modelRevision, versions: [e.beforeA.version, e.afterA.version],
  BVersions: [e.B.before.version, e.B.after.version], diagnostic: e.results.diagnostic });
