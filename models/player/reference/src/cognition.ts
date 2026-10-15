import { enhanceLoop } from './loop.js';
import { assessSituation } from './situation.js';
import { validateMode, selectDeliberation, type ExecutionMode } from './execution-mode.js';
import type { Action, Belief, BodyCommand, Bundle, Evaluation, Memory, Profile, RulesA, Trace } from './contracts.js';
import { validate, validateEvidence } from './validation.js';
// No world, renderer or simulator import is permitted in this module.
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const angle = (v: number) => Math.atan2(Math.sin(v), Math.cos(v));
export function think(bundle: Bundle, memory: Memory, profile: Profile, rules: RulesA): Trace {
  return evaluate(bundle,memory,profile,rules);
}
export function thinkWithMode(bundle:Bundle,memory:Memory,profile:Profile,rules:RulesA,mode:ExecutionMode):Trace {
  validateMode(mode);return evaluate(bundle,memory,profile,rules,mode.mode==='legacy'?undefined:mode);
}
function evaluate(bundle:Bundle,memory:Memory,profile:Profile,rules:RulesA,mode?:Extract<ExecutionMode,{mode:'h-wm-1'}>):Trace {
  validateEvidence(bundle, memory); validate('Profile', profile); validate('RulesA', rules);
  if (bundle.time < memory.lastTime) throw new Error('Clock moved backwards; restore snapshot memory');
  const salience = (p: Bundle['percepts'][number]) => p.kind === 'call' ? 3 : p.kind === 'ball' ? 2 : 1;
  const attended = [...bundle.percepts].sort((a, b) => salience(b) - salience(a) || a.id.localeCompare(b.id)).slice(0, 4);
  const merged = new Map(memory.episodes.map(p => [p.id, structuredClone(p)]));
  for (const p of attended) { if (p.observedAt > bundle.time) throw new Error('Future observation'); merged.set(p.id, structuredClone(p)); }
  const episodes = [...merged.values()].filter(p => bundle.time - p.observedAt <= 30).slice(-128);
  const latest = new Map<string, Belief>();
  for (const p of episodes) {
    const age = bundle.time - p.observedAt;
    const belief = { ...p, age, currentConfidence: p.confidence * 2 ** (-age / rules.memoryHalfLife), uncertaintyRadius: .3 + age * 2 };
    const key = p.entityId + ':' + p.modality;
    if (!latest.has(key) || latest.get(key)!.observedAt < p.observedAt) latest.set(key, belief);
  }
  const beliefs = [...latest.values()].filter(b => b.currentConfidence >= rules.minimumConfidence);
  const situation=bundle.contractVersion>=2?assessSituation(bundle,beliefs,rules):undefined;
  const attackDirection=situation?.ownAttackDirection??1;
  const deliberation=mode?selectDeliberation(beliefs,attended,mode):undefined;
  const predictions: Trace['predictions'] = beliefs.map(b => ({ entityId: b.entityId, basisObservedAt: b.observedAt,
    ...(b.position ? { position: { ...b.position } } : {}), uncertaintyRadius: b.uncertaintyRadius, method: 'last-observation' }));
  // Engineering hypothesis: old evidence changes risk/information value, never current fact or pass eligibility.
  let uncertainThreat = 0;
  const scanRequests: { value: number; target: NonNullable<Trace['assessment']['scanTarget']> }[] = [];
  for (const [index, b] of beliefs.entries()) {
    const prediction = predictions[index];
    if (b.modality === 'vision' && b.kind === 'player' && b.age > .5 && prediction.position) {
      const d = dist(prediction.position, bundle.self.position);
      // The uncertainty disk may overlap the player's near region. Its center is NOT a current location.
      const risk = b.relation === 'opponent' ? b.currentConfidence * clamp((4 - Math.max(0, d - prediction.uncertaintyRadius)) / 4) : 0;
      uncertainThreat = Math.max(uncertainThreat, risk);
      const information = b.currentConfidence * Math.min(b.age / 2, 1) * (1 - clamp(prediction.uncertaintyRadius / 40, 0, .8));
      if (d <= bundle.vision.range + prediction.uncertaintyRadius) scanRequests.push({ value: information + risk,
        target: { sourceId: b.id, observedAt: b.observedAt, modality: 'vision',
          headYaw: clamp(angle(Math.atan2(prediction.position.x - bundle.self.position.x, prediction.position.z - bundle.self.position.z) - bundle.self.yaw), -2.4, 2.4) } });
    }
    if (b.modality === 'audio' && b.bearing !== undefined && (b.observerYaw !== undefined || b.age === 0)) {
      // Retain the observation's yaw frame; a remembered call does not rotate with the current body.
      // Old audio without a frame cannot supply a remembered direction.
      const cueWeight = b.cue === 'warning-call' ? 1.4 : b.cue === 'support-call' ? 1.1 : .25;
      scanRequests.push({ value: b.currentConfidence * cueWeight,
        target: { sourceId: b.id, observedAt: b.observedAt, modality: 'audio',
          headYaw: clamp(angle((b.observerYaw ?? bundle.self.yaw) + b.bearing - bundle.self.yaw), -2.4, 2.4) } });
    }
  }
  scanRequests.sort((a,b) => b.value - a.value || a.target.sourceId.localeCompare(b.target.sourceId));
  const selectedScan = scanRequests[0];
  const assessment: Trace['assessment'] = { uncertainThreat, informationValue: selectedScan?.value ?? 0,
    ...(selectedScan ? { scanTarget: selectedScan.target } : {}) };
  const fresh = beliefs.filter(b => b.modality === 'vision' && b.age <= .5 && b.position);
  const legacyReceiver = fresh.filter(b => b.relation === 'teammate' && (b.position!.z-bundle.self.position.z)*attackDirection < -.5 &&
    dist(b.position!, bundle.self.position) <= profile.ability.passRange).sort((a, b) => a.entityId.localeCompare(b.entityId))[0];
  const receiver=deliberation?deliberation.selected.find(b=>b.modality==='vision'&&b.age<=.5&&b.position&&b.relation==='teammate'&&(b.position.z-bundle.self.position.z)*attackDirection<-.5&&dist(b.position,bundle.self.position)<=profile.ability.passRange):legacyReceiver;
  const threat = fresh.some(b => b.relation === 'opponent' && dist(b.position!, bundle.self.position) < 4);
  const unknown = fresh.filter(b => b.kind === 'player').length === 0;
  const signals = {
    'no-fresh-receiver': !legacyReceiver, 'fresh-receiver': !!legacyReceiver,
    'stale-player': beliefs.some(b => b.kind === 'player' && b.age > .5),
    'heard-call': beliefs.some(b => b.modality === 'audio'),
    'missing-player-vision': unknown, 'observed-ball': fresh.some(b => b.kind === 'ball'),
  };
  const appliedRules = (rules.contextRules ?? []).filter(rule =>
    (rule.when.possession === 'any' || (rule.when.possession === 'has-ball') === bundle.self.hasBall) &&
    signals[rule.when.evidence] && !(rule.when.unlessCloseThreat && threat));
  const personal: Record<string, number> = {
    scan: (unknown ? .85 : .25) + rules.scanBias + assessment.informationValue - (threat ? .8 : 0),
    hold: threat ? .9 : .1 + uncertainThreat * .6,
    carry: profile.preference.carry + rules.carryBias - (threat ? .5 : 0) - uncertainThreat * 1.2,
    pass: profile.preference.pass * profile.selfEstimate.passReliability + rules.passBias,
    support: profile.preference.support - uncertainThreat * .8,
  };
  // Declared conditional preferences cannot change evidence or bypass hard eligibility.
  for (const rule of appliedRules) if(rule.action in personal)personal[rule.action] += rule.weight;
  const allowed: Record<string, boolean> = { scan: true, hold: true, carry: bundle.self.hasBall && !threat,
    pass: bundle.self.hasBall && !!receiver, support: !bundle.self.hasBall && (!situation||situation.phase==='attack-support') };
  if(situation?.actionScope==='confirmation-and-hold-only'){allowed.carry=false;allowed.pass=false;allowed.support=false;}
  const reason: Record<string, string> = {
    scan: selectedScan ? `Seek new evidence toward ${selectedScan.target.modality} cue ${selectedScan.target.sourceId} observed at ${selectedScan.target.observedAt}s; location remains uncertain.` : 'Reduce uncertainty by changing head direction; do not assume unseen space is clear.',
    hold: 'Preserve current body state while obtaining evidence.',
    carry: threat ? 'Close observed opponent: contact skill unsupported.' : `Proprioceptive possession; remembered uncertainty risk ${uncertainThreat.toFixed(3)} penalizes progress. Unseen threats remain possible.`,
    pass: deliberation ? (receiver ? 'Selected fresh backward receiver within ability range; receiver deliberation only, pass execution unsupported.' : 'No eligible receiver in the deliberation set; retained evidence may exist outside capacity.') : receiver ? 'Fresh observed backward receiver within ability range; pass execution unsupported.' : 'No fresh observed backward receiver within range.',
    support: situation?`Phase ${situation.phase}: support requires recent teammate possession evidence. Defense and unknown possession only permit confirmation/hold; defense skills are not implemented.`:'No proprioceptive possession; move slowly along own heading, not toward hidden ball.',
  };
  const evaluation: Evaluation[] = (['scan', 'hold', 'carry', 'pass', 'support'] as Action[]).map(action => ({
    action, allowed: allowed[action], reason: reason[action] + appliedRules.filter(r => r.action === action).map(r => ` Conditional principle ${r.id}: ${r.weight}.`).join(''),
    score: (1 - profile.tactics.adherence) * personal[action] + profile.tactics.adherence * (profile.tactics.preferredAction === action ? 1 : 0),
    ...(action === 'pass' && receiver ? { targetId: receiver.entityId } : {}),
  }));
  const intention = [...evaluation].filter(e => e.allowed).sort((a, b) => b.score - a.score || a.action.localeCompare(b.action))[0];
  const requestedSpeed = intention.action === 'carry' ? Math.min(profile.ability.maxSpeed, 2) : intention.action === 'support' ? Math.min(profile.ability.maxSpeed, 1) : 0;
  const speed = requestedSpeed * (1 - .8 * uncertainThreat);
  const output: BodyCommand[] = [{ channel: 'locomotion', status: 'supported', value: { x: Math.sin(bundle.self.yaw) * speed, z: Math.cos(bundle.self.yaw) * speed } }];
  if (intention.action === 'scan') output.push({ channel: 'headYaw', status: 'supported',
    value: selectedScan?.target.headYaw ?? Math.sin(bundle.time * 1.5 + .5) * 2.1,
    reason: selectedScan ? 'Orient toward an uncertain remembered/called direction; obtain a new observation before asserting location.' : 'Exploratory scan without a located cue.' });
  if (intention.action === 'pass') output.push({ channel: 'pass', status: 'unsupported', value: intention.targetId!, reason: 'Ball release/catch mechanics not implemented; intention only.' });
  const call = [...appliedRules].filter(r => r.action === intention.action && r.call).sort((a,b) => b.weight-a.weight || a.id.localeCompare(b.id))[0];
  if (call) output.push({ channel: 'call', status: 'supported', value: call.call!, reason: `Semantic simulated event from ${call.id}; no acoustic voice or teammate response is implemented.` });
  const result:Trace={ sensation: structuredClone(bundle), attention: attended.map(p => p.id),
    workingMemory: beliefs.slice(-4), longTermMemory: { episodes, lastTime: bundle.time }, beliefs,
    predictions, assessment, modelRevision: situation?'cognition-orientation-phase-v1':mode?'cognition-h-wm-1-v1':'cognition-0.3', ...(deliberation?{traceVersion:2 as const,deliberation}:{}), ...(situation?{traceVersion:3 as const,situation}:{}), appliedRules: appliedRules.map(({id,action,weight,call})=>({id,action,weight,...(call?{call}:{})})), evaluation, intention, output, rulesVersion: rules.version };
  return bundle.contractVersion===3?enhanceLoop(result,memory,profile,rules):result;
}
export const capabilities = {
  locomotion: 'supported', headYaw: 'supported', call: 'supported', gaze: 'unsupported', voice: 'unsupported',
  pass: 'unsupported', jointPose: 'unsupported', muscleEffort: 'unsupported', posture: 'unsupported',
} as const;
