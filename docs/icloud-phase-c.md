# iCloud状態同期 Phase C — ダウンロード／全量LWW

## 基準と成果物

HEAD `28ed081`＋写真最終（枠別解放）＋写真パス再ベース＋Phase A/B。基準54 suites / 505件。既存の未コミット変更を保護した。Phase C単独パッチは `Rhythm-icloud-phase-C-after-phase-B.patch`。別のPhase B適用済みツリーでのみ `git apply --check` 後に適用する。現在の作業ツリーには適用済みなので再適用しない。

オーナーの最新指示で検証後のcommit/pushが許可された。履歴上のA/B報告にある「commit/pushしない」は当該Phase納品時点の記録。

## 判定と安全性

`resolveSyncDecision(local, remote)` は純粋関数。項目別マージなし、同時刻はlocal維持。

| 入力／条件 | 処理 |
| --- | --- |
| remoteなし | localがあればupload |
| localなし、検証済みremoteあり | 採用候補 |
| remoteが新しい | 空データ保護・編集中保護を通して採用候補 |
| localが新しい | local維持・必要ならupload |
| 同時刻 | local維持 |
| remoteが空、localにTodo・予定・日記等あり | 自動採用しない（全削除も安全側で止める） |
| 未保存変更、フォーム、キーボード等 | 保留、保存／安全な画面復帰後に再判定 |
| 不正body/meta/hash | 採用しない |
| 退避失敗 | main状態を書き換えない |

root検証を既存loadと共通化し、既知フィールドの明らかな形違いも拒否する。unknownフィールドを削らず、PersistedState・STORAGE_KEY・Premium IDは変更しない。

承認済みの任意 `meta.bodyHash` をSHA-256で付与。meta/body/metaの安定読取り、UTF-8バイト数、hashを照合し、別配送の同サイズbody混同を防ぐ。旧hashなしmetaは自動採用しない。両端末とも新プロトコルのビルドへ更新する必要がある。localが新しければ新形式を送信する。KVSは非原子的・非即時であり、hashは配送タイミングを保証しない。

## 保存・起動への接続

- 起動時hydration完了、KVS変更、アプリ復帰、ローカル成功保存後にcoordinatorが判定。初回比較までuploadを止め、復元時の正規化／写真再ベースを利用者の新編集と誤認せず、元の時刻を維持する。
- mainの既存直列queueに条件付き採用jobを追加。ディスク本文・write version・画面状態を照合し、現行raw JSONを `rhythm-state-pre-sync-backup-v1` へ1世代退避してから書込む。元データなしの退避値は文字列 `null`。採用後は既存hydrationRetryで読み直す。
- Native書込み中に入力が始まった場合、同queue内で旧本文へrollbackして後続local保存を優先する。rollback自身のIO失敗まで完全な原子性は保証できない。その場合もbackupを保持し、UIをremoteで再hydrationしない。
- `useRhythmPersistence` の80ms debounce、バックグラウンドflush、保存失敗UI・再試行はそのまま。Cloud処理をmain保存Promiseの成功条件にしない。
- 同期メタのみ別キー `rhythm-state-local-sync-meta-v1`（updatedAt/bodyHash）に保存する。既存 `rhythm-sync-device-id-v1` は維持。初回C移行で一致するローカルメタがなければ、既存localを安全側で優先する。元々localなしの新端末は時刻0として初回自動保存がremoteに勝たないようにする。
- iOSでは未ログイン時もlocal時刻を記録し、後からログインした時にオフライン編集時刻を捏造しない。利用不可時はCloudのread/write/subscribeをしない。Androidはno-op。新しい画面やログイン要求はない。
- 編集保護は保守的：安全なホーム以外のタブでは採用を保留する。ホーム内の関連メモ等の内部sheet、rootフォーム、選択、集中、各modal、keyboard、touch後1秒も保護する。別タブで即置換せず、ホーム復帰または次回起動時に再判定する。
- uploadは従来の3秒debounce、900,000 bytes上限、失敗時警告・次回保存時再試行を維持する。

## 写真

管理写真のファイル不在は表示用コピーだけで未設定扱いにする。原状態のURI・cropを消さない。Home等のテーマ写真、PhotoEntry、分析の日記／振り返り、Widget設定previewを保護。日記写真の削除は、非表示写真のindexずれで別写真を消さないようURI照合にした。Reactレビューでもrawと表示モデルの分離を確認した。

cleanupは従来どおりファイル側の未参照削除。起動時／現状態／1世代退避の参照を保護し、退避読取り失敗時はcleanupを見送る。状態参照の書換えはしない。写真ファイルは同期されない。URIも全量LWWの一部であり、端末別写真を項目マージしたり、全履歴のファイルを永久保持する実装ではない。

## 実装手段・変更ファイル

NativeはPhase Aの `@nauverse/expo-cloud-settings@1.3.5` のまま。新しいNative依存なし。hashはCJS対応のJS実装 `@noble/hashes@1.8.0` を固定。Expo Metroで同ライブラリのcrypto参照だけbrowser shimへ解決し、Node cryptoをbundleしない。SHA計算はUint8Arrayから行いTextEncoder／Native乱数polyfillを要求しない。

Phase Cの26ファイル：

