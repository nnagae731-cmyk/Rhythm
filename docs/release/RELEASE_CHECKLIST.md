# RhythmPace iOSリリース準備

2026年11月26日開始。基準commitは `4c2693368ed5a1f7cf781413e25921e1d14b1d1a`。現時点は提出準備中であり、公開可能との判定ではない。

アプリと課金商品3種類は作成済みとのユーザー確認あり。App Store Connectの内容・販売状態・契約状況は未照合。今回、Build・アップロード・審査提出・公開設定変更は行わない。

初回配信は日本のみとユーザーが決定（2026年11月26日）。App Store Connectの配信地域は未操作で、実際の設定との照合は残る。

## 現在確認できていること

| 項目 | 状態 |
| --- | --- |
| 最新LOCALの自動QA | 302件PASS、typecheck・iOS JS export・diff check PASS（上記commitの直前に実施） |
| Bundle ID | `app.rhythm.daily` |
| Widget Extension / App Group | `app.rhythm.daily.widget` / `group.app.rhythm.daily` |
| ローカル版番号 | version `0.1.0`、iOS buildNumber `3`。初回公開版の番号とASC上の使用済み番号は未確認 |
| Widget有効時のNative最小OS | pluginとpodspecはiOS 17.0。完成したArchiveの設定は次回Buildで確認 |
| 掲載文 | [日本語下書き](app-store-ja.json)。未アップロード・未承認 |
| 実機QA・撮影計画 | [実機QAと審査メモ](DEVICE_QA_AND_REVIEW.md) |
| プライバシー・広告 | [確認事項](PRIVACY_REVIEW.md)。回答は未確定 |
| 公開URL | サポート・プライバシーURLを匿名HTTP GETで確認し、いずれも200・認証ページではない（2026年11月26日） |
| サポートFAQ | ローカルを9種類Widget・現行の購入説明に更新。公開サイトへの反映は未実施 |

## 次に進む順番

1. 下記の配信地域・プライバシー・課金確認を完了する。
2. 公開版versionと未使用buildNumberを決める。既存番号を推測で上書きしない。
3. 最新Native変更を含むStore配布用Buildを別途承認して実行する。
4. TestFlightで、Metroに接続しない起動・課金・通知・Widget・Live Activityを確認する。
5. 掲載文と実画面スクリーンショット、審査メモをASCへ登録する。
6. 最終ゲート確認後、提出・公開方法をユーザーが承認する。自動公開は今回設定しない。

## 提出を止める未完了ゲート

- [ ] 最新コードのiOS Archiveが成功し、Widget Extension・ActivityKit・画像アセットをコンパイルできる。
- [ ] 提出用BuildがDevelopment Clientではなく、単独で起動する。開発用権限切替UIが表示されない。
- [ ] 署名・Provisioning・App Groupが本体とExtensionで一致し、Archiveで必要な権限を持つ。
- [ ] Buildに使うXcode / iOS SDKがAppleの提出要件を満たす。公式確認時点ではXcode 26以降・iOS 26 SDK以降。ビルドサービスの選択イメージ・実ログで確認し、提出日に再確認する。
- [ ] Widget／Live Activityの最新文字サイズ・M/L配置を実機で確認する。WindowsのテストやJS exportをSwiftコンパイル・実機描画の代わりにしない。
- [ ] StoreKitの3商品ID・種類・販売地域・価格・サブスクリプショングループが実装と一致する。
- [ ] 初回の課金商品タイプは新しいアプリ版と一緒に審査へ含める。新しいサブスクリプショングループも対応する商品とセットで確認する。
- [ ] 無料→購入→復元→失効／取消の権限変化をSandbox/TestFlightで確認する。本番購入をQAに使わない。
- [ ] Apple契約・税務・銀行情報、アプリの配信権利・年齢レーティングをASCで確認する。
- [ ] AdMobの本番アプリ・広告ユニット、app-ads.txtの要否／設定、配信地域に応じた同意管理を確認する。NPA指定だけで確認済みにしない。
- [ ] SDKを含むApp Privacy回答、ATTの要否、Privacy Manifest、暗号化申告を確認する。
- [ ] サポートFAQの更新版を公開し、ログインなしで全リンク・問い合わせ先を確認する。
- [ ] 必要な解像度のスクリーンショット・アイコンを用意する。個人メール・写真・実予定・通知を写さない。
- [ ] バックアップ／クラウド同期がない点を誤認させず、既存ユーザーのデータを保った更新を確認する。実データがあるアプリを削除して試験しない。

## 課金商品 照合用

| 実装のデフォルトID | 想定する種類 | ASC・実機の照合 |
| --- | --- | --- |
| `app.rhythm.daily.premium.monthly` | 月額の自動更新サブスクリプション | 未実施 |
| `app.rhythm.daily.premium.yearly` | 年額の自動更新サブスクリプション | 未実施 |
| `app.rhythm.daily.design.customize` | 非消耗型の買い切り | 未実施 |

`app/features/purchases/storeProducts.ts`にはデフォルトIDがあるため、productionのenvに商品IDがないだけで未設定とは判定しない。EAS側の環境変数で上書きされている場合は、その最終値をASCと比較する。24時間のデザイン体験・広告12時間解放と、StoreKitのサブスクリプション導入オファーは別制度。

## ローカルの確認コマンド

リポジトリ直下：`node app/scripts/release-preflight.cjs`

preflightはローカル設定と掲載文の静的検査だけを行う。ネットワーク、Build、ストレージ変更、審査提出は行わない。PASSでも上記の手動ゲートは未完了のまま。

コードを変更した場合は `app` で全Jest・`pnpm typecheck`・`npx expo export --platform ios`、リポジトリで `git diff --check` を再実行する。実機確認結果にはBuild番号・端末・iOS・日時を添える。

## 公式確認先

- [Appleの提出要件](https://developer.apple.com/news/upcoming-requirements/)
- [審査提出](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/)
- [初回のアプリ内課金提出](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase)
- [App Privacy](https://developer.apple.com/app-store/app-privacy-details/)
- [スクリーンショット仕様](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

確認日：2026年11月26日。公開準備中に仕様が変わる可能性があるため、提出直前にも確認する。
