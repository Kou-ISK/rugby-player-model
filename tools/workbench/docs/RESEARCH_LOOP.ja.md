# 本人とCodexの最初の研究実験

[English](RESEARCH_LOOP.md) | [日本語](RESEARCH_LOOP.ja.md)

このloopの目的は、本人の指導を条件付き仮説として明示し、適用場面と反例の両方で試して残すことです。動作が変わるだけでは改善とは判定しません。実施状況・本人の評価・採否は各sessionの記録で確認します。

## 会話で研究を進める役割と区切り

研究対象は、限られた知覚と記憶から関係・行為可能性を推定し、目標に照らして行為を選び、実行後の観測で維持・修正する仕組みです。生成場面はその仕組みを識別する刺激として使います。指導者の説明だけで人間の認知過程そのものを測定したことにはなりません。

本人は場面の意味を確認し、選手への指導・判断が変わる手掛かり・例外を伝えます。Codexは研究の進行、場面準備、表示、原文と解釈の分離、仮説・対照・結果の記録を担当します。本人に次のコマンドや試験方式を選ばせて会話を止めません。

1. **現在地を伝える。** 調べる問い、現在の段階、今回本人にしてほしい一つのことを示す。画面が動作試行、仮説形成用の配置比較、モデル評価のどれかを明示する。
2. **意味を確かめて指導を受ける。** 誰が味方か、対象や身体方向などの不備があれば先に修正する。見せた入力を保存し、通常は一度に一つの具体的な質問をする。操作の失敗を認知判断として採点しない。
3. **指導を仮説にする。** 「使った情報→予測する関係→選択・継続・中止の条件」を短く言い直す。本人の明示事項、助手の解釈、未確認事項を分ける。理解済みの内容を毎回承認し直してもらわず、判断を変える曖昧さだけを聞く。
4. **次の比較へ進める。** 指導を保存しただけで一往復を終えない。距離・向き・運動・観測の新鮮さなどから、競合する説明を見分ける変更を一つ選ぶ。何を固定し、何を変え、何を確認するかを先に記録し、次の場面と質問を提示する。本人の答えや場面妥当性の確認を先回りして生成しない。
5. **機構を比較する。** 複数条件で確認した解釈を選手モデルの実行案と判断原則の原則案へ分ける。選手モデルが未対応なら必要な機構を明示したコード案として扱う。動作確認のための重み変更・強制行動・描画成功を、認知機構の改善に読み替えない。判断原則は同じ観測への原則なし／旧版／新版を独立に評価する。
6. **区切りと次の一手を残す。** この往復で分かったこと、残る反例、次の比較と本人への質問を短く伝える。候補採用時だけ対象と版を示して選手モデル／判断原則別に本人の判断を待つ。次の場面は仮説を識別するために選び、場面数や成功数だけで終了しない。

各sessionの `work/` に、現在の問い・段階・source snapshot/候補/表示応答・本人の発言と未確認の解釈・次の比較・予測と反証条件・次の質問・実行能力の不足をまとめたcheckpointを保存します。これは私的研究ノートであり、state.jsonの実験記録や本人の承認の代用にはしません。再開時は表示と記録を確認してから現在地を説明します。

道具の不具合で今回の知覚・結果の意味が変わる場合は、その判断の採点を止めて修正します。必要能力がない場合も、その結果についての検証だけを保留し、独立して進められる指導の解釈や配置の確認を示します。実試合映像には進みません。

事前凍結・匿名判断原則比較・首振り履歴の現行手順は [EVALUATION_PROTOCOL.md](../../../evaluation/PROTOCOL.ja.md)。未使用条件で試す場合、指導を入力する前にfreezeします。固定8ケースだけでは未知への転用評価を完了した扱いにしません。

## 1. 場面と指導を保存

一人称で首を振る／再生／停止し、短い指導を入力して候補を保存します。scene・seed・time・player、身体／首、観測と履歴、profile、選手モデル／判断原則基準版を記録します。`context CANDIDATE_ID` または「Codex用の観測contextを保存」でCodexへ渡します。世界真値のenvelopeは含まれません。

本人への聞き返しが必要なのは、指導がどの観測条件に適用され、何を変えずに残すかが不明なときです。Codexは候補を編集できますが、本当の研究原則の採用を代行しません。

## 2. 条件・例外・予測・反例を書く

[合成例](../examples/conditional-coaching-edit.json)は「保持中で新鮮な受け手情報がなければ再観測する。ただし観測上の近い脅威は例外」です。`notes.rationale` に指導から変更案への理由、`expectedEffect` に対象場面の予測、`counterexample` に変えてはいけない条件を書きます。判断原則の条件・判断基準・優先度・例外・不明時・根拠は独立に編集します。

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

