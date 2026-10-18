# Rugby Player Model

[English](README.md) | [日本語](README.ja.md)

Research how a rugby player perceives, remembers, predicts and chooses actions from limited information. The project develops two independently usable research outputs:

- **Player model** — executable cognition. Observations, prior memory, player characteristics and decision rules produce beliefs, action evaluations, an intention and supported body requests.
- **Judgment principles** — a standalone document describing the decision process, conditions, exceptions and uncertainty. A person or general-purpose AI can use it without running the player model.

The workbench supports the research: it presents synthetic scenes, records observations and coaching, and compares proposed changes. The outputs are research hypotheses; passing software tests does not establish human cognitive validity or improved rugby performance.

## Start here

| Purpose | Guide |
| --- | --- |
| Run the player model on observations | [Player model](models/player/README.md) |
| Use the principles or give an LLM a player role | [Judgment principles](models/judgment/README.md) |
| Start research with Codex or another collaborator | [Research start](tools/workbench/docs/RESEARCH_START.md) |
| Practice software operations with synthetic data | [Optional tutorial](tools/workbench/docs/FIRST_RUN.md) |
| Understand the research method | [Cognitive research](docs/COGNITIVE_RESEARCH.md) |
| Contribute or reproduce an experiment | [Contributing](CONTRIBUTING.md), [reproduction](docs/REPRODUCTION.md) |
| Browse specifications and operating guides | [Documentation](docs/README.md) |

## Run the player model

With Node.js 24, install the locked dependencies and run the example:

```sh
npm ci
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
```

The player package needs no simulated world, viewer, private session or judgment document. Its input contract is portable to other implementations.

## Use the judgment principles

Read [the principles](models/judgment/RUGBY_JUDGMENT.md) and [the player role guide](models/judgment/PLAYER_GUIDE.md). For an independent evaluation, compare the same observations with **no principles**, **an earlier document** and **a proposed document** using the [judgment evaluation guide](tools/workbench/docs/JUDGMENT_EVALUATION.md). Record principle conformance and rugby plausibility separately. The tool does not call an AI service.

## Research through scenes and coaching

Follow [research start](tools/workbench/docs/RESEARCH_START.md) in a private session. No previous conversation or personal Mac setup is needed. Begin with goals, relationships, breakdowns and repair across attack/support and defense; reuse existing evidence before asking for details. Select cases only when they reveal a gap or distinguish competing explanations. Record acquired observations and coaching, retain counterexamples, and park repetitive or unrelated branches. Keep a resumable [checkpoint](tools/workbench/docs/RESEARCH_CHECKPOINT.md).

[AGENTS.md](AGENTS.md) requires this sequence and the [research loop](tools/workbench/docs/RESEARCH_LOOP.md) defines stage gates. Preserve evidence after every answer; synthesize at meaningful checkpoints and propose mechanisms later. Do not tune the model after each case. Coaching fit, mutually responsive coordination and support from actual human behavior are separate quality levels; scripted formations alone do not establish self-organization. These are research procedures, not an automatic runtime guarantee of collaborator compliance.

A candidate is a saved proposal; a preview does not adopt it. The player model and judgment principles have separate versions, adoption decisions and undo operations. Shared proposals import as unapproved data and require local reproduction and review.

Coaching stays in your conversation. [Presentation commands](tools/workbench/docs/PRESENTATION.md) connect the conversation to a browser capture without UI automation. No particular AI product, API key, paid service or private asset is required. This workflow uses generated scenes and does not include real-match video analysis.

## Current capabilities

The model separates world state, observations and uncertain beliefs. It distinguishes observed body orientation from movement and supports attack, defense and possession uncertainty through one current contract. Motor settings add bounded movement, abstract passing/catching/contact and independently observing actors. Kinematic settings retain intention-only passing where execution is unsupported. The package stays at 0.4.0; see [current format](docs/decisions/ADR-003-current-format.md).

The optional [receiver deliberation hypothesis](models/player/spec/H-WM-1.md) restricts evidence used to compare receivers; it is not a complete human working-memory model. Compare finite and unlimited capacity under the same policy, and evaluate the baseline policy separately. [Orientation](models/player/spec/ORIENTATION_PHASE.md), [closed-loop behavior](models/player/spec/CLOSED_LOOP.md), the [model card](models/player/MODEL_CARD.md) and [limitations](docs/LIMITATIONS.md) describe what is implemented and what remains unvalidated.

Run `npm run check` for documentation, manifest, types, core tests, build and dependency boundaries; `npm run test:browser` for browser integration; and `npm run test:first-run` for the synthetic first-run walkthrough. Browser tests require Playwright Chromium or `RPM_CHROMIUM`. Automated results are separate from human interface acceptance and scientific validation.

## Existing Mac setup

On the configured research Mac, use the [Mac start guide](tools/workbench/docs/MAC_START.md) and [storage guide](tools/workbench/docs/LOCAL_STORAGE.md). Shared launchers use the configured source and private session even when copied elsewhere. Test another checkout with an explicit synthetic session.

## License and source material

MIT applies to the authored scope in [LICENSE-SCOPE.md](LICENSE-SCOPE.md). Retain dependency licenses and attribution. [Archived research sources](models/judgment/archive/README.md) and procedural rendering sources retain their original bytes and historical notices. Private sessions, real match/player data and unrelated external assets are outside the public scope.

English and Japanese documents link to each other. [Naming and compatibility](docs/NAMING.md) explains descriptive names and legacy identifiers retained only for existing data and reproducibility.
