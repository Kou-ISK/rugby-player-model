# Model card — provisional research foundation

[English](MODEL_CARD.md) | [日本語](MODEL_CARD.ja.md)

Status: **uncalibrated and not validated as a human-cognition or rugby-performance model**. This card covers the executable player model, independently of judgment principles. Package version is `0.4.0`; all new traces use `cognition-0.4.0` and Trace 4, with explicit sensing, motor and deliberation settings. The commit containing the [reproduction manifest](../../reproducibility.json) and its source hashes identify code; a rule version such as `A0` alone does not.

## Purpose

A hand-written, deterministic hypothesis-testing model separates sensation, attention, memory, uncertain belief, action evaluation, intention and capability-labeled output. It has no trained neural weights, fitting dataset or reward optimizer and does not recover a particular athlete's cognition. Coaching creates explicit candidates; manually adopted changes are experiments, not demonstrated learning.

Inspect synthetic player information, formulate falsifiable changes, preview without adoption, compare fixed conditions/counterexamples and review each deliverable independently. Do not use this prototype for athlete selection, clinical ability assessment, safe real-contact prescriptions, match adjudication or performance claims based on changed synthetic action labels.

## Inputs and outputs

| Boundary | Content and limitation |
|---|---|
| Bundle | Synthetic self state, visible evidence, coarse audio, time/confidence; no hidden positions, intentions or future truth |
| Memory | Previously attended observations with unchanged source time/confidence; assumed capacity/decay |
| Profile | Synthetic ability, self-estimate, preferences and tactical adherence; not personal measurements |
| Rules | Versioned numeric/conditional configuration, separate from code and document versions |
| Trace/body requests | Evidence, uncertainty, scores, intention and supported/unsupported output; intention is not execution |

World-bearing snapshots are evaluator envelopes. Cognition consumes only validated bundle/memory/profile/rules; snapshot export does not authorize hidden-world player knowledge.

## Engineering assumptions

Baseline sensing and cognition defaults include 90° horizontal FOV, 35 m visual range, circular occlusion, coarse audio, four-percept encoding, a four-belief display excerpt (not a decision bottleneck), 128 episodes and a 30-second lifetime. Decay, uncertainty growth and weights are uncalibrated. Configurable FOV and [orientation/phase](spec/ORIENTATION_PHASE.md), [H-WM-1](spec/H-WM-1.md) and [closed-loop](spec/CLOSED_LOOP.md) settings state their assumptions within the current formats. Scores/confidence are not calibrated success probabilities.

Remembered uncertainty can penalize approach and request reobservation; audio meaning/bearing can direct a turn. Neither proves a hidden actor present, refreshes stale receivers or yields exact remembered sound positions after translation. Negative observation does not independently clear a remembered actor.

## Capabilities and failure modes

Shared capabilities include synthetic sensing, bounded memory, traceable decisions, observation replay, profile-preserving regressions, frozen conditions, recorded experiments, candidate revision, independent review/undo and persistence. Kinematic motion uses semantic calls; passes are intention-only and other actors are scripted. Motor settings add bounded acceleration/turning, abstract passing/catching/contact and independent actors with their own evidence. It does not implement full rugby physics or laws.

Unresolved: biological validity, learned tactics, joints/muscles/posture, realistic contact/flight/kicking, speech, independent eye gaze, complete phases/laws, validated group coordination and match outcomes. P2P procedural geometry is presentation-only, not evidence of skill. Limited MIT permission is in [LICENSE-SCOPE](../../LICENSE-SCOPE.md); historical UNLICENSED notices remain provenance.

Interpretation risks include unseen = empty, overtrusted confidence, weighted score = optimal, intention = successful action, known parameter variants = unseen validation, and code changes mistaken for rule-only interventions. Interface/tests expose distinctions without proving human validity.

## Evidence and governance

At reference commit `5886a70`, 27 Node tests and four browser tests passed, with [CI run 38156672972](https://github.com/Kou-ISK/rugby-player-model/actions/runs/38156672972). This is historical software evidence, not the current test count or human validation. See [verification](../../docs/verification/VERIFICATION.md), [readiness](../../docs/verification/RESEARCH_READINESS.md), [Mac cycle](../../docs/verification/MAC_RESEARCH_CYCLE.md), [data card](../../evaluation/DATA_CARD.md) and [limitations](../../docs/LIMITATIONS.md).

Public fixtures/regressions are synthetic and provide no measured generalization or demographic score. The independent document has a [frozen reference](../../evaluation/baselines/judgment-evaluation.v1.json), standalone evaluation and its own adoption. No document benefit or owner screen acceptance follows from executable tests; actual human decisions require session evidence.

Review saved content at the confirmed revision; preview is not adoption. Independent active versions and undo remain separate. Owner approval is local self-attestation. Repository edits do not replace private principles. Record code, snapshot, profile/rules, candidate revision, review target and comparison conditions. [Provenance](../../docs/provenance/PROVENANCE.md) and [publication scope](../../docs/provenance/PUBLICATION_SCOPE.md) define the authorized, limited source set.
