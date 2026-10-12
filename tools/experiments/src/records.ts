import type { RulesA, Bundle, Memory, Profile, Trace, Body, ObservationEvent } from '../../../models/player/reference/src/contracts.js';
import type { Candidate, RulesB, Snapshot, CoachingWindow } from './contracts';
import type { SceneId } from '../../simulation/src/contracts';
import type { AnonymousCase, BCaseMap, FrozenEvaluation, BArm, CaseGroup, ExposureReason } from './evaluation';
// Persistent legacy experiment contract v1. Function return types do not own stored data.
export const LEGACY_EXPERIMENT_FORMAT = 1 as const;
export type ObservationCase = { group:'recorded'|CaseGroup;caseId:string;scene:SceneId;seed:number|null;
  bundle:Bundle;memoryBefore:Memory;profile:Profile;initialMemory?:Memory;observations?:Bundle[] };
export type SceneDiagnostics = {overlaps:string[][];contactResolution:string;ballPhysics:string;otherActors:string}|null;
export type ReplayFrame = {time:number;body:Body;diagnostics:SceneDiagnostics;trace:Trace};
export type ReplayResult = {frames:ReplayFrame[];termination:'scene-end'|'coaching-window-end'|'step-budget';
  finalTime:number;finalTick:number|null;finalSelf:Body;emittedCalls:{at:number;playerId:string;cue:string}[]};
export type ObservationReplay = {mode:'static-study'|'fixed-step-study';
  frames:{sequence:number;trigger:ObservationEvent['trigger'];time:number;trace:Trace}[];
  memoryBeforeLast:Memory;finalTrace:Trace;timing:string};
export type RecordedInput = {snapshot:Snapshot;source:'captured-snapshot'|'coaching-window-first-acquisition';
  sourceSequence:number|null;window:CoachingWindow|null};
export type ReplayPair = {comparisonKind:'same-scene-closed-loop';sameInitialConditions:boolean;before:ReplayResult;after:ReplayResult};
export type ExperimentResults = {steps:number;dt:number;profilePolicy:'candidate-profile-fixed';regressionKind:'published-fixed-regression';
  recordedInput:RecordedInput;recorded:ReplayPair;
  trials:({caseId:string;seed:number;strata:string[]}&ReplayPair)[];
  frozenTrials:({caseId:string}&ReplayPair)[];
  observedHistory:{before:ObservationReplay;after:ObservationReplay}|null;
  diagnostic:{distinctFirstActions:Trace['intention']['action'][];homogeneousWarning:boolean;interpretation:string};
  observationCases:ObservationCase[]};
export type BInputSet = {modelCases:AnonymousCase[];evaluatorMap:BCaseMap[]};
export type BMaterial = { version: string; markdown: string; structuredAmendments: RulesB['principles'] };
export type Experiment = {
  id: string; at: string; candidateId: string; candidateRevision: number; mode: 'preview' | 'active';
  modelRevision: string; engineFingerprint: string; engineFingerprintFormat?: 'source-files-v2' | 'source-manifest-v1'; candidate: Candidate;
  provenance: { node: string; platform: string; arch: string; gitCommit: string | null; gitDirty: boolean | null;
    lockSha256: string; snapshotSha256: string; resultSha256: string; beforeBSha256: string; afterBSha256: string };
  beforeA: RulesA; afterA: RulesA; B: { before: BMaterial; after: BMaterial; status: 'proposed' | 'approved-version' };
  results: ExperimentResults;
  evaluation?: {set:FrozenEvaluation;useIndex:number;exposure?:{policy:'dynamic-lineage-and-acquired-observations-v1';matches:{experimentId:string;frozenCaseIndex:number;reasons:ExposureReason[]}[]};status:'first-recorded-use-owner-declared'|'reused-not-unseen'};
  bInputs?:BInputSet;
};
export type BReview = { id: string; at: string; experimentId: string; model: string; output: string; assessment: string;
  status: 'unverified-external-response'; humanValidated: false; arm?:BArm; group?:CaseGroup; inputSha256?:string };
export const experimentSummary = (e: Experiment) => ({ id: e.id, at: e.at, candidateId: e.candidateId, candidateRevision: e.candidateRevision,
  mode: e.mode, steps: e.results.steps, modelRevision: e.modelRevision, versions: [e.beforeA.version, e.afterA.version],
  BVersions: [e.B.before.version, e.B.after.version], diagnostic: e.results.diagnostic });
