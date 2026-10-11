import type { Action, Belief, BodyCommand, Bundle, Evaluation, Memory, Profile, RulesA, Trace } from './contracts';
import { validate, validateEvidence } from './validation';
// No world, renderer or simulator import is permitted in this module.
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
export function think(bundle: Bundle, memory: Memory, profile: Profile, rules: RulesA): Trace {
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
  const fresh = beliefs.filter(b => b.modality === 'vision' && b.age <= .5 && b.position);
  const receiver = fresh.filter(b => b.relation === 'teammate' && b.position!.z < bundle.self.position.z - .5 &&
    dist(b.position!, bundle.self.position) <= profile.ability.passRange).sort((a, b) => a.entityId.localeCompare(b.entityId))[0];
  const threat = fresh.some(b => b.relation === 'opponent' && dist(b.position!, bundle.self.position) < 4);
  const unknown = fresh.filter(b => b.kind === 'player').length === 0;
  const personal: Record<Action, number> = {
    scan: (unknown ? .85 : .25) + rules.scanBias,
    hold: threat ? .6 : .1,
    carry: profile.preference.carry + rules.carryBias - (threat ? .5 : 0),
    pass: profile.preference.pass * profile.selfEstimate.passReliability + rules.passBias,
    support: profile.preference.support,
  };
  const allowed: Record<Action, boolean> = { scan: true, hold: true, carry: bundle.self.hasBall && !threat,
    pass: bundle.self.hasBall && !!receiver, support: !bundle.self.hasBall };
  const reason: Record<Action, string> = {
    scan: 'Reduce uncertainty by changing head direction; do not assume unseen space is clear.',
    hold: 'Preserve current body state while obtaining evidence.',
    carry: threat ? 'Close observed opponent: contact skill unsupported.' : 'Proprioceptive possession; no close observed threat (unseen threats remain possible).',
    pass: receiver ? 'Fresh observed backward receiver within ability range; pass execution unsupported.' : 'No fresh observed backward receiver within range.',
    support: 'No proprioceptive possession; move slowly along own heading, not toward hidden ball.',
  };
  const evaluation: Evaluation[] = (['scan', 'hold', 'carry', 'pass', 'support'] as Action[]).map(action => ({
    action, allowed: allowed[action], reason: reason[action],
    score: (1 - profile.tactics.adherence) * personal[action] + profile.tactics.adherence * (profile.tactics.preferredAction === action ? 1 : 0),
    ...(action === 'pass' && receiver ? { targetId: receiver.entityId } : {}),
  }));
  const intention = [...evaluation].filter(e => e.allowed).sort((a, b) => b.score - a.score || a.action.localeCompare(b.action))[0];
  const speed = intention.action === 'carry' ? Math.min(profile.ability.maxSpeed, 2) : intention.action === 'support' ? Math.min(profile.ability.maxSpeed, 1) : 0;
  const output: BodyCommand[] = [{ channel: 'locomotion', status: 'supported', value: { x: Math.sin(bundle.self.yaw) * speed, z: Math.cos(bundle.self.yaw) * speed } }];
  if (intention.action === 'scan') output.push({ channel: 'headYaw', status: 'supported', value: Math.sin(bundle.time * 1.5 + .5) * 2.1 });
  if (intention.action === 'pass') output.push({ channel: 'pass', status: 'unsupported', value: intention.targetId!, reason: 'Ball release/catch mechanics not implemented; intention only.' });
  return { sensation: structuredClone(bundle), attention: attended.map(p => p.id),
    workingMemory: beliefs.slice(-4), longTermMemory: { episodes, lastTime: bundle.time }, beliefs,
    predictions: beliefs.map(b => ({ entityId: b.entityId, basisObservedAt: b.observedAt, ...(b.position ? { position: { ...b.position } } : {}), uncertaintyRadius: b.uncertaintyRadius, method: 'last-observation' })),
    evaluation, intention, output, rulesVersion: rules.version };
}
export const capabilities = {
  locomotion: 'supported', headYaw: 'supported', gaze: 'unsupported', voice: 'unsupported',
  pass: 'unsupported', jointPose: 'unsupported', muscleEffort: 'unsupported', posture: 'unsupported',
} as const;
