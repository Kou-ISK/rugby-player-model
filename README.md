# Rugby Player Model — research foundation

選手の観測から判断する実行モデル **A** と、生成AIが単独で使える原則文書 **B** を別々に育てるローカル研究基盤です。人間再現や筋骨格技能の完成モデルではありません。

## Mac quick start

Node.js 24 と Git を用意し、このブランチで実行します。

```sh
npm ci
npm run dev
```

表示された `http://127.0.0.1:5173` を開く。首振り → 再生/停止 → フィードバック → 候補保存 → CodexとJSON編集 → A/B別の本人承認 → 同条件比較 → undo。sessionは `.rpm/` に私的保存され、gitignore対象です。APIキーもクラウド契約も不要です。

```sh
npm run bridge -- status
npm run check
npm run spike
npm run --silent model -- --input examples/support-42.snapshot.json --steps 10
```

- [B: RUGBY_JUDGMENT.md](RUGBY_JUDGMENT.md) — runnerなしで読めるB0.1-draft。[単独評価packet](docs/B_EVALUATION_SCENES.md)は原則なし/旧B/新Bを比較。私的sessionのB出力は凍結B0＋本人承認済み原則です。
- [設計と情報境界](docs/ARCHITECTURE.md)、[言語選択ADR](docs/ADR-001-runtime.md)
- [Codex local bridge](docs/LOCAL_BRIDGE.md)、[Mac実証手順](docs/MAC_ACCEPTANCE.md)
- [制約・再現性](docs/LIMITATIONS.md)、[権利と来歴](docs/PROVENANCE.md)
- [再現manifest](research/reproducibility-manifest.json)と[再現手順](docs/REPRODUCTION.md)、[モデルカード](docs/MODEL_CARD.md)、[データカード](docs/DATA_CARD.md)、[公開範囲](docs/PUBLICATION_SCOPE.md)

Cloudの検証合格と、本人Macでの共同研究loop実証は別です。P2P描画kitは取得できていないため独立した仮の手続き描画を使用しています。ライセンスは未決（UNLICENSED）です。
