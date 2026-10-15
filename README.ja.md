# Rugby Player Model

[English](README.md) | [日本語](README.ja.md)

限られた情報から、ラグビー選手が何を知覚・記憶・予測し、どう行動を選ぶかを研究します。独立して使える二つの成果物を作ります。

- **選手モデル** — 実行可能な認知モデル。観測、過去の記憶、選手の特性、判断ルールから、状況の推定、行為の評価、意図、実行可能な身体動作の要求を返します。
- **判断原則** — 判断過程、適用条件、例外、不確実性の扱いを説明する自己完結した文書。選手モデルを動かさずに、人や汎用AIが利用できます。

研究ワークベンチは、合成場面の提示、観測と指導の記録、修正候補の比較を支えます。成果物は研究仮説です。ソフトウェア試験の成功だけでは、人間の認知としての妥当性や競技力の改善を示せません。

## 目的から探す

| 目的 | 文書 |
| --- | --- |
| 観測を入力して選手モデルを動かす | [選手モデル](models/player/README.ja.md) |
| 判断原則を使う・LLMに選手の役割を渡す | [判断原則](models/judgment/README.ja.md) |
| ローカルで研究を始める | [初回チュートリアル](tools/workbench/docs/FIRST_RUN.ja.md) |
| 研究手法を理解する | [認知研究の要件](docs/COGNITIVE_RESEARCH.ja.md) |
| 改善へ参加する・実験を再現する | [貢献ガイド](CONTRIBUTING.ja.md)、[再現手順](docs/REPRODUCTION.ja.md) |
| 仕様や操作手順を探す | [文書一覧](docs/README.ja.md) |

## 選手モデルを実行する

Node.js 24で固定された依存関係を入れ、付属例を実行します。

```sh
npm ci
npm run build:player
node models/player/dist/reference/cli.js --input models/player/examples/observations.json
```

選手モデルのパッケージは、シミュレーション世界、ビューア、私的session、判断原則文書を必要としません。同じ入力契約を別の実装にも利用できます。

## 判断原則を利用する

[判断原則](models/judgment/RUGBY_JUDGMENT.ja.md)と[選手役のガイド](models/judgment/PLAYER_GUIDE.ja.md)を読みます。独立評価では、同じ観測について**原則なし・旧文書・提案文書**を比較します。[判断原則の評価手順](tools/workbench/docs/JUDGMENT_EVALUATION.ja.md)に沿い、原則への適合とラグビーとしての妥当性を別々に記録します。ツールからAIサービスは呼び出しません。

## 場面と指導を通じて研究する

[初回チュートリアル](tools/workbench/docs/FIRST_RUN.ja.md)で新しい合成sessionを用意します。選手視点で場面を見て、実際に取得した観測を保存し、そのsnapshotに指導を結び付けます。指導の解釈を仮説にし、別の説明との違いを識別できる条件を用意して結果を比較し、反例も残します。[会話による研究の進め方](tools/workbench/docs/RESEARCH_LOOP.ja.md)を参照してください。

候補は保存された提案であり、previewでは採用されません。選手モデルと判断原則は、版・採否・undoを独立して管理します。共有提案も未承認データとして取り込み、ローカルで再現・レビューします。

指導は会話で行います。[表示接続](tools/workbench/docs/PRESENTATION.ja.md)で実際のブラウザ観測と結び付けるため、UIの自動操作は不要です。特定のAI製品、API鍵、有料サービス、私有素材に依存しません。生成場面を用い、実試合映像の分析はこの手順に含めません。

## 現在できること

世界状態・観測・不確実な推定を分離します。身体の向きと移動を区別し、版付き契約で攻撃・守備・保持の不確実性を扱います。任意選択のscene v3では、制限付きの移動、抽象的なパス・捕球・接触、各自で観測する選手を扱います。旧場面の挙動は維持し、パス実行が未対応の枝では意図だけを返します。

任意選択の[受け手比較の仮説](models/player/spec/H-WM-1.ja.md)は、受け手を比較する観測の容量を制限します。人間の作業記憶全体のモデルではありません。同じpolicyの有限／無制限容量を比較し、従来policyとの差は別に調べます。[身体方向](models/player/spec/ORIENTATION_PHASE.ja.md)、[閉ループ](models/player/spec/CLOSED_LOOP.ja.md)、[モデルカード](models/player/MODEL_CARD.ja.md)、[限界](docs/LIMITATIONS.ja.md)に実装範囲と未検証事項を記載しています。

`npm run check` は文書・manifest・型・基本試験・build・依存境界、`npm run test:browser` はブラウザ連携、`npm run test:first-run` は合成データによる初回手順を検証します。ブラウザ試験にはPlaywright Chromiumまたは `RPM_CHROMIUM` が必要です。自動試験、本人による画面の受入、科学的な妥当性を区別します。

## 設定済みのMac

研究用Macでは[起動手順](tools/workbench/docs/MAC_START.ja.md)と[保存・復旧手順](tools/workbench/docs/LOCAL_STORAGE.ja.md)に従います。launcherは別の場所へコピーしても、設定されたソースと私的sessionを使います。別checkoutの試験には、保存先を明示した合成sessionを使ってください。

## ライセンスと原資料

[LICENSE-SCOPE.md](LICENSE-SCOPE.ja.md)に定める著作部分へMITを適用します。依存物のライセンスと帰属を保持します。[研究原資料のアーカイブ](models/judgment/archive/README.ja.md)と手続き的描画の原資料は、元のバイト列・歴史的な権利表記を保持します。私的session、実試合・選手データ、範囲外の外部素材は公開対象ではありません。

日本語版と英語版は相互リンクします。[命名と互換性](docs/NAMING.ja.md)に、意味の分かる名称と、過去データの再現に必要な旧識別子の扱いをまとめています。
