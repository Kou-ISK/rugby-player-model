import { legacyMode, type ExecutionMode } from '../../models/player/reference/src/execution-mode.js';
// Application composition root: authored cases are supplied to the experiment tools here.
import { regressionCases } from '../../evaluation/cases/known-regressions';
import { regressionCompare as compareCases, experimentRun as runCases } from '../experiments/src/compare';
import type { RulesA, Profile } from '../../models/player/reference/src/contracts.js';
import type { Snapshot, CoachingWindow } from '../experiments/src/contracts';
export * from '../experiments/src/capture';
export * from '../experiments/src/candidates';
export { compare, coachingReplayInput, replay } from '../experiments/src/compare';
export { regressionCases };
export const regressionCompare=(before:RulesA,after:RulesA,profile:Profile,beforeMode:ExecutionMode=legacyMode(),afterMode:ExecutionMode=legacyMode())=>compareCases(before,after,profile,regressionCases(before,profile),beforeMode,afterMode);
export const experimentRun=(snapshot:Snapshot,after:RulesA,steps:number,frozen:{id:string;snapshot:Snapshot}[]=[],window?:CoachingWindow,afterMode:ExecutionMode=snapshot.executionMode??legacyMode())=>runCases(snapshot,after,steps,frozen,window,regressionCases(snapshot.rulesA,snapshot.profile),afterMode);
