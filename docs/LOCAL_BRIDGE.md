# Codexと使うローカルfile/CLI bridge

通常のCodexでこのリポジトリを開き、ローカルファイルを一緒に編集します。新たな有料API・鍵・AI自動送信は不要です。自然言語を自動で実行規則に変換する機能はありません。`propose` は場面付きの原則**候補**を保存するだけです。

## UIから始める

1. `npm run dev`。一人称で首を振る、再生、停止。
2. フィードバックを記述して「この場面で候補を保存」。scene/seed/time/player、観測bundle、記憶、個人条件、A/B版が同時に記録されます。
3. 表示された候補IDをCodexへ渡す。以下を実行し、観測に基づく候補を共同編集します。

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
```

`context.json` は世界真値を含みません。表示された候補の `revision` を控え、`editable.patchA` と `editable.principle` を `.rpm/edit.json` に取り出してCodexと編集します。形式は [sample](../examples/candidate-edit.json) を参照。原則は条件・基準・優先度・例外・不明時・根拠を埋めます。

```sh
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

Codexへの依頼例：

> `.rpm/context.json` を読み、この選手が知り得る情報だけで判断をレビューしてください。観測時刻を保持し、見えない空間を空と断定しないでください。Aの検証可能なパラメータ差分と、Bの汎用的な原則候補を `.rpm/edit.json` に書き、`bridge edit` まで実行してください。採用・却下・undoは私が行います。変更理由、例外、反証になり得る場面を説明してください。

4. UIは数秒でCLIの変更を反映します。内容を確認し本人チェックを入れ、A/Bそれぞれ「採用」または「却下」。チェックは一操作ごとに解除されます。
5. 採用前は「保存済み候補をpreview＋層別評価」。未保存のJSON編集がある間は警告し、古い比較表示を消して要求を送信しません。先に保存し、表示されたrevisionを確認してください。保存時のAへ候補差分を一時合成し、版・承認・実行状態を変えず効果と反例を見ます。「現在の承認版と比較」は現在activeのAと保存時のAを比べる別操作です。層別8ケースは保持/非保持、圧力、観測欠損、記憶、音を含みます。どちらも保存した1時点の判断比較であり、勝率や試合全体の因果効果ではありません。Bは文書を出力し別に評価します。
6. 本人チェック＋対象のundo。A undoはBを戻しません。候補の「approved」は過去の承認履歴で、現在の版は画面のA/B版を確認します。

## CLIだけで同じloopを使う

```sh
npm run bridge -- snapshot --scene support --seed 42 --head -2
npm run bridge -- propose SNAPSHOT_ID --feedback "支援の再確認を検討する"
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file examples/candidate-edit.json --revision 1
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run --silent bridge -- preview CANDIDATE_ID --revision 2 > .rpm/preview.json
```

ここまでが候補作成です。次は**本人が意図して実行する承認コマンド**です。Codexは本人から個別の承認指示がない限り実行しません。

```sh
npm run bridge -- approve CANDIDATE_ID --target A --by owner --revision 2
npm run bridge -- approve CANDIDATE_ID --target B --by owner --revision 2
npm run --silent bridge -- compare CANDIDATE_ID > .rpm/comparison.json
npm run bridge -- export-b --out .rpm/RUGBY_JUDGMENT.local.md
npm run bridge -- undo A --by owner --version A1
npm run bridge -- undo B --by owner --version B1
```

上の数値は「revision 1の候補を1回編集し、A/Bの初回版を採用する」例です。実際には本人が確認したrevisionと、画面または `status` で確認したactive版を指定します。**最新値を自動取得して承認に渡すスクリプトにしないでください。** 却下にも `reject CANDIDATE_ID --target A --by owner --revision 2` のように確認版が必要です。

編集・承認・却下はlock内で確認revisionを照合します。別CLIが編集した場合はHTTP 409 / CLIエラーで拒否し、UIは最新内容を再表示して本人チェックを解除します。undoも確認済みactive版と異なれば拒否します。競合時の自動承認再試行はしません。承認履歴に確認revisionと差分・原則のコピーが固定されます。既存sessionの古い候補にはrevision 1を付与しますが、過去の承認に確認revisionがあったと後付けでは主張しません。

snapshotのA/B基準版が変わった候補は採用できません。previewでは古い基準版での試算であることを表示します。採用するには最新snapshotから候補を作り直します。いずれかの対象を採用/却下した候補は編集不可です。両方の内容を先に仕上げるか、新しい候補を作ります。

`RUGBY_JUDGMENT.md` はB0.1-draftの提案文書です。bridgeのB出力は凍結B0＋本人承認済み原則を使い、リポジトリ文書の編集で私的sessionのBを変更しません。新しい原則はB候補として個別に承認できます。全文baselineの置換は別の本人判断であり、この更新では実施していません。

`npm run --silent` はJSONをファイルに保存する場合に必要です（npmの見出しを混ぜないため）。状態は `.rpm/state.json`、通常はUI/CLI経由で扱い、手で内部状態を書き換えません。`RPM_SESSION_DIR` で別ディレクトリを指定する場合は、誤ってGit追跡される場所を選ばないでください。

## 再起動・競合・回復

再起動しても候補・承認・履歴は保存済みです。画面は初期場面から始まるため「最新を復元」で直近snapshotの世界・記憶・個人条件に戻します。現在の承認済みルールは維持します。前後比較は候補に保存された旧ルールと現在のルールを使います。

同時書き込みは一方が `Session busy` で失敗し、後から再試行できます。プロセスが強制終了され `.rpm/.lock` が残った場合：dev serverと書き込みCLIをすべて停止し、`.rpm/` 全体をバックアップした後、`.rpm/.lock` **だけ**を除去して再起動します。実行中にlockを削除しないでください。状態ファイルの破損は自動初期化せずエラーにします。保存前の未編集テキストや未保存再生履歴は復元されません。

私的session、ユーザーのフィードバック、入力計画原文、認証情報はPRへ含めません。共有する場合は新しい合成サンプルに編集し直し、本人が公開範囲を確認します。
