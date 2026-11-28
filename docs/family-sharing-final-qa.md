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

## 当初の実機手順・記録表（実施前の計画）

事前自動検証：全Jest **60 suites / 671 tests PASS**（既存651＋追加20）、`pnpm typecheck` PASS、iOS JS export PASS、`git diff --check` PASS。追加分は競合の対称性/削除優先、権限状態、QA APIの引数・無効時no-op・Native失敗/ログアウト、DEBUG限定と実サーバー権限probe/権限回復のNativeソース契約、個人保存からの分離。Swift実行やCloudKit実権限拒否は、この自動テストの合格だけでは保証しない。

署名準備：本体/Widgetとも既存Distribution証明書 `G44M2YBF7H`、本体APNsキー `VS639C26G5` を再利用。既存profileは両端末を含み、本体はCloudKit Developmentを許可。生成configでDevelopment、既存KVS/App GroupとWidgetを再確認した。今回の新EASビルドは1回のみ実行し、再ビルドは追加承認なしに行わない。

新Nativeビルド：コードコミット `07905fb` の [f64a9b45-4bac-47ee-8125-63329edb404a](https://expo.dev/accounts/rhythm-nn/projects/rhythm/builds/f64a9b45-4bac-47ee-8125-63329edb404a) がFINISHED、エラーなし。1回のみ実行。IPA内の署名entitlementsを読み取り、本体CloudKit Development/APNs production/既存KVS/App Group、Widgetの既存App Group、本体・Widget双方のprofileに2端末を確認。DEBUG用probeのNative文字列も本体に含まれる。Windows上のMach-O署名領域読み取りであり、macOS codesignによる暗号学的検証や実機API成功を代替しない。両実機への上書き更新と以降のQAはこれから実施する。

以下の当初チェックリストは計画であり、実施結果は末尾の「2026-11-28 実機結果」を正とする。未実施・部分検証を合格扱いにしない。

| 項目 | 手順と合格条件 | 状態 |
| --- | --- | --- |
| 署名/接続 | 同一IPAをA/Bへ。Development、既存KVS/App Group、両UDID、既存証明書を確認。異なるApple Account、同一CloudKit環境 | Native/IPA確認済み、実機更新・接続待ち |
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

## 2026-11-28 実機結果（JST・当初チェックリストより優先）

同じ新IPA `f64a9b45-4bac-47ee-8125-63329edb404a` を別Apple IDのA/Bに導入し、新Native QA APIで確認した。Bの旧バイナリは同じIPAの再インストールで解消。追加ビルド・Production deployは行っていない。以下は検証用レコードのみを対象とする。

| 項目 | 実測結果・判定 |
| --- | --- |
| Native/CloudKit接続 | A/Bとも新API利用可能、CloudKit利用可能。IPA検査済みDevelopment環境の同一ビルドで検証 |
| 閲覧専用とサーバー拒否 | Bのactual currentUserParticipantがaccepted/readOnly。通常保存拒否に加え、ローカルguardを迂回した直接保存probeもCloudKit error 10（permissionFailure）、serverRejected=true、unexpectedWrite=false。Aに不正レコードなし。再招待後にも同じ拒否を確認 |
| 招待時の権限選択 | 実際の送信シートの「People you choose can edit.」行から「閲覧とダウンロードのみ」を選択して送信→B受諾→実CKShare readOnlyを確認。「選択した人」を維持。管理画面の共有オプションではprivate shareの新規参加者権限がグレーになる場合があり、送信シート側の選択と区別する。public shareへ変更しない。受諾前pending時点の権限は独立計測できていない |
| 招待後の変更 | AのApple標準管理UIでreadWriteへ変更し、Bの実権限確認後に完了状態を更新、Aでdone=1を受信。readOnlyへの変更も確認 |
| 未送信変更中の権限低下 | B自動同期停止→編集pending=1→AでreadOnly→送信試行。未許可の楽観的編集を取り下げ、サーバーの元タイトル/done=1へ戻りpending=0。閲覧可能なまま。readWrite復帰後も取り下げた編集は復活しない。ただしこの経路は送信前検証で処理され、engineのpermissionFailures=0。実送信permissionFailure後の復旧分岐は未検証（直接probeの拒否確認とは別） |
| 同時編集 | A/Bが同じタグの同一TODOを編集し送信。Aで実serverRecordChangedを1件観測。双方がBの同じupdatedAt/mutationIdへ収束、pending=0。送信順を反転した全組合せは未実施 |
| 編集対削除 | Bで削除をqueue後、Aでそれより新しい編集をqueueして送信。Aのconflictsは累計2。双方から非表示、pending=0。古い同一IDの更新は拒否。B完全終了→再起動でも復活なし。全送信順の組合せは未実施 |
| 退出 | B退出後records=0/pending=0、left/permission=none/verified=false。Aのグループと検証TODOは維持 |
| 再招待 | 閲覧専用で再送・受諾後、Bはaccepted/readOnly、グループ1件（重複なし）、Aの残したTODOを取得。以前削除したTODOは復活しない。Apple管理UIの未使用共有リンクを実在参加者の重複と混同しない |
| 個人TODO/日記/Wish | 通常UIで作成した削除可能なQAデータを比較し、共有QA後も内容一致。Bの個人保存にこれらのQA目印なし。これは当該検証データの保持確認であり、全個人機能の網羅検証ではない |
| 個人通知 | QA TODOの14:45通知を実画面で確認。14:55のpresented notificationsで期待identifierと一致する1件を確認。通知比較ではJSONキー順を正規化し、発火後に予約から消える正常動作を破損扱いしない |
| Widget | Aの14:07/14:54スクリーンショットで同じQA個人TODO・進行中表示を確認。Widget設定/サイズの保存値も一致。全サイズ/全種類の操作は未検証 |
| 長時間background後の復帰 | 初回はRhythm内ホームだったため無効。再試行はBをiPhone OSホームへ通常background（強制終了ではない）。約26分34秒後の復帰でAの新TODOを受信し手動更新なし/pending=0。background中の配送とは区別する。詳細は次段落 |
| Account切替/ログアウト | 専用検証環境がないためユーザー判断で保留。未検証。通常利用Accountのログアウトを促さない |

### background計測の正確な記録

端末BのAppState時刻：background=`1795845706020`（15:01:46.020 JST）、active=`1795847299971`（15:28:19.971 JST）、約26分34秒。Aの新規QA TODO更新=`1795847049725`（15:24:09.725 JST）。Bの最初の観測イベント=`1795847300563`、受信内容確認=`1795847304163`（15:28:24.163 JST、復帰から約4.2秒）。観測時のAppStateは開始/完了ともactive。したがって **長時間background後のforeground自動同期は確認済みだが、background中の自動配送/silent push成功は未検証**。受信後の手動syncは行わず、検証用購読は解除した。省電力設定は記録できていない。Nativeがbackground中に取得済みだったかも、このJS観測だけでは断定しない。

### UIフェーズへの引き継ぎと残件

- 基本共有・実サーバー閲覧権限・代表的な競合/削除・退出/再参加・限定した個人データ保持は実機確認済み。UI設計・既存共有データの表示実装へは進める。ただし「全回帰検証完了」「リリース保証済み」とはしない。
- 残件：engine実送信permissionFailure後のreadOnly復旧、競合の逆順組合せ、Account切替/ログアウト、background配送。いずれもリリース前の最終QAで必須検証とする（オーナー指示）。追加ビルドなしで実施可能なケースから別途計画する。Account操作は専用環境の承認が前提で、未実施のまま完了扱いにしない。
- 個人予定4段階公開は上記の別CKShare/projection設計が前提。現在のFamilyGroup配下だけで実装しない。公開範囲UIの接続前に設計確定と否定テストが必要。
- 権限低下で取り下げた編集はUIで理由を伝える必要がある。現状は開発QA APIのみで、本格編集UIは未実装。
- QAグループ/検証データは削除承認なしに一括削除しない。証明書/APNs/KVS/App Groupを維持。Production deployおよび追加Nativeビルドは禁止のまま。
- 自動検証の最終実行結果は60 suites / 671 tests PASS、typecheck/iOS JS export/diff check PASS（コード`07905fb`）。本記録追加はMarkdownのみであり、実機成功を単体テストの追加件数として数えない。
