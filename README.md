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

URLを保存して以後のデフォルトにする（VercelのビルドでもこのURLが使われます）:

```bash
npm run publish -- https://example.com
```

pushまで実行せずに確認したい場合（コミットは作成します）:

```bash
npm run publish -- --dry-run https://example.com
```

生成物:

- `output/content.json`
- `output/index.html`
- `output/style.css`
- `output/script.js`

## Vercel

このリポジトリをVercelにImportすると、ビルド時に `npm run build`（= generate）が走り、`output/` がそのまま公開されます（`vercel.json` 設定済み）。

`npm run publish -- <URL>` で `site.json` が更新されてpushされるため、Vercel側は次回デプロイでそのURLを元にLPを再生成します。