- `App.tsx`、`screens/HomeScreen.tsx`：hydration後の接続、編集保護、backup写真保護。
- `screens/HistoryScreen.tsx`、`components/PhotoEntry.tsx`、`components/WidgetSettingsCard.tsx`、`features/photo/persistentPhoto.ts`、`features/photo/photoSamples.ts`：表示ガードのみ。
- `features/sync/resolveSyncDecision.ts`、`stateSyncCoordinator.ts`、`useICloudStateSync.ts`、`syncCodec.ts`：判定・制御・接続・hash。
- `features/sync/icloudStateSync.ts`、`icloudStateUpload.ts`、`syncConfig.ts`、`README.md`：厳格読取り、予約制御、C有効化。
- `storage/rhythmStorage.ts`、`rhythmStateValidation.ts`：同queueの条件付き採用と共通root検証。
- `package.json`、`pnpm-lock.yaml`、`metro.config.js`：固定hash依存と限定resolver。
- `__tests__/qa-icloud-phase-b.test.js`：metaにhashを含む期待値のみ更新。既存ケース削除なし。
- `__tests__/qa-icloud-phase-c.test.js`、`qa-icloud-phase-c-app.test.js`、`qa-icloud-phase-c-photo.test.js`、`qa-sync-metro.test.js`：追加テスト。
- 本報告。

## 自動検証

最終検証：**58 suites / 580件全PASS**（140.228秒、基準505件＋75件、skipなし）。`pnpm typecheck` PASS、`npx expo export --platform ios` PASS（Hermes bundle 4.36MB）、`git diff --check` PASS。Phase Cパッチは前提4本を一時indexへ適用した基準にstrict check→実適用し、現在の作業ツリーと完全一致することを確認した（26ファイル）。追加75件の内訳は純粋判定・codec・保存queue・coordinator63件、App統合5件、写真表示6件、Metro resolver1件。基準505件は削除・skipしていない。App統合には新端末初回復元、編集中保護、写真参照保護、メタ読取り再試行、未ログイン時のlocal時刻保護を含む。

## Native／Apple設定と実機試験（未検証）

Phase Cでentitlement/config pluginの追加変更なし。Phase AのKVS-only `com.apple.developer.ubiquity-kvstore-identifier = $(TeamIdentifierPrefix)$(CFBundleIdentifier)` を継続。App ID `app.rhythm.daily` のiCloud Key-value storage、有効なprofileと署名entitlementsの一致を確認し、Nativeモジュール入りDevelopment Buildを再作成する必要がある。Apple Developer操作、profile更新、EAS/iOS Nativeビルド、実機インストールは本環境では未実施。JS exportは署名・Swiftリンク・配送確認ではない。Metroは設定追加後に再起動が必要（既存プロセスは停止していない）。

開発用データ・同一Apple Accountの実機2台で以下を行う。実データを消して試験しない。

1. **A→B復元：未検証。** AでTodo／予定／習慣／日記を作り、3秒以上foregroundに保つ。Bをlocal状態のない試験用環境で起動し、採用・再hydration・内容一致を確認する。
2. **B→A編集：未検証。** Bで編集・保存後、Aを安全なホームで待機して反映と1世代backupを確認する。
3. **offline競合：未検証。** A/Bで秒単位で異なる時刻の編集を行い、online復帰後に新しいupdatedAtへ収束し、空にならないことを確認する。同時刻はlocal維持。端末時計ずれの補正はない。
4. **localなし：未検証。** 試験用新端末でクラウド復元し、初回defaults保存がremoteより新しい編集扱いにならないことを確認する。
5. **iCloudログアウト：未検証。** 試験アカウントのログアウト中も全機能がlocal動作し、催促UIやCloud呼出しがないことを確認。編集後にログイン／アプリ再activationし、保持した編集時刻で比較することを確認する。
6. **写真：未検証。** Aの写真はBで未設定表示、raw URI/cropは維持。Bで別写真設定後、Aの元ファイルとcleanup／再起動時のbackup保護を確認する。写真実体の同期は期待しない。

Phase Bの未検証項目もまとめて確認：開発ログ `[iCloud] Native KVS write calls returned (not server confirmation).` はNative setterが戻った証拠だけ。Xcode/LLDBでKVSのmetaとbodyのUTF-8長を確認し、別端末でのmeta/hash／開発用内容の一致と採用ログをもって配送を確かめる。privateな日記本文や全JSONをログに出さない。

```swift
expr -l Swift -- import Foundation
expr -l Swift -- NSUbiquitousKeyValueStore.default.string(forKey: "rhythm-state-meta-v1")
expr -l Swift -- NSUbiquitousKeyValueStore.default.string(forKey: "rhythm-state-body-v1")?.lengthOfBytes(using: .utf8)
```

Appleの配送時刻は制御できず、synchronizeの戻りも即時反映保証ではない。実機6項目、実KVS書込み／配送、Native署名／ビルドはすべて未検証であり、自動テスト合格で代替保証しない。

## 公開前

状態JSONがiCloudへ複製されること、写真ファイルは対象外であることをプライバシー表記で説明し、実際のデータアクセスに応じApp Privacy回答を再確認する。外部のストア／ポリシー編集は未実施。「リアルタイム同期」とは表記しない。

一次資料：[Expo capabilities](https://docs.expo.dev/build-reference/ios-capabilities/)、[Apple KVS synchronize](https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore/synchronize())、[Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/)、[noble-hashes releases](https://github.com/paulmillr/noble-hashes/releases)。
