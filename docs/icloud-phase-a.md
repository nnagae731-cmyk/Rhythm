# iCloud状態同期 Phase A（土台・同期無効）

## 基準と範囲

HEAD `28ed081`＋写真最終パッケージ（枠別解放）＋写真パス再ベース。基準52 suites / 470件PASS。既存未コミット変更を保持し、Phase Aだけの追加パッチを納品。commit/pushなし。

同期は`ICLOUD_STATE_SYNC_ENABLED = false`で固定。環境変数では変更不可。App・保存キュー・hydrationとの接続はない。無効時はラッパを呼んでもNativeモジュール解決/利用可否取得/購読/読み書きは一切行わない。deviceId・pre-sync backupキーへの書き込みも未実装。Phase B/Cの機能は追加していない。

## 採用手段と互換調査

第一候補の`@nauverse/expo-cloud-settings`を**1.3.5固定**で導入。独自Swiftモジュールへの置換はしていない。ライブラリのNative KVS実装のみ利用し、TSからの呼び出しは自前ラッパ内に閉じ込める。上流JSのeager requireNativeModuleを使わず、ExpoのrequireOptionalNativeModuleで旧バイナリ/Expo Goでも安全に無効化できる。

公開npmメタデータで最新版1.3.5の公開日2026-11-08を確認（開発依存SDK58/RN0.87.1、peerはexpo/react/RNすべて`*`）。SDK54世代の1.3.1は開発依存expo ^54.0.27/RN0.81.5。両版の配布tarballを比較し、Native境界のModule/Events/Function/OnStartObserving/OnStopObserving/sendEventが現行SDK54のExpo Modules APIで利用できることを静的に確認。1.3.5のobserver重複防止と購読開始時synchronize改善を選び、古い版へ固定しなかった。CocoaPods依存はExpoModulesCoreのみ、iOS最低15.1/Swift5.9で、アプリのiOS17設定と衝突しない。

JS型チェック・Jest・Expo設定展開・Apple向けautolinkingで確認するが、**SDK54/RN0.81でのSwiftコンパイル・CocoaPods/EAS Nativeビルドは未検証**。ワイルドカードpeerを根拠にNative互換を保証しない。上流は小規模（GitHub確認時2 stars/28 commits）であり、リリース前Native検証が必要。