選手モデルの限定的な宣言ルールは次の語彙を使います。scene・seed・見えない選手・将来の真値で分岐する欄はありません。新しい機構が必要なら、候補JSONで表現したふりをせずコード差分として研究します。

| 欄 | 選択肢／意味 |
|---|---|
| `when.possession` | `any` / `has-ball` / `no-ball`。自己の合成保持感覚 |
| `when.evidence` | `no-fresh-receiver` / `fresh-receiver` / `stale-player` / `heard-call` / `missing-player-vision` / `observed-ball`。現在の観測と記憶に由来 |
| `when.unlessCloseThreat` | 観測上の近い脅威があるなら適用しない。隠れた脅威が不存在という意味ではない |
| `action` / `weight` | scan・hold・carry・pass・supportのスコアへ−2〜2を加算。戦術との混合前で、硬い実行資格は変更しない |
| `call`（任意） | `support-call` / `warning-call`。その規則の行動が選ばれた場合だけ意味的イベントを出す |

`contextRules` は最大32個・一意IDの配列です。編集は配列全体を置換するので、残す既存原則も含めてください。複数の該当規則は加算されるため、重複した意味の規則が過大な重みを作らないかレビューします。個人選好や戦術遵守が強ければ予想と違う行動になることも試験対象です。callは音声合成でも他選手の反応でもなく、自己の新しい聴覚証拠へ戻しません。

## 3. 未採用のまま実験を記録

「未採用候補で再実行・記録」で1〜20stepを実行します。1stepは0.2秒。記録場面と8つの固定回帰ケースを、指導候補のprofileを全てへ固定してbefore/afterで再生します。事前凍結setを候補作成時に選んだ場合は、別のfrozenTrialsも保存します。行動が違えば、その後の観測が異なることはあります。

```sh
npm run --silent bridge -- run CANDIDATE_ID --revision CONFIRMED_REVISION --steps 5 --mode preview > .rpm/experiment-preview.json
npm run bridge -- experiments
npm run --silent bridge -- experiment EXPERIMENT_ID > .rpm/experiment.json
```

`preview` 簡易比較は保存ファイル自体を変えません。`run --mode preview` は実験記録だけを保存し、有効な選手モデル／判断原則や採用状態を変えません。各実験は候補全文・revision・理由・初期入力・before/after 選手モデル・判断原則文書／構造化追加原則・各step trace・coreソース識別を固定します。Node/platform/arch、Git commitとdirty状態、lock・snapshot・結果・判断原則文書のSHA256も保存します。snapshotと結果のhashは保存オブジェクトの `JSON.stringify` UTF-8に対するSHA256です。Git情報を取得できないコピー配布ではnullと記録し、成功を推測しません。保存結果の表示は再計算しません。ソースを書き換えた場合はserverを再起動してから記録します。

合成例の期待差分は記録場面carry→scan、別場面carrier-openもcarry→scan。一方、圧力下hold、新鮮な受け手pass、非保持supportは維持します。5種類すべての定数行動stubと旧 `scanBias:2` はこの受入条件に失敗します。これは仕組みを確認する回帰試験であり、公開された8ケースを将来も「未知」と呼べません。実研究では本人が未使用の場面・条件を別途選び、候補作成前に予測と失敗条件を記録します。

## 4. 本人が差戻し／採用する

差戻しには理由が必要です。いずれかの選手モデル／判断原則がレビュー済みになると元候補は不変です。「同場面で新候補」は観測・記憶・profileを保持し、現在の承認選手モデル／判断原則を基準として親ID付きの新しいpending候補を作ります。コピーされた差分は新しい基準に対して再点検します。特にcontextRulesの全置換による既存原則の消去に注意します。

```sh
# このreturnは本人が意図して実行する操作
npm run bridge -- return CANDIDATE_ID --target player --by owner --revision CONFIRMED_REVISION --reason "差戻し理由"
# 派生候補を作るだけでは採用されない
npm run bridge -- revise CANDIDATE_ID --revision CONFIRMED_REVISION --reason "修正方針"
```

内容を確認した本人が選手モデルと判断原則を別々に採用します。選手モデルだけ採用して判断原則を保留することも可能です。同じ判断原則IDを改訂すると現行文書では置換し、旧版には旧文章を残します。別クライアントが候補を編集するとrevision競合409で拒否し、再確認が必要です。最新revisionを自動取得して承認する処理を作りません。

採用後は `run --mode active` または「現在の承認版で再実行・記録」を実行し、採用前の記録と比べます。合成試験のowner操作は実研究原則への本人承認ではありません。

## 5. 判断原則を独立に試す

保存した実験を選び「匿名判断原則入力」。または以下を実行します。

