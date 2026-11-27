# App.tsx 分割メモ

## 目的・コンセプト

「1日の生活全部を、自分の好きなデザインと写真で、ひとつの場所に」。
TODO・予定・習慣・目標・集中・記録を一元管理し、好きなデザインと写真で使える体験を維持する。
今回の分割は挙動・画面・保存形式を変えず、コードの置き場所だけを整理する。

## 基準と不変条件

- 基準：main `4d326deac42de4759cccfa8cd771c8bca882c3a1`。適用前は307件PASS。
- PersistedState、保存キー、保存形式、Premium境界、Widgetの色・柄indexは変更しない。
- default App、DesignTryOnModal、FloralPatternDecorのexport面を維持する。
- 挙動の違う重複実装を統合しない。
- 分割後も既存の花柄読み込み・フォールバック動作を維持する。

## 今回適用した範囲

1. 完了フィードバック・音・触覚 → `app/features/feedback/completionFeedback.ts`
2. デザイン素材・選択肢 → `app/features/design/designAssets.ts`
3. 予定競合・出発時刻 → `app/features/schedule/scheduleConflict.ts`
4. 地図検索 → `app/features/departure/mapSearch.ts`
5. レビュー判定 → `app/features/wish/wishUtils.ts` に追加
6. 柄の装飾 → `app/components/PatternDecor.tsx`
7. Mono背景 → `app/components/MonoBackgrounds.tsx`

新規6ファイルは、共有された更新パッチ記載のGit blobハッシュと一致する。
`require`の相対パスを調整し、FloralPatternDecorはAppから再exportする。
移動後にAppへ残る74個の非import/export文は、移動前とテキスト一致を確認した。
日付関数の再利用先4関数も移動元と同じ内容である。
App.tsxは8,242行から7,815行（改行を含む数え方・移動跡の空行を保持）。

## 検証

- [x] 新規6ファイルのハッシュ一致、既存App本体の宣言不変
- [x] `pnpm typecheck`
- [x] iOS向けJS export（Nativeコンパイル・実機確認とは別）
- [x] 全Jestテスト：35 suites・307件PASS、0件FAIL
- [ ] iPhoneでMono / Design / Photo、予定、分析、Wish、Focusの表示と操作

## 関連メモの整理について（分割とは別件）

分割後、ユーザーから「サブタスクは関連メモとして表に出して扱う想定」と仕様の確認があった。
単なる位置変更案は中止し、別変更としてTaskModalの入力を既存の関連メモへ接続した。
旧サブタスクは文章・チェック・順序を保持して既存メモへ引き継ぐ。詳細は`app/features/tasks/README.md`を参照。
分割単体は307件PASS確認済み。メモ変更後の全体結果は下記の最終確認へ記録する。

## Phase 3A：土台と小物部品（2026-11-27）

関連メモ修正後のLOCAL・316件PASSを基準に、共有パッチを重ねて移植した。
古いApp.tsxやこの文書への置き換えはしていない。

- 色定数 → `app/styles/colors.ts`
- 日付・時刻 → `app/features/schedule/dateTimeUtils.ts`
- 繰り返し・完了収集 → `app/features/tasks/repeatUtils.ts`
- デザイン視覚ヘルパー → `app/features/design/designVisuals.ts`
- 予定内タブ → `app/components/TimeTabButton.tsx`
- カレンダー目印・予定操作 → `app/components/CalendarMarkPicker.tsx`
- 数値設定・テーマカラー選択 → `app/components/SettingsControls.tsx`

App.tsxは7,816行から7,450行（LF改行数、366行削減）。
7ファイルは共有パッチのGit blobハッシュと一致する。
残った36個の非import/export文・再exportは移動前とテキスト一致。
関連メモの登録・引継ぎ・競合対策・テスト、保存キューとキー、課金境界等の既存19ファイルのハッシュも不変。
既存の`taskUtils.ts`等にある別実装との統合は行っていない。

### Phase 3Aの検証

- [x] 移動先7ファイル・残ったAppの処理・既存LOCAL差分の保護を機械確認
- [x] 全Jest：36 suites・316件PASS、0件FAIL（追加・削除なし）
- [x] `pnpm typecheck` PASS
- [x] iOS向けJS export PASS（Nativeコンパイル・実機確認とは別）
- [x] `git diff --check` PASS
- [ ] iPhoneで小さい画面・文字拡大・テーマカラー選択・予定タブ・カレンダー目印を最終確認

Reactレビュー：小物部品のHooks順序・初期化とイベント処理は移動前の原文を保持。
default App・DesignTryOnModal・FloralPatternDecorのexportを維持し、デザインやUI文言の変更は行っていない。

## Phase 3B：デザインモーダル・今日の達成・柄選択（2026-11-27）

- 最新LOCALの宣言をそのまま `components/DesignModals.tsx`、`components/TodayWinStrip.tsx`、`components/ChicPatternSelector.tsx` へ移動。
- App.tsx：7,472行 → 7,073行（既存の関連メモ・行動削除修正を維持）。
- DesignTryOnModalはApp内部へimportし、Appからの再exportも維持。FloralPatternDecorとdefault Appのexportは変更なし。
- 移動した8宣言の本文一致（export付与を除く）、移動前から存在したApp以外のファイルのハッシュ一致を確認。
- 全Jest：36 suites・324件PASS（追加・削除なし）。型チェック・iOS向けJS export・diffチェックPASS。
- Reactレビュー：Hooksの順序・初期値・依存配列・JSX・ハンドラ・スタイル値を変更しない。不要なimportだけ移動先へ持ち込まない。

