# 写真まわり最終パッケージ

## 基準とオーナー決定

- 着手HEAD `28ed081`、作業ツリーはclean。420件の既存テストから開始。clone/reset/旧パッチの再適用は行っていない。
- 旧方式はリリース前のため廃止するオーナー回答に従った。旧永久解放/枠数は互換読込・データ保持だけに残し、利用権には使わない。写真URI・cropは消さない。
- commit/pushは行わない。HEADのまま適用できるbinary付きパッチを納品する。

## 解放・期限

- Premium / StoreKit Design Customize購入者は広告なし・期限なし。PersistedStateの購入ミラーだけで権利を付与しない。
- premiumDesign / premiumDesignTrialExpiredは1広告で72時間、Widget写真は1広告で3日。無料試着24時間、Wish/行動/Calendar/Skip消費型の必要回数は維持。
- photoTop / photoBackground / photoFocusは各枠独立の進捗・期限。ホームを解放しても集中背景は未解放。EARNED1回目でsampleUnlocked、2回目でpersonalUnlockedUntil（2回目のEARNED日時＋72時間）を保存し、個人写真の進捗は0へ。
- 個人写真の期限後は再び0→1→2回。サンプル解放は残る。別targetの広告は合算しない。旧共通photoAccessは利用権に変換せず保持する。新規receiptはphotoTargetを保存する。対象を特定できない旧photoTop receiptは他枠へ推測付与せず保持する。Design広告や24時間無料試着を、個人写真の利用権へ横流ししない。
- Rewardedの既存保存キー・versionを維持し、任意のphotoAccessByTargetを追加。receipt journal・二重付与防止・保存リトライの機械部は維持。リトライ日時で期限を延長しない。
- シートの「写真を再解放する」は保存済みURI/cropを戻すだけで、picker/cropを再表示しない。別写真への通常変更は既存pickerへ進む。
- 期限切れは表示用のphotoThemeコピーでURIを隠すだけ。保存されたURI/crop/sample種別に書き戻さず、再解放で復帰する。
- 残り期間は「写真を添える」シートの上部。購入者は「購入済み・期限なし」、個人写真利用中は「この枠の自分の画像：残りN日」、それ以外はサンプルと個人写真の解放条件を表示する。

## サンプル・画像種別

- 添付順にflowers/sky/sea/cafe/cat/dog/textureの7枚をapp/assets/photo-samplesへ無加工で同梱。添付と同梱ファイルのSHA256が7枚すべて一致。
- PhotoThemeSettingsの任意samplePhotoIdsでtargetごとの種別を識別。旧データや未指定は個人写真として扱う。保存キー・PersistedStateの既存フィールドやversionは変更しない。
- 同梱サンプルは端末の写真許可を要求せず、管理写真フォルダへ原本をコピーしない。画像IDから現在のbundle URIを起動時に再解決し、アップデートでbundleの位置が変わっても復元できるようにする。
- 開発用Metroのhttp(s)素材URLは、再調整時だけ既存Expo FileSystemのcacheへ取得してからiOS ImageManipulatorへ渡す。リリースのローカルbundle URIはそのまま使う。管理写真フォルダや原本には触れず、期限/cleanup条件も変更しない。
- 新しいシートの7サムネイルからサンプルを選ぶと、そのまま適用。トップの再調整は既存cropへ接続し、切り出し結果だけを既存管理ファイルとして保存する。同梱原本は削除しない。
- 個人写真への置換時はsample markerを解除。サンプル再調整ではmarker・原本参照を保持する。

## 設定成功・Photo切替

- 共通pickPhotoThemeで全体背景のファイル保存・参照更新が成立した操作だけ、Photoへ切替。サンプル背景も対象。初期化・起動時に一律でPhotoへ移行しない。
- Mono Light/Dark/Designの元の色・柄・appearanceは変更しない。トップ/集中の設定はモードを変更しない。集中写真も現在のモードのまま表示可能。
- キャンセル・写真許可拒否・ファイルコピー失敗・保存先ファイルの確認失敗では写真もモードも変更しない。picker/crop待機中に権利が失効した場合も最新の権利で再確認する。
- 写真とモードのsetterを同じ成功経路で更新し、既存root snapshot/80ms queueで一緒に保存する。別の保存キーや保存経路は作らない。root保存失敗時は従来の未保存警告と再試行を維持する（ファイル保存失敗とは区別）。
- Settingsの無料プレビュー選択・試着UIは維持し、正式適用の共通処理にも同じ新写真gateを置く。プレビューだけで個人写真を正式設定できる抜け道は作らない。
- 「背景を外す」は既存Settingsの処理を維持し、Photoモードを変更しない。

## Native復帰とトップ解除

