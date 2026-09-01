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
