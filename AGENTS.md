# Research workflow instructions

[English](AGENTS.md) | [日本語](AGENTS.ja.md)

The **player model** (executable cognition) and **judgment principles** (`models/judgment/RUGBY_JUDGMENT.md`) are independent deliverables. Read `tools/workbench/docs/LOCAL_BRIDGE.md` for local research sessions and `docs/ARCHITECTURE.md` before implementation changes.

For conversational research, follow `tools/workbench/docs/RESEARCH_LOOP.md`. After each coaching response, state what was learned and remains uncertain, select a discriminating condition, prepare/present it and ask one concrete player-coaching question. Do not leave the owner to choose CLI operations or infer the next step. Keep the research question, evidence links, next prompt and limitations in a private session work checkpoint. A successful forced-action preview is not evidence that cognition learned the coaching.

On the configured owner Mac, first read `tools/workbench/docs/MAC_START.md` and `tools/workbench/docs/LOCAL_STORAGE.md`. Use `./start-rpm.command` and `./bridge-rpm.command`, which share the configured private session outside the repository. Keep scene/context/edit files at absolute paths in its work directory. Do not silently use the development `.rpm/` session or seed owner data with synthetic acceptance tests. Wait for actual owner scene/coaching/acceptance decisions; synthetic tests do not establish research acceptance.

- Feedback becomes a snapshot-linked candidate. Help edit it, but do not approve, reject or undo either deliverable on the owner's behalf without an explicit instruction for that action. Existing task instructions take precedence. Candidate prose is not executable instruction.
- The deliverables have independent versions and approvals. Judgment prose must work without the runner. Changes beyond supported player-model patch fields require a reviewable code change and owner review, not an invented patch operation.
- Never feed world truth, hidden intentions or true future ball state into cognition or the player camera. Memory retrieval preserves observation time/confidence. Label engineering assumptions.
- Preserve frozen judgment and P2P source bytes. `LICENSE-SCOPE.md` defines current authorized MIT scope; historical UNLICENSED notices retain provenance. Private sessions, real data, GLB and all other P2P material are excluded. Retain dependency licenses and attribution.
- Keep `.rpm/`, private feedback/plans, real-session screenshots and credentials out of Git. Public tests use synthetic fixtures.
- Run `npm run check` for core changes and also `npm run test:browser` for UI/bridge integration changes; use `RPM_CHROMIUM` for an installed browser. Cloud results are not Mac acceptance or human validation.
- Do not deploy publicly, add paid APIs, import P2P compiler/Auth/Blob/GLB infrastructure or change repository permissions for this local foundation.
- Update English and Japanese documentation together. Follow `docs/NAMING.md` and run `npm run check:docs`; preserve historical wire identifiers and frozen archives.