調査元：[リポジトリ](https://github.com/TheNaubit/expo-cloud-settings)、[npm 1.3.5 metadata](https://registry.npmjs.org/@nauverse%2Fexpo-cloud-settings/1.3.5)、[SDK54世代1.3.1 metadata](https://registry.npmjs.org/@nauverse%2Fexpo-cloud-settings/1.3.1)。配布ソースとロックファイルのintegrityを固定している。依存追加は1パッケージ、install scriptsを無効にして導入した。

## entitlement/config

- `app/package.json`と`pnpm-lock.yaml`：依存1.3.5を追加。他の依存は更新しない。
- `app/app.config.js`：`./plugins/with-rhythm-icloud-kvs`を追加。
- pluginが追加するのは`com.apple.developer.ubiquity-kvstore-identifier = $(TeamIdentifierPrefix)$(CFBundleIdentifier)`だけ。既存の別IDがあればエラーにし、無断で別コンテナに移さない。
- 上流の同梱pluginは1.3.1/1.3.5とも`icloud-container-identifiers: []`と`icloud-services: ['CloudKit']`を追加するため不採用。KVSだけに必要な権限を付ける自前config pluginとした。
- CloudKit、iCloud Documents、追加container、追加push権限は付与しない。既存App Group・通知権限は保持する。`ios.usesIcloudStorage`も追加しない。

`expo config --type introspect`で、KVS識別子と既存App Group/通知権限のみが存在し、CloudKit/services/container権限が無いことを確認。`expo-modules-autolinking resolve --platform apple --json`でExpoCloudSettings 1.3.5 / CloudSettingsModuleの発見を確認。これらは署名済みNativeビルドの検証ではない。

## Apple Developer側：未実施

現在のアプリBundle IDは`app.rhythm.daily`。対象はメインアプリで、Widget extensionへのKVS権限追加は行わない。

[AppleのKVS entitlement説明](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.ubiquity-kvstore-identifier)に従い、対象App IDでiCloud capabilityとKey-value storageを有効にし、ビルドのprovisioning profileを再生成/更新する必要がある。KVS IDのprefixはTeamIdentifierPrefixで解決され、署名profileと一致させる。

[Expoのcapability同期説明](https://docs.expo.dev/build-reference/ios-capabilities/)はEASによる対応capabilityの同期を説明しているが、iCloud対応表のキーはicloud-container-identifiers。本件はKVS-onlyのため、**EASが自動で有効化するとは確認できていない**。Apple Developerログイン・App ID変更・profile更新・EAS Buildは一切実施していない。

オーナーのNative検証時：対象App IDのiCloud/KVS設定→profile更新→開発用iOSビルド→署名済みentitlementsのKVS ID一致を確認する。CloudKit containerを作る必要はない。既存App Group/Pushの設定は外さない。EASで権限不一致なら手動設定を確認する。署名や実機動作を確認するまでは有効化しない。

## 状態JSONサイズ実測

実端末のAsyncStorage/個人データは取得していない。実データ相当の**模擬fixture**を、現在のJSON.stringify保存形式でUTF-8バイト計測した。再実行：`node app/scripts/measure-icloud-state.cjs`（repo rootから）。画像はURIのみで、画像バイナリ/base64は含めない。

| 想定 | タスク/予定/日記日数 | 日記本文長の目安 | イベント/集中記録 | body bytes | 1,000,000 bytes比 |
| --- | --- | --- | --- | ---: | ---: |
| 軽量 | 30 / 10 / 30 | 100 UTF-16文字 | 60 / 20 | 59,041 | 5.90% |
| 通常相当 | 100 / 40 / 90 | 280 UTF-16文字 | 180 / 60 | 226,656 | 22.67% |
| 多量 | 1000 / 400 / 365 | 1000 UTF-16文字 | 2000 / 730 | 2,516,751 | 251.68% |

日本語・emoji、チェックリスト、習慣、日記写真参照、背景/トップ/crop、Widget設定などを含む。端末上の実際の利用量やprune後の最大値を保証するものではない。通常相当では900,000 bytesまで673,344 bytesの余裕があるが、多量データはKVSに入らない。メタ/キー分の追加容量も必要なので、Phase Bの900KBガードを必須とする。測定用の超過判定はあるが**runtimeアップロード/サイズガードはPhase Bで実装するもので、Phase Aでは未実装**。

[Appleの制限](https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestorequotaviolationchange)：合計1MB/1024キー。ここでは保守的に1MB=1,000,000、900KB=900,000として測定した。状態増大で同期できなくなってもローカル保存を維持する設計が必要。写真ファイルは同期しない。

## 変更ファイル・テスト

- package.json、pnpm-lock.yaml、app.config.js、plugins/with-rhythm-icloud-kvs.js。
- features/sync/icloudStateSync.ts、syncConfig.ts、README.md。
- scripts/measure-icloud-state.cjs、__tests__/qa-icloud-phase-a.test.js、本報告。
- ラッパの無効時完全no-op、Android、未導入、未ログイン、Native例外、文字列読み書き、購読/解除、2キーの通知絞り込み、pluginのKVS-only/既存設定保持/識別子保護、実保存文字列と測定バイト数の一致、超過fixture識別の12件を追加。Native有効時のテストはmockでflagを差し替え、実製品のflagはfalseのまま。
- App.tsx、PersistedState/types.ts、STORAGE_KEY、storage/rhythmStorage.ts、storage/useRhythmPersistence.ts、写真/Widgetコードに本Phaseの追加差分はない。

## 実機・未検証

最終自動検証：**53 suites / 482件全PASS**（141.051秒、skipなし、基準470件＋12件）。`pnpm typecheck` PASS。iOS JS export PASS（1,177 modules、4.28MB、35 assets）。`git diff --check` PASS。iOS JS exportはNativeリンク/署名/実機確認の代替ではなく、未使用ラッパも型チェックと個別テストで検証した。

Phase Aパッチを一時indexで「HEAD＋写真最終パッチ＋再ベースパッチ」にstrict check→実適用し、現在の作業ツリーと完全一致を確認。差分は上記10ファイルだけで、既存の保存/写真/App実装を保護。実際のindex・HEADは変更していない。現在の作業ツリーにはPhase Aも反映済みなので再適用不要。他の同じ基準ツリーで使う場合だけ`git apply --check Rhythm-icloud-phase-A-after-photo-rebase.patch`→`git apply Rhythm-icloud-phase-A-after-photo-rebase.patch`。

仕様§7の実機1〜6（A→B、B→A、オフライン競合、新規端末復元、iCloudログアウト、他端末写真保護）はすべて未実施。Phase Aでは同期を無効にしており、送受信成功を主張しない。EAS/Swift署名ビルド、端末でのNative isAvailable、KVS書込みは未検証。Phase B以降は別途指示を待つ。

## App Store/プライバシー

Phase Aはデータ送受信も新規収集も無いため、この変更だけを理由に「同期開始」「リアルタイム同期」等のストア説明へ変更しない。現行の広告等に関する申告もそのまま必要。今回App Store Connectやプライバシー表記を更新していない。

Phase B公開前には、状態（Todo/日記等）が本人Apple AccountのiCloud KVSへ送られること、写真ファイルは対象外、反映タイミングはApple任せであることをプライバシーポリシーに追記し、実際の開発者/第三者によるアクセス・保持に基づいてApp Privacy回答を再確認する。[Appleの説明](https://developer.apple.com/app-store/app-privacy-details/)はApple自身の収集と開発者/第三者による収集を区別している。「iCloudだから申告不要」と一律断定しない。Phase B有効化後の申告内容・審査適合は現時点で未確定/未検証。
