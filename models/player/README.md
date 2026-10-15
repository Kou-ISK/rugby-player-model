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
H-WM-1 is an explicitly selectable research mode; see [its contract and limits](./spec/H-WM-1.md). It constrains receiver deliberation only, not all judgments or complete human working memory.

In Bundle v1/v2, pass is an intention with unsupported execution. Bundle v3 supports abstract motor requests through the separate simulation adapter. Software conformance does not
establish human validity, optimal rugby decisions or performance improvement.

The core has no filesystem or network adapter. The CLI performs only the explicit
input/output file operations above and rejects a full-world Snapshot as its input.

For execution contract v2, use `execute({executionContractVersion:2, executionMode, bundle, memory, profile, rules})`. Choose `legacyMode()`, `finiteMode(4)` or `unlimitedMode()`. The input contains no world or B. `node models/player/dist/reference/cli.js --input models/player/examples/observations-v2.json` runs the provided v2 example. Legacy `think` and old inputs retain their original behavior.

Observation Bundle v2 and Trace v3 are opt-in contracts for body orientation and uncertain attack/defense phase. See [ORIENTATION_PHASE](spec/ORIENTATION_PHASE.md) for evidence boundaries, engineering assumptions and unsupported defense skills. Existing Bundle v1 behavior is retained.

## 閉ループの追加契約

任意選択のscene v3は、身体方向を含む観測から運動を推定し、小目標の維持・切替と攻守の抽象動作、独立した少人数の相互応答を扱う。仕様・工学的仮定・機構除去比較・限界は [Closed loop](spec/CLOSED_LOOP.md) を参照。旧scene v1/v2と保存記録は従来の意味を保持する。ソフトウェア試験は人間の認知的妥当性やA/Bの採用ではない。
