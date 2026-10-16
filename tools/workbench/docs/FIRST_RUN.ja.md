# 初めての研究loop（公開合成チュートリアル）

[English](FIRST_RUN.md) | [日本語](FIRST_RUN.ja.md)

実際の共同研究は [RESEARCH_START](RESEARCH_START.ja.md) から始めます。私的checkpointを作り、大枠を整理する入口です。この文書の合成採否や即時の編集・previewを、指導後の既定の研究手順にはしません。

Node 24とGitを用意し、repositoryのrootで実行します。Codex・本人Mac用launcher・dot・API鍵・有料AIは不要です。選手モデルのソフトウェア検証、判断原則の手動評価、本人による研究原則の採用は別です。以下の採否は新しい合成チュートリアルsessionにだけ行います。

```sh
npm ci
export RPM_SESSION_DIR="$PWD/.rpm/tutorial"
npm run bridge -- session init --dir "$RPM_SESSION_DIR" --synthetic
npm run dev
```

表示されたloopback URLをブラウザで開きます。既存sessionならinitは拒否するので、別の新しい保存先を選びます。既存データを消してinitし直す操作はありません。停止は起動したTerminalでControl-C、または同じ `RPM_SESSION_DIR` の別Terminalで `npm run bridge -- stop`。後者はそのsessionの起動instanceを照合し、他のプロセスをkillしません。再開は同じ保存先で `npm run dev`。

## 画面から行う

1. 支援の場面、seed 42、一人称で始めます。首を約−110°へ振って支援選手を観測し、0°へ戻します。世界表示はspectator、選手の観測・記憶は別の欄です。画面のscene/seed/player/timeを確認し、snapshotを保存します。
2. フィードバックを短く記入し「この場面で候補を保存」。下の「AI不要の手動候補入力」で条件・判断基準・例外・不明時・根拠・変更理由・期待・反例を記入し、編集欄へ反映します。候補編集欄を確認し保存。JSON欄は直接手動でも編集できます。`Codex用の観測context`は任意の補助で、worldを含みません。
3. 「保存済み候補をpreview＋固定回帰」で未採用差分を確認。候補のモードを「H-WM-1：容量指定」、K=1として保存し、同じ観測で従来・無制限・有限を保存比較します。無制限対有限が容量対照、従来対無制限はpolicy差です。保持観測による危険／定位は容量制約外です。受け手の比較・選択への制約であり、全判断をK件に制限する、人間作業記憶の完成モデルではありません。
4. 合成試験として本人チェックを一操作ごとに入れ、選手モデルだけ採用。判断原則が変わらないことを確認します。次に判断原則だけ採用。判断原則全文置換を試す場合は編集時に「新baselineへ全文置換」を選び、本文と引き継ぐ原則の順序付き配列を明示します。旧本文は上書きされません。
5. 選手モデルだけundoして判断原則が維持されることを確認し、判断原則も別操作でundoします。候補・実験・採否の履歴は残ります。停止・再起動して候補、mode/K、保存arm、現在選手モデル／判断原則版を再確認します。保存frameの比較は再計算しません。
6. 「共有提案」で対象選手モデル／判断原則、作者、権利根拠を記入し、この合成候補への許諾チェックを入れてexport。候補と許諾した合成入力だけが列挙されます。私的session全体・採用履歴・絶対保存pathは梱包しません。
7. 別の新規sessionでファイルを選びvalidate → import-inert → preview/reproduce。未承認取込で有効な選手モデル／判断原則は変わりません。新run IDで再実行され、元runと意味結果digestを比較します。判断原則単独再現を選べます。
8. 研究reviewは実施したrunを選び、scope・限界・理由を記入して記録します。チュートリアルでは「合成ソフトウェア試験の模擬review」を明示。永久IDから機構/原則、仮説、反例/ケース、run、review、提案成果物をたどれます。撤回は理由を追記し、負の証拠を削除しません。

## CLIで同じ操作を行う

各JSON応答からIDとrevisionを読み、下の大文字プレースホルダーを置き換えます。採用の直前に最新値を自動取得して渡すのではなく、表示した内容と版を確認します。

