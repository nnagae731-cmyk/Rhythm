# 家族共有 CloudKit基盤

## 基準／対象範囲

最新mainをfast-forward取得して `17ffcc0`（変更前clean）を確認。`d6f235a` の580件に、その後の写真UI回帰3件を含む **58 suites / 583件**が現在の既存基準。個人データ移行、カレンダーUI、公開範囲設定、課金／Premium変更は行わない。commit/pushは今回行わない。

**リリースゲート：Nativeビルド未確認なので完了扱いにしない。別Apple IDの実機2台で招待→参加→同期まで通るまでは「家族共有の動作確認完了」としない。Phase Dは未完了。** 以下は実装内容とJS／設定検証の記録で、Native成功・通信成功の保証ではない。

納品は `Rhythm-family-sharing-foundation-WIP-after-17ffcc0.patch`。16ファイルに限定し、一時index上で17ffcc0への `git apply --check --whitespace=error` →実適用→現在ツリーとの一致を確認した。現在の作業ツリーには実装済みなので再適用しない。実際のGit index/HEADは変更しておらず、commit/pushしていない。別の同じ基準ツリーでのみ適用する。

## 構成・変更ファイル

- `app/modules/rhythm-family/{package.json,index.js,expo-module.config.json}`：既存local Expo moduleと同方式。
- `ios/RhythmFamily.podspec`：iOS 17、CloudKit/UIKit/CryptoKit、ExpoModulesCore。
- `ios/FamilyArchive.swift`：record address、secure CKRecord archive、LWW、atomic account別cache/outbox。
- `ios/FamilyStore.swift`：グループ／profile／予定／TODO CRUD、Private/Shared CKSyncEngine delegate、受け入れ、メンバー取得、退出／停止。
- `ios/RhythmFamilyModule.swift`：Expo bridge、システム共有UI、cold/warm招待入口、lifecycle/account/CloudKit通知。
- `app/features/sharing/{records.ts,familySharing.ts,debug.ts,README.md}`：型・検証・純粋判定、Native詳細を隠すAPI、opt-in開発コンソール。
- `app/plugins/with-rhythm-family.js`、`app/app.config.js`：entitlement、Info.plist、AppDelegate bridge、自動リンク。
- `app/index.js`：明示した開発環境だけconsole harnessをロード。本番画面・App.tsxに追加UIなし。
- `app/__tests__/qa-family-sharing.test.js`、本報告。

`features/sync/`、個人storage、PersistedState、STORAGE_KEY、Premium ID、既存Widget ID／色柄index、旧共有パケットの識別子は変更していない。追加レコードID・ローカル領域は共有専用。

## CloudKit設計（確定）

専用containerは **`iCloud.app.rhythm.daily.family`**。外部の実コンテナ作成・登録は永江さんが実施する。コードからApple Developerのリソースは作成していない。

1グループ＝オーナーPrivate DB内のcustom zone `rhythm-family-<UUID>`。固定recordName `group` のFamilyGroupをCKShareルートにする。全ての子recordに `parent = FamilyGroup` を付けたhierarchical share。参加者はShared DBから同じ階層を操作する。専用コンテナのPrivate DBに置くのは共有用グループだけで、既存の個人データではない。Public DBは使用しない。CKShare.publicPermissionはnone、共有UIは招待制／readWriteを提示。

採用は**レコード階層共有**。CloudKitの正式なCKRecord.parentをSharedEvent・SharedTodo・FamilyMember全てに設定する。独自groupIdだけで代用しない。ゾーン共有ならzoneの全レコードが共有対象になるが、階層共有では指定rootの子孫だけが対象で、将来zone内に補助レコードを置く場合も自動公開しない境界を維持できるため選んだ。とはいえ今回は1zone全体を共有専用にし、個人レコードを混在させない。

複数グループは独立zoneとして保持し、scope・ownerName・zoneName・recordNameの組を完全な識別子とする。異なるオーナーの同名recordやPrivate/Sharedを混同しない。退出・グループ削除のcache/outbox消去は同じzoneだけを対象にし、別グループや個人状態を巻き込まない。

