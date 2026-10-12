// Contract v1; metric units, radians, seconds. +z is the attacking direction.
export type Vec = { x: number; z: number };
export type Action = 'scan' | 'hold' | 'carry' | 'pass' | 'support';
export type ContextRule = {
  id: string;
  when: { possession: 'any' | 'has-ball' | 'no-ball'; evidence: 'no-fresh-receiver' | 'fresh-receiver' | 'stale-player' | 'heard-call' | 'missing-player-vision' | 'observed-ball'; unlessCloseThreat: boolean };
  action: Action; weight: number; call?: 'support-call' | 'warning-call';
};
export type StudyNotes = { rationale: string; expectedEffect: string; counterexample: string };
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
export type Principle = {
  id: string; condition: string; criterion: string; priority: number;
  exceptions: string; unknown: string; evidence: string;
};
export type RulesB = { version: string; principles: Principle[] };
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
  modelRevision: 'cognition-0.3';
  appliedRules: { id: string; action: Action; weight: number; call?: string }[];
};
export type SceneId = 'support' | 'occluded' | 'audio' | 'heldout';
export type WorldEntity = { id: string; kind: 'player' | 'ball'; team: 'blue' | 'red' | 'none'; position: Vec; radius: number };
export type World = { scene: SceneId; seed: number; time: number; playerId: string; body: Body; entities: WorldEntity[]; calls: { id: string; position: Vec; cue: string }[];
  emittedCalls?: { at: number; playerId: string; cue: string }[] };
export type Snapshot = {
  contractVersion: 1; scene: SceneId; seed: number; world: World;
  bundle: Bundle; memoryBefore: Memory; profile: Profile; rulesA: RulesA; rulesBVersion: string;
  observationHistory?: ObservationHistory;
};
export type ObservationEvent = { sequence:number; trigger:'initial'|'head-turn'|'body-turn'|'step'|'configuration'|'restore';
  bundle:Bundle; profile:Profile; rulesA:RulesA };
export type ObservationHistory = { version:1; mode:'static-study'; initialMemory:Memory; events:ObservationEvent[] };
export type Candidate = {
  id: string; revision: number; createdAt: string; feedback: string; context: Snapshot;
  principle: Principle; patchA: Partial<Omit<RulesA, 'version'>>;
  notes?: StudyNotes; parentCandidateId?: string; evaluationSetId?: string;
  decisions: { A: 'pending' | 'approved' | 'rejected' | 'returned'; B: 'pending' | 'approved' | 'rejected' | 'returned' };
};
export const emptyMemory = (): Memory => ({ episodes: [], lastTime: 0 });
export const defaultProfile = (): Profile => ({
  ability: { maxSpeed: 5, passRange: 15 }, selfEstimate: { passReliability: 0.7 },
  preference: { carry: 0.5, pass: 0.5, support: 0.7 }, tactics: { preferredAction: 'pass', adherence: 0.3 },
});
export const defaultRulesA = (): RulesA => ({ version: 'A0', scanBias: 0, carryBias: 0, passBias: 0, memoryHalfLife: 4, minimumConfidence: 0.35 });
