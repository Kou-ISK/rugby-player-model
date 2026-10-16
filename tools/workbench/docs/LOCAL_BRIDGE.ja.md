# Codexと使うローカルfile/CLI bridge

[English](LOCAL_BRIDGE.md) | [日本語](LOCAL_BRIDGE.ja.md)

首振りはマウス固定・ドラッグ・矢印キーで操作できます。操作方法と研究上の意味は [選手視点での見回し](PLAYER_VIEW.ja.md) を参照してください。

会話中心で進める場合は [表示接続](PRESENTATION.ja.md) を使います。指導は会話に入力し、CLIが表示済みsnapshotと結び付けます。以下のブラウザ入力は手動記録の代替手順です。

設定済みの本人Macは [MAC_START.md](MAC_START.ja.md) と [保存場所](LOCAL_STORAGE.ja.md) を使います。以下の `npm run bridge --` は `./bridge-rpm.command`、`.rpm/` の作業ファイルはsession内の `work/` / `exports/` の絶対パスへ読み替えます。UIとCLIの通常起動を同じ設定に揃えてください。

See [dynamic scene contracts, CLI and acceptance scope](DYNAMIC_SCENES.ja.md) for the new fixed-step workflow: one 選手モデル-controlled player and scripted stimuli.
通常のCodexでこのリポジトリを開き、ローカルファイルを一緒に編集します。新たな有料API・鍵・AI自動送信は不要です。自然言語を自動で実行規則に変換する機能はありません。`propose` は場面付きの原則**候補**を保存するだけです。

未使用条件を評価する場合は、フィードバックより先に [評価条件を凍結](../../../evaluation/PROTOCOL.ja.md) します。固定8ケースは本人のprofileを引き継ぐ回帰試験であり、未見評価ではありません。UIの首振り観測履歴は静止研究として保存・再生します。

継続的な会話では[原則の探索を先に進める研究手順](RESEARCH_LOOP.ja.md)に従います。各回答を即時保存し、幅広く根拠を集めながら暫定原則を定期的に整理します。整理のたびにモデルを修正せず、実装とモデル評価は後の研究段階に行います。以下は個々の操作方法であり、回答や少数の場面のまとまりごとに全工程を実行する指示ではありません。

## UIから始める

1. `npm run dev`。一人称で首を振る、再生、停止。
2. フィードバックを記述して「この場面で候補を保存」。scene/seed/time/player、観測bundle、記憶、個人条件、選手モデル／判断原則版が同時に記録されます。
3. 表示された候補IDをCodexへ渡す。以下を実行し、観測に基づく候補を共同編集します。

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
```

`context.json` は世界真値を含みません。表示された候補の `revision` を控え、`editable.patchA` と `editable.principle` を `.rpm/edit.json` に取り出してCodexと編集します。形式は [条件付き指導例](../examples/conditional-coaching-edit.json) を参照。`notes` に変更理由・予測・反例を記入します。`contextRules` は配列全体の置換なので、保持する既存原則も含めます。原則は条件・基準・優先度・例外・不明時・根拠を埋めます。

```sh
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

Codexへの依頼例：

> `.rpm/context.json` を読み、この選手が知り得る情報だけで判断をレビューしてください。観測時刻を保持し、見えない空間を空と断定しないでください。選手モデルの検証可能なパラメータ差分と、判断原則の汎用的な原則候補を `.rpm/edit.json` に書き、`bridge edit` まで実行してください。採用・却下・undoは私が行います。変更理由、例外、反証になり得る場面を説明してください。

4. UIは数秒でCLIの変更を反映します。内容を確認し本人チェックを入れ、選手モデル／判断原則それぞれ「採用」「却下」または理由付き「差戻し」。チェックは一操作ごとに解除されます。
5. 採用前は「保存済み候補をpreview＋固定回帰」。未保存のJSON編集がある間は警告し、古い比較表示を消して要求を送信しません。先に保存し、表示されたrevisionを確認してください。保存時の選手モデルへ候補差分を一時合成し、版・承認・実行状態を変えず効果と反例を見ます。「現在の承認版と比較」は現在activeの選手モデルと保存時の選手モデルを比べる別操作です。層別8ケースは保持/非保持、圧力、観測欠損、記憶、音を含みます。この簡易比較は1時点の判断です。「未採用候補で再実行・記録」では1–20stepの結果・理由・版・入力を固定保存します。「現在の承認版で再実行・記録」と区別してください。判断原則は保存実験のpacketから文書／構造化追加原則／観測ケースを出力し、独立に評価・回答記録します。[手順とCLI](RESEARCH_LOOP.ja.md)を参照。勝率や試合全体の因果効果ではありません。
6. 本人チェック＋対象のundo。選手モデル undoは判断原則を戻しません。候補の「approved」は過去の承認履歴で、現在の版は画面の選手モデル／判断原則版を確認します。

## CLIだけで同じloopを使う

```sh
npm run bridge -- snapshot --scene support --seed 42 --head -2
npm run bridge -- propose SNAPSHOT_ID --feedback "支援の再確認を検討する"
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file tools/workbench/examples/candidate-edit.json --revision 1
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run --silent bridge -- preview CANDIDATE_ID --revision 2 > .rpm/preview.json
```

ここまでが候補作成です。次は**本人が意図して実行する承認コマンド**です。Codexは本人から個別の承認指示がない限り実行しません。

