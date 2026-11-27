# 家族共有・UI移行前の最終検証

## 基準と完了条件

- 基準main：`f1a29bf`、59 suites / 651 tests PASS。今回のNative差分は新しいDevelopment Buildが必要。
- 旧ビルド `451f0d1e-1e65-4bee-af15-82c18fceff7f` では、別Apple ID 2台による招待・参加、双方向の予定/TODO追加・編集・完了・削除、終日暦日、アプリ再起動、オフライン保存（送信待ち1件）→完全終了→再接続で同一IDの1件に収束、招待再オープンの重複防止、共有停止と旧参加者の書き込み拒否を実機確認した。
- 旧QAグループはオーナー承認で停止済み。A/Bとも共有レコード0・未送信0・失敗0。個人タスク/日記は未登録、Widget未設置だったため、個人既存データとWidgetの保持は未検証。
- 新しいビルドで下記を実測するまで、残項目解消・UI移行準備完了とはしない。単体テストやNativeソース契約チェックを実機結果として扱わない。
- Productionスキーマdeploy禁止。個人保存、KVS、App Group、証明書/APNsキー、保存識別子は変更しない。検証用データ以外を削除・移行しない。

## 今回の修正

1. `UICloudSharingController.availablePermissions` に `allowReadOnly` を追加。private shareのみ。新規招待・既存共有の参加者管理とも、最新のCKShareをシステムUIへ渡してCloudKit上の参加者権限を保存する。権限を個人状態や独自フィールドへ書いて代用しない。
2. 未送信中の保存/削除がpermissionFailureとなった際、サーバーのroot/CKShare/currentUserParticipantを再取得。accepted/readOnlyなら未送信の楽観的編集を取り下げ、閲覧権限を残してサーバー値を再取得する。readOnlyでない/検証できない場合はfail-closedで対象zoneのcache/outboxを除去。アカウント世代を再確認し、別zoneや個人保存は触らない。取り下げた変更を勝手に再送しない。将来UIでは権限変更で編集を保存できなかったことを明示する必要がある。
3. DEBUG専用QA操作（Releaseではcase自体をコンパイルしない）を追加。JS側も `__DEV__ && EXPO_PUBLIC_RHYTHM_SHARING_DEBUG=1` でのみglobalへ公開する。通常起動で何も作成・実行しない。

## 開発専用QA API

既存 `globalThis.rhythmFamily` に `debug` を追加する。新しいNativeビルドでのみ使用可能。返り値は他APIと同じく `{ok,value}` / `{ok:false,...}`。失敗時は後続を実行しない。

- `debug.setAutomaticSync(false)`：checkpoint/outboxを保ったまま両engineの自動同期を停止。テストの競合タイミングを固定する。`debug.sendPending()` はprefetchせず送信し、実際のrecordChangeTag衝突を発生させる。完了後に `setAutomaticSync(true)` と `sync()` を実行。フラグは永続化せずアカウント変更/再起動で通常動作へ戻る。
- `debug.diagnostics()`：実際のserverRecordChangedとpermissionFailureの件数のみ。私的本文/メール等は含まない。
- `debug.probeReadOnlyWrite(participantGroup)`：実CKShareでreadOnlyを確認してから、local write guard/outboxを経由せずShared DBへ新しい `QA_PERMISSION_PROBE` TODOの保存を試みる。CloudKitのpermissionFailure（個別またはpartialFailure内）だけを `serverRejected:true` とする。通信エラーは合格ではない。成功してしまった場合は不合格とし、そのprobeだけ削除を試み、cleanupSucceededも返す。結果が不合格なら先へ進まず原因調査する。

## 実機手順・記録表

事前自動検証：全Jest **60 suites / 671 tests PASS**（既存651＋追加20）、`pnpm typecheck` PASS、iOS JS export PASS、`git diff --check` PASS。追加分は競合の対称性/削除優先、権限状態、QA APIの引数・無効時no-op・Native失敗/ログアウト、DEBUG限定と実サーバー権限probe/権限回復のNativeソース契約、個人保存からの分離。Swift実行やCloudKit実権限拒否は、この自動テストの合格だけでは保証しない。

署名準備：本体/Widgetとも既存Distribution証明書 `G44M2YBF7H`、本体APNsキー `VS639C26G5` を再利用。既存profileは両端末を含み、本体はCloudKit Developmentを許可。生成configでDevelopment、既存KVS/App GroupとWidgetを再確認した。今回の新EASビルドは1回のみ実行し、再ビルドは追加承認なしに行わない。

各項目は実行時に結果/日時/根拠を追記する。現在は全て新ビルドで未実施。

