# Use the player model (A)

A is a deterministic, uncalibrated research model. It reads observations, prior memory,
profile and A rules, and returns beliefs, scores, an intention and capability-labelled
body requests. It needs neither a simulated world nor the B document, viewer or session.

From the repository, with Node 24 and dependencies installed using the root lock:

```sh
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
npm pack ./models/player --pack-destination /your/output/directory
```

Install the resulting tarball in another project. Only Ajv is required at runtime.
Use `rpm-player --input observations.json`, or import `think`, `defaultProfile`,
`defaultRulesA`, `emptyMemory` and `replayObservationSequence` from
`@rugby-player-model/player-reference`. The exported JSON schema defines the wire
contract for implementations in other languages.

`think(bundle, memory, profile, rules)` returns the legacy trace. Retrieval preserves
original observation times and confidence. The current `workingMemory` field is a
display excerpt; it is not a capacity constraint on the decision. Attention encodes
at most four inputs, while the store retains up to 128 observations for 30 seconds.
The separately versioned H-WM-1 research mode is being added during this migration.

Pass is an intention with unsupported execution. Software conformance does not
establish human validity, optimal rugby decisions or performance improvement.

The core has no filesystem or network adapter. The CLI performs only the explicit
input/output file operations above and rejects a full-world Snapshot as its input.
