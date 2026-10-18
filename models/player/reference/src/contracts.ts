import type { Deliberation, ExecutionMode } from './execution-mode.js';
// Current observation-only player contracts. Units: meters, radians, seconds.
export type Vec = { x: number; z: number };
export type Action = 'scan' | 'hold' | 'carry' | 'pass' | 'support' | 'evade' | 'defend' | 'receive' | 'tackle';
export type ContextRule = {
  id: string;
  when: { possession: 'any' | 'has-ball' | 'no-ball'; evidence: 'no-fresh-receiver' | 'fresh-receiver' | 'stale-player' | 'heard-call' | 'missing-player-vision' | 'observed-ball'; unlessCloseThreat: boolean };
  action: Action; weight: number; call?: 'support-call' | 'warning-call';
};
export type Body = { position: Vec; yaw: number; headYaw: number; eyeHeight: number; hasBall: boolean; motor?: {velocity:Vec;stoppedUntil:number;result:{action:string;status:'idle'|'running'|'completed'|'failed';at:number;reason:string}} };
export type Percept = {
  id: string; entityId: string; kind: 'player' | 'ball' | 'call';
  relation: 'teammate' | 'opponent' | 'neutral'; modality: 'vision' | 'audio';
  evidenceVersion: 2; bodyOrientation?: {yaw:number;halfWidth:number;confidence:number}; ballControl?: {holding:true;confidence:number};
  observedAt: number; confidence: number; position?: Vec; bearing?: number; observerYaw?: number; cue?: string;
};
export type Bundle = {
  contractVersion: 3; context?: {ownAttackDirection:1|-1}; playerId: string; time: number;
  self: Body; vision: { horizontalFov: number; range: number }; percepts: Percept[];
};
export type Memory = { episodes: Percept[]; lastTime: number; intent?:LoopPlan };
export type Profile = {
  ability: { maxSpeed: number; passRange: number };
  selfEstimate: { passReliability: number };
  preference: { carry: number; pass: number; support: number };
  tactics: { preferredAction: Action; adherence: number };
};
export type RulesA = {
  version: string; scanBias: number; carryBias: number; passBias: number;
  memoryHalfLife: number; minimumConfidence: number;
  contextRules?: ContextRule[]; mechanisms?:Mechanisms;
};
export type Belief = Percept & { currentConfidence: number; age: number; uncertaintyRadius: number };
export type Capability = 'locomotion' | 'headYaw' | 'gaze' | 'voice' | 'call' | 'pass' | 'jointPose' | 'muscleEffort' | 'posture' | 'heading' | 'tackle';
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
  modelRevision: string; sourceTraceVersion?:number;
  situation?: Situation;
  traceVersion:4; loop?:LoopTrace; deliberation?:Deliberation;
  appliedRules: { id: string; action: Action; weight: number; call?: string }[];
};
export type ObservationEvent = { sequence:number; trigger:'initial'|'head-turn'|'body-turn'|'step'|'configuration'|'restore';
  bundle:Bundle; profile:Profile; rulesA:RulesA; executionMode?:ExecutionMode };
export type ObservationSequence = { initialMemory: Memory; events: ObservationEvent[] };

export type Situation = {
 hypothesis:'orientation-phase-v1';
 selfOrientation:{bodyYaw:number;headYaw:number;viewYaw:number};
 phase:'attack-carrier'|'attack-support'|'defense'|'unknown';
 goal:'advance-with-ball'|'support-observed-carrier'|'protect-own-goal'|'locate-possession';
 ownAttackDirection:1|-1; possessionSources:{sourceId:string;observedAt:number;confidence:number}[];
 reason:string; actionScope:'confirmation-and-hold-only'|'kinematic-attack-skills'|'bounded-motor-skills';
 orientations:{sourceId:string;entityId:string;relation:Percept['relation'];observedAt:number;yaw:number;
  currentConfidence:number;angularHalfWidth:number;bodyRelativeYaw:number;facingObserver:'toward'|'away'|'uncertain'}[];
};

export type Mechanisms={motion:boolean;intention:boolean;local:boolean;tactics:boolean};
export type LoopPlan={action:Action;targetId?:string;startedAt:number;reviewAt:number;goal:Vec;phase:Situation['phase'];basis:string[]};
export type LoopEstimate={entityId:string;sourceIds:string[];observedAt:number;velocity:Vec;position:Vec;uncertainty:number;method:'two-observations'|'last-observation'};
export type LoopTrace={hypothesis:'closed-loop-v1';configuration:RulesA;ability:Profile['ability'];mechanisms:Mechanisms;estimates:LoopEstimate[];plan:LoopPlan;transition:'started'|'continued'|'switched';reason:string;goalConstraints:string[]};
