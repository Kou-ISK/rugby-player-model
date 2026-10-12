# Rugby Player Model — research foundation

See [dynamic scene contracts, CLI and acceptance scope](docs/DYNAMIC_SCENES.md) for the new fixed-step workflow: one A-controlled player and scripted stimuli.
選手の観測から判断する実行モデル **A** と、生成AIが単独で使える原則文書 **B** を別々に育てるローカル研究基盤です。人間再現や筋骨格技能の完成モデルではありません。

## Mac quick start

設定済みの本人Macでは [開始手順](docs/MAC_START.md) に沿って `~/Documents/workSpace/rugby-player-model` をCodexで開き、`./start-rpm.command` で起動します。CLIは `./bridge-rpm.command`。ソースと私的sessionは [別の保存場所](docs/LOCAL_STORAGE.md) を使います。

新しい開発環境ではNode.js 24 と Git を用意し、このブランチで実行します。

```sh
npm ci
npm run dev
```

表示された `http://127.0.0.1:5173` を開く。首振り → フィードバック → 候補保存 → Codexと条件・例外・反例を編集 → 未採用の複数step実験と保存3D比較 → 本人の差戻し／A/B別採用 → 同場面＋対照比較 → undo。開発起動は `.rpm/`、本人の共通launcherはrepo外の私的sessionへ保存します。APIキーもクラウド契約も不要です。

```sh
npm run bridge -- status
npm run check
npm run spike
npm run --silent model -- --input examples/support-42.snapshot.json --steps 10
```

- [B: RUGBY_JUDGMENT.md](RUGBY_JUDGMENT.md) — runnerなしで読めるB0.1-draft。[単独評価packet](docs/B_EVALUATION_SCENES.md)は原則なし/旧B/新Bを比較。私的sessionのB出力は凍結B0＋本人承認済み原則です。
- [事前凍結・匿名B入力・首振り履歴の手順](docs/EVALUATION_PROTOCOL.md) — 固定回帰を未見評価と区別。自然言語の解釈は本人とCodexの共同作業。
- [研究開始条件の点検](docs/RESEARCH_READINESS.md)、[共同研究loop全手順](docs/RESEARCH_LOOP.md)、[今回のMac合成検証](docs/MAC_RESEARCH_CYCLE.md)
- [設計と情報境界](docs/ARCHITECTURE.md)、[言語選択ADR](docs/ADR-001-runtime.md)
- [Codex local bridge](docs/LOCAL_BRIDGE.md)、[Mac実証手順](docs/MAC_ACCEPTANCE.md)、[Mac headless記録](docs/MAC_HEADLESS.md)
- [制約・再現性](docs/LIMITATIONS.md)、[権利と来歴](docs/PROVENANCE.md)
- [再現manifest](research/reproducibility-manifest.json)と[再現手順](docs/REPRODUCTION.md)、[モデルカード](docs/MODEL_CARD.md)、[データカード](docs/DATA_CARD.md)、[公開範囲](docs/PUBLICATION_SCOPE.md)

Cloudの検証合格と、本人Macでの共同研究loop実証は別です。検証済みP2P手続き描画と最小姿勢型を表示adapterで再利用し、これらを含むコード・合成fixture・文書の公開は本人承認済みです。私的研究sessionは公開対象外です。ライセンスはUNLICENSEDを維持しています。[公開範囲](docs/PUBLICATION_SCOPE.md)を参照してください。