| record type | fields（CloudKit型） |
| --- | --- |
| 全4種共通 | updatedAt(Int64, epoch ms)、mutationId(String UUID)、isDeleted(Int64 0/1) |
| FamilyGroup | name(String)、creatorId(String)、createdAt(Int64) |
| SharedEvent | title(String)、allDay(Int64 0/1)、時刻付きはstartAt/endAt(Int64 epoch ms)＋timeZoneID(IANA String)、終日はstartDate/endDateExclusive(YYYY-MM-DD String)、location/note(String)、creatorId(String)、creatorMember(Reference) |
| SharedTodo | title(String)、done(Int64 0/1)、completedBy(String任意)、creatorId(String)、creatorMember(Reference)、dueAt(Int64任意) |
| FamilyMember | userId(String)、displayName(String)、color(String #RRGGBB) |

予定/TODOのrecordNameはUUID。creatorMemberは同zoneのFamilyMemberを参照する。完了者は未完了→完了にした本人のCloudKit user IDを記録し、完了中のタイトル変更では上書きしない。再度未完了にすると解除。Nativeで現在のユーザーを判定し、JS入力のcreatorIdを採用しない。

時刻付き予定は絶対時刻と表示元IANA timezoneを保存。終日予定は開始暦日と終了暦日（その日は含まない）で保存し、epochや端末timezoneへ変換しない。UIフェーズでもこの暦日文字列をそのまま日付として扱い、`new Date(startDate)`で前日／翌日にずらさない。切替時は反対形式のfieldを消して混在を避ける。個人日時データは変更しない。繰り返し予定は未実装。将来は共有専用series ID・ルール・例外recordを追加する方針とし、個人repeat識別子を流用しない。

## メンバー名・色

CKShare.participantsのrole／permission／acceptanceStatusが実メンバーの正。pending／accepted／removed／unknownを区別する。Appleが招待中のuserRecordIDを開示しない場合はid/name/colorをnullで返す。人数や仮名を固定して埋めない。プロフィールが残っていても参加者一覧へ架空メンバーを足さない。

FamilyMember IDは `member-<SHA256(container-scoped userRecordID)>`。初期のオーナー名・色はcreateGroupの明示入力。参加者は初期取得後に名前空文字＋user ID由来の安定した色を保存し、後からsetProfileで本人が入力する。共有予定からcreatorId／creatorMemberを用いて色を解決できる。UIは空名を「未入力」として扱い、個人連絡先へのアクセスを要求しない。

閲覧のみの参加者はCloudKit側で書き込めないので、本人のprofile更新も拒否する。オーナーは `setMemberProfile` で**実際のCKShare参加者IDに限って**名前・色を割り当てられる。pending等でIDが未開示の場合は割り当てずnullのまま。メールアドレス、電話番号、連絡先、自宅住所、個人移動設定や個人通知設定を共有recordへ保存しない。

重要な権限境界：CKShareのreadWriteは共有階層全体の編集権限であり、FamilyMemberを本人しか変更できないというサーバー側フィールドACLではない。このクライアントのsetProfileは本人だけを編集するが、改造クライアントによる他プロフィール編集まで防ぐ認証システムではない。将来「本人だけ編集」を厳密に要求するなら別の信頼境界が必要。

TS snapshotではcreatorMemberのrecordNameをfields.creatorMemberIdとして公開する。creatorId／FamilyMember.userIdとの対応も利用できる。CKShare参加者のメール等はモデルへ保存・転送しない。

## 同期・競合・削除

Private/Shared各DBにCKSyncEngineを1つずつ作成。stateUpdateをaccount別atomic archiveへ保存し、fetched zone／record変更、送信ACK、競合、削除、account変更を処理する。起動・foreground・CloudKit silent push・明示syncで取得／送信する。Appleの自動タイミングは非即時。

共有の変更は **outboxをディスクへatomic保存してから** engineへpending変更を登録。checkpointより先にプロセスが終了しても、次の初期化時にoutboxからpendingを再構成する。ACKが届くまでpendingを維持し、送信中に新しいlocal変更があれば旧ACKで消さない。サーバーCKRecordのsystem fieldsを更新して再送する。account切替時はengineをcancelしてメモリを分離し、account hashの別ファイルを使用する。旧accountの未送信変更は旧ファイルに保持し、新accountへは送信しない。

ログアウト・account変更時は共有メモリ／engineを破棄し、旧accountのdisk fileはアクセス不可のaccount別隔離として残す（未送信変更を勝手に捨てない）。同じaccountへ戻り権限を確認できた時だけ再利用する。cache/outboxは再取得可能な共有用領域としてiCloudバックアップ対象から除外しており、端末紛失時に未送信操作まで復元する保証はしない。共有解除／退出確認時は当該zoneのrecordとoutboxをdiskから消し、名前等を含まないaccess状態（left/revoked/stopped）だけ保持する。

CloudKitのrecordChangeTagを含むCKRecordをsecure archiveし、CKSyncEngineの楽観的並行制御で送る。タグ不一致のserverRecordChangedを処理し、最新server tag/system fieldsに勝者のfieldを載せて再送する（server tagが無い競合recordは拒否）。updatedAtだけでサーバー更新の正当性を決めたり、タグを無視した無条件上書きをしない。実際に競合したlive record同士の解決はupdatedAt、大きさが同じならmutationIdの辞書順。localの連続変更は前の時刻＋1以上にする。端末時計ずれの補正・フィールド単位マージは行わない。

予定/TODO削除はisDeleted=1のtombstoneを同期し、snapshotでは非表示。**削除優先（remove-wins）**とし、時計が進んだ編集であっても同じIDの削除を復活させない。削除済みIDを更新APIで再利用することも拒否する。新たな予定は新IDで作成する。tombstoneは勝手に期限削除せず、グループ削除まで保持（将来の圧縮は別設計）。物理削除／zone削除も取得し、unknownItemでは復活させない。

内部状態はsnapshotの `syncStates`（record address／synced・pending・failed／errorCode）と `pendingCount`、`access`（role／permission／status／checkedAt／verified）で区別。失敗をACK扱いせず、transient失敗はoutboxを保持しengine／次回syncで再送する。permissionFailureは対象zoneのcache/outboxを消し、engine checkpointをリセットして再取得する。readOnlyへ変わった際は送信待ちの楽観的変更を取り下げserver値を再取得する。永続的な権限問題のユーザー向け解決UIは後続。

verifiedは「最後に確認した権限が有効だった」という意味で、現在オンライン照会が成功したことや即時失効保証ではない。失効確認後の遅延fetchでcacheを復活させず、再参加は有効な招待を再受諾／再取得する。送信は1zone・最大100件のatomic batchに分割し、メンバー参照を先行させる。重なったsync要求は同じTaskをawaitし、招待受諾中の追加要求も次のfetchへ反映する。engine delegate内で自分のcancel完了を待ってdeadlockしないよう、古いengineの取消は切り離して行う。

退出：参加者が自分のShared DBのCKShareを削除するpendingを保存。オーナーのstopGroup：専用zone削除をpendingとして保存する。どちらも対象グループの未送信編集は取り下げて非表示にし、Cloud確認後に共有cacheから除去する。通常の個人状態・別グループを削除しない。システム共有UIで共有停止が成功した時も、オーナーならグループ削除をqueueへ追加し、参加者なら退出済みとして当該cacheを消す。

offline編集は一度account／グループを初期取得した後に可能。再起動後もoutboxは残る。ただしcold launch時にiCloud account／userRecordIDを検証できない環境では、安全上、共有APIは検証ができるまで利用不可とする（別accountへ送信しないため）。グループ初回作成・招待作成／受け入れ・最新メンバー取得はonlineが必要。共有ディスクの破損や書込不能時は共有のみfail-closedで、既存ファイルを初期化しない。

**オーナー決定：オフライン利用に時間制限を付けず、次回接続時に失効を反映する。** 最後に確認したaccepted/readWriteまたはreadOnlyの範囲だけ利用可能。offline中に他端末で共有停止しても、その通知が届くまでは閲覧・編集を即時停止できない。次回接続でroot/share/currentUserParticipantを再検証し、失効ならcacheを非表示・消去、readOnlyなら編集を止める。UIフェーズでもこの限界を隠して即時遠隔消去を保証しないこと。

## 招待・起動

createGroupはzone/root/CKShareを保存し、UICloudSharingControllerへ既存shareを渡す。別Native modalが出ている場合は重ねずエラーを返す。既存シートを閉じてからpresentInviteを呼ぶ。

`CKSharingSupported=true` によりAppleの招待URLからアプリに受け入れmetadataが渡る。Expo SDK54のAppDelegateは当該メソッドを転送しないので、pluginが `application(_:userDidAcceptCloudKitShareWith:)` を追加。container ID一致を確認→CKShare受け入れ→Shared DB初期取得を行う。明示API acceptURLも同じ経路を使い、httpsのicloud.com/share/だけを受け付ける。通常のLinking／通知リスナーは変更しない。現在のnon-scene AppDelegate構成に限定し、将来SceneDelegateへ変える場合は明示対応が必要。

cold launch／起動中／復帰時とも同じNative actorへ渡す。pendingは受諾、acceptedは再取得だけ、removed/unknownは拒否する。招待からcreateGroupを呼ばず、CloudKitの既存zone/root IDへupsertするので、同じ招待を開き直してもグループを複製しない。受諾後に初期fetchが中断しても、利用済みフラグとengineが次回起動／復帰で再取得する。

## 永江さんがApple側で行う手順（全て未実施）

1. Apple DeveloperのIdentifiersでiCloud container **iCloud.app.rhythm.daily.family** を作成。同じTeamでApp ID **app.rhythm.daily** のiCloud CloudKitへ割り当てる。既存のKey-value storage、App Group **group.app.rhythm.daily**、Widget設定を外さない。
2. App IDのPush Notificationsを有効にする。Development／Distribution provisioning profileを更新する。EAS capability同期に任せきりにせず、生成されたprofileと署名entitlementsでcontainer、CloudKitサービス、aps-environmentと既存KVS/App Groupの共存を確認する。
3. Mac/XcodeまたはEASで新しいDevelopment Buildを作る。iOS17以上。Expo Go／旧バイナリにはこのmoduleはない。pluginはAppDelegate生成も含むため、OTA JS更新だけでは有効にならない。
4. CloudKit ConsoleでDevelopment環境を選び、開発用グループ／予定／TODOを作って上記4種類とfieldsを作成・確認する。Public DBへデータを登録しない。schema作成は本作業環境では行っていない。
5. 開発用実機2台（**別Apple Account**）で後述の試験。両方とも同じcontainer・同じDevelopment環境のビルドを使う。
6. 公開前にDevelopment schemaをProductionへdeployし、Distribution/TestFlight同士で再試験する。DevelopmentとProductionを混ぜて配送確認しない。作成したschemaや本番データを不用意にresetしない。

追加設定：`com.apple.developer.icloud-container-identifiers=[iCloud.app.rhythm.daily.family]`、`com.apple.developer.icloud-services=[CloudKit]`、`aps-environment`（developmentを既定、Distributionでは署名設定に対応）、Info.plist `CKSharingSupported=true`、`UIBackgroundModes`へremote-notification、Podfile target iOS17以上。既存配列はunionし、KVS entitlementには触れない。config introspectionで既存KVS/App Groupと共存、自動リンクでRhythmFamilyModule／RhythmFamilyLifecycle／既存WidgetとExpoCloudSettingsを検出できた。

## 開発用の最小確認手段

Nativeを含むDevelopment Buildで `EXPO_PUBLIC_RHYTHM_SHARING_DEBUG=1` を設定してMetro起動／JS bundle再作成する。React Native DevTools Consoleのapp実行contextから利用する（LLDBのSwift consoleではない）。本番ビルドではharnessを公開しない。実メンバー名・予定本文はconsoleへ不用意に出力しない。

```js
const f = globalThis.rhythmFamily;
await f.availability();
await f.initialize();
const created = await f.createGroup('試験グループ', '本人が入力した名前', '#6488aa');
// okを確認してからvalueを利用する。failedは個人保存の失敗ではない。
const group = created.ok ? created.value : null;
await f.presentInvite(group); // 共有先をシステムUIで選ぶ。先に既存modalを閉じる。
const watch = f.subscribe(async () => { /* 必要ならsnapshotを再取得、私的本文はlogしない */ });
await f.sync();
const snapshot = await f.snapshot();
await f.members(group);
await f.setProfile(group, '本人が入力した表示名', '#7389bb');
const event = await f.saveEvent(group, { title: '試験予定', startAt: Date.now(), endAt: Date.now() + 3600000, timeZoneID: 'Asia/Tokyo', allDay: false });
const holiday = await f.saveEvent(group, { title: '終日試験', allDay: true, startDate: '2026-12-31', endDateExclusive: '2027-01-01' });
const todo = await f.saveTodo(group, { title: '試験TODO', done: false });
// 更新はsnapshot内のrecordNameをinput.idに指定する。
await f.saveTodo(group, { id: todo.value.recordName, title: '試験TODO', done: true });
await f.removeRecord(event.value);
watch.remove();
// 参加者側は自分のsnapshotからscope:sharedのFamilyGroup addressを得る。
// await f.leaveGroup(participantGroup);
// オーナー専用、グループ全体の破棄：await f.stopGroup(ownerGroup);
```

サンプルのvalue参照は事前に各result.okを確認する。別端末にgroup addressをそのままコピーしない。owner名・scopeが異なるので、各端末のsnapshotから選ぶ。参加者Bは届いたURLをタップ（cold/warm両方）する。手動確認には `f.acceptURL(actualCloudKitURL)` もあるが、メール等の実招待を通す試験の代替ではない。

## 検証と実機確認

**全件PASSの完了条件は未達。** 追加共有テスト63件は全PASS。現在の全体は **59 suites / 646件中645 PASS、1 FAIL**（127.786秒、skipなし）。失敗は既存 `qa-wish-task-app.test.js` の「Native完了の保存中にWish側で取消しても古い完了を再適用せず最新状態の保存後にACKする」（280行、完了falseを期待したがtrue）。Phase B全体でも同じ1件が2回失敗した。

一方、現在ツリーでのWish19件単独はPASS、変更前17ffcc0の一時コピーも58 suites / 583件全PASS（134.987秒、pnpm補助依存のmodulePathsを指定）だった。関連するApp.tsx・WishScreen・個人storage・KVS・既存Wishテストに差分が無いことをGitで確認したが、これだけで原因が既存側／共有側のどちらかと断定しない。タイミング／実行条件を含む原因は未確定。個人保存変更禁止のため、その処理やテスト期待値を変更して通してはいない。**この失敗を別途切り分けるまで全件PASS維持とは報告しない。** 診断用のtestNamePattern/forceExitは一時コピーの比較にだけ使い、最終全体をskipやforceExitで通していない。

`pnpm typecheck` PASS、`npx expo export --platform ios` PASS（Hermes bundle 4.36MB）、`git diff --check` PASS。config introspectionでCloudKit/KVS/App Groupの共存とCKSharingSupportedを確認。Expo autolinkingでRhythmFamilyModule/RhythmFamilyLifecycleと既存Native moduleを検出した。

追加63件はレコード変換4種、不正入力、LWW／同時刻／削除優先、zone/scope識別、終日暦日とIANA timezone、招待状態と重複受諾の判断、権限／offline方針、URL制限、module不在／未ログイン／Native失敗、Native引数／profile、snapshot拒否／重複検出、不要なメールの除外、entitlement共存、AppDelegate bridgeの冪等性・既存処理維持、個人保存からの分離を検証する。Nativeコードに必要な接続があるかを見るソース契約チェックも含むが、**Swift実行や実サーバー成功の試験ではない**。

内部チェックポイント（追加指示到着時点でA〜C初期実装は統合済みだったため、各時点の統合ツリー全体を検証）：

| 区切り | 型チェック | 全Jest | 判定 |
| --- | --- | --- | --- |
| Phase A 設定・型・レコード再確認 | PASS | 59 suites / 637件PASS（128.754秒） | Native接続／作成は未確認、Phase完了とはしない |
| Phase B 招待・権限・停止 | PASS（Wish単独再確認と併せ独立実行） | 643件中642 PASS、既存Wish1 FAIL。再実行も同じ | 未達 |
| Phase C 同期・queue・削除の最終 | PASS | 646件中645 PASS、同じWish1 FAIL | Native同期未確認、未達 |
| Phase D Native／実機／リリース | JS export・設定検証のみPASS | 下記Native／実機は未検証 | **未完了** |

iOS prebuildも一時コピーで試みたが、WindowsではExpo CLIがiOS生成をskipし `At least one platform must be enabled when syncing` で終了した。元の作業ツリーにios生成を行わず、Mac/Linux制限を偽装して回避していない。AppDelegateはpure patch関数のSDK54型fixtureで検証したのみで、生成済みNativeプロジェクトによる検証は未実施。Native compileと通信はどちらも未検証として分ける。

実機は以下全て **未検証**。WindowsのためNativeコンパイル、iOS simulator、実機ログイン／配送は実施していない。

1. Macでprebuild後、生成AppDelegateにbridgeが1つだけ入り、従来URL処理・Expo delegate・Widget・KVSが残ることを確認。CocoaPods／Xcode Native compileと署名確認。
2. AがcreateGroup→presentInviteからBへ招待を送り、pending→accepted、B cold/warm launchの受け入れ、初期fetch、profile設定、A/Bのメンバー表示名・色・人数を確認。
3. A/Bで予定とTODOを追加／変更、完了／再開、削除し、fetch／push後のsnapshotが一致することを確認。第三者Cにはレコードが見えないことも確認。
4. 同じ共有itemをA/Bがoffline編集し、recordChangeTag競合→serverRecordChanged→live同士の時刻／同時刻tieの勝者が一致することを確認。offlineで削除→古い編集や時計が進んだ編集でも同じIDが復活しないこと、アプリ終了・再起動後のoutbox保持、online復帰後ACK／pendingCountとsyncStatesの変化を確認。
5. Bの退出→A側participants、AのstopGroup→Bのzone消失、権限解除中の送信失敗、再招待、別グループ・個人データが変わらないことを確認。Native共有UIの取消／Done後に再度招待を開けることも確認。
6. iCloud未ログイン／account切替／CloudKit不可／Native module不在／Androidで個人Todo・保存・KVS・Widgetが従来どおり動くことを確認。旧accountのoutboxを別accountへ送信しないこと、ディスク障害／破損cacheが共有のみを止めることを確認。長時間offlineでも利用でき、次回onlineで失効が反映されることを確認。閲覧のみの参加者が編集できず、オーナーが実参加者IDにprofileを割り当てられること、A/Bのtimezoneが異なっても終日暦日が動かないことも確認する。
7. Production schema＋TestFlightで2台別Apple Accountの招待・参加・同期・offline再送を再確認する。Developmentだけの成功を公開版保証にしない。

## UIフェーズへの引き継ぎ／未実装

カレンダー改修、共有編集画面、member filter、招待の説明／確認UI、権限失敗／pending送信の表示、profile未入力案内、繰り返し、退出／グループ削除確認ダイアログは未実装。本番には動かない共有ボタンを増やしていない。`FamilyResult` のok/codeを扱い、Native modalを閉じてから招待を提示すること。

個人予定の将来公開：既存個人レコードをCloudKitへ移すのではなく、明示した公開操作で共有側にprojectionを作る。非公開＝projectionなし、予定ありのみ＝時刻と匿名タイトルだけ、詳細まで＝選択した詳細のcopy、共同編集＝共有recordを編集元にする方式を別設計する。個人IDを公開IDに流用せず、別namespaceの対応表を共有専用ローカル領域に置き、公開解除は共有projectionへ削除を送る。KVS同期を共有の通信路にはしない。今回はこのprojectionも実装していない。

## リリースへの影響

Native追加・CloudKit／Push capability・Production schema deploy・profile更新が必要。最低iOS17は既存Widgetと同じで、Widgetを無効化した構成でも共有moduleはiOS17を要求する。OTAのみでは配布不可。App Review向けに2アカウントでの共有確認手順を用意し、共有相手に予定／TODO／プロフィールが見えることをプライバシー表記へ反映する。App Privacyの申告は実際のデータアクセスに基づいて再確認し、本変更だけで免除・E2E暗号化済み等とは主張しない。Apple側手続き・実機検証前に本番共有機能として公開しない。

一次資料：[CKSyncEngine](https://developer.apple.com/documentation/cloudkit/cksyncengine-5sie5)、[Shared Records](https://developer.apple.com/documentation/cloudkit/shared-records)、[UICloudSharingController](https://developer.apple.com/documentation/uikit/uicloudsharingcontroller)、[Expo AppDelegate subscribers](https://docs.expo.dev/modules/appdelegate-subscribers/)。
