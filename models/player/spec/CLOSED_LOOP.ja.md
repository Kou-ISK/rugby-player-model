# 閉ループ仮説 v1

[English](CLOSED_LOOP.md) | [日本語](CLOSED_LOOP.ja.md)

Scene schema 3がBundle 3と `cognition-loop-v1` / Trace 4を選択します。Scene 1/2は旧sensor・認知・身体積分を維持します。未較正の新しい工学的仮説で、採用済みパラメータ版でも人間認知の実証でもありません。実装はsource hashで識別し、`A0` だけでは特定できません。

## 観測と判断

選手モデルの入力はBundle、Memory、Profile、RulesAだけです。身体・頭・視線・可視の他者方向はv2契約に従います。自己速度、停止期限、直近の運動結果は合成固有感覚です。他者の記憶・計画・予定経路、球の真の未来軌道を認知・選手カメラへ渡しません。

異なる時刻で間隔2秒以内の視覚観測2件から変位速度を推定し、10m/sに制限します。一回の観測では推定しません。外挿は0.5秒までで位置不確実性を増やし、source IDと元時刻を保持します。取得で確信度・時刻を更新しません。較正済み到達確率や人間の速度推定器ではありません。

観測保持に応じ、保持者carry/evade/pass、味方support、守備位置取り/contact、不明時scan、見えるloose ballのreceiveを候補にします。可視身体角は左右空間の同点を分けられますが意図・視線は示しません。パスには新鮮に見た後方味方と距離資格が必要で、H-WM-1も有効時は追加filterです。新policyはscan/carry/pass biasとcontext-rule weightを使いますが、旧preference/selfEstimate/tactical blendingと意味的callは未実装です。個人・戦術仮説の追加には別コード変更が必要です。

計画はaction、観測target ID、goal、phase、開始・再検討時刻、evidence IDを持ちます。同じ局面で適格、未失敗・未到達、競合が0.25を超えて優位でない場合に0.6秒継続できます。定数は工学的仮定です。traceは継続・切替、身体要求、実行結果を分けます。小目標の制御であり、学習済み長期計画ではありません。

`RulesA.mechanisms` で `motion`、`intention`、`local`、`tactics` を個別に無効化でき、v3の欠損はtrueです。tacticsは既知の攻撃方向・支援深さ・自ゴール保護で、任意の戦術解釈ではありません。localは横の圧力対応と攻守調整で、offでも基本資格・衝突回避確認を維持します。他者が見えなくなる操作ではありません。v1/v2はこれらを無視し、除去比較は同じ身体のv3で行います。

## 運動と相互作用

0.2秒の認知stepに0.02秒の身体substepを10回実行します。全自律選手が、独立した記憶・profile・チーム別攻撃方向で同じstep前世界を観測してから、命令を実行します。controlled/autonomousは明示した選手モデル設定を共有します。同距離同時捕球は安定actor順で解決し、runtime配列の並べ替えでは結果が変わりません。

| 量 | 工学的既定値 |
|---|---|
| 加速・減速 | 4m/s²。最高速度・パス距離はactor能力 |
| 身体・頭の旋回 | 2 / 3rad/s。相対首角は±2.4rad |
| release | 準備0.2秒。意図変更、接触、前方・距離外の対象で中止 |
| ball | 2Dで15m/s、2秒または境界でloose |
| catch | 半径0.75m。飛行0.06秒以降、receive/support/defend要求時。scripted刺激は捕球可能 |
| contact | 半径0.9m、正面左右90°、要求した観測対象。保持者1秒・守備者0.4秒停止 |

同じsubstepでは接触をreleaseより先に処理します。release、catch（interception含む）、contact、failureを別eventにします。接触はruck、傷害、合法タックル、knock-on、自動turnoverを作りません。飛行に高さ・回転・bounce・人体捕球はなく、後方対象判定は全ラグビー規則ではありません。scripted経路は加減速・接触移動制約に従わない作者刺激です。タックル以外の一般衝突解決はありません。

派生plan/output/motorはbrowser/Node再現のため1e-9へ丸めますが、取得証拠の時刻・確信度は丸め・更新しません。再生frameは対象traceと全actor runtimeを固定し、比較は他者を再計算しません。

## 対比較と再現

別の合成sessionへ `evaluation/fixtures/loop-attack.scene.json` または `loop-defense.scene.json` を読み込みます。

```sh
npm run --silent bridge -- mechanism-study SCENE_ID --revision 1 --steps 40 --out /absolute/private/work/study.json
```

reportは入力全文/hash、engine source manifest、6arm（full、4つの単独除去、local+tactics除去）、rules、traces、runtime、評価者専用の進行・間隔・event・切替指標を固定します。full/local-off/tactics-off/both-offは2×2比較です。同じ最終記録frameで測り観測期間を明記し、身体実装・能力を固定して認知介入と技能更新を分けます。旧パラメータ版指定で旧実行体を復元するものではありません。

v3再生はscene終端内の1–201frame、旧回帰は20frameまでです。予算終端では最後の判断frameより一step先まで身体が進み得るため、指標は記録期間に限定します。固定観測と閉ループを分け、runtime/指標はLLM選手packetへ渡しません。

公開刺激は開発用で未見holdoutではありません。試験は身体上限、中断、捕球・interception、独立知覚、同期順、除去比較の再現、snapshot/history巻戻し、共有提案再現を検査します。集団協調、人間との同等性、汎化、競技改善には別の予測と独立資料が必要です。本人の新しい指導と成果物別の採用は明示的な人間の判断です。
