# Model card — provisional research foundation

This card covers executable **A** and distinguishes it from the independently reviewed principle document **B**. Status: **uncalibrated, provisional, not a validated human or rugby-performance model**. Model revision is `cognition-0.3`; package version is `0.4.0`. The exact implementation is identified by the Git commit containing the [reproduction manifest](../research/reproducibility-manifest.json) and its source-file hashes. Rule version A0 alone does not identify an executable.

## Purpose and method

A is a hand-written, deterministic hypothesis-testing model for local discussion with the owner and Codex. It separates sensation, attention, working/episodic memory, belief and uncertainty, action evaluation, intention and capability-labelled body output. There are no trained neural weights, fitting dataset, reward optimizer or claim to recover a particular athlete's cognition. Human/Codex feedback creates explicit candidates; approved parameter changes are manual experiments, not evidence of successful learning.

The intended use is to inspect one synthetic player's available information, formulate a falsifiable rule change, preview it without adoption, compare fixed inputs and stratified cases, and accept/reject/undo A and B independently. The model should not be used to select athletes, assess ability clinically, prescribe safe real-world contact, adjudicate a match, or claim improved performance from a changed synthetic action label.

## Inputs and outputs

| Boundary | Supplied information | Important limitation |
| --- | --- | --- |
| Observation bundle | Own synthetic body state, visible entity positions, coarse audio cue/bearing, observation time/confidence | Accurate own position/possession are engineering assumptions. No hidden entities, opponent intentions or future true ball state may enter. |
| Memory | Prior attended observations with original time/confidence | Retrieval does not refresh facts. Capacity/decay are assumed rather than measured. |
| Profile | Ability limits, self-estimate, individual preferences, tactical adherence | These are synthetic adjustable inputs, not measurements of a person. |
| Rules | Versioned numeric A configuration and observation-conditional score/call rules | A rule version is separate from code revision and from B's document version. |
| Trace/output | Staged evidence, uncertainty/risk/information assessment, candidate scores, intention and body commands | Intent is not successful execution. Unsupported channels are labelled as such. |

Snapshots contain world truth for reproducibility and spectator inspection, but the cognition function consumes only the validated observation/memory/profile/rules boundary. Exporting a private snapshot is not permission to use its hidden world as a player's knowledge.

## Assumptions and calibration

The 90° horizontal view, 35m visual range, circular occlusion, coarse audio bearing, 4-input attention encoding, legacy 4-belief display excerpt (not a judgment capacity limit), 128-episode bound, 30s episode lifetime, exponential decay, uncertainty growth and all scoring weights are **engineering hypotheses**. They have not been fit to human gaze, behavior, biomechanical measurements or match outcomes. Scores and confidence values are not calibrated probabilities of correct play.

Remembered uncertainty can penalize approach and suggest re-observation; audio meaning/direction can guide a head turn. Neither mechanism proves a hidden entity is present. Stale memory does not become fresh pass eligibility. Negative observation does not yet clear a remembered entity, and a coarse remembered sound cannot be repositioned precisely after translation without distance information.

## Capabilities and failure modes

Supported: synthetic sensing, bounded memory, traceable heuristic decisions, simple locomotion/head yaw and semantic call events, ordered static-study head/body observation replay, profile-preserving fixed regressions, prospectively frozen evaluation conditions, and 1–20-step recorded experiments, conditional coaching candidates, reasoned return/revision, independent A/B review, undo and local persistence. See the [readiness audit](RESEARCH_READINESS.md) for scope and the [Mac cycle record](MAC_RESEARCH_CYCLE.md) for software evidence.

Unsupported: physiological/human validity; learned tactical skill; joint/muscle/posture control; realistic passing/release/catching/contact/kicking; voice production; independent eye gaze; complete rugby rules; other autonomous players; match outcomes. Other players are static in the legacy four scenes; dynamic scenes use declared scripted paths while only the selected player is controlled by A. The renderer reuses the verified P2P procedural kit through a presentation-only adapter. No gait/contact hint is used as evidence of a skill. Publication of the bounded source and minimal pose type is explicitly authorized; UNLICENSED remains in effect.

Material risks in interpretation: confusing absence of observation with empty space; overtrusting synthetic confidence; treating a weighted score as optimal; mistaking a pass intention for an executed pass; calling parameter variants novel-match validation; or comparing old/new code as if only a rule changed. The interface and tests expose these distinctions but do not establish human validity.

## Evidence and acceptance

At reference commit `5886a70`, 27 Node tests and 4 browser tests passed, with exact GitHub run [38156672972](https://github.com/Kou-ISK/rugby-player-model/actions/runs/38156672972) succeeding. They establish implementation properties: boundaries, paired causal effects of memory/audio, revision conflicts, deterministic local replay and UI operations. They do not establish rugby quality or transfer to a human.

The published eight A strata and three snapshot fixtures are synthetic regression inputs; there is no measured generalization score or demographic evaluation. B has a separate frozen [evaluation reference](../research/b-evaluation-baseline.json), a runner-independent packet and a separate approval path. No B outcome is inferred here from its text, preliminary work elsewhere or A's test results. **Owner Mac acceptance is not recorded as passed.** See [verification](VERIFICATION.md), [data card](DATA_CARD.md) and [limitations](LIMITATIONS.md).

## Governance

Candidate content must be saved and confirmed at a specific revision before review. Preview does not adopt it. A/B approvals and active versions remain separate; owner approval is a local procedural self-attestation. Repository draft edits do not automatically replace private session B exports. Material changes should record the exact code commit, input snapshot, profile/rules, candidate revision, target approval and comparison conditions.

License remains **UNLICENSED**, pending the owner's decision. [Provenance](PROVENANCE.md) records verified Mac input acquisition and pending licensing decisions; [publication scope](PUBLICATION_SCOPE.md) states what is and is not included in this public foundation.
