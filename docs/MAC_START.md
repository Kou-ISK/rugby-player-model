# Macで生成3Dと会話から研究を始める

1. Codexで `~/Documents/workSpace/rugby-player-model` をフォルダとして開きます。最初に「`docs/MAC_START.md` に沿って研究を始めたい。試したい場面を会話で一緒に作り、採用は私が判断する」と伝えます。
2. repo直下の `start-rpm.command` を実行し、表示された `http://127.0.0.1:5173` をブラウザで開きます。専用Node 24と同じ保存先を使います。停止は起動ターミナルで **Control-C** です。既存serverがportを使用中なら起動は失敗します。他のjobを停止しないでください。
3. 試したい配置や動きを短く伝えます。Codexは `examples/dynamic-support.scene.json` と [動的場面契約](DYNAMIC_SCENES.md) を参照し、場面JSONをsessionの `work/` に保存して `./bridge-rpm.command scene-create --file ABSOLUTE_SCENE_JSON` を実行します。場面生成はA/B採用ではありません。まず合成例を見たい場合は次だけでも開始できます。

```sh
./bridge-rpm.command scene-create --file examples/dynamic-support.scene.json
```

4. 画面の「場面」で保存した動的r1を選び、「再現 / reset」。一人称のまま1 step、再生・停止、首振りで観察します。対象1人をAが動かし、他の選手は指定した経路を動きます。再生開始だけでは記録は保存されません。
5. 止めて「ここでは一度周囲を確認してほしい」など短い指導を入れ、「この場面で候補を保存」。理由は任意です。区間の開始tickを選び、終了tick・対象・場面版を確認します。表示された候補IDをCodexへ伝えます。
6. Codexと観測contextを読み、適用条件・例外・予測・反例を候補として編集・保存します。Aの対応外の機構は別のコード案にします。会話で場面を作ったCodexは未来を知り得るため、これを盲検評価とは呼びません。

```sh
./bridge-rpm.command context CANDIDATE_ID > "$HOME/Research/rugby-player-model/sessions/owner-primary/work/context.json"
./bridge-rpm.command edit CANDIDATE_ID --file "$HOME/Research/rugby-player-model/sessions/owner-primary/work/edit.json" --revision CONFIRMED_REVISION
```

7. 画面で保存revisionを確認し、「未採用候補で再実行・記録」。保存実験の「beforeを3Dで見る」「afterを3Dで見る」で同じtickを比較し、「研究へ戻る」で戻ります。最大20frameの記録範囲です。区間全体の完走とは限らないため、終了理由も確認します。ここまではA/Bを採用せずにできます。

採用・差戻し・undoは本人が内容を確認してA/B別々に行います。Codexは個別指示なしで代行しません。次の別条件で再検証し、Bは独立したAI入力・回答・採点として記録します。本人の意味判断が必要になったところで一緒に確認します。

ブラウザ再読込・server再起動後は、保存場面を選ぶか「最新を復元」、または保存候補の「候補の場面を復元」を使います。保存実験もそのまま選べます。未保存テキストと未保存の再生履歴は戻りません。

研究正本は `~/Research/rugby-player-model/sessions/owner-primary/state.json`、作業案は `work/`、出力コピーは `exports/`。詳細は [LOCAL_STORAGE.md](LOCAL_STORAGE.md)。追加のAPIキー・有料AI接続は不要です。

受入済みなのはS1–S5の合成実装です。本人が実画面と会話で一周するS6、Bの実AI評価はこれからです。headless試験・仮承認を本人の研究原則への承認と扱いません。公開はこの配置作業と別に確認します。
