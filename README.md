# 世界196カ国 国名・首都名クイズ

Next.js で作成した、世界196カ国の国名と首都名を入力できる学習アプリです。入力欄にフォーカスした国は白地図上で強調表示されます。

公開URL: https://countryquiz-rho.vercel.app

## データ

- 国数の定義は外務省の「世界の国の数は196か国」という説明に合わせています。
- 首都の日本語表記は `https://www.siken.net/w_ranking?stat=capital` から生成しています。
- 国の基礎データは `world-countries`、地図形状は Natural Earth 由来の `world-atlas` を使っています。
- 生成は `npm run generate:data` で再実行できます。

## 開発

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## データ再生成

```bash
npm run generate:data
```

## ビルド

```bash
npm run build
```

## Vercel デプロイ

```bash
npx vercel --prod
```

## 主な機能

- 地域選択、回答入力、答え合わせの3画面構成
- 国名のみ・首都のみ・国名と首都の3モード
- 日本語・英語の別名判定
- メルカトル図法の白地図
- 地図上の番号と入力欄の番号を対応表示
- 番号が密集する地域を拡大表示できる地図操作
- 回答入力中は正解数・正誤状態・答えを非表示
- 地図を固定し、入力欄だけをスクロールするレイアウト
