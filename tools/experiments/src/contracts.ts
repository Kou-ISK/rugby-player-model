import type { Baseline,BReplacement } from './judgment';
import type { ExecutionMode } from '../../../models/player/reference/src/execution-mode.js';
import type { Bundle, Memory, Profile, RulesA, ObservationEvent } from '../../../models/player/reference/src/contracts.js';
import type { World, SceneId, SceneRef } from '../../simulation/src/contracts';
export type StudyNotes = { rationale: string; expectedEffect: string; counterexample: string };
export type Principle = {
  id: string; condition: string; criterion: string; priority: number;
  exceptions: string; unknown: string; evidence: string;
};
export type RulesB = { version: string; principles: Principle[]; baseline?:Baseline; outputFormat?:2 };
export type Snapshot = {
  contractVersion: 1 | 2; scene: SceneId; seed: number | null; world: World;
  bundle: Bundle; memoryBefore: Memory; profile: Profile; rulesA: RulesA; rulesBVersion: string;
  observationHistory?: ObservationHistory; executionMode?:ExecutionMode;
};
export type ObservationHistory = { version:1|2; mode:'static-study'|'fixed-step-study'; sceneRef?:SceneRef; initialMemory:Memory; events:ObservationEvent[] };
export type Candidate = {
  id: string; revision: number; createdAt: string; feedback: string; context: Snapshot;
  principle: Principle; patchA: Partial<Omit<RulesA, 'version'>>;
  executionMode?:ExecutionMode; replacementB?:BReplacement; coaching?: CoachingWindow; notes?: StudyNotes; parentCandidateId?: string; evaluationSetId?: string;
  decisions: { A: 'pending' | 'approved' | 'rejected' | 'returned'; B: 'pending' | 'approved' | 'rejected' | 'returned' };
};
export type CoachingWindow = SceneRef & {playerId:string;fromTick:number;toTick:number};
export type ApplicationPoint = SceneRef & {playerId:string;tick:number;fromA:string;toA:string;fromB:string;toB:string;receiptId:string};
