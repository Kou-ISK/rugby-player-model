# Player model

[English](README.md) | [日本語](README.ja.md)

The player model is a deterministic, uncalibrated cognition prototype. It takes observations, prior memory, a player profile and decision rules, then returns beliefs, action scores, an intention and capability-labelled body requests. It runs without a simulated world, judgment document, viewer or private session.

## Run or package

Use Node 24 and the repository lockfile:

```sh
npm ci
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
npm pack ./models/player --pack-destination /your/output/directory
```

Install the tarball in another project and run `rpm-player --input observations.json`. The package `@rugby-player-model/player-reference` exports `think`, `defaultProfile`, `defaultRulesA`, `emptyMemory` and `replayObservationSequence`; Ajv is its only runtime dependency. The [JSON schema](spec/contracts.schema.json) supports implementations in other languages. `RulesA` and `defaultRulesA` are retained API identifiers; see [compatibility](../../docs/NAMING.md).

## Contracts and limits

`think(bundle, memory, profile, rules)` returns the legacy trace. Retrieval preserves original observation times and confidence. Legacy attention encodes at most four inputs; the store retains at most 128 observations for 30 simulation seconds. The legacy `workingMemory` field is a display excerpt, not a decision-capacity limit.

Execution contract v2 uses `execute({executionContractVersion:2, executionMode, bundle, memory, profile, rules})`. Choose `legacyMode()`, `finiteMode(4)` or `unlimitedMode()`. Run `node models/player/dist/reference/cli.js --input models/player/examples/observations-v2.json` for the v2 example. The [receiver deliberation hypothesis](spec/H-WM-1.md) limits receiver comparison only; it does not model complete human working memory.

[Observation v2](spec/ORIENTATION_PHASE.md) adds body orientation and uncertain attack/defense phase; legacy v1 semantics remain unchanged. [Scene v3 / closed loop](spec/CLOSED_LOOP.md) adds observation-derived movement, persistent intention and abstract motor requests through a separate simulation adapter. Passing remains intention-only in v1/v2.

The pure core has no filesystem, network or world-state adapter. The CLI performs explicit input/output file operations and rejects a full-world Snapshot as player input. Tests establish software properties, not human cognition, optimal rugby judgment or performance gains. See the [model card](MODEL_CARD.md).
