# H-WM-1：受け手検討の研究モード

[English](H-WM-1.md) | [日本語](H-WM-1.ja.md)

未検証の仮説で、従来の既定動作と並べて選択できます。受け手の比較・選択、パス資格と説明を制約します。すべての判断を制限するものでも、人間の作業記憶全体を再現するものでもありません。このlegacy/v2機構ではパスは身体実行非対応の意図です。

実行契約v2は `executionContractVersion: 2`、`executionMode`、観測だけのbundle/memory/profile/rulesを要求します。legacyは `{mode:"legacy",policyVersion:"legacy-ecc5c298-v1"}`、研究モードは `{mode:"h-wm-1",policyVersion:"receiver-deliberation-v1",capacity:{kind:"finite",k:4}}` または `{kind:"unlimited"}` です。Kは1–128の整数で、測定した人間容量ではなく工学的上限です。未知の版や追加fieldは拒否します。

符号化は従来の顕著性で現在知覚を4件、保持は30シミュレーション秒以内の元エピソードを128件まで扱います。取得はentity/modalityごとの最新証拠を選び、元時刻・確信度・yawを変えずに派生確信度を減衰します。研究rankingはcall > ball > player、次に現在の確信度、観測の新しさ、Unicode scalar順のsource IDです。上位K件（無制限なら全件）から、新鮮な視覚情報を持つ後方の適格な味方を最初の受け手に選びます。

保持証拠による危険評価・定位、fresh/no-fresh述語は取得pool全体を使い、容量述語には変えません。Trace v2は符号化・取得・順位・選択と採否理由を記録します。旧Trace v1のworkingMemoryは表示抜粋のままで、判断のボトルネックと読み替えません。

legacy／研究無制限／研究有限を別armで比較します。無制限対有限は同じ入力で容量だけを比較し、legacy対無制限にはranking policy差が含まれます。W0は36件の旧結果を固定し、W1–W10は機構効果、証拠保持、除外脅威、観測境界を検査します。W4bのpool横断比較は定位も変える混合介入です。合格は競技改善、生物学的妥当性、本人採用ではありません。

互換性のためTrace v2も旧 `workingMemory` 表示を保持します。容量制約を受ける集合は `deliberation.selected` で、旧fieldはKを定義しません。
