# iCloud状態同期 Phase B — アップロードのみ

## 基準・適用

HEAD `28ed081`＋写真最終（枠別解放）＋写真再ベース＋iCloud Phase A。基準53 suites / 482件PASS。未コミット変更を保護し、Phase B単独の追加パッチとして納品する。実際のindex/HEAD変更、commit/pushは行わない。作業ツリーには実装済みのため再適用不要。

別の同じ基準ツリーでのみ`git apply --check Rhythm-icloud-phase-B-after-phase-A.patch`→`git apply Rhythm-icloud-phase-B-after-phase-A.patch`。

## 実装・保存への接続位置

- `storage/rhythmStorage.ts`：既存の`JSON.stringify(state)`、直列化queue、AsyncStorage書込み、例外処理はそのまま。最後の`await write`が成功した後にだけ、同じserialized文字列と`Date.now()`を同期側へ通知する。queueにCloudのPromiseを連結しない。通知処理自体がthrowしてもローカル成功をrejectしない。
- `features/sync/syncConfig.ts`：trueへ変更。Phase Bのuploadのみ有効。Phase Cのcoordinatorは存在しない。
- `features/sync/icloudStateUpload.ts`：成功保存ごとに予約を更新し、最後の成功保存から3秒で最新1件を複製する。`updatedAt`はローカル書込み成功時点のepoch msで、広告/描画/Cloud送信時点ではない。
- 本文はローカルに保存した文字列そのもの。再シリアライズ/再正規化や画像ファイルコピーはしない。UTF-8で900,000 bytes超なら警告ログのみでスキップ。ちょうど900,000は許可。JSONメタとキーの容量を含めても1MBまで余裕を残す。
- `rhythm-sync-device-id-v1`に初回のみinstall-local IDを生成・保存する。Apple Account、広告ID、ハードウェアIDではない。PersistedStateに含めない。IDの読込/保存失敗は同期だけ中止し、次回保存で再試行する。既存IDは再起動後も再利用。
- ID取得待ちの間に新しいローカル保存が成功した場合、generation確認で古い送信を破棄。新しい巨大状態/利用不可も古い予約を取り消す。失敗したローカル保存は既存の最後の成功保存の予約を変更しない。
- KVSは`rhythm-state-body-v1`、続いて`rhythm-state-meta-v1`（JSON `{ updatedAt, deviceId, bodyBytes }`）の順。新規キーはdevice ID用のローカル1個と、仕様どおりのKVS2個のみ。pre-sync backupは採用処理がないため本Phaseでは使用しない。
- KVS失敗・例外・モジュール不在・iCloud未ログインでは同期側だけ終了。独立した即時retryループを作らず、次回の成功保存で最新状態を再試行する。ローカル保存待機者や保存エラーUIをCloud成否で操作しない。

`useRhythmPersistence.ts`、80ms debounce、バックグラウンドflush、hydration、PersistedState、STORAGE_KEY、Premium ID、写真処理、画面は変更していない。保存queue本体の順序/失敗扱いも不変。バックグラウンドflushも同じ保存関数を通るので成功後のupload対象となるが、iOSが3秒タイマーより先にプロセスを停止した場合の実行は保証しない。生存中は復帰後のタイマー、または次回成功保存で再送する。

## 読み戻しをしないこと

upload側はPhase Aラッパのavailability/writeだけを呼ぶ。read/subscribeは一度も呼ばず、KVS通知リスナー、ダウンロード、マージ、ローカル退避、hydrationRetry操作は追加していない。既存のlow-level read/subscribe APIは将来用として残るだけ。

KVS2キーは原子的トランザクションではない。body成功/meta失敗などでクラウド上が一時不整合になる可能性があり、次回成功保存で両方再送する。Phase Cでは必ず整合性と採用条件の検証が必要。今回クラウド状態を採用する経路はない。

Phase Bだけではクラウド復元も競合保護もない。複数端末がupload有効で動くと、それぞれのローカル成功保存が同じクラウドsnapshotを書き換える。新規端末の空状態も自動保存され得る。本Phaseを復元/双方向同期として実データの複数端末へ配布せず、下記の検証は開発用データで行う。Phase Cの実装は別途指示を待つ。

## 変更ファイルとテスト

最終検証：**54 suites / 505件全PASS**（111.859秒、skipなし、基準482件＋23件）。`pnpm typecheck` PASS、iOS JS export PASS（1,180 modules / 4.29MB / 35 assets）、`git diff --check` PASS。Phase Bパッチは一時indexで前提パッチ3本を適用した基準にstrict check→実適用し、現在の作業ツリーと一致することを確認。差分は本Phaseの8ファイルだけで、既存の写真/App/保存hookや保存キュー構造を保護した。実際のGit index/HEADは変更していない。

