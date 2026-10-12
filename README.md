# Rugby Player Model

Study how a rugby player could make decisions from limited observations. This project has two independent outputs:

- **A — an executable player model.** Given observations, remembered observations, a player profile and decision rules, it returns beliefs, scores, an intention and supported body requests.
- **B — a document of judgment principles.** A person or any general-purpose AI can use it without installing or running A.

Both are research hypotheses. Passing the software tests does not establish human cognition or better rugby performance.

## Use the models

**Run A on observations.** With Node.js 24, install the pinned dependencies and run the bundled example:

```sh
npm ci
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
```

The [A guide](models/player/README.md) explains the standalone package, input contract and optional research modes. A needs no simulated world, principle document, viewer or private session.

**Read or evaluate B.** Open [the judgment principles](models/judgment/RUGBY_JUDGMENT.md). No software setup is required to read or use the document. For a controlled comparison, follow the [independent B guide](tools/workbench/docs/B_STANDALONE.md): the same observations with no principles, an earlier document and a proposed document. It can record manual reviews or responses obtained separately; it does not call an AI service.

## Develop and test ideas

The local research workbench lets you view synthetic scenes from a player's perspective, turn the head, capture observations and propose changes. A **candidate** is a saved proposed change. A **preview** compares it with its captured baseline before adoption. A and B are adopted and undone separately.

Follow the [complete first-run tutorial](tools/workbench/docs/FIRST_RUN.md) ([日本語](tools/workbench/docs/FIRST_RUN.ja.md)) to create a new synthetic session, use the browser or command line, compare research modes, save a proposal and reproduce it in another session. No particular AI product, API key, paid service or private asset is required. The tutorial includes startup, shutdown and restart commands.

See [Contributing](CONTRIBUTING.md) for changes to models, principles or experiments. Shared proposals contain explicitly permitted synthetic inputs and fixed references. Import leaves them unapproved; reproduction creates a new local run before any independent A/B decision.

## What is implemented

The player model separates world state, sensed observations and uncertain beliefs. The viewer displays generated players, a pitch and a ball; rendering does not add physical skills. Passing is currently an intention with unsupported execution. Other actors follow scripted stimuli rather than a complete rugby simulation.

The default model preserves the legacy behavior. The optional [H-WM-1 hypothesis](models/player/spec/H-WM-1.md) limits the evidence used to compare and choose a receiver. Risk, orienting and existing freshness checks still use retained evidence. It is not a complete model of human working memory. Compare finite capacity with the same policy at unlimited capacity; compare the legacy policy separately.

Useful references:

- [Architecture and information boundaries](docs/ARCHITECTURE.md), [model card](models/player/MODEL_CARD.md), [limitations](docs/LIMITATIONS.md)
- [Evaluation protocol](evaluation/PROTOCOL.md), [scene format](tools/workbench/docs/DYNAMIC_SCENES.md), [reproduction manifest](reproducibility.json)
- [Standalone A](models/player/README.md), [standalone B](models/judgment/README.md), [local command-line bridge](tools/workbench/docs/LOCAL_BRIDGE.md)

Run `npm run check` for the core, type, build and boundary checks; `npm run test:browser` for browser integration; and `npm run test:first-run` for the empty-environment walkthrough. Browser tests need a Playwright browser or an explicit `RPM_CHROMIUM` executable. Automated headless tests are separate from a person using the interface and from scientific validation.

## Already configured on the owner's Mac

Use the [Mac start guide](tools/workbench/docs/MAC_START.md) and [current storage and recovery guide](tools/workbench/docs/LOCAL_STORAGE.md). The shared launchers follow their configured source directory and private session. Running a copied launcher does not select a different checkout. Use the first-run tutorial's explicit synthetic session when testing another checkout.

## License and source material

MIT applies to the authored scope listed in [LICENSE-SCOPE.md](LICENSE-SCOPE.md). Dependency licenses and notices remain in force. The procedural rendering sources and frozen principle documents retain their original bytes and historical notices; [provenance](docs/provenance/PROVENANCE.md) records their origin. Private sessions, real match data and external assets are outside the public scope.
