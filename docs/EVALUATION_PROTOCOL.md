# 評価条件の事前凍結・匿名B入力・首振り履歴

90f7154への独立レビューを受けた修正です。固定8ケースの合格を未知場面への転用成功とは呼びません。最初の本人指導・本人採点・外部AI実行は引き続き未実施です。以下はそれらを始めるための手順と記録機構です。

## 固定回帰と事前凍結した条件を分ける

固定8ケースは `published-fixed-regression`。UIの簡易比較・保存実験とも、**指導候補に保存したprofile全体**（能力、自己推定、個人選好、戦術と遵守度）を全ケースのbefore/afterへコピーします。途中でdefaultProfileへ戻しません。profileが違う選手の結果を同じ対照とみなしません。

指導に使っていない条件で試す場合は、次の順で行います。

1. 本人と評価担当のCodexで、未使用条件と成功／失敗の採点基準を先に選びます。条件の作者が知っていることと、指導・候補修正に使っていないことは別です。公開されたテスト例のseedだけを変えて「未見」とは主張しません。
2. UIで試したい選手のprofileを設定します。同じprofileを保ち、評価用の場面・seed・向き・履歴でsnapshotを保存します。UIのresetはprofileを保持します。CLIの `snapshot` はdefaultProfileなので、本人のprofileを使う場合はUI保存snapshot、または明示的に同じprofileを設定した評価担当のfixtureを使います。
3. snapshotを評価担当用に出力し、Codexが以下の形の `.rpm/evaluation-plan.json` を作ります。snapshotは完全なJSONオブジェクトを埋めます。本人がprofile・条件・基準と「指導未使用」の申告を確認してからfreezeします。本人がJSONを手書きする必要はありません。

```sh
npm run --silent bridge -- snapshot-export SNAPSHOT_ID > .rpm/evaluation-case.json
npm run bridge -- freeze-evaluation --file .rpm/evaluation-plan.json
npm run bridge -- evaluation-sets
```

```text
{
  "criteria": "事前に決めた採点基準、維持すべき条件、反証になる結果",
  "noveltyAttestation": "not-used-for-coaching",
  "cases": [
    { "label": "評価担当だけの状況名", "snapshot": <保存したsnapshot JSON全体> }
  ]
}
```

上の説明用表記の `<...>` は実ファイルではsnapshotオブジェクトへ置き換えます。1〜12ケースを受け付け、全ケースのprofile一致、観測とセンサーの整合、重複した観測条件を検査します。凍結時刻・session revision・基準・入力・profile・digestを固定保存し、編集APIは設けません。

4. **freezeの後で**、別の指導場面を選び、UIの「指導前に凍結した評価条件」でsetを選択してからフィードバックを候補保存します。CLIなら `propose SNAPSHOT_ID --feedback "本人の指導" --evaluation-set FROZEN_SET_ID`。profile不一致や凍結条件そのものを指導にする操作は拒否します。既存候補へ後付けする操作はありません。評価条件を変更する場合は新しいsetを先に作り、その後の新しい候補から使います。
5. 指導候補を編集して「未採用候補で再実行・記録」。固定回帰と `frozenTrials` を別に保存します。各組は同じ初期条件・同じprofileでbefore/afterを比較します。評価条件と採点基準も実験に固定します。

初回の記録は `first-recorded-use-owner-declared` と表示し、**未見性を独立に証明したという意味ではありません**。再実行は `reused-not-unseen`。別set IDで同じ観測条件を登録し直しても、過去の実験に同じ観測・記憶・profileがあれば再利用扱いです。後から別の候補で評価条件を指導に使った場合は、そのsetの実験を拒否します。過去の採用やundoは変更しません。

この検出は同じsession内の記録に限ります。別会話、他session、類似条件、本人やCodexの事前知識まで判定できません。採点基準や正答を候補編集用contextへ渡さず、評価用の内容を見た後で仮説を直した場合は、新しい未使用条件を用意します。「凍結した」「行動が変わった」だけで転用成功にしません。

## Bへ渡すものと評価側だけに残すもの

Bモデル用の入力は、単一の比較群の原則と匿名ケースだけです。caseIdの状況名、scene、seed、層別ラベル、評価基準、Aの出力、世界真値、実験IDは含めません。ケースIDはランダムな匿名ID、選手・音源・観測のIDもケース内の匿名表現へ置換します。観測された関係・cue・位置・元の観測時刻／確信は保持します。同じ実験では匿名ID・順序・観測を3群で揃えます。

```sh
npm run --silent bridge -- b-packet EXPERIMENT_ID --arm none --cases frozen > .rpm/B-none.json
npm run --silent bridge -- b-packet EXPERIMENT_ID --arm before --cases frozen > .rpm/B-before.json
npm run --silent bridge -- b-packet EXPERIMENT_ID --arm after --cases frozen > .rpm/B-after.json
npm run --silent bridge -- b-evaluator-map EXPERIMENT_ID > .rpm/B-evaluator-only.json
```