1. storage/rhythmStorage.ts（成功後の通知のみ）。
2. features/sync/icloudStateUpload.ts（新規）。
3. features/sync/syncConfig.ts、icloudStateSync.ts（flag有効化、旧/欠落APIのno-op、Native呼出し戻り値の説明）。
4. features/sync/README.md。
5. __tests__/qa-icloud-phase-b.test.js（新規）。
6. __tests__/qa-icloud-phase-a.test.js：実flagがtrueになることを反映し、無効時検証はmock flag=falseで維持。保存文字列の測定テストだけはupload予約をmockして直列化の一致を独立検証する。本Phase Bテストは実際の保存関数とupload実装を通す。既存ケースの削除/skipはしない。
7. 本報告。

新規テストは保存完了前/失敗時は発火しない、保存開始後の入力変更がCloud本文を変えない、最後の保存からのdebounce/時刻、900KB境界/日本語/emoji/孤立surrogate、古い予約の取り消し、body/meta/ID保存/Native失敗と次回retry、ID取得中の新保存、再起動相当ID再利用、利用不可・flag無効、並行保存の直列順序、read/subscribe未使用を検証する。

## Nativeビルド・Apple側の実施状況

Phase Aの[Apple側の設定手順](icloud-phase-a.md)を引き継ぐ。対象App IDは`app.rhythm.daily`。KVS-only entitlement/config plugin/依存バージョンはPhase Aから変更なし。

- 実施：JS/型/設定済みコードの自動検証（結果は末尾）。
- 未実施：Apple Developerへのログイン、App IDのiCloud/Key-value storage有効化確認、provisioning profile更新、EAS/iOS Nativeビルド、実機インストール、実KVS書込み/配送確認。
- Windows環境のため署名済みNative/実機を検証したとは報告しない。JS export成功もSwiftリンクや署名の確認ではない。
- [Expoのcapability同期](https://docs.expo.dev/build-reference/ios-capabilities/)はKVS-onlyの自動設定成功まで保証するものではない。署名済みentitlementsとprofileの`com.apple.developer.ubiquity-kvstore-identifier`がTeamIdentifierPrefix＋Bundle IDで一致することをオーナー側で確認する。

## 実機でKVS書込みを確認する手順（未実施）

1. Phase A報告に沿ってApp IDのiCloud/Key-value storage、profileを確認し、新しいDevelopment Buildを作成する。古いバイナリ/Expo GoにはNativeモジュールが無く、従来どおりローカルだけで動く。
2. 同一Apple Accountにログインした実機Aで、開発用Todo等を変更し、アプリをフォアグラウンドで3秒以上保つ。
3. Metro/Xcodeの開発ログで`[iCloud] Native KVS write calls returned (not server confirmation).`を見る。ログはupdatedAt/bodyBytes/deviceIdSuffixだけで、日記本文/JSON本文/完全なIDは出さない。このログはNative setterが戻った証拠だけで、永続化やAppleサーバーへの配送確認ではない。
4. Xcode debugger/LLDBで同じ実機のNative KVSを直接確認する（アプリ状態には読み戻さない）。以下は手動検証用でありアプリに自動読込経路を追加するものではない。

```swift
expr -l Swift -- import Foundation
expr -l Swift -- NSUbiquitousKeyValueStore.default.string(forKey: "rhythm-state-meta-v1")
expr -l Swift -- NSUbiquitousKeyValueStore.default.string(forKey: "rhythm-state-body-v1")?.lengthOfBytes(using: .utf8)
```

meta.updatedAtが最後の成功保存の時刻、meta.bodyBytesが実際のbodyのUTF-8長、meta.deviceIdが複数回保存/再起動で同じであることを確認する。個人データを使う場合はbody全体をconsoleへ出さない。

5. サーバー配送まで確認するには、別実機BはPhase Aなど**upload無効の診断ビルド**を使い、KVS値だけをLLDBで確認する。Bもupload有効だとBの起動時保存でAのクラウド値を上書きし得る。Appleの配送を待ち、Aのmeta.updatedAt/deviceIdとbodyの内容（開発用マーカー）/UTF-8長がBのKVSで一致することを確認する。アプリ状態へ採用はしない。
6. 必要ならdebuggerから`NSUbiquitousKeyValueStore.default.synchronize()`を呼べるが、[Appleのsynchronize説明](https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore/synchronize())に従い、戻り値を即時サーバー反映の保証として扱わない。
7. iCloudログアウト・Nativeモジュール無しでローカル保存が継続すること、巨大な開発fixtureで`Upload skipped: body exceeds size limit`が出てもローカルが残ることを確認する。これら実機試験も本環境では未実施。

内部警告にはsize/body/meta/ID/Native例外を区別した文言がある。次回成功保存で再試行される。警告やログだけで実機KVSの保存/配送を保証しない。

## 公開前の注意

Phase Bでは状態JSONが端末外へ送信されるため、公開前にiCloud KVSへの保存・写真ファイル対象外・Apple任せの反映時期をプライバシー表記へ反映し、[Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/)に沿って実際のアクセス/保持に基づく回答を再確認する。現行の広告等の申告も維持する。今回はストア/ポリシーの外部更新はしていない。「リアルタイム同期」やクラウド復元完成とは表記しない。
