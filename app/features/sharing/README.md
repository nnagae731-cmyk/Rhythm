# 家族共有（CloudKit基盤）

最終QAと4段階公開の安全境界：`docs/family-sharing-final-qa.md`（repoルート）。閲覧専用/編集可能はCKShareの実権限としてApple標準UIで管理する。個人予定の4段階公開を既存FamilyGroupの子＋UI制限だけで実装してはいけない。

開発フラグ時のみ `rhythmFamily.debug` に `setAutomaticSync` / `sendPending` / `diagnostics` / `probeReadOnlyWrite` を追加。Native側もDEBUG限定。明示呼び出しだけで実行し、通常画面/起動時には何も作らない。権限probeのCloudKit拒否は新しいNativeビルドで実機確認し、通信失敗を権限検証PASSにしない。

個人用 `features/sync`（KVS）、`storage`、PersistedState、旧 `features/shared` の共有パケットとは別実装。UI統合は後続。

- 窓口：`familySharing.ts`。Native module不在／Androidはunavailable、iCloud不在もunavailable。通常画面に共有ボタンを足さない。
- レコード／純粋判定：`records.ts`。CloudKitのフィールドはNativeで構築し、作成者・完了者IDはNativeの現在のiCloudユーザーから決定する。
- Native：`modules/rhythm-family/ios`。iOS 17以降、専用container `iCloud.app.rhythm.daily.family`、Private/Shared各1つのCKSyncEngine。Public DBは不使用。
- 保存：Application Support/RhythmFamily/<account hash>.json。CKRecord、未送信outbox、engine checkpointを一つのatomicファイルへ保存。個人のAsyncStorage/KVSへ接続しない。アカウント変更でメモリを切り離し、別アカウントへoutboxを送らない。破損／ディスク障害は共有だけfail-closed。
- 予定/TODO削除はLWW対象のtombstone。退出は参加者Shared DBからCKShare削除、オーナーのグループ削除は専用zone削除。権限エラーを成功扱いしない。
- 削除は更新時刻より優先し、同じIDを復活させない。live同士はrecordChangeTagで検出した競合をLWWで解決。syncStatesでsynced/pending/failedを区別する。
- オフライン利用の時間制限は設けない（オーナー決定）。次回接続時に権限失効を反映する。account切替時はmemoryを切り離し、失効したzoneはcache/outboxを消去する。offline中の即時遠隔消去は保証しない。
- 時刻付き予定はepoch ms＋IANA timezone、終日はstartDate/endDateExclusiveの暦日文字列。終日を端末timezoneへ変換しない。
- 各グループにFamilyMemberを保持。名前未入力は空文字（UIでは未入力扱い）、色はユーザーIDから一度生成して保存、本人が後から変更可能。CKShare参加者が正、プロフィールだけをメンバーとして増やさない。
- `debug.ts` は `__DEV__ && EXPO_PUBLIC_RHYTHM_SHARING_DEBUG=1` の場合のみ `globalThis.rhythmFamily` を公開する。初期データや架空メンバーを自動生成しない。

招待のcold/warm launch受け口はconfig pluginのAppDelegate bridge。Expo SDK 54は当該delegateを転送しないため明示追加している。現在のnon-scene構成専用で、scene構成へ変更した時はprebuildを止める（SceneDelegate対応が必要）。通常のURL／通知リスナーを置換しない。

設計・Apple設定・開発コンソール手順は `docs/family-sharing-foundation.md`。最新の実機結果は `docs/family-sharing-final-qa.md` の2026-11-28実機結果を優先する。コード`07905fb`のNativeビルドは成功し、別Apple ID 2台で実権限拒否・競合・退出/再招待等を確認済み。JSテストをNative実証として扱わない。

自動検証は60 suites / 671 tests PASS。共有表示のUI設計へ進めるが、全回帰完了ではない。Account切替/ログアウト、background中の配送、engine実送信permissionFailure後のreadOnly復旧、競合の逆順組合せは未検証。個人予定の4段階公開は別CKShare/projection設計が必要で、現行階層のUI制限だけでは実現不可。追加ビルド/Production deployは別途承認が必要。

未検証4項目はリリース前の最終QAで必ず確認する。個人予定の公開処理は設計承認前に実装しない。コンパクト月間カレンダー等のUI先行実装とは切り離して管理する。
