# Reproducibility and limitations

[English](LIMITATIONS.md) | [日本語](LIMITATIONS.ja.md)

## Reproducible behavior

The four static generators (`support`, `occluded`, `audio`, `heldout`) use uint32 seeds and 0.2-second steps. Reset reproduces initial geometry with current profile/rules. A snapshot retains world, exact observations, prior memory, profile and versions. Fixed-input comparisons change only selected rules. CLI/browser share cognition and sensing. Restore preserves recorded body/head/memory while using current approved rules.

The eight published regressions explicitly cover carrier/open (900), carrier/pressure (901), carrier/fresh receiver (1230), noncarrier/open (1231), missing vision (65536), stale threat memory (65537), and noncarrier left/right calls (104728/104729). Possession is explicit, not seed parity. They preserve candidate profile and are known regression/parameter probes, not general rugby competence. Prospective conditions freeze profile, inputs and criteria before coaching and record first-use/reuse; prior knowledge outside records cannot be detected. Actual judgment-document execution/scoring remains independent and manual.

Three public snapshots live in `evaluation/fixtures/`, generated with `npm run samples`. Headless replay is:

```sh
npm run --silent model -- --input evaluation/fixtures/support-42.snapshot.json --steps 10
```

It emits JSON without changing private sessions. Later observations come from sensing, not future world truth. Dynamic scene definitions/hashes, acquired history and source fingerprints provide additional reproduction boundaries; a seed cannot reproduce arbitrary unsaved manual actions, UUIDs or wall-clock feedback times.

## Scope by version

| Area | Limit |
|---|---|
| Static and kinematic scenes | Others are static/scripted; movement is capped kinematic translation, pass is unsupported intent, no release/catch/contact resolution |
| [Orientation/phase](../models/player/spec/ORIENTATION_PHASE.md) | Oriented sensing adds visible direction/holding cues and uncertain possession; defense/unknown can only scan/hold. Orientation affects recorded relations, not route scoring. No scripted holder transfer |
| [Closed loop](../models/player/spec/CLOSED_LOOP.md) | Motor settings add bounded acceleration/turning, 2D release/catch/contact, observed velocity, persistent subgoals and independent small-team actors; scripted stimuli still do not react |
| All versions | No full rugby law/score engine, biomechanics, realistic tackle consequences, kicking, fatigue, complete set pieces, independent eye gaze, speech generation or validated learned behavior |

Contact in motor scenes is an abstract motor event, not proof of a legal/safe tackle, injury, ruck or turnover. New physical skills and new cognitive policies are separate interventions. Published ablations are development data, not proof of self-organization, human equivalence, unseen transfer or owner acceptance.

## Perception and cognition assumptions

- Flat pitch, horizontal FOV, circular 2D occlusion and whole-model visibility masks; no partial-body/vertical attention, peripheral-acuity or detailed acoustic model. Self position/possession are synthetic accurate proprioception assumptions.
- Four-percept attention, bounded 128-episode/30-second memory, decay, uncertainty growth and score weights are engineering hypotheses, not measured human constants or biological long-term memory. The working-memory display is not a capacity bottleneck; H-WM-1 limits receiver deliberation only.
- Kinematic prediction retains last position with growing uncertainty; motor velocity uses multiple acquired observations with bounded extrapolation. Neither receives true velocity or future ball state.
- Old uncertainty can penalize approach and guide reobservation; call meaning/bearing can guide looking. These do not prove hidden opponents exist or refresh stale receivers. Failure to re-detect an actor does not independently establish absence.
- Audio retains original observer yaw and coarse uncertain bearing. Without range, translation cannot yield an exact new bearing; historical audio lacking a yaw frame cannot steer remembered looking. No source coordinates/identity are invented.
- Kinematic calls are bounded semantic events with cooldown, not acoustic voice or teammate reactions. The motor policy's separate limitations are in its contract.

## Research and storage limits

Quick comparison is one decision. Ordinary recorded experiments are 1–20 steps; motor mechanism studies allow their specified larger horizon. Actions can change later observations. These are not paired full matches, and conditional score rules neither prove improvement nor learn from prose. Constant-action controls reject a trivial all-scan result only for the supplied hypothesis.

Manual looking while paused acquires extra observations at the same simulation time. It does not measure real-time cognition, physical turning or reaction speed. Each history segment is bounded at 256 events; API 11 normally preserves/continues at 224 with immutable predecessor evidence. Current-segment replay is distinct from earlier saved segments. Unsaved text/history and unrecorded trajectories cannot be recovered. The browser needs an explicit saved-state restore after restart.

Both deliverables remain research drafts with independent versions/reviews. Owner approval is local self-attestation. Confirmed revision/active-version checks reject concurrent edits or stale undo; no automatic adoption retry occurs. Historical approved labels remain after undo. Old approvals are not retroactively assigned new confirmation evidence.

The current judgment reading edition does not replace private exports: those retain the frozen initial document and explicitly adopted amendments. A rule version is not an archived binary. Before/after comparisons recompute both arms with the current engine; exact old execution requires its recorded source/runtime/hashes, including uncommitted changes. Document translations are distinct hashed experimental inputs.

Anonymous judgment packets exclude evaluator labels, scene/seed, world and executable outputs. Responses bind arm/group/input hash but remain unverified. No AI is called, and synthetic mock transport is not actual AI evaluation or human screen acceptance. Original outside research is separate evidence.

The local JSON store has one writer and no multi-user authentication/distributed writes. Long histories may require a larger storage backend. P2P geometry is display-only, hash-preserved and covered only by the limited publication/license scope; first-person self geometry is hidden. Headless Mac checks are not owner interaction.

## Verification

```sh
npm ci
npm run check
npm run spike
npx playwright install chromium
npm run test:browser
```

An installed Chromium can be selected with `RPM_CHROMIUM=/absolute/path/to/chromium npm run test:browser`. Initial dependency/browser/CI provisioning needs network access; installed model/tests/app need no remote service. A browser-download failure is separate from tests actually run against an installed browser. CI configuration uses installation, checks, build, spike and browser tests without paid cloud deployment or production secrets. Local success does not establish a completed remote CI run. See [historical verification](verification/VERIFICATION.md).
