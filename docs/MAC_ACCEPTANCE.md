# Macでの最終共同研究DoD

**本人による画面受入は未実施。Mac上の合成headless試験は実施済み（MAC_HEADLESS.md）。自動試験を本人の受入と呼ばない。** 本人がMacで「見る→フィードバック→候補保存→承認→比較→undo」を行って初めて共同研究loopの最終合格です。

## 起動

Node.js 24、Git、WebGL対応ブラウザを用意します。初回依存インストールにはネットワークが必要です。

```sh
git clone https://github.com/Kou-ISK/rugby-player-model.git
cd rugby-player-model
git switch codex/research-foundation
npm ci
npm run dev
```

既存cloneならdev serverをCtrl-Cで停止してから `git fetch origin` → 対象ブランチへ切替 → `git pull --ff-only` → `npm run dev`。serverコードは画面の更新だけでは入れ替わりません。古いserverが残る場合、新しい画面はbridgeのversion不一致で書き込みを拒否し、再起動を案内します。表示された `http://127.0.0.1:5173` を開きます。ポート使用中なら `PORT=5175 npm run dev`。公開deploy、認証設定、外部鍵は不要です。

## 実証チェック（本人が記録）

1. **一人称を見る**：支援場面・seed 42。首振りスライダーを左へ約-110°にし、青い支援選手と観測欄の `support-1` を確認。正面へ戻し、1 step。現在の観測から消えても、記憶に元の観測時刻が残ることを確認。
2. **視点を区別**：spectatorで全体を見る。一人称に戻す。切替だけでは時間・観測bundle・判断が変わらない。遮蔽場面では隠れた選手が観測欄に入らない。音場面では背後の声は方向cueで、正確な位置ではない。
3. **再現**：同じ場面・seedでreset。再生→停止→snapshot保存。首と身体の向きがcameraに反映され、ballを自動追尾しない。
4. **候補保存**：resetして「情報が不確かなときに首振りを増やす仮説」と入力。保存後も版はA0/B0のまま（既存sessionなら現在の版のまま）。候補にはscene/seed/time/player/観測が紐付く。
5. **Codex共同編集**：[local bridge](LOCAL_BRIDGE.md)で `context` を渡し、A差分とB原則を編集。簡単な動作実証ならAに `{"scanBias":2}` を設定。Bは条件・基準・例外・不明時・根拠を埋める。これは実験用の大きな摂動で、妥当な完成ルールではない。
6. **採用前previewと本人承認**：先にpreviewし、A0/B0とpendingを維持したまま効果を見られることを確認。内容と候補revisionを確認してAのみ採用し、A版だけ変わることを確認。その後Bを別に採用。別CLIが候補を書き換えた場合は競合で拒否・最新内容を再表示・本人チェック解除となることも確認する。
7. **承認版との同条件比較**：保存時の観測/記憶/個人条件でbefore/afterを比較。初期支援場面の大きなscanBias変更では carry→scan。異なる状態では別結果でもよい。保持/非保持・圧力・欠測・記憶・左右音の層別8ケースを確認し、改善と主張する前に反例を探す。
8. **B単独利用**：Bを出力し、runnerを渡さず一般生成AIに未知場面を判断・生成・自己レビューさせる。[B評価](B_REVIEW.md)を使って本人が採点。未実行なら未評価のまま記録。
9. **undoと再起動**：A undoでAのみ戻る、B undoでBが戻る。serverを再起動し、候補/承認/undo履歴とsnapshot復元を確認。採用されていない候補や却下した候補が実行に影響しない。

`.rpm/mac-acceptance.md` に以下を私的に記録してください。

```text
Commit:
macOS / Node / browser:
Scene / seed / candidate ID:
First person / occlusion / memory: pass|fail
Feedback + Codex edit: pass|fail
Separate A/B owner approval: pass|fail
Same-condition comparison: pass|fail
Undo + server restart: pass|fail
B independent AI review: pass|fail|not-run
Observed limitations / next hypothesis:
Owner / date:
```

## 問題が出た場合

- Nodeのversionが違う：`node --version` を確認して24へ。
- 白画面：ブラウザのWebGL利用可否とConsoleを確認。CloudではLinux Chromiumのみ検証済みで、Safariの動作保証はまだありません。
- `Session busy`：[lock回復手順](LOCAL_BRIDGE.md)を使用。
- 画面の首振りは動くがパスしない：パス実行は未対応であり、意図としてのみ出力します。
- このlocal branchは取得・hash照合済みのP2P原本を表示adapterで再利用します。[来歴](PROVENANCE.md)参照。実身体技能と公開権利は別の未完了ゲートです。
