# Cognitive model and research-tool requirements

[English](COGNITIVE_RESEARCH.md) | [日本語](COGNITIVE_RESEARCH.ja.md)

This is a research design contract, not a finding that human cognition has been reproduced. [Architecture](ARCHITECTURE.md) is authoritative for implemented mechanisms and limitations. The executable player model, judgment principles and research tools are independent deliverables.

## Deliverables and acceptance

| Deliverable | Required properties | How to examine them |
|---|---|---|
| Player model | Observations → attention and memory → uncertain situation inference → action evaluation → maintained or revised intention → body requests; no lookup by scene name | Repeated inputs, information-leakage checks, mechanism ablations and transfer to other conditions |
| Judgment principles | Self-contained information boundaries, decision process, conditions, exceptions and responses to missing information; usable by a person or LLM | Give identical observations to separate no-principles, previous-version and proposed-version arms; score compliance and rugby plausibility separately |
| Research tools | Present synthetic scenes, freeze acquired observations and coaching, compare mechanisms and counterexamples, preserve records | Another contributor can follow the procedure in a new session and reproduce inputs, versions and results |

Publication follows [LICENSE-SCOPE](../LICENSE-SCOPE.md). Public code, synthetic fixtures and model documents must suffice for installation and verification. Private conversations, plans and real data stay outside the public set. Tools do not call AI APIs: a person or any conversational environment exchanges files. An LLM product's own terms still apply.

## Tactics and interpersonal relations

The design hypothesis is a loop: known team goals, roles and tactics constrain action; locally perceived teammate/opponent relations change available actions; execution and new observations update both. Knowing team tactics does not reveal everyone's current position. Use only previously shared tactics and updates the player actually received.

Bidirectional relations between global game-model constraints and local interaction are consistent with team-sport theory ([Ribeiro et al., 2019](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.02213/full)). This does not establish two independent brain systems. An integrative account also combines shared knowledge and perceived affordances ([Steiner et al., 2017](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.01440/full)). A flock analogy is not proof of identical neural mechanisms; tactics need not be conscious while interaction is unconscious.

Distinguish these functions, while grounding them in the same observations and memory:

1. **Goals and constraints:** team objectives, phase, role, known agreements and skill limits.
2. **Relations and affordances:** observed relative position, orientation and movement; reachable space; changing support and pressure. Estimates depend on ability and context.
3. **Regulation:** allocate attention, reobserve, maintain, cancel or switch intentions according to uncertainty and urgency.
4. **Execution and feedback:** distinguish requested action, achieved action and subsequent observations.

Do not claim self-organization until at least two players react to each other using independent observations and memory. Scripted paths are useful controlled stimuli for a single-player experiment.

## Research unit and records

Cases are stimuli for investigating mechanisms, not entries in a scene-to-answer dictionary. Translate coaching into a falsifiable hypothesis about information, prediction and decision changes before adding action rules.

| Record | Required content |
|---|---|
| Scene and display | Synthetic scene version/hash, player, initial state, time/tick, head/body orientation, view mode, client/revision and display receipt; a receipt does not prove human viewing |
| Cognitive input | Acquired history, original timestamps/confidence/sources, pre-intervention memory, ability/self-estimate/preferences, known tactics, both deliverable versions and execution settings |
| Coaching | Original text, snapshot and interval, interpretation, ambiguities and interpretation confirmed by the coach; keep source text separate from candidates |
| Hypothesis | Changed mechanism, scope, predictions, failure criteria, counterexamples, controls, unsupported capabilities and evaluation conditions frozen in advance |
| Experiment | Fixed-observation or closed-loop comparison, code/document/input hashes, seed, actions and execution support, belief changes, terminal reason and intervention |
| Judgment and provenance | Software checks, researcher assessment, separate adoption decisions, scope, withdrawal reasons and later counterexamples; never overwrite history |

Not every item has a dedicated field. Use existing snapshots, candidates, notes, experiments and the evidence graph. Completed display receipts persist; `research-log` links snapshots, coaching and experiments. Motor traces retain plans, motion estimates and decision transitions in the current trace format. Record human-confirmed interpretations and research scoring of prediction errors separately.

Conversational coaching is a **researcher intervention**, not something the player heard at that instant. Separate prior tactics, perceived calls, coaching and forced actions. Original text is necessary for interpretation provenance; saving it alone is not understanding, implementation or validation.