| 項目 | 手順と合格条件 | 状態 |
| --- | --- | --- |
| 署名/接続 | 同一IPAをA/Bへ。Development、既存KVS/App Group、両UDID、既存証明書を確認。異なるApple Account、同一CloudKit環境 | 未検証 |
| 閲覧専用招待 | A作成→システムUIで「閲覧のみ」→B受諾。両方のmembers/currentUserParticipantがreadOnly、Bの読み取り成功 | 未検証 |
| サーバー拒否 | Bの通常save拒否に加えdebug.probeReadOnlyWriteでCloudKit permissionFailureを確認。A側にprobeが作成されていない | 未検証 |
| 招待後の変更 | Aの既存共有管理でBをreadWriteへ変更→B編集成功→再びreadOnlyへ。共有URL/グループを複製しない | 未検証 |
| 変更後の未送信 | Bの自動同期を停止→編集をqueueへ→AでreadOnlyへ→B debug.sendPending。サーバー拒否を観測し、再取得後は閲覧可能/未送信0/未許可編集なし。readWriteへ戻しても取り下げた編集が復活しない | 未検証 |
| 同時編集 | 両自動同期を停止。同じタグの同一QAレコードをA/B編集→順にsendPending。conflicts増加を確認→再同期でupdatedAt/mutationIdによる同じ勝者へ収束。逆順でも実施 | 未検証 |
| 編集対削除 | 同じIDをA編集/B削除。逆順でも送信。削除優先で非表示となり、再起動後も復活しない | 未検証 |
| 退出/再招待 | B leaveGroup→Bのcache/outbox/権限失効、Aは利用継続。旧招待が重複グループを作らない。Aの管理UIで新規招待→B再参加・初期取得 | 未検証 |
| Account切替/ログアウト | オーナーの手動操作のみ。検証用Account/端末を優先。サインアウトで共有利用不可、個人機能利用継続。別Accountで旧cache/outboxを閲覧・送信しない。同じAccountへ戻り権限確認後に旧データを再利用 | 未検証 |
| 長時間background | 時刻/経過時間・省電力設定を記録。Bを通常background（強制終了とは別）にしAで変更。自動配送と復帰時同期を分けて確認。手動sync成功だけでsilent push成功としない | 未検証 |
| 個人データ分離 | 通常UIからQA目印付きの個人TODO/日記/Wish/通知とWidgetを作成。共有の追加・編集・削除/退出/停止の前後で個人内容・通知予約・Widget表示を比較。相手に個人内容が届かない。個人の既存内容は変更しない | 未検証 |

Apple Accountのサインアウトは他アプリ/iCloud写真/キーチェーン等にも影響する。会社端末の管理制限や許可に従い、オーナーが実施可能な範囲でのみ行う。実施しない場合は未検証を維持する。iCloudの同期時間は保証しない。停止の即時遠隔消去は保証せず、承認済み方針どおり次回接続で失効を反映する。

## 個人予定の4段階公開：現在の階層のままでは不可

**結論：FamilyGroup配下に個人原本や詳細を置き、UI/フィールドだけで隠す方式は禁止。** CKShareのparticipant permissionはshareの全階層に及ぶ。同じshare内で予定ごと/フィールドごとに読み取りや書き込みを制限するACLはない。readWrite参加者はUIの制限とは関係なく、その共有範囲を書き換え得る。FamilyMemberの本人名/色だけ編集可能という制限も、このクライアントの検証でありサーバー側フィールドACLではない。

| 公開段階 | サーバー境界を持つ将来方式 |
| --- | --- |
| 非公開 | 個人原本を現行ローカル/KVSに維持。共有レコードを生成しない。FamilyGroupの子にしない |
| 予定ありのみ | 開始/終了・終日・必要なtimezone等だけの専用projectionを作成。タイトル/場所/メモ/写真/自宅/移動/通知等を送信しない。固定の「予定あり」以外の詳細を含めない。専用CKShareで対象参加者をreadOnlyとする |
| 詳細まで | 明示選択した公開可能フィールドだけを別projectionへコピー。専用CKShareに対象参加者をreadOnlyで招待。元の個人データ全体を共有しない |
| 共同編集 | 別の共有専用record/階層を正本として扱い、明示対象者だけreadWrite。個人原本や非公開メタを同じ階層に含めない。個人原本への反映は別の仕様決定が必要で、自動的な双方向上書きを行わない |

projectionのルートは既存FamilyGroupの子にしない。参加者集合/権限が異なる単位は別CKShare（必要なら別zone）に分離し、親からの共有継承を避ける。1recordは1shareのみなので、busy版と詳細版は別record ID。対応表は所有者の非公開領域に置き、共有側から個人原本を参照・編集できないようにする。公開範囲の変更では不要になった旧projection/shareをサーバーで撤回し、クライアントcacheも失効処理する。既に閲覧された情報を回収できる、オフライン端末から即消去できるとは保証しない。

これはUIフェーズ前の設計条件であり、今回projectionの実装/個人データ移行/新しい共有IDの保存は行わない。既存groupモデルだけで4段階が実現済みとは報告しない。対象者別の公開範囲、共同編集の正本、旧projectionの撤回手順を確定し、CloudKit実権限の否定テストを追加してからUIへ接続する。

根拠：[Shared Records](https://developer.apple.com/documentation/cloudkit/shared-records)、[CKRecord.share](https://developer.apple.com/documentation/cloudkit/ckrecord/share)、[CKShare](https://developer.apple.com/documentation/cloudkit/ckshare)、[automaticallySync](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5/configuration)。