```sh
npm run bridge -- snapshot --scene support --seed 42 --head -2
npm run bridge -- snapshot-turn SNAPSHOT_ID --head 0
npm run bridge -- propose TURNED_SNAPSHOT_ID --feedback '合成試験：支援の鮮度と不確実性を確認する'
npm run --silent bridge -- context CANDIDATE_ID
npm run bridge -- edit CANDIDATE_ID --revision 1 --file tools/workbench/examples/conditional-coaching-edit.json
npm run bridge -- mode-edit CANDIDATE_ID --revision 2 --mode finite --k 1
npm run --silent bridge -- preview CANDIDATE_ID --revision 3
npm run bridge -- mode-study CANDIDATE_ID --revision 3 --k 1
npm run bridge -- approve CANDIDATE_ID --target player --by owner --revision 3
npm run bridge -- approve CANDIDATE_ID --target judgment --by owner --revision 3
npm run bridge -- compare CANDIDATE_ID
npm run bridge -- undo player --by owner --version A1
npm run bridge -- undo judgment --by owner --version B1
npm run bridge -- proposal export CANDIDATE_ID --revision 3 --targets player,judgment --author 'Synthetic tutorial' --rights '自作合成素材、明示したMIT許諾範囲' --public-synthetic --out "$RPM_SESSION_DIR/proposal.rpm-proposal.json"
```

次のsessionでは元のsessionの保存先を渡さず、exportしたファイルだけを渡します。

```sh
export RPM_SESSION_DIR="$PWD/.rpm/tutorial-receiver"
npm run bridge -- session init --dir "$RPM_SESSION_DIR" --synthetic
npm run bridge -- proposal validate --file /absolute/path/proposal.rpm-proposal.json
npm run bridge -- proposal import --file /absolute/path/proposal.rpm-proposal.json
npm run bridge -- proposal reproduce LOCAL_CANDIDATE_ID --manifest CONFIRMED_MANIFEST_SHA256
npm run bridge -- proposal list
```

採用する場合は `proposal adopt LOCAL_CANDIDATE_ID --target player --by owner --session-revision CONFIRMED_SESSION_REVISION --manifest CONFIRMED_MANIFEST_SHA256 --run LOCAL_RUN_ID --reason '合成試験の採用理由'`。判断原則は対象を判断原則にした別操作です。undoは上と同じです。旧revisionは409相当のConflictErrorで拒否され、内容を再確認します。失敗時には状態を書き換えません。

基準版が異なる場合は `proposal rebase LOCAL_CANDIDATE_ID --session-revision N --reason '理由' --targets player,judgment --author '作者' --rights '許諾根拠' --public-synthetic`。新しい未承認revisionを作り、再度reproduceしてから判断します。初版のデータrebaseは1ケースの固定観測に限定し、多caseやcode-review-refは明示的に拒否します。判断原則は提案の本文・原則順序を引き継ぐため、現在判断原則との違いをレビューしてください。自動mergeしません。

判断原則だけの評価は [独立判断原則比較の完全手順](JUDGMENT_EVALUATION.ja.md) を使います。`judgment-evaluation-packet --file CASES.json --arm none` は本文無し、`--arm old --version B0` は凍結旧本文、`--arm new --text-file PRINCIPLES.md` は新本文と固定hash参照です。評価者へ渡すのはpacketの `modelInput` だけ。`judgment-evaluation-review --file REVIEW.json` には元packet、model、output、原則適合とラグビー妥当性の別採点を渡します。保存時にactive 判断原則から入力を再生成しません。選手モデル実験・外部AI呼出は不要で、回答は未検証として記録します。

`research-review LOCAL_CANDIDATE_ID --run LOCAL_RUN_ID --status restrict --scope '合成固定観測' --limits '人の妥当性未評価' --reason '反例を保持する' --synthetic`、`research-evidence`、`research-withdraw HYPOTHESIS_URN --version 1 --reason '反例による撤回'`で参照を保存・表示・撤回できます。採用や科学的支持を自動発生させません。

## 共有形式と限界

初版の運搬形式は `.rpm-proposal.json`。versioned manifestと列挙したUTF-8データentryを一つのJSON envelopeに保存します。ZIPや実行環境は不要です。16 MiB payload / 256 entry / 1 MiB manifestを上限とし、未知field/version、重複キー、危険path、実行物、壊れたhash、不足参照を拒否します。HTMLとして解釈せず、外部資源を取得しません。hashは署名や作者認証ではありません。

engine参照と入力が揃い、binaryだけが未導入ならimport-inertまで可能です。選手モデル実行はengine-unavailableで停止し、別engineへ黙って置き換えません。判断原則単独本文再現は独立に可能です。再現は実行管理ID・壁時計・環境を別記録し、観測ID・観測時刻・score・意図・次Memory・判断原則本文/順序を含む意味結果を比較します。

この手順の自動試験はMac headlessの合成試験です。本人が画面で操作した実証、認知仮説の実測、外部AIによる判断原則評価とは区別します。

## 保存形式と復旧

新規sessionはstate format 2です。format 1は読み取れ、最初の明示的な保存操作でformat 2になります。個々の旧記録と旧digestは保持します。旧バイナリはformat 2を拒否するため、古いコードへ戻して新記録を黙って誤解釈しません。入口を戻す場合もformat 2対応readerを使い、旧backupで新しい記録を上書きしないでください。
