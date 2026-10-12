import type { Deliberation, ExecutionMode } from './execution-mode.js';
// Observation-only A contract v1. Units: meters, radians, seconds.
export type Vec = { x: number; z: number };
export type Action = 'scan' | 'hold' | 'carry' | 'pass' | 'support';
export type ContextRule = {
  id: string;
  when: { possession: 'any' | 'has-ball' | 'no-ball'; evidence: 'no-fresh-receiver' | 'fresh-receiver' | 'stale-player' | 'heard-call' | 'missing-player-vision' | 'observed-ball'; unlessCloseThreat: boolean };
  action: Action; weight: number; call?: 'support-call' | 'warning-call';
};
export type Body = { position: Vec; yaw: number; headYaw: number; eyeHeight: number; hasBall: boolean };
export type Percept = {
  id: string; entityId: string; kind: 'player' | 'ball' | 'call';
  relation: 'teammate' | 'opponent' | 'neutral'; modality: 'vision' | 'audio';
  observedAt: number; confidence: number; position?: Vec; bearing?: number; observerYaw?: number; cue?: string;
};
export type Bundle = {
  contractVersion: 1; playerId: string; time: number;
  self: Body; vision: { horizontalFov: number; range: number }; percepts: Percept[];
};
export type Memory = { episodes: Percept[]; lastTime: number };
export type Profile = {
  ability: { maxSpeed: number; passRange: number };
  selfEstimate: { passReliability: number };
  preference: { carry: number; pass: number; support: number };
  tactics: { preferredAction: Action; adherence: number };
};
export type RulesA = {
  version: string; scanBias: number; carryBias: number; passBias: number;
  memoryHalfLife: number; minimumConfidence: number;
  contextRules?: ContextRule[];
};
export type Belief = Percept & { currentConfidence: number; age: number; uncertaintyRadius: number };
export type Capability = 'locomotion' | 'headYaw' | 'gaze' | 'voice' | 'call' | 'pass' | 'jointPose' | 'muscleEffort' | 'posture';
export type BodyCommand = {
  channel: Capability; status: 'supported' | 'unsupported';
  value: number | string | Vec | Record<string, number>; reason?: string;
};
export type Evaluation = { action: Action; score: number; allowed: boolean; reason: string; targetId?: string };
export type Trace = {
  sensation: Bundle; attention: string[]; workingMemory: Belief[]; longTermMemory: Memory;
  beliefs: Belief[]; predictions: { entityId: string; basisObservedAt: number; position?: Vec; uncertaintyRadius: number; method: 'last-observation' }[];
  evaluation: Evaluation[]; intention: Evaluation; output: BodyCommand[]; rulesVersion: string;
  assessment: { uncertainThreat: number; informationValue: number; scanTarget?: { sourceId: string; headYaw: number; observedAt: number; modality: 'vision' | 'audio' } };
  modelRevision: 'cognition-0.3' | 'cognition-h-wm-1-v1';
  traceVersion?:2; deliberation?:Deliberation;
  appliedRules: { id: string; action: Action; weight: number; call?: string }[];
};
export type ObservationEvent = { sequence:number; trigger:'initial'|'head-turn'|'body-turn'|'step'|'configuration'|'restore';
  bundle:Bundle; profile:Profile; rulesA:RulesA; executionMode?:ExecutionMode };
export type ObservationSequence = { initialMemory: Memory; events: ObservationEvent[] };