- 以前はphotoTopだけがRewardedシートの終了後にpickerへ復帰していた。背景/集中にも同じdismiss経路を適用し、Native modalの重なりを避ける。
- 設定のPhoto試着から正式適用する場合も、試着案内をNative dismissしてから写真解放の案内を開く。既存のdesignTrialAfterDismissRefを使い、画面構成や選択UIは変えない。
- 解放直後の二度押しでは、広告開始側でも現在の利用権を確認し、余分な広告を開始しない。
- 以前の背景/集中の継続callbackは、広告前のrewardedAccessを参照し再び広告案内になりえた。最新のpicker/adjust callbackをrefから呼び、保存済みの最新権限を使う。
- 新シートのトップ4枠だけに「トップ画像を外す」。シート終了後に「このトップ画像を外しますか？」、説明「写真はこの画面からのみ外します。」、キャンセル/外すを表示。
- 確定時は選択targetのtopImageUris / topImageOriginalUris / topImageCropRects / topImageAdjustments / samplePhotoIdsだけを解除。モード、他の枠、全体/集中背景、購入・広告期限は変えない。
- ファイルの即時削除はしない。既存の参照保護・次回起動時の安全なscan/cleanupを維持する。端末ライブラリ・同梱資産は削除対象ではない。
- 新シートには全体/集中背景の解除ボタンを出さない。Settingsに従来からある解除UIは、画面構成維持の制約どおり変更していない。

## 変更ファイルと理由

- App.tsx：表示gate、枠別広告進捗/完了判定、Native復帰、正式背景適用、metadata復元、シート配線。
- types.ts：任意sample IDのみ。
- features/ads/rewardedAccess.ts・rewardedAccessLogic.ts・rewardedAccessStorage.ts・earnedRewardStorage.ts：3日ルール・枠別写真進捗・互換読込・同じreceiptによる付与。
- features/photo/usePhotoTheme.ts：共通gate、サンプル選択、背景成功時のモード、最新callback、sample再調整。
- features/photo/photoAccess.ts・photoSamples.ts：権利/残日表示、同梱registry、表示用コピー、安定URI復元、参照解除。
- components/PhotoEntry.tsx：サンプル/個人画像の区別、残日数、トップだけの確認解除。
- components/DesignCustomizeModal.tsx・DesignModals.tsx・WidgetSettingsCard.tsx：新期限・写真条件と一致する文言。
- assets/photo-samples/*.jpg：支給7枚。
- features/photo/README.md・features/ads/README.md・本書：最新仕様と旧ルール廃止の記録。

SettingsScreen / PhotoThemeSettingsCard / TopImageCropModal / persistentPhoto / useRhythmPersistence / rhythmStorage / premiumAccessは実装差分なし。設定の写真タブの構成・操作部品、cropのジェスチャー/座標/画像処理、ファイル管理・保存キュー・Premium IDは維持。

## テスト

- 新規qa-photo-final-package.test.js：枠別進捗・全6枠間の分離・旧共通権利の無効化、期限境界/再解放、旧フラグ無効、非破壊表示、receipt復旧、全4トップ解除、保存失敗/再試行、背景/集中の対象外、Native確認順、7同梱素材。
- qa-photo-theme-hook.test.js追加：3モードからの成功、cancel/denied/write-failed/unavailable、トップ/集中のモード維持、最新権限での継続、サンプル、旧権限/bypass拒否、picker中失効、サンプル再crop。
- qa-photo-entry-app.test.js追加：本番Appの背景/モード復元・元の色柄保持、解除のキャンセル/確定・他枠・再起動・再設定、失効後の再解放復帰、サンプル1回のNative終了後適用と背景自動切替、設定のPhoto試着→Native終了→写真2広告→正式適用。
- 既存写真テストは「1広告1枠/既存写真の無広告変更/背景と集中の永久解放」の期待を、指定された各枠1回/2回の新ルールへ変更。CLOSEDだけでは無効、保存失敗保護、crop/他データの維持は残す。
- 既存Design広告の表示文字列と12時間の期限assertion、Widget7日間の付与assertionを3日間へ更新。Wish/Calendar/Skipの消費数assertionは維持。テスト削除・skip追加なし。

枠別化後の検証結果は末尾の追記を参照。未コミット・未push。

### 枠別化後の最終検証

- 全Jest：50 suites / 458件全PASS（161.657秒、skipなし、基準420件＋38件）。
- pnpm typecheck：PASS。
- iOS JS export：PASS（1,177 modules / 4.28MB / 35 assets）。Native実機の広告表示は未確認。
- git diff --check：PASS。binary付きパッチは一時indexでstrict check・実適用し、作業ツリーと一致することを確認。
- 旧共通解放版の納品パッチは本版へ置き換える。重ね適用しない。commit/pushなし。

一度、exportと並行した全体実行で既存の関連メモdarkケースの1秒待機が失敗した。単独再実行および最終の全体実行ではPASS。メモ機能や当該assertion/timeoutは変更せず、最終検証はテスト→型チェック→exportの順で実行した。

## 残る実機確認

枠別化後も、実機でホームを解放した直後に集中背景を開き、別の広告進捗になることを確認する。Jestでは全6枠の相互独立、背景1回→集中0回、ホーム2回→予定0回、サンプルも各枠で1回必要なことを検証済み。

1. 本物のEARNED/CLOSEDイベント、広告シート→サンプル/picker/cropのNative終了順（iOS/Android）。JSテストはNative境界をmock。
2. 添付7枚の見え方、特に背景用の質感とバナーの高さ/余白。サムネイルの操作性・文字拡大・シートスクロール。
3. 実ファイルのコピー・再起動/アップデート後のbundle解決・サンプル再crop。
4. StoreKit購入/復元後の実機権限、3日経過・background復帰時の非表示/再解放、容量不足での警告/リトライ。
