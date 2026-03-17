# lp-auto-generator

URLからLP（`Hero / Concept / Story / Product / CTA`）を生成し、`output/` に静的HTML/CSS/JSとして出力します。

## 使い方

依存関係をインストール:

```bash
npm i
```

生成（デフォルトURLで生成）:

```bash
npm run generate
```

任意URLで生成:

```bash
npm run generate -- https://example.com
```

生成物:

- `output/content.json`
- `output/index.html`
- `output/style.css`
- `output/script.js`

## Vercel

このリポジトリをVercelにImportすると、ビルド時に `npm run build`（= generate）が走り、`output/` がそのまま公開されます（`vercel.json` 設定済み）。

