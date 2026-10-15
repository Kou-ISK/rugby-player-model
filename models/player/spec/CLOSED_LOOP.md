# Closed-loop hypothesis v1

[English](CLOSED_LOOP.md) | [日本語](CLOSED_LOOP.ja.md)

Scene schema 3 opts into Bundle 3 and `cognition-loop-v1` / Trace 4. Scene 1/2 retain their previous sensors, cognition and body integration. This is a new, uncalibrated engineering hypothesis, not an approved player model parameter version or a demonstrated model of human cognition. Its source hash identifies the implementation; A0 alone does not.

## Observation and decision contract

The player model still receives only Bundle, Memory, Profile and RulesA. Body/head/view orientation and visible body direction use the v2 observation contract. Self motor velocity, stopping deadline and the last motor result are synthetic proprioception. Other agents' memory, plans, intended paths and the true ball trajectory never enter player model or the player camera.

Two acquired visual observations, at different times no more than 2 seconds apart, permit a displacement velocity estimate (clipped to 10 m/s). Single observations do not. Extrapolation is limited to 0.5 seconds and increases positional uncertainty. Estimates retain source IDs and original observation time. Retrieved evidence keeps its original time/confidence. This is neither an uncertainty-calibrated arrival probability nor a measured human velocity estimator.

Eligible options depend on observed possession: carrier carry/evade/pass, teammate support, defense positioning/contact, uncertain possession scan, or observed loose-ball reception. A visible body angle can break a lateral-space tie; it does not reveal intent or gaze. Pass targets must have fresh, observed backward teammate evidence and pass-range eligibility. H-WM-1 receiver selection remains an additional eligibility filter when enabled. The new policy uses scan/carry/pass biases and matching context-rule weights; the legacy preference/self-estimate/tactical blending and semantic call production are not implemented by this loop policy. Unsupported personal/team-model hypotheses require a separate code change.

A plan records action, observed target ID, goal, phase, start/review time and evidence IDs. It can continue for 0.6 seconds while eligible, in the same phase, not failed or reached, and no competing option exceeds it by 0.25. Those constants are engineering assumptions. The trace records continuation/switch and body requests separately from execution outcomes. This is a bounded small-goal controller, not a learned long-horizon planner.

`RulesA.mechanisms` can independently disable `motion`, `intention`, `local` and `tactics`. Missing flags default to true for v3. `tactics` currently means known attack direction, support depth and own-goal protection; it is not an arbitrary game-system interpreter. `local` enables lateral pressure response and support/defense adjustment; disabling it retains basic action eligibility and collision avoidance checks. Mechanism-off does not mean the player stops seeing other people. V1/v2 ignore these flags; ablations must use v3 and keep bodies fixed.

## Motor and interaction contract

Simulation uses a 0.2-second cognitive step with ten 0.02-second motor substeps. All autonomous actors first sense the same pre-step world using separate memories, profiles and team-relative attack directions. Only then are commands executed. Controlled and autonomous actors share the explicit player model configuration. Stable actor ordering resolves simultaneous equal-distance catches; ordering the runtime actor array does not change results.

| Quantity | Engineering default |
| --- | --- |
| Acceleration / deceleration | 4 m/s²; maximum speed and pass range from actor ability |
| Body / head turn | 2 / 3 rad/s; relative head angle limited to ±2.4 rad |
| Release | 0.2-second preparation; cancellation on revised intent/contact/forward or out-of-range target |
| Ball | 2D flight at 15 m/s; loose after 2 seconds or field boundary |
| Catch | Radius 0.75 m; after 0.06 seconds in flight, with receive/support/defend request (scripted stimuli are catch-ready) |
| Contact | Radius 0.9 m and frontal 90° each side, on requested observed target; holder stops 1 second, defender 0.4 seconds |

Contact is resolved before release at the same substep. Events distinguish release, catch (including interception), contact and failure. Contact does not create a ruck, injury, legal tackle, knock-on or automatic turnover. Flight has no height, spin, bounce or anatomical catching; backward-target validation is an engineering rule, not a full rugby law model. Scripted paths ignore acceleration/contact movement limits and remain authored stimuli. General non-tackle collision resolution is absent.

Derived plan/output/motor quantities are rounded to 1e-9 for browser/Node reproducibility; acquired evidence times and confidence are not rounded or refreshed. Replay frames freeze every actor's runtime alongside the selected player's trace, so comparison displays recorded outcomes instead of recalculating other agents.

## Paired mechanism study and reproduction

In a separate synthetic session, import `evaluation/fixtures/loop-attack.scene.json` or `loop-defense.scene.json`, then run:

```sh
npm run --silent bridge -- mechanism-study SCENE_ID --revision 1 --steps 40 --out /absolute/private/work/study.json
```

The report freezes the full input and its hash, engine source manifest, six arms (full, four single removals, local+tactics removed), rules, traces, runtime frames and evaluator-only progress/spacing/event/switch measures. Full/local-off/tactics-off/both-off form the 2×2 comparison. Measures use the same last recorded frame and state their observation horizon. Before/after traces are computed with the same body implementation and abilities. This separates a cognitive intervention from a skill upgrade. It does not reconstruct an old executable by supplying an old player model version.

V3 replay permits 1–201 frames, bounded by scene end; legacy regression stimuli remain capped at 20 frames. A step-budget replay can advance its final body one step beyond its last recorded decision; report metrics deliberately use the recorded horizon. Fixed-observation comparison and closed-loop comparison remain distinct. Runtime/metrics are evaluator data and must never be passed into an LLM player packet.

These published stimuli are development examples, not unseen holdouts. Tests cover physical bounds, interruption, reception/interception, isolated sensory inputs, synchronous update order, ablation reproducibility, snapshot/history rewind and portable proposal reproduction. Group coordination, human equivalence, generalization and better rugby decisions require separately specified predictions and independent data. New owner coaching and player model and judgment principles adoption remain explicit human decisions.
