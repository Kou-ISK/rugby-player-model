import type { Memory, Profile, RulesA } from './contracts.js';
export const emptyMemory = (): Memory => ({ episodes: [], lastTime: 0 });
export const defaultProfile = (): Profile => ({
  ability: { maxSpeed: 5, passRange: 15 }, selfEstimate: { passReliability: 0.7 },
  preference: { carry: 0.5, pass: 0.5, support: 0.7 }, tactics: { preferredAction: 'pass', adherence: 0.3 },
});
export const defaultRulesA = (): RulesA => ({ version: 'A0', scanBias: 0, carryBias: 0, passBias: 0, memoryHalfLife: 4, minimumConfidence: 0.35 });
