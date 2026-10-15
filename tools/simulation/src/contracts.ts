import type { Vec, Body, Memory, Profile, Trace } from '../../../models/player/reference/src/contracts.js';
export type SceneId = 'support' | 'occluded' | 'audio' | 'heldout' | 'dynamic';
export type WorldEntity = { id: string; kind: 'player' | 'ball'; team: 'blue' | 'red' | 'none'; position: Vec; radius: number; yaw?: number };
export type World = { scene: SceneId; seed: number | null; time: number; playerId: string; body: Body; entities: WorldEntity[]; calls: { id: string; position: Vec; cue: string }[];
  dynamic?: {scene:SceneRevision;tick:number}; runtime?:MotorRuntime;
  emittedCalls?: { at: number; playerId: string; cue: string }[] };
export type Keyframe = { tick: number; position: Vec; yaw: number };
export type SceneDefinition = {
  sceneSchemaVersion: 1|2|3; ownAttackDirection?:1|-1; horizontalFovDegrees?:number; tickSeconds: 0.2; durationTicks: number; controlledPlayerId: string;
  actors: { id: string; team: 'blue'|'red'; initial: {position:Vec;yaw:number};
    motion: {kind:'controlled'} | {kind:'autonomous';profile:Profile} | {kind:'scripted';keyframes:Keyframe[]} }[];
  ball: {kind:'attached';carrierId:string} | {kind:'scripted';keyframes:Keyframe[]};
  calls: {startTick:number;endTick:number;sourceActorId:string;cue:'support-call'|'warning-call'}[];
};
export type SceneRef = {sceneId:string;revision:number;contentHash:string};
export type SceneRevision = SceneRef & {definition:SceneDefinition;generationSeed:number|null;trackingIds:string[];createdAt:string};

export type MotorRuntime={version:1;actors:{id:string;body:Body;memory:Memory;profile:Profile}[];
 ball:{mode:'held'|'flight'|'loose';position:Vec;velocity:Vec;carrierId?:string;releasedAt:number;pending?:{at:number;actorId:string;target:Vec}};
 events:{at:number;actorId:string;kind:'release'|'catch'|'contact'|'failure';reason:string}[];decisions:{id:string;trace:Trace}[]};
