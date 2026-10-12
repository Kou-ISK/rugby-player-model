import type { Vec, Body } from '../../../models/player/reference/src/contracts.js';
export type SceneId = 'support' | 'occluded' | 'audio' | 'heldout' | 'dynamic';
export type WorldEntity = { id: string; kind: 'player' | 'ball'; team: 'blue' | 'red' | 'none'; position: Vec; radius: number; yaw?: number };
export type World = { scene: SceneId; seed: number | null; time: number; playerId: string; body: Body; entities: WorldEntity[]; calls: { id: string; position: Vec; cue: string }[];
  dynamic?: {scene:SceneRevision;tick:number};
  emittedCalls?: { at: number; playerId: string; cue: string }[] };
export type Keyframe = { tick: number; position: Vec; yaw: number };
export type SceneDefinition = {
  sceneSchemaVersion: 1; tickSeconds: 0.2; durationTicks: number; controlledPlayerId: string;
  actors: { id: string; team: 'blue'|'red'; initial: {position:Vec;yaw:number};
    motion: {kind:'controlled'} | {kind:'scripted';keyframes:Keyframe[]} }[];
  ball: {kind:'attached';carrierId:string} | {kind:'scripted';keyframes:Keyframe[]};
  calls: {startTick:number;endTick:number;sourceActorId:string;cue:'support-call'|'warning-call'}[];
};
export type SceneRef = {sceneId:string;revision:number;contentHash:string};
export type SceneRevision = SceneRef & {definition:SceneDefinition;generationSeed:number|null;trackingIds:string[];createdAt:string};
