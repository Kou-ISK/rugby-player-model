# 選手モデル

[English](README.md) | [日本語](README.ja.md)

選手モデルは、決定的に動く未較正の認知プロトタイプです。観測、過去の記憶、選手profile、判断ルールから、状況の推定、行為の得点、意図、対応技能を明示した身体要求を返します。シミュレーション世界、判断原則文書、ビューア、私的sessionは不要です。

## 実行とパッケージ化

Node 24とrepositoryのlockfileを使います。

```sh
npm ci
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
npm pack ./models/player --pack-destination /your/output/directory
```

別projectへtarballを入れ、`rpm-player --input observations.json` で実行できます。`@rugby-player-model/player-reference` は `think`、`defaultProfile`、`defaultRulesA`、`emptyMemory`、`replayObservationSequence` をexportし、runtime依存はAjvだけです。[JSON Schema](spec/contracts.schema.json)を別言語の実装にも使えます。`RulesA` と `defaultRulesA` は互換API識別子です。[互換性](../../docs/NAMING.ja.md)を参照してください。

## 契約と限界

`think(bundle, memory, profile, rules)` はTrace 4、`modelRevision: cognition-0.4.0` を返します。入力はBundle 3・Percept 2に統一します。検索で元の観測時刻・確信度を更新せず、注意は最大4入力、記憶は30秒内の最大128観測です。`workingMemory` は表示抜粋であり判断容量の上限ではありません。

実行契約v2は `execute({executionContractVersion:2, executionMode, bundle, memory, profile, rules})` です。`baselineMode()`、`finiteMode(4)`、`unlimitedMode()` を選びます。`node models/player/dist/reference/cli.js --input models/player/examples/receiver-deliberation.json` で付属例を実行できます。[受け手比較の仮説](spec/H-WM-1.ja.md)が制限するのは受け手の比較だけで、人間の作業記憶全体ではありません。

[身体方向](spec/ORIENTATION_PHASE.ja.md)と[閉ループ](spec/CLOSED_LOOP.ja.md)は同じ契約を使い、実際にある文脈・運動観測で能力を有効にします。運動学的場面のパスは意図のみ、motor場面では抽象的なパス・捕球・接触を実行します。CLIの返却は常に実行envelopeです。過去の記録は未観測情報を補わずコピーを変換します。[現行形式への統一](../../docs/decisions/ADR-003-current-format.ja.md)を参照してください。

純粋なcoreはfilesystem・network・世界状態のadapterを持ちません。CLIは明示した入力・出力ファイルだけを扱い、世界全体を含むSnapshotを選手入力として拒否します。試験が示すのはソフトウェアの性質であり、人間の認知、最適なラグビー判断、競技力向上ではありません。[モデルカード](MODEL_CARD.ja.md)を参照してください。
