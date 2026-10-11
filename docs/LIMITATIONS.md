# Reproducibility and unsupported work

## What is reproducible

The four scene generators (`support`, `occluded`, `audio`, `heldout`) use a uint32 seed. Time advances by fixed 0.2s steps. UI reset reproduces the initial geometry with current profile/rules. Snapshot stores the full selected world plus the exact observation bundle, prior episodic memory, profile and rule versions. Comparison fixes those decision inputs; only A rules differ. CLI and browser share the cognition and sensor code. Snapshot restore preserves recorded body/head state and memory but uses the currently active approved rules.

The `heldout` suite reserves seeds 901, 1229, 65537 and 104729 from routine examples. It changes geometry/possession/heading within one synthetic family. This is a regression/parameter-generalization probe, **not evidence of general rugby competence**. B's novel-scene evaluation is manual and separate.

`examples/` contains three public synthetic snapshots, reproducible with `npm run samples`. Run the headless model with `npm run --silent model -- --input examples/support-42.snapshot.json --steps 10`. It emits the staged trace as JSON and does not modify the private session. A replay starts from the snapshot's world/memory/profile/rules; each later observation is produced by the sensor adapter, never taken from a future world state.

## Unsupported or simplified

- All other players are static during a run. No opposing agent, realistic tackle, collision response, pass/release/catch, kicking, match scoring, fatigue, set-piece dynamics or complete law engine.
- Movement is capped kinematic translation. Model intent may select a pass, but output reports it unsupported and never claims success. Joints, muscles, posture, voice production and independent eye gaze are extension points only.
- Flat pitch, circular 2D occlusion and horizontal FOV. First-person renderer masks unobservable entities using the same adapter, conservatively removing an entire occluded model. No partial body visibility, vertical visual attention, detailed hearing propagation or reaction-time fit. Own ball possession and body location are synthetic accurate proprioception assumptions.
- Perceptual attention is a 4-item heuristic. Bounded episodic storage expires after 30 simulation seconds; it is not a validated human long-term-memory system. Semantic knowledge is supplied as explicit rule configuration. No spontaneous learning from prose or neuronal reproduction.
- Predictions hold the last observation and widen uncertainty. No true velocity or future ball path enters the player model or camera.
- Comparison is a single decision from a captured state, not a paired full-match intervention. Changing rules may change behavior but has not been shown to improve it.
- The browser restarts at the initial scene until “restore latest” is chosen. Only saved snapshots/candidates survive; arbitrary replay control history and unsubmitted form text are not an event tape.
- A/B baseline versions are drafts. Local owner approval is a procedural self-attestation, not identity verification. Approved candidate labels are historical; undo changes active versions without erasing the approval record.
- No standalone generative-AI B evaluation and no owner Mac acceptance have been completed in Cloud.
- P2P original kit reuse remains blocked by the input transfer failure. Current fallback meshes are independent and should not be described as P2P assets.

## Verification commands

```sh
npm ci
npm run check
npm run spike
npx playwright install chromium
npm run test:browser
```

With an already installed browser, `RPM_CHROMIUM=/absolute/path/to/chromium npm run test:browser` avoids a browser download. Cloud used its installed Chromium because the browser-download service was unavailable. Do not reinterpret that download failure as a test failure: actual tests ran against the installed browser. First dependency/browser installation and GitHub CI provisioning are network operations; core tests and app execution after installation need no remote service.

CI uses only package install, typechecking, Node tests, build, a small spike and browser tests. No paid cloud resources, secrets or production deployment. Repository workflows are provided; local Cloud command success is distinct from a remotely completed CI run. See [verification evidence](VERIFICATION.md).
