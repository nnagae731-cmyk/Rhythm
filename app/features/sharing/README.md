# 家族共有（CloudKit基盤）

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

設計・Apple設定・開発コンソール手順・実機チェックと未検証範囲は `docs/family-sharing-foundation.md`。Nativeビルド・実CloudKitはMac／署名済み実機での確認前であり、JSテストをNative実証として扱わない。

現在はWIP。Nativeビルド未確認につき完了扱いにしない。別Apple ID実機2台の招待→同期を確認するまで動作確認完了とはしない。全体Jestでの既存Wishケース失敗も報告書を参照。
