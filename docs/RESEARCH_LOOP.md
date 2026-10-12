# 本人とCodexの最初の研究実験

このloopの目的は、本人の指導を条件付き仮説として明示し、適用場面と反例の両方で試して残すことです。動作が変わるだけでは改善とは判定しません。本人が画面を見て行う最初の実験は未実施です。

## 1. 場面と指導を保存

一人称で首を振る／再生／停止し、短い指導を入力して候補を保存します。scene・seed・time・player、身体／首、観測と履歴、profile、A/B基準版を記録します。`context CANDIDATE_ID` または「Codex用の観測contextを保存」でCodexへ渡します。世界真値のenvelopeは含まれません。

本人への聞き返しが必要なのは、指導がどの観測条件に適用され、何を変えずに残すかが不明なときです。Codexは候補を編集できますが、本当の研究原則の採用を代行しません。

## 2. 条件・例外・予測・反例を書く

[合成例](../examples/conditional-coaching-edit.json)は「保持中で新鮮な受け手情報がなければ再観測する。ただし観測上の近い脅威は例外」です。`notes.rationale` に指導から変更案への理由、`expectedEffect` に対象場面の予測、`counterexample` に変えてはいけない条件を書きます。Bの条件・判断基準・優先度・例外・不明時・根拠は独立に編集します。

```sh
npm run --silent bridge -- context CANDIDATE_ID > .rpm/context.json
npm run bridge -- edit CANDIDATE_ID --file .rpm/edit.json --revision CONFIRMED_REVISION
```

Aの限定的な宣言ルールは次の語彙を使います。scene・seed・見えない選手・将来の真値で分岐する欄はありません。新しい機構が必要なら、候補JSONで表現したふりをせずコード差分として研究します。

| 欄 | 選択肢／意味 |
|---|---|
| `when.possession` | `any` / `has-ball` / `no-ball`。自己の合成保持感覚 |
| `when.evidence` | `no-fresh-receiver` / `fresh-receiver` / `stale-player` / `heard-call` / `missing-player-vision` / `observed-ball`。現在の観測と記憶に由来 |
| `when.unlessCloseThreat` | 観測上の近い脅威があるなら適用しない。隠れた脅威が不存在という意味ではない |
| `action` / `weight` | scan・hold・carry・pass・supportのスコアへ−2〜2を加算。戦術との混合前で、硬い実行資格は変更しない |
| `call`（任意） | `support-call` / `warning-call`。その規則の行動が選ばれた場合だけ意味的イベントを出す |

`contextRules` は最大32個・一意IDの配列です。編集は配列全体を置換するので、残す既存原則も含めてください。複数の該当規則は加算されるため、重複した意味の規則が過大な重みを作らないかレビューします。個人選好や戦術遵守が強ければ予想と違う行動になることも試験対象です。callは音声合成でも他選手の反応でもなく、自己の新しい聴覚証拠へ戻しません。

## 3. 未採用のまま実験を記録

「未採用候補で再実行・記録」で1〜20stepを実行します。1stepは0.2秒。記録場面と8つの固定回帰ケースを、同じ初期世界・記憶・profileからbefore/afterで再生します。行動が違えば、その後の観測が異なることはあります。

```sh
npm run --silent bridge -- run CANDIDATE_ID --revision CONFIRMED_REVISION --steps 5 --mode preview > .rpm/experiment-preview.json
npm run bridge -- experiments
npm run --silent bridge -- experiment EXPERIMENT_ID > .rpm/experiment.json
```

`preview` 簡易比較は保存ファイル自体を変えません。`run --mode preview` は実験記録だけを保存し、active A/Bや採用状態を変えません。各実験は候補全文・revision・理由・初期入力・before/after A・B文書／構造化追加原則・各step trace・coreソース識別を固定します。Node/platform/arch、Git commitとdirty状態、lock・snapshot・結果・B文書のSHA256も保存します。snapshotと結果のhashは保存オブジェクトの `JSON.stringify` UTF-8に対するSHA256です。Git情報を取得できないコピー配布ではnullと記録し、成功を推測しません。保存結果の表示は再計算しません。ソースを書き換えた場合はserverを再起動してから記録します。

合成例の期待差分は記録場面carry→scan、別場面carrier-openもcarry→scan。一方、圧力下hold、新鮮な受け手pass、非保持supportは維持します。5種類すべての定数行動stubと旧 `scanBias:2` はこの受入条件に失敗します。これは仕組みを確認する回帰試験であり、公開された8ケースを将来も「未知」と呼べません。実研究では本人が未使用の場面・条件を別途選び、候補作成前に予測と失敗条件を記録します。

## 4. 本人が差戻し／採用する

