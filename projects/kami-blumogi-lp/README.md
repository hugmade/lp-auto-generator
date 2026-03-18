# 神と青よもぎ | Kami × BLUMOGI LP

NINE SENSE store 新製品「神と青よもぎ」の、スマホ最優先・縦長1ページのブランドLPです。  
静かで深く、上質で少し神聖な世界観を、スクロールで体験できる構成にしています。

---

## ローカルでの確認方法

1. **そのまま開く**  
   `index.html` をブラウザで開く（ファイルプロトコルでOK）。

2. **ローカルサーバーで開く（推奨）**  
   プロジェクトルート（`kami-blumogi-lp`）で:

   ```bash
   npx serve .
   ```

   表示されたURL（例: http://localhost:3000）をブラウザで開く。

---

## 画像差し替え箇所

画像がなくても背景・プレースホルダーで成立するようにしてあります。差し替え時は以下を参照してください。

| セクション | 推奨ファイル名 | 用途 |
|------------|----------------|------|
| 1. ファーストビュー | `assets/hero-bg.jpg` | ヒーロー背景（任意） |
| 1. ファーストビュー | `assets/hero-product.png` | 商品パッケージ |
| 6. 商品提示（概念） | `assets/product-concept.png` | 商品ビジュアル |
| 7. なぜ、青よもぎなのか | `assets/yomogi-field.jpg` | やんばる・畑など |
| 7. なぜ、青よもぎなのか | `assets/yomogi-leaf.jpg` | 新芽・葉のクローズアップ |
| 8. 普通のよもぎとの違い | `assets/dry-compare-normal.jpg` | 一般的な乾燥イメージ |
| 8. 普通のよもぎとの違い | `assets/dry-compare-premium.jpg` | BLUMOGI製法イメージ |
| 9. 沖縄よもぎの優位性 | `assets/okinawa-landscape.jpg` | 沖縄の風景 |
| 9. 沖縄よもぎの優位性 | `assets/okinawa-leaf.jpg` | 葉のマクロなど |
| 11. 体験（状態変化） | `assets/experience-state.jpg` | 静かな横顔・朝の光・呼吸感 |
| 13. 商品提示（静かに） | `assets/product-final.png` | 商品単体 |

- 差し替えは、`index.html` 内の該当セクションコメント（`<!-- 差し替え画像: ... -->`）の直下にある `.placeholder` や `div` を `<img src="assets/ファイル名" alt="..." />` に置き換えるか、`styles.css` で `background-image` を指定してください。
- 実装は「画像なしでも成立」「後から差し替えしやすい」ことを優先しています。

---

## デプロイ方法（Vercel 想定）

1. このフォルダ（`kami-blumogi-lp`）をGitリポジトリのルートにするか、ルートにこの中身を置く。
2. [Vercel](https://vercel.com) で「Import Project」→ リポジトリを選択。
3. Framework Preset は **Other** のまま。Build Command は空、Output Directory は **`.`**（ルート）でOK。
4. デプロイすると、`index.html` がルートで配信され、そのままLPとして公開されます。

静的HTMLのため、ビルドは不要です。

---

## カスタマイズしやすいポイント

- **色・トーン**: `styles.css` の `:root` 内の `--color-*` を変更すると全体の雰囲気を変えられます。
- **フォント**: `index.html` の Google Fonts リンクと、`styles.css` の `--font-serif` を変更可能です。
- **セクション単位の編集**: 各セクションは `id` と `class`（例: `#hero`, `.section-hero`）で一意になっているので、セクションごとにスタイルや文言を変更しやすい構成です。
- **文言**: 本文はすべて `index.html` 内にあります。コピー変更時は該当セクションの `<p>` や `<h2>` を編集してください。

---

## ファイル構成

```
kami-blumogi-lp/
├── index.html      # ページ本体（15セクション）
├── styles.css      # スタイル（モバイルファースト）
├── script.js       # スクロールフェード用
├── README.md       # 本ドキュメント
├── WIRE_AND_POLICY.md  # ワイヤー・レイアウト・実装方針
└── assets/         # 画像・フォントなど（差し替え用）
```

---

## 今後の流れ

- 画像の差し替え・実写真の追加
- CTAボタンのリンク先設定（購入ページなど）
- 必要に応じてClaude Codeで細部の文言・レイアウト調整