## Verification order and stopping conditions

1. **Tool integrity:** displayed scene and captured input match; stale views, tabs, retries and restarts never silently bind coaching to another scene.
2. **Scene and perception validity:** teams, possession and attack direction are understandable. Specify body orientation separately from motion. Only visible orientation enters observations, never occluded orientation or future truth. The owner confirms the scene's meaning.
3. **Motor feasibility:** implement required turning, acceleration, routes, passing, catching and contact abstractions. Freeze assumptions, units and limits. Report unsupported actions without claiming success.
4. **Mechanism comparison:** infer motion across observations, update uncertain arrival estimates and maintain/switch subgoals. Compare against the simpler policy with identical body conditions. Separate skill additions from cognitive changes.
5. **Interaction:** provide independent observations and memory per player. Compare tactical constraints present/absent × local adjustment present/absent, and reactive actors against scripted paths. Evaluator-only spacing, synchronization and coverage measures never return to players.
6. **Generalization and independent reproduction:** vary reflection, numbers, speed, initial position, occlusion, ability and tactics using the same mechanism. Separate development examples from unused conditions. Evaluate the judgment document independently, manually or with any LLM.

Thresholds, weights and capacities are not human constants. Freeze measurements, expected changes and failure criteria before each experiment. Even an effective mechanism does not establish human equivalence without comparison to actual human behavior. Real-match video analysis is outside this procedure.

## Implemented and unresolved scope

[Oriented observation](../models/player/spec/ORIENTATION_PHASE.md) provides body orientation and phase inference. The optional [motor setting](../models/player/spec/CLOSED_LOOP.md) provides observation-derived motion, subgoal persistence/switching, acceleration/turning, release/flight/catch/abstract contact, independent small-team reactions and ablations with identical motor conditions. These settings share the current record formats in [ADR-003](decisions/ADR-003-current-format.md); historical evidence is converted only on import.

These are engineering hypotheses about implementability, not established rugby improvement or human equivalence. Arrival-probability calibration, long-term planning, biomechanics, complete laws, arbitrary team tactics, learning, unseen transfer and scientific validation of self-organization remain unresolved. Synthetic tests cannot replace owner scene interpretation, coaching interpretation or adoption.

## Attack, defense, transition and memory

Scope includes ball-carrier and supporting attack, defense, loss/gain of possession and unknown possession. Use common attention, memory, inference and intention regulation, with phase-specific goals and skills. Do not bind colors to AT/DF or infer defense merely from not holding the ball.

Kinematic and motor settings share one current format. Motor execution supports defensive positioning, contact requests and possession changes through catching within the same information boundary; coverage allocation and post-tackle rugby procedure are not validated. See the closed-loop skill/phase contract.

Distinguish player memory (the player's acquired observations), research-session history (coaching, candidates, comparisons and reviews), and model/principle improvement (human-reviewed version changes). Coaching does not automatically train the model.

## Human–tool research loop

Start with the broad framework and coverage map in [RESEARCH_LOOP](../tools/workbench/docs/RESEARCH_LOOP.md), using [RESEARCH_START](../tools/workbench/docs/RESEARCH_START.md) for a new session. The operations below apply when a useful comparison has been identified; they do not require a new scene or model change after every answer. Framework review, synthesis and parking an uninformative branch are valid next actions. Keep verbal-only guidance separate from observed scene evidence.

1. Choose one decision/mechanism, player, situation and required skills.
2. Present a generated scene in player view; the coach confirms meaning and gives conversational coaching.
3. Preserve text and interval; formulate what is observed, inferred and capable of changing the decision.
4. Prepare discriminating controls, varying distance, orientation, support arrival, visibility, ability or known tactics one at a time; include supporting and counterexample conditions.
5. Obtain coaching/assessment on those conditions, correct interpretations and compare executable and document candidates separately.
6. Keep coached examples separate from evaluation conditions frozen before exposure. A newly coached condition is no longer unseen.
7. Examine predictions, counterexamples and scope, record independent adoption decisions and test transfer.

More scenes are not the objective. Choose the next scene to distinguish where a hypothesis holds or fails. Keep authoring conversations that know the future separate from anonymous player-role evaluations.