差戻しには理由が必要です。いずれかのA/Bがレビュー済みになると元候補は不変です。「同場面で新候補」は観測・記憶・profileを保持し、現在の承認A/Bを基準として親ID付きの新しいpending候補を作ります。コピーされた差分は新しい基準に対して再点検します。特にcontextRulesの全置換による既存原則の消去に注意します。

```sh
# このreturnは本人が意図して実行する操作
npm run bridge -- return CANDIDATE_ID --target A --by owner --revision CONFIRMED_REVISION --reason "差戻し理由"
# 派生候補を作るだけでは採用されない
npm run bridge -- revise CANDIDATE_ID --revision CONFIRMED_REVISION --reason "修正方針"
```

内容を確認した本人がAとBを別々に採用します。Aだけ採用してBを保留することも可能です。同じB原則IDを改訂すると現行文書では置換し、旧版には旧文章を残します。別クライアントが候補を編集するとrevision競合409で拒否し、再確認が必要です。最新revisionを自動取得して承認する処理を作りません。

採用後は `run --mode active` または「現在の承認版で再実行・記録」を実行し、採用前の記録と比べます。合成試験のowner操作は実研究原則への本人承認ではありません。

## 5. Bを独立に試す

保存した実験を選び「B評価packet」。または以下を実行します。

```sh
npm run --silent bridge -- b-packet EXPERIMENT_ID > .rpm/B-packet.json
npm run --silent bridge -- export-b-json > .rpm/B-current.json
npm run bridge -- b-review EXPERIMENT_ID --file .rpm/B-response.json
```

packetには記録場面＋8対照の観測・記憶・profile、before/after Bの全文Markdownと構造化追加原則が入ります。Aの結果・隠れた世界は渡しません。構造化JSONは承認された追加原則であり、凍結baseline全文を機械的に構造化したと主張しません。未採用Bは文書内でもNOT approvedと表示します。

本人が原則なし／before B／after Bそれぞれの新しい会話を作り、その群に割り当てたB文書（原則なし群には無し）と共通の観測ケースだけを渡します。複数群を含むpacket全体やAの結果を各会話へ渡すと比較条件を混ぜるため、packetは条件分割の保管用にします。[B評価手順](B_REVIEW.md)に沿い、判断・使った原則・不確実性・反例・自己レビューを求めます。UIまたは以下のJSONで回答を保存します。

```json
{"model":"実際のモデル名・設定・実行日","output":"回答全文（条件名を含む）","assessment":"本人の採点、未確認事項、反例"}
```

保存は実験への紐付けであり、正しさを承認する機能ではありません。記録は常に `unverified-external-response` / `humanValidated:false`。原則準拠とラグビー上の妥当性を分けて本人が判断します。API・課金・外部自動送信は追加していません。今回の合成mockはBの実際の生成AI評価ではありません。

## 6. 復元して次の仮説へ

本人がA/Bごとにundoします。承認・差戻し・親候補・保存実験・B回答は消えません。Control-Cで停止して再起動し、「候補の場面を復元」で記録時の身体／首／履歴／profileへ戻します。実行ルールは現在activeの承認版です。古い実験結果はそのまま読み、旧エンジンの再実行にはそのGit版を使います。

状態は私的な `.rpm/` に保存します。長い履歴を蓄積する本格運用の前にはバックアップとストレージ拡張を検討します。初回の本人受入では「画面で見えた情報」「指導の意図」「適用条件と反例」「独立A/Bの判断」「復元できたか」を [Mac受入記録](MAC_ACCEPTANCE.md) に残してください。

## 0.2.0への互換性と移行

| 対象 | 互換性／操作 |
|---|---|
| package | 0.1.0→0.2.0。依存version／解決先は不変、lockのpackage版だけ更新 |
| 観測／snapshot | contractVersion 1を維持。旧3fixtureをそのまま読み、通常の数値ルールは同じ判定を返す |
| A trace | 新規実行はcognition-0.3／appliedRules付き。JSON Schemaは旧cognition-0.2 traceも読む |
| 私的session | format 1の旧候補・版・履歴を保持。experiments／bReviewsが無ければ空として読む。原則を自動採用しない |
| bridge | API 2→3。旧serverを止めて新しいコードで再起動。旧serverへの新UIの書き込みは拒否 |
| B | 凍結B0＋明示採用した追加原則。既存B評価baselineとroot B0.1-draftは今回変更しない |

コードを戻す際はsessionも更新前バックアップへ戻す別作業です。新形式で書いたsessionを旧コードへ上書きで読み込ませる前方互換性は保証しません。A/Bの研究上のundoはコードのdowngradeとは別操作です。