```sh
npm run --silent bridge -- judgment-packet EXPERIMENT_ID --arm after --cases frozen > .rpm/judgment-after.json
npm run --silent bridge -- judgment-evaluator-map EXPERIMENT_ID > .rpm/judgment-evaluator-only.json
npm run --silent bridge -- export-judgment-json > .rpm/judgment-current.json
npm run bridge -- judgment-review EXPERIMENT_ID --file .rpm/judgment-response.json
```

model用入力は指定した一群の判断原則文書／構造化追加原則と匿名ケースだけです。原則なし群は --arm none、before群は --arm before。固定回帰には --cases regression を指定し、未見と呼びません。評価用ラベル・scene・seed・採点基準・選手モデル結果・worldは別の評価側対応表に残し、モデルへ渡しません。構造化JSONは追加原則であり、baseline全文の機械構造化を主張しません。

本人が原則なし／before 判断原則／after 判断原則それぞれの新しい会話を作り、その群に割り当てた判断原則文書（原則なし群には無し）と共通の観測ケースだけを渡します。それぞれの新しい会話へ対応する一群の匿名入力だけを渡し、他群の回答・評価側対応表・選手モデル結果は持ち込みません。[判断原則評価手順](../../../models/judgment/docs/REVIEW.ja.md)に沿い、判断・使った原則・不確実性・反例・自己レビューを求めます。UIまたは以下のJSONで回答を保存します。

```json
{"arm":"after","group":"frozen","model":"実際のモデル名・設定・実行日","output":"回答全文（条件名を含む）","assessment":"本人の採点、未確認事項、反例"}
```

保存は実験への紐付けであり、正しさを承認する機能ではありません。記録は常に `unverified-external-response` / `humanValidated:false`。原則準拠とラグビー上の妥当性を分けて本人が判断します。API・課金・外部自動送信は追加していません。今回の合成mockは判断原則の実際の生成AI評価ではありません。

## 6. 復元して次の仮説へ

本人が選手モデル／判断原則ごとにundoします。承認・差戻し・親候補・保存実験・判断原則回答は消えません。Control-Cで停止して再起動し、「候補の場面を復元」で記録時の身体／首／履歴／profileへ戻します。実行ルールは現在activeの承認版です。古い実験結果はそのまま読み、旧エンジンの再実行にはそのGit版を使います。

状態は私的な `.rpm/` に保存します。長い履歴を蓄積する本格運用の前にはバックアップとストレージ拡張を検討します。初回の本人受入では「画面で見えた情報」「指導の意図」「適用条件と反例」「独立選手モデル／判断原則の判断」「復元できたか」を [Mac受入記録](../../../docs/verification/MAC_ACCEPTANCE.md) に残してください。

## 過去の0.3.0導入時の互換性と移行

これは当時の変更記録です。現行保存形式はLOCAL_STORAGE、API 11の継続保存はLOCAL_BRIDGEを参照してください。研究上のundoとコードdowngradeは別です。

| 対象 | 互換性／操作 |
|---|---|
| package | 0.1.0／0.2.0→0.3.0。依存version／解決先は不変、lockのpackage版だけ更新 |
| 観測／snapshot | contractVersion 1を維持。旧3fixtureをそのまま読み、通常の数値ルールは同じ判定を返す |
| 選手モデル trace | 新規実行はcognition-0.3／appliedRules付き。JSON Schemaは旧cognition-0.2 traceも読む |
| 私的session | format 1の旧候補・版・履歴を保持。experiments／bReviews／evaluationSetsが無ければ空として読む。原則を自動採用しない |
| bridge | API 2／3→4。旧serverを止めて新しいコードで再起動。旧serverへの新UIの書き込みは拒否 |
| 判断原則 | 凍結初期判断原則＋明示採用した追加原則。既存判断原則評価baselineとroot 判断原則ドラフト0.1は今回変更しない |

コードを戻す際はsessionも更新前バックアップへ戻す別作業です。新形式で書いたsessionを旧コードへ上書きで読み込ませる前方互換性は保証しません。選手モデル／判断原則の研究上のundoはコードのdowngradeとは別操作です。

## 保存した現在位置から先へ試行する

`run CANDIDATE_ID --revision N --steps 7 --mode preview --start snapshot` は、候補に結び付いたsnapshotの位置・時刻・取得済み記憶から先へ進む。既定の `--start coaching` は従来どおり指導区間の開始へ戻り、区間末尾で停止する。未来の試行と過去の再検証を混同しない。

保存結果の `recordedInput.source` は `captured-snapshot`、`window` はnullになり、元の指導区間はcandidate内に保持される。比較表示は既存の `view-request compare` で行う。previewは選手モデル／判断原則の採用を変更しない。一時的な実行補助の重みを使った試行は、その旨をnotesへ記し、一般原則の獲得や本人の研究承認とは扱わない。
