# Orientation and possession hypothesis v1

[English](ORIENTATION_PHASE.md) | [日本語](ORIENTATION_PHASE.ja.md)

This is a versioned engineering hypothesis, not a validated human cognitive mechanism. It supplies observable body orientation and uncertain phase estimation to the existing cognition loop. It does not learn a policy from coaching prose.

## Version and boundary

Scenes use schema 3 with `observationMode: oriented` and `ownAttackDirection: 1 | -1` (+z / -z). Direction is prior tactical knowledge, not live possession truth. Every sensor emits Bundle 3. `positions` preserves position-only acquisition without inventing orientation or context. Changing the authored condition starts a new scene/history. Historical observations are converted on copies and retain their actual information; see [ADR-003](../../../docs/decisions/ADR-003-current-format.md).

Bundle 3 contains the original self position, body yaw, head-relative yaw and own possession (assumed exact synthetic proprioception). Every percept is tagged `evidenceVersion: 2`. A currently visible player may have `bodyOrientation: {yaw, halfWidth, confidence}`. Angles are radians in the shared pitch frame, not movement direction, gaze, intention or a promised future action. The orientation sensor uses integer-bin wrapping (no trigonometric normalization, preserving exact browser/Node observation bytes) and quantizes yaw in 15° steps with ±7.5° uncertainty and confidence 0.8, below the parent observation's 0.9. These values are engineering assumptions. A missing orientation remains missing.

Only an observed player with a visible ball within 0.2 m of the synthetic front holding position may have `ballControl: {holding: true, confidence: 0.85}`. Absence is not evidence of non-possession. The adapter uses visible geometry, never the scene's true carrier/attachment binding. A scripted loose ball at the same visible position produces the same cue: it is uncertain visual evidence, not an image classifier or global possession oracle. With `attachedBallFrame: body`, the held-ball marker sits 0.65 m along the holder's forward body direction so a front view can see it; the holder can occlude it from behind. This point/disk geometry is not validated rugby anatomy. `attachedBallFrame: world` retains the original world-axis marker placement.

Audio carries no source orientation, position, identity or possession. Occluded/offscreen actors contribute no visual evidence. Actor names, planned paths and future ball states never enter Bundle. Four-item perceptual attention still applies before evidence enters memory. This attention limit is separate from optional H-WM-1 receiver deliberation.

## Inference and recording

Trace 4 identifies `modelRevision: cognition-0.4.0` and records `situation`:

- Self body yaw, head-relative yaw and their normalized sum (view yaw).
- Other players' observed yaw, original source ID/time, relative yaw, derived confidence and angular uncertainty. Memory retrieval never refreshes source time or source confidence. Derived confidence decays using `memoryHalfLife`; angular uncertainty grows at 90°/s to 180°. A toward/away relation is asserted only at age zero with sufficient confidence and an unambiguous angular interval; otherwise it is `uncertain`.
- Phase and goal: own possession → `attack-carrier`; a single recent teammate holding cue → `attack-support`; opponent cue → `defense`; missing/conflicting cues → `unknown`. Recent means at most 0.5 simulation seconds and derived confidence at least `minimumConfidence`. These are tunable future hypotheses, currently explicit code constants, not human measurements. Each estimate retains its supporting source/time/confidence.
- Execution scope: defense/unknown can choose scan or hold; carry/pass/support are ineligible. Non-possession alone no longer triggers support with oriented sensing. Existing attacking movement follows the body's heading; it is not a path planner. Backward receiver eligibility uses the known attack direction. Other players' orientation currently affects the recorded relation estimate, **not action scoring or route choice**.

Both baseline and H-WM-1 execution modes accept the current input. Trace 4 records H-WM-1 deliberation when enabled; its capacity remains receiver-only and does not limit all cognition. The actual input and settings, engine source hash, profile and rule configuration together identify behavior. A0 alone is not a complete engine version. A new sensor/engine is a code change requiring review, not a player-model parameter patch or an adopted coaching principle. the judgment document’s frozen text and approval state do not change.

## Research sequence

1. Confirm the generated geometry from player view: own team, attack direction, actual front/back posture and visible ball. Correct the authored scene if its meaning is wrong; preserve the earlier revision.
2. Capture through the presentation bridge and attach coaching to that snapshot. Examine sensor evidence and inferred relations separately. Capture another observation after a head turn rather than filling in hidden orientation.
3. Form a mechanism hypothesis and freeze its predictions and failure conditions. Vary body yaw alone while retaining position, path and visibility where possible; separately vary head yaw, occlusion, possession and attack direction. A hidden-ball condition must be expected to yield uncertain possession.
4. Compare fixed observations for cognition and action-driven replay for closed-loop behavior. No-op comparisons establish reproducibility, not coaching effectiveness. Software fixtures are known development conditions, not unseen human validation.
5. Implement the necessary skills before assessing avoidance, covering, tackles or delayed passes. Approve player model and judgment principles independently only after the owner reviews the relevant candidate/code and counterexamples.

Public synthetic stimuli: `evaluation/fixtures/orientation-{attack,support,defense}.scene.json`. All use the same CLI (`scene-create`, `scene-snapshot`, presentation, `propose`, edit and preview); use a separate synthetic session for software testing. They do not seed or approve an owner's research session. Kinematic scenes still have one controlled player and scripted others, with a fixed holder: possession changes, autonomous opponent reactions and collective self-organization are future work.