固定回帰を試すときだけ `--cases regression` を指定します。これは未見評価ではありません。指導に使った記録場面はこれらのBケース群へ混ぜません。旧実験に匿名入力が無い場合、過去の入力を匿名であったかのように書き換えず、新しく実験を記録します。

本人が **原則なし／before B／after Bそれぞれ別の新しい会話** を作り、その群のJSONだけを渡します。前の群の回答、候補の指導、採点基準、対応表を渡しません。モデルや生成設定、ケースごとの会話の分け方も群間で揃え、違いがあれば記録します。外部サービスへ送るのは本人の明示操作です。bridgeからAPIを呼ばず、新しい契約・鍵・課金を要求しません。

評価側の対応表は別出力として、匿名IDと元のcase名・scene・seed・ID対応・採点基準を保持します。**Bモデルに渡しません。** 本人が回答を対応表で採点し、原則準拠とラグビー上の妥当性を別に記録します。

```json
{"arm":"after","group":"frozen","model":"実際のモデル名・設定・実行日","output":"匿名ID付きの回答全文","assessment":"本人の採点、未確認事項、反例"}
```

これを `b-review EXPERIMENT_ID --file .rpm/B-response.json` で保存します。UIでも群とケース集合を選んでから保存します。群・ケース集合・入力hashを回答へ紐付けますが、外部でその入力を実際に使ったことの証明ではありません。回答は常に未検証として保存し、`humanValidated:false` を維持します。合成mockの保存試験は実AI評価や本人採点ではありません。

## 首振りと観測履歴の時間

現在のUIは **static-study（静止研究）** です。停止中の頭／身体の回転ではシミュレーション時刻を進めません。変化ごとに連番、操作種別、観測bundle、身体／頭の向き、当時のprofileとA設定を記録します。同一時刻の複数観測を連番で順序付けます。同じ向きの重複UI通知は追加しません。眼球の独立計測や実際の首振り速度の測定ではありません。

1 stepは0.2秒。再生ボタンもこの離散stepを呼びます。ブラウザが遅れたりタブが停止しても壁時計に追いつく補正はしません。静止中に長く考えても記憶は時間減衰しないため、実時間の認知・反応時間を研究したと解釈できません。`realtime` を名乗る履歴や、手動回転で時刻が進む履歴は現契約では拒否します。

「現在の観測履歴を再生」で、記録済みbundleを順に入力し、当時のprofile／A設定で判断と記憶を再現します。worldを再度見て観測を補完せず、再生操作で世界や時計を進めません。最後の画面だけからの判断と、首振りで過去に得た情報を使う判断を区別できます。

snapshot保存／候補保存には履歴全体を含めます。保存済みsnapshotはCLIでも再生できます。

```sh
npm run --silent bridge -- history-replay SNAPSHOT_ID > .rpm/observation-replay.json
```

保存実験の `observedHistory` は同じ観測列へbefore/afterのAと候補のprofileを固定して適用する比較です。過去の観測列を固定するため、新しい行動で次の観測が変わる効果は評価しません。一方、`recorded` / `trials` / `frozenTrials` は初期条件を固定し、その後の行動で世界・観測が分かれる再実行です。この二つを区別して結果を読みます。

履歴は最大256イベント。上限では追加を止め、黙って古い履歴を捨てません。resetは新しい履歴を開始するので先にsnapshotを保存します。snapshot復元は記録を保持し、承認版が変わっていれば明示的な設定イベントを追加します。旧snapshotには記録されていない首振り軌跡を後付けせず、旧memoryを起点とした新しい区間だけを記録します。

## 自然言語から原則への手動部分

| 作業 | 担当／実装 |
|---|---|
| 短い指導とその場面を保存 | UI／bridge。文を候補に記録するだけ |
| 指導の意味、適用条件、例外、曖昧さを解釈 | 既存のCodex会話で本人と共同作業。自動変換器は無い |
| Aの差分、Bの独立原則、理由・予測・反例を書く | CodexがJSON案を作成・保存。本人が意味を確認 |
| 固定回帰／凍結条件／履歴で比較 | ローカルコードが再現可能な記録を出す。改善の自動判定はしない |
| 採用・差戻し、Bの外部実行と採点 | 本人の個別判断・操作 |

完成済みJSONを合成sessionへ入れたテストは保存・反映・評価配線の証拠に限ります。本人の自然言語指導を一緒に解釈し、本人が画面で評価する初回実験が完了したとは扱いません。

## 互換性

package0.3.0／bridge API4。serverを停止してから再起動します。観測contractVersion 1と旧snapshotの読み込みは維持し、履歴や評価条件を自動生成・自動採用しません。Aの純粋な `think` は今回変更せずcognition-0.3を維持。比較レスポンスの `unseen` は `regression` に改名し、B出力は `--arm` と `--cases` の指定が必須です。状態と旧実験のbackupを保ち、旧版へのコードdowngradeと研究上のundoを混同しません。
