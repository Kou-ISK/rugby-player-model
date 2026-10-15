# 会話とブラウザ表示を結ぶローカル接続

[English](PRESENTATION.md) | [日本語](PRESENTATION.ja.md)

指導と解釈はCodexなどの会話で行い、ブラウザは3Dの表示と観測の取得を担う。AI APIやComputer Useは必要ない。ブラウザの自由文欄は手動記録用であり、入力をAIへ送信・解釈する機能ではない。

設定済みMacでは `./start-rpm.command` と `./bridge-rpm.command` を使う。他の環境は [FIRST_RUN](FIRST_RUN.ja.md) に沿って専用sessionを用意し、下記のbridgeを `npm run --silent bridge --` に置き換える。生成scene/context/編集案の保存先は私的session内の絶対パスにする。

## 表示を固定して指導を受ける

1. 起動URLをブラウザで開く。bridgeが接続した表示を列挙する。

```sh
./bridge-rpm.command views
```

各表示は `clientId` と `display.revision`、場面ID・版・tick、player/spectator/comparison、停止状態を返す。別タブは別IDになる。操作対象を明示し、最初のタブや最新snapshotを勝手に選ばない。

2. 対象表示を止め、実際の観測履歴を保存する要求を送る。

```sh
./bridge-rpm.command view-request capture --client DISPLAY_ID --revision N
./bridge-rpm.command view-result REQUEST_ID
```

requestは受付を意味するだけ。`completed` と `result.snapshotId` を得てから、その場面への指導を扱う。ブラウザが動いて表示revisionが変わると拒否される。`views` で対象を再確認して新規要求を出す。取得した応答JSONも研究記録として保存する場合は、session内workの絶対パスへ出力する。

3. 選手の情報だけを読み、会話の指導をsnapshotへ結ぶ。

```sh
./bridge-rpm.command snapshot-context SNAPSHOT_ID
./bridge-rpm.command propose SNAPSHOT_ID --feedback '会話で受け取った指導原文'
./bridge-rpm.command context CANDIDATE_ID
```

区間指導では既存の `--from-tick N --to-tick M --player observer-0` を指定する。保存snapshotが実際に取得した履歴の区間を使い、CLIで別に計算した過去を「本人が見た区間」としない。指導は研究者の介入であり、その瞬間の選手の聴覚入力にしない。

`context` は観測ベースの研究編集用であり、匿名盲検の判断原則 packetとは別。`snapshot-export` は世界真値を含む作成者用出力なので、選手役のLLMには渡さない。以後は [LOCAL_BRIDGE](LOCAL_BRIDGE.ja.md) の編集・比較手順を使う。

## 固定snapshotを表示する

場面JSONを `scene-create` で保存し、`scene-snapshot SCENE_ID --revision N --tick 0` などで開始点を用意する。この計算だけでは画面への提示にならない。

```sh
./bridge-rpm.command view-request present --client DISPLAY_ID --revision N --snapshot SNAPSHOT_ID
./bridge-rpm.command view-result REQUEST_ID
```

ブラウザは元の取得履歴をsnapshotとして退避し、指定snapshotを一人称で復元・描画して停止する。三人称（spectator）表示中もpresentを受け付け、退避後に一人称へ切り替える。俯瞰カメラの角度や世界真値を選手の観測履歴へ追加しない。退避中に研究状態や表示モードが変わった場合は拒否する。応答の `previousSnapshotId` は退避先、`snapshotId` は新しく描画した状態の保存先。元の場面の履歴を混ぜない。現在の選手モデル／判断原則・実行設定と異なるsnapshotは拒否する。その場合は既存の保存実験比較機能を使い、現在の採用版を置き換えない。

## 応答の意味と限界

- `completed` はローカルUIが描画処理を終え、対応するsnapshotが保存されたという応答。人が画面を見たことや場面を妥当と判断したことの証明ではない。
- 5秒以上heartbeatがない表示は操作できない。要求は15秒で期限切れ、未完了・失敗要求の照会は最大5分。完了receiptとsnapshotはstate.jsonへ残り、再起動後もID照会できる。未処理要求は再実行しない。
- `--request-id` を固定すれば同じ入力の再送は同じ要求を参照する。内容の異なるID再利用は拒否する。期限切れ・通信切断で表示だけ変わった可能性がある場合は、新しい `views` と保存記録を確認する。成功したと仮定しない。
- 手動の首振り・場面変更などでrevisionが変わると古い要求を拒否する。spectatorからはpresentだけを受け付け、capture・compare・returnは拒否する。比較中はcompare/returnだけを受け付ける。
- 表示命令はcapture/present/compare/return。任意JS、自然言語実行、選手モデル／判断原則採否は持たない。CLIは同一sessionのserver leaseを使い、既存のloopback・Host・Origin制限を維持する。ローカルユーザー自身による偽造に対する認証システムではない。
- snapshot保存とreceipt保存は別トランザクション。中断時にはsnapshotだけ残り得る。完了応答のない表示を指導の確定根拠にしない。過去に永続receiptがなかった記録へ後付けの証明は作らない。

画面上部のチーム色・保持・攻撃方向・足元の身体方向の補助表示は状況理解用であり、生体の視覚モデルではない。観測v2の場面では、可視の身体方向が選手モデルの入力・関係推定に含まれる。旧v1は従来の入力を維持する。v3は抽象的な走路・守備技能も持つが、競技的妥当性の承認ではない。詳細は [観測契約](../../../models/player/spec/ORIENTATION_PHASE.ja.md)。

## 保存実験を会話から比較する

```sh
./bridge-rpm.command view-request compare --client DISPLAY_ID --revision N --experiment EXPERIMENT_ID --arm before --frame 2
./bridge-rpm.command view-result REQUEST_ID
# viewsで新しいrevisionを確認して、同じframeのafterへ切り替える
./bridge-rpm.command view-request compare --client DISPLAY_ID --revision M --experiment EXPERIMENT_ID --arm after --frame 2
./bridge-rpm.command view-request return --client DISPLAY_ID --revision K
./bridge-rpm.command research-log --out /absolute/private/work/research-log.json
```

比較は保存frameの表示であり再計算ではない。receiptはexperiment/arm/frameへ結び付き、画面の時計もそのframeを指す。returnで元の停止中の研究状態へ戻りsnapshotを保存する。比較中は研究の時計・記憶・承認版を進めない。`research-log` は永続receipt、候補の参照snapshot、指導区間、実験と採否を列挙する。過去に専用リンクがなかった候補はnullのまま残す。