## Phase 3C：Focus・予定・お知らせ等（2026-11-27）

- `components/modalPalette.ts`：モーダル共通の型・スタイル土台。
- `components/FocusModeView.tsx`：Focus表示、候補抽出、完了ダイアログ。共有Contextと既存controllerの接続は維持。
- `components/ScheduleCalendar.tsx`：日別タイムライン・予定カレンダー・フィルタ。Free/Premium制限は変更なし。
- `components/NoticeModals.tsx`：お知らせ・明日の準備。
- `components/SettingsDisclosure.tsx`、`components/AchievementVessel.tsx`：設定開閉・達成表示。
- App.tsx：7,073行 → 6,448行。移動後に残った古い説明コメントと末尾の空行も整理。
- 移動19宣言の本文（export付与を除く）と、Appに残った全処理のハッシュ一致を確認。既存App以外のファイルは移動時点で変更なし。
- 全Jest：36 suites・324件PASS（追加・削除なし）。型チェック・iOS向けJS export・diffチェックPASS。
- Reactレビュー：Hooks順序・初期化・依存配列・Context・イベント処理・アクセシビリティ属性を原文のまま維持。
- iPhoneでのタイマー継続、カレンダー操作、Nativeモーダル表示は最終確認が必要。commit・push・EAS Buildは未実施。

## Phase 4-1：モジュールレベルの残り（2026-11-27）

- 通知許可・カテゴリ設定・アファメーション通知 → `features/notifications/notificationSetup.ts`。
- 出発通知アクションの型・一覧 → 既存の `features/departure/departureNotifications.ts` へ追加。
- crop初期値 → 既存の `features/photo/topImageCrop.ts` へ追加。
- お知らせ初期値 → 既存の `components/NoticeModals.tsx` へ追加。
- `Notifications.setNotificationHandler` の登録はAppに残す。通知許可のタイミング・カテゴリID・旧PREPARED互換・crop計算は変更なし。
- App.tsx：6,448行 → 6,374行。6宣言・Appに残った処理・移動先の既存宣言の一致を確認。
- 全Jest：36 suites・324件PASS（追加・削除なし）。型チェック・iOS向けJS export・diffチェックPASS。Nativeの通知許可・配信・写真cropの実機確認とは別。
- hook化はこの移動とは別段階。保存形式・保存キュー・失敗再試行を維持し、写真のstate・永続化・掃除との関連を調べてから着手する。

## Phase 4-2：写真選択・crop操作のhook化（2026-11-27）

- `features/photo/usePhotoTheme.ts`：cropの一時state/ref/effectと写真選択・再調整・確定を移動。
- App.tsx：6,374行 → 6,187行。移動13宣言の本文・依存配列と、App内の残りの文の一致を確認。
- 写真設定本体・全体保存・hydration・起動時掃除・モーダル配線はAppに維持。写真全体の永続化責務をhookへ移したわけではない。
- 全Jest：37 suites・329件PASS（既存324件＋hook回帰5件）。型チェック・iOS向けJS export・diffチェックPASS。
- Reactレビュー：無条件のhook呼出し、初期値、refによる二重実行防止、最新設定のfunctional setterを維持。保存やNative処理の仕様変更は行わない。
- iPhoneの写真選択→crop→確定→再調整、報酬/購入画面からの復帰、再起動後の写真表示は実機で最終確認する。

## 次の分割候補（Phase 5以降）

カレンダー等のUI部品、写真・音声・広告・Wishのドメインhook、保存・復元hook。
次は保存・復元hook化を候補とするが、読込・保存キュー・失敗リトライは別段階で検証する。Phase 4-2は未コミット・未push・EAS Build未実施（Phase 4-1まではmain `9fc8e76` にpush済み）。

## メモ整理後の最終確認（2026-11-27）

- 全Jest：36 suites・316件PASS、0件FAIL（既存307件＋追加9件）。
- `pnpm typecheck`：PASS。
- iOS向けJS export：PASS。iOS Native Build・実機描画の確認とは別。
- `git diff --check`：PASS。
- 既存の保存キュー・保存キー、Widget/Live ActivityのJS/Swiftデータ形式、Premium境界のファイルは変更なし。
- Reactレビュー：Hooksの順序・初期化、Appの公開export、メモ編集中の最新チェック状態の保護を確認。
- iPhoneでタイトル下の関連メモを開き、登録→「今」の表示→チェック→再起動を最終確認する。

## 行動削除の選択肢（2026-11-27・分割とは別の機能修正）

- 関連TODOがある行動の削除時に「行動だけ削除」「関連TODOも一緒に削除」を選べる。
- 同時削除は確認時のTask IDと月・目標・行動の関連を再検査する。同名・別月のTODOや曖昧な関連は削除しない。
- 既存の通知取消と保存キューを使用し、永続化完了までEditorを保持する。失敗時は同じ削除を再試行し、別TODOの更新は巻き戻さない。
- 全Jest：36 suites・324件PASS（削除関連8件追加）、typecheck・iOS向けJS export・diffチェックPASS。
- Reactチェックで保存待ち・再試行中の入力/保存操作とアクセシビリティのdisabled状態を揃えた。
- iPhoneのNative確認ダイアログ・通知取消の実機動作は未確認。commit・push・EAS Buildは未実施。
