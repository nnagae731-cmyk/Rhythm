# RhythmPace サポートサイト

App Store Connect のサポートURL・プライバシーポリシーURLに利用する静的サイトです。

## ファイル

- `index.html` — サイト入口
- `support.html` — サポート・FAQ
- `privacy.html` — プライバシーポリシー
- `styles.css` — 共通CSS

## ローカル確認

リポジトリ直下で次を実行し、`http://localhost:8080/support.html` または `privacy.html` を開きます。

```bash
python -m http.server 8080 --directory support-site
```

公開前に、課金商品の提供状況、広告SDKの最新開示内容、問い合わせ先などを確認してください。

## リリース準備

チェックリスト・掲載文・実機QA・審査メモは `docs/release/` にあります。
`node app/scripts/release-preflight.cjs` をリポジトリ直下で実行すると、ローカルの設定と掲載下書きを読み取り専用で確認できます。公開サイトのデプロイやApp Storeへの登録は行いません。

2026年11月26日：ローカルのFAQをWidget全9種類・Wish/TODO連動・購入権限とデータ復元の区別に更新しました。公開サイトへの反映は未実施です。デプロイ後に匿名アクセスで内容とリンクを再確認してください。