```sh
npm run bridge -- approve CANDIDATE_ID --target player --by owner --revision 2
npm run bridge -- approve CANDIDATE_ID --target judgment --by owner --revision 2
npm run --silent bridge -- compare CANDIDATE_ID > .rpm/comparison.json
npm run bridge -- export-judgment --out .rpm/RUGBY_JUDGMENT.local.md
npm run bridge -- undo player --by owner --version A1
npm run bridge -- undo judgment --by owner --version B1
```

上の数値は「revision 1の候補を1回編集し、選手モデル／判断原則の初回版を採用する」例です。実際には本人が確認したrevisionと、画面または `status` で確認したactive版を指定します。**最新値を自動取得して承認に渡すスクリプトにしないでください。** 却下にも `reject CANDIDATE_ID --target player --by owner --revision 2` のように確認版が必要です。

編集・承認・却下はlock内で確認revisionを照合します。別CLIが編集した場合はHTTP 409 / CLIエラーで拒否し、UIは最新内容を再表示して本人チェックを解除します。undoも確認済みactive版と異なれば拒否します。競合時の自動承認再試行はしません。承認履歴に確認revisionと差分・原則のコピーが固定されます。既存sessionの古い候補にはrevision 1を付与しますが、過去の承認に確認revisionがあったと後付けでは主張しません。

snapshotの選手モデル／判断原則基準版が変わった候補は採用できません。previewでは古い基準版での試算であることを表示します。採用するには新しいsnapshot、または理由を付けた `revise` で現承認版を基準に新候補を作ります。後者は観測を保持し、親候補IDを記録します。コピーした差分は現承認版に対して再点検し、既存のcontextRulesを誤って消さないでください。いずれかの対象を採用/却下/差戻しした候補は編集不可です。両方の内容を先に仕上げるか、新しい候補を作ります。

`models/judgment/RUGBY_JUDGMENT.md` は判断原則ドラフト0.1の提案文書です。bridgeの既定判断原則出力は凍結初期判断原則＋本人承認済み原則を使い、リポジトリ文書の編集で私的sessionの判断原則を変更しません。新しい原則は判断原則候補として個別に承認できます。全文baselineの置換も別の本人判断として利用でき、旧baselineと原則順序を保持します。合成の手動操作・共有提案・判断原則単独評価は [FIRST_RUN.md](FIRST_RUN.ja.md) を参照してください。本人sessionの全文置換は実施していません。

`npm run --silent` はJSONをファイルに保存する場合に必要です（npmの見出しを混ぜないため）。状態は `.rpm/state.json`、通常はUI/CLI経由で扱い、手で内部状態を書き換えません。`RPM_SESSION_DIR` で別ディレクトリを指定する場合は、誤ってGit追跡される場所を選ばないでください。

## 再起動・競合・回復

再起動しても候補・承認・履歴は保存済みです。画面は初期場面から始まるため「最新を復元」で直近snapshotの世界・記憶・個人条件に戻します。現在の承認済みルールは維持します。前後比較は候補に保存された旧ルールと現在のルールを使います。

同時書き込みは一方が `Session busy` で失敗し、後から再試行できます。プロセスが強制終了され `.rpm/.lock` が残った場合：dev serverと書き込みCLIをすべて停止し、`.rpm/` 全体をバックアップした後、`.rpm/.lock` **だけ**を除去して再起動します。実行中にlockを削除しないでください。状態ファイルの破損は自動初期化せずエラーにします。保存前の未編集テキストや未保存再生履歴は復元されません。

私的session、ユーザーのフィードバック、入力計画原文、認証情報はPRへ含めません。共有する場合は新しい合成サンプルに編集し直し、本人が公開範囲を確認します。

## H-WM-1研究モード（未検証）

受け手の比較・選択に対する容量制約です。全判断をK件に制限する、人間作業記憶の完成モデルではありません。保持観測による危険／定位、fresh/no-fresh条件は全保持証拠を使います。既定は従来のままです。

`mode-edit CANDIDATE --revision N --mode finite --k 4`、`--mode unlimited`、`--mode legacy`で候補に保存します。UIの研究モード欄も同じ編集を使います。変更だけではactiveは変わりません。`mode-study CANDIDATE --revision N --k 4`は同一観測で従来・新policy無制限・新policy有限を別armとして保存します。`mode-studies`で再起動後も取得できます。有限対無制限が容量対照、従来対無制限はpolicy差です。選手モデル専用採用後に実行へ適用し、選手モデル undoで以前のmodeへ戻ります。判断原則は変わりません。

旧記録でmodeがない場合は記録当時のlegacyを意味します。readerは旧記録へ新fieldやhashを書き足しません。新しい観測履歴には各eventのmodeを保存します。新規sessionと新しい書込みは外側のstate format 2を使い、旧バイナリはこれを拒否します。rollback時もformat 2対応readerを使い、新版sessionを保全してください。非legacy activeをundoするだけでは旧reader互換には戻りません。新版の記録を削除して旧版互換にしないでください。

## 観測の継続保存（bridge API 11）

一人称の観測は224件を目安に自動保存し、位置・時刻を維持して次の保存単位へ進みます。旧snapshotは変更しません。新snapshotの任意欄 `observationPredecessor` は元snapshotのID・hash、`observationAnchor` は区間開始時の再生専用世界です。観測contextには前者だけを含め、後者は選手モデル／判断原則の選手入力へ渡しません。`research-log` の `observationContinuations` で保存間の参照を確認できます。開始状態と観測の重複一件を用いて再生し、取得時刻・confidenceを更新しません。

共有提案は従来どおり選択した固定観測と記憶を出力し、私的snapshotの連鎖全体を自動公開しません。古いbridgeへ新UIから書き込まないため、更新時はserverを再起動します。
