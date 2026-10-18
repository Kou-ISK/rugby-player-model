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
| Codexなどの協力者と研究を始める | [研究開始手順](tools/workbench/docs/RESEARCH_START.ja.md) |
| 合成データでソフトウェア操作を練習する | [任意のチュートリアル](tools/workbench/docs/FIRST_RUN.ja.md) |
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

[研究開始手順](tools/workbench/docs/RESEARCH_START.ja.md)に従って私的sessionを用意します。過去の会話や個人Macの設定は不要です。まず攻撃・サポート・守備の目的、維持する関係、崩れ方、修復を整理し、既存の根拠を使ってから不足を確認します。ケースは不足を明らかにするか、競合する説明を区別するために選びます。取得した観測と指導、反例を保存し、反復や無関係な枝は保留します。再開用の[checkpoint](tools/workbench/docs/RESEARCH_CHECKPOINT.ja.md)を維持します。

[AGENTS.md](AGENTS.ja.md)でこの順序を必須とし、[研究手順](tools/workbench/docs/RESEARCH_LOOP.ja.md)で段階の移行条件を定めます。証拠は毎回答保存し、意味のある区切りで統合して、後の段階で機構を提案します。ケースごとのモデル調整は行いません。指導への適合、相互反応による連携、実際の人の行動による支持は別の品質段階であり、隊形の台本再生だけで自己組織化とは認定しません。これは研究手順であり、協力者の遵守を実行時に自動保証する機能ではありません。

候補は保存された提案であり、previewでは採用されません。選手モデルと判断原則は、版・採否・undoを独立して管理します。共有提案も未承認データとして取り込み、ローカルで再現・レビューします。

指導は会話で行います。[表示接続](tools/workbench/docs/PRESENTATION.ja.md)で実際のブラウザ観測と結び付けるため、UIの自動操作は不要です。特定のAI製品、API鍵、有料サービス、私有素材に依存しません。生成場面を用い、実試合映像の分析はこの手順に含めません。

## 現在できること

世界状態・観測・不確実な推定を分離します。身体の向きと移動を区別し、共通の現行契約で攻撃・守備・保持の不確実性を扱います。motor設定では、制限付きの移動、抽象的なパス・捕球・接触、各自で観測する選手を扱います。kinematic設定のパスは意図のみです。packageは0.4.0のまま、[現行形式](docs/decisions/ADR-003-current-format.ja.md)に統一します。

任意選択の[受け手比較の仮説](models/player/spec/H-WM-1.ja.md)は、受け手を比較する観測の容量を制限します。人間の作業記憶全体のモデルではありません。同じpolicyの有限／無制限容量を比較し、従来policyとの差は別に調べます。[身体方向](models/player/spec/ORIENTATION_PHASE.ja.md)、[閉ループ](models/player/spec/CLOSED_LOOP.ja.md)、[モデルカード](models/player/MODEL_CARD.ja.md)、[限界](docs/LIMITATIONS.ja.md)に実装範囲と未検証事項を記載しています。

`npm run check` は文書・manifest・型・基本試験・build・依存境界、`npm run test:browser` はブラウザ連携、`npm run test:first-run` は合成データによる初回手順を検証します。ブラウザ試験にはPlaywright Chromiumまたは `RPM_CHROMIUM` が必要です。自動試験、本人による画面の受入、科学的な妥当性を区別します。

## 設定済みのMac

研究用Macでは[起動手順](tools/workbench/docs/MAC_START.ja.md)と[保存・復旧手順](tools/workbench/docs/LOCAL_STORAGE.ja.md)に従います。launcherは別の場所へコピーしても、設定されたソースと私的sessionを使います。別checkoutの試験には、保存先を明示した合成sessionを使ってください。

## ライセンスと原資料

[LICENSE-SCOPE.md](LICENSE-SCOPE.ja.md)に定める著作部分へMITを適用します。依存物のライセンスと帰属を保持します。[研究原資料のアーカイブ](models/judgment/archive/README.ja.md)と手続き的描画の原資料は、元のバイト列・歴史的な権利表記を保持します。私的session、実試合・選手データ、範囲外の外部素材は公開対象ではありません。

日本語版と英語版は相互リンクします。[命名と互換性](docs/NAMING.ja.md)に、意味の分かる名称と、過去データの再現に必要な旧識別子の扱いをまとめています。
