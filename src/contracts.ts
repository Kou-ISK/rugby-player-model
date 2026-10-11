// Contract v1; metric units, radians, seconds. +z is the attacking direction.
export type Vec = { x: number; z: number };
export type Action = 'scan' | 'hold' | 'carry' | 'pass' | 'support';
export type Body = { position: Vec; yaw: number; headYaw: number; eyeHeight: number; hasBall: boolean };
export type Percept = {
  id: string; entityId: string; kind: 'player' | 'ball' | 'call';
  relation: 'teammate' | 'opponent' | 'neutral'; modality: 'vision' | 'audio';
  observedAt: number; confidence: number; position?: Vec; bearing?: number; cue?: string;
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
};
export type Principle = {
  id: string; condition: string; criterion: string; priority: number;
  exceptions: string; unknown: string; evidence: string;
};
export type RulesB = { version: string; principles: Principle[] };
export type Belief = Percept & { currentConfidence: number; age: number; uncertaintyRadius: number };
export type Capability = 'locomotion' | 'headYaw' | 'gaze' | 'voice' | 'pass' | 'jointPose' | 'muscleEffort' | 'posture';
export type BodyCommand = {
  channel: Capability; status: 'supported' | 'unsupported';
  value: number | string | Vec | Record<string, number>; reason?: string;
};
export type Evaluation = { action: Action; score: number; allowed: boolean; reason: string; targetId?: string };
export type Trace = {
  sensation: Bundle; attention: string[]; workingMemory: Belief[]; longTermMemory: Memory;
  beliefs: Belief[]; predictions: { entityId: string; basisObservedAt: number; position?: Vec; uncertaintyRadius: number; method: 'last-observation' }[];
  evaluation: Evaluation[]; intention: Evaluation; output: BodyCommand[]; rulesVersion: string;
};
export type SceneId = 'support' | 'occluded' | 'audio' | 'heldout';
export type WorldEntity = { id: string; kind: 'player' | 'ball'; team: 'blue' | 'red' | 'none'; position: Vec; radius: number };
export type World = { scene: SceneId; seed: number; time: number; playerId: string; body: Body; entities: WorldEntity[]; calls: { id: string; position: Vec; cue: string }[] };
export type Snapshot = {
  contractVersion: 1; scene: SceneId; seed: number; world: World;
  bundle: Bundle; memoryBefore: Memory; profile: Profile; rulesA: RulesA; rulesBVersion: string;
};
export type Candidate = {
  id: string; createdAt: string; feedback: string; context: Snapshot;
  principle: Principle; patchA: Partial<Omit<RulesA, 'version'>>;
  decisions: { A: 'pending' | 'approved' | 'rejected'; B: 'pending' | 'approved' | 'rejected' };
};
export const emptyMemory = (): Memory => ({ episodes: [], lastTime: 0 });
export const defaultProfile = (): Profile => ({
  ability: { maxSpeed: 5, passRange: 15 }, selfEstimate: { passReliability: 0.7 },
  preference: { carry: 0.5, pass: 0.5, support: 0.7 }, tactics: { preferredAction: 'pass', adherence: 0.3 },
});
export const defaultRulesA = (): RulesA => ({ version: 'A0', scanBias: 0, carryBias: 0, passBias: 0, memoryHalfLife: 4, minimumConfidence: 0.35 });
