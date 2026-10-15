# Frozen evaluation conditions, anonymous judgment inputs and observation history

[English](PROTOCOL.md) | [日本語](PROTOCOL.ja.md)

See [dynamic scenes](../tools/workbench/docs/DYNAMIC_SCENES.md) for fixed-step stimuli and optional independent actors. Passing eight fixed cases does not establish transfer to unfamiliar situations. This document describes procedures and records, not completed owner coaching or external AI evaluation; actual status belongs in session evidence.

## Separate regressions from prospectively frozen conditions

The eight fixed cases are `published-fixed-regression`. Quick previews and recorded experiments copy the candidate's **entire profile**—ability, self-estimate, preference and tactical adherence—to both arms of every case. Do not revert to defaults or compare different profiles as identical controls.

For conditions not used in coaching:

1. The owner and evaluator select conditions and success/failure criteria before coaching. Author knowledge is distinct from coaching exposure. A renamed public example or changed seed alone is not unseen.
2. Set the desired profile in the UI and capture evaluation snapshots with scene, seed, orientation and history. Reset retains profile; CLI `snapshot` uses the default, so use actual UI snapshots or an explicitly matched evaluator fixture for the owner's profile.
3. Export full evaluator-only snapshots and prepare the following plan. The owner confirms profile, conditions, criteria and non-use attestation before freezing; manual JSON authoring by the owner is unnecessary.

```sh
npm run --silent bridge -- snapshot-export SNAPSHOT_ID > .rpm/evaluation-case.json
npm run bridge -- freeze-evaluation --file .rpm/evaluation-plan.json
npm run bridge -- evaluation-sets
```

```text
{
  "criteria": "Predetermined scoring, invariants and refuting outcomes",
  "noveltyAttestation": "not-used-for-coaching",
  "cases": [{ "label": "Evaluator-only label", "snapshot": <full saved snapshot object> }]
}
```

Replace the explanatory placeholder with actual JSON. Accepts 1–12 cases and checks identical profiles, sensor consistency and duplicate observed conditions. Freeze time, session revision, criteria, inputs, profile and digest; no edit API exists.

4. **After freezing**, choose a separate coaching scene and select the frozen set before proposing: `propose SNAPSHOT_ID --feedback "Owner coaching" --evaluation-set FROZEN_SET_ID`. Profile mismatch and coaching on frozen conditions are rejected. No retroactive attachment to existing candidates; changed conditions require a new set before a new candidate.
5. Edit and record the unadopted candidate. Fixed regressions and `frozenTrials` remain separate, each paired on identical initial conditions/profile with frozen criteria.

First use is `first-recorded-use-owner-declared`, **not independently proven novelty**; repeated use is `reused-not-unseen`. New set IDs do not hide identical past observation/memory/profile exposure. Later coaching on evaluation conditions blocks that set's experiment without altering past approvals/undo.

Detection is session-local; it cannot detect other conversations/sessions, similar conditions or prior knowledge. Keep criteria/answers outside editing contexts. If evaluation exposure informs revision, prepare new unused conditions. Neither freezing nor changed behavior proves transfer.

## Player input versus evaluator-only material

A judgment-model input contains one arm's principles and anonymous cases only. Exclude situation names, scene/seed, strata, scoring criteria, executable outputs, world truth and experiment IDs. Random anonymous case IDs and within-case player/audio/observation IDs preserve observed relations, cues, positions and original time/confidence. All arms share IDs, ordering and observations within the experiment.

```sh
npm run --silent bridge -- judgment-packet EXPERIMENT_ID --arm none --cases frozen > .rpm/judgment-none.json
npm run --silent bridge -- judgment-packet EXPERIMENT_ID --arm before --cases frozen > .rpm/judgment-before.json
npm run --silent bridge -- judgment-packet EXPERIMENT_ID --arm after --cases frozen > .rpm/judgment-after.json
npm run --silent bridge -- judgment-evaluator-map EXPERIMENT_ID > .rpm/judgment-evaluator-only.json
```

Use `--cases regression` only for known regressions. Do not include the coached scene in these case groups. Record a new experiment when an old record lacks anonymous input; never rewrite history to imply it was blinded.

The owner supplies one arm per fresh conversation, with no other-arm answers, coaching, criteria or mapping. Keep model/settings and per-case conversation grouping consistent, recording deviations. External submission is an explicit owner action; the bridge calls no AI API or new paid service.

The separate evaluator map retains original labels, scene/seed, ID mappings and criteria. **Never send it to the player-role model.** Use it to score compliance and rugby plausibility independently.

```json
{"arm":"after","group":"frozen","model":"Actual model/settings/date","output":"Full answer with anonymous IDs","assessment":"Owner scores, uncertainties and counterexamples"}
```

Save with `judgment-review EXPERIMENT_ID --file .rpm/judgment-response.json`, or select arm/group in the UI. Linking arm/group/input hash does not prove the external service used that input. Responses remain unverified with `humanValidated:false`; synthetic mocks are not real AI evaluation or owner assessment.

## Looking and observation time

Paused head/body turns do not advance simulation time. Record sequence, action kind, bundle, pose, profile and model settings per change; duplicate same-angle UI notifications add nothing. Static studies use `static-study`; dynamic histories use `fixed-step-study`. Neither measures independent eye motion or actual turning speed.

A step is 0.2 seconds; playback repeats steps without catching up to wall time after browser delays. Thinking while paused does not age memory. Do not infer reaction time; histories claiming `realtime` or time-advancing manual turns are rejected.

History replay feeds saved bundles in order with their original profile/rules, without querying world truth or advancing the live clock. This distinguishes last-frame-only judgment from judgment using acquired earlier evidence. Snapshots/candidates retain acquired histories:

```sh
npm run --silent bridge -- history-replay SNAPSHOT_ID > .rpm/observation-replay.json
```

`observedHistory` fixes the acquired sequence and candidate profile across rules; it cannot assess action-driven changes in later observation. `recorded`, `trials` and `frozenTrials` fix initial conditions and permit subsequent world/observation divergence. Keep these interpretations separate.

A saved segment holds at most 256 events without truncation. Current UI normally saves at 224 and continues with an immutable predecessor reference; see [player view](../tools/workbench/docs/PLAYER_VIEW.md). Save before reset; restore preserves recorded evidence and adds an explicit setting event if approved rules changed. Do not invent unrecorded turns for old snapshots; start a new segment from their saved memory.

## Manual interpretation boundary

| Work | Responsibility |
|---|---|
| Save short coaching and scene | UI/bridge records text, not interpretation |
| Interpret meaning, scope, exceptions and ambiguity | Owner and conversational assistant; no automatic compiler |
| Write executable patch, independent principles and notes | Assistant prepares/saves JSON; owner checks meaning |
| Compare regressions, frozen conditions and histories | Local reproducible execution; no automatic judgment of improvement |
| Adoption/return, external evaluation and scoring | Explicit owner decisions/actions |

Synthetic tests using completed JSON verify storage/application/evaluation wiring only. They do not establish a completed owner conversational experiment.

## Compatibility

The original protocol change used package 0.3.0 / bridge API 4, retained observation contract 1 and cognition-0.3, renamed comparison `unseen` to `regression`, and required judgment packet `--arm` / `--cases`. These are historical checkpoints, not current versions. Current contracts add versioned scenes and API 11 continuation while preserving old records. Restart after server updates and preserve backups; code downgrade and research undo are separate.
