# UI第2弾（2026-11-27）

## 基準・既存作業との関係

- HEADはmain `453af1e`。第1弾は作業ツリーへ適用済み（44 suites / 394件）。
- 着手時には、写真入口・日記1行化・入口の控えめ化・crop表示ずれ修正も未コミットで適用済み。既存の408件全体PASSと追加cropテスト1件PASSを引き継ぎ、今回の追加は11件。
- 第1弾との未解決競合なし。日記1行化は既存実装を再利用し、重複実装しない。
- 現在の写真実装を前提にする増分と、第1弾394件のtreeへ適用する累積パッチを分ける。両方を続けて適用しない。GitHubへのpushは行わない。

## 項目ごとの変更ファイル・テスト

### 1補足：写真ボタンの周知

- `app/features/onboarding/onboardingSteps.ts`：customizeだけに「カメラのボタンから、いつでも好きな写真に変えられます」を追記。枚数・順序・他スライドは維持。
- `app/features/onboarding/OnboardingCarousel.tsx`：デザイン紹介の本番プレビューに静的なカメラバッジ。pointerEvents=noneの中に置き、写真選択はさせない。
- `app/features/onboarding/onboardingStorage.ts`：既存onboardingキー内に任意の`photoEntryHintShown`のみ追加。未設定は初回扱い。既存の直列mutationキューで表示receiptを保存し、他の案内更新で消えないようにする。PersistedStateや保存キーは変更なし。
- `app/features/onboarding/usePhotoEntryHint.ts`：初回の利用可能なホーム起動中にだけ表示。タップ・任意の写真設定でその場で消去。表示receiptは先に保存するので、操作せず終了した場合も2回目以降の起動では出さない。
- `app/App.tsx`：復元・初回紹介・デザイン選択が終わるまではヒントを出さない。ホームの入口のタップ時だけヒントを消して、元と同じtargetでシートを開く。他画面にはヒントを出さない。
- `app/components/PhotoEntry.tsx`：表示専用の任意hintとカメラ部品の共用のみ。常時ラベルは追加しない。シート内の解放判定・Native dismiss・picker/crop接続は変更なし。
- 追加テスト：`qa-photo-entry-hint.test.js` 5件（旧データ、タップ、写真設定、再起動、既存写真、直列保存、紹介枚数/バッジ）。`qa-photo-entry-app.test.js`の既存Free/Premiumケースに、本番Appのヒント消去・receipt保存のassertionを追加。

### 2：ホーム日記

- 今回の追加変更なし。既存の`app/screens/HomeScreen.tsx`はminHeight=48の横1行、本文プレビューはnumberOfLines=1、写真サムネイルなし。バナーとTODAY構造は維持。
- `qa-journal-entry.test.js`の3テーマテストを最初に再実行してPASS。保存済み・保存中・失敗、タップの既存assertionを保持。全体テストでも保存・編集・失敗復旧を再検証する。

### 3：設定ヘッダーの潜り込み

- `app/App.tsx`：設定を表示中のメインScrollViewだけ、上部padding=24、自動inset調整を無効、viewport外をclip。他画面は未指定のままで、ヘッダーと写真設定画面は変更しない。
- `qa-ui-guidance-app.test.js`に1件追加。設定へ入った時だけpropsが変わり、ToDoへ戻ると元へ戻ることを確認。
- Nativeの半透明表示・実際のスクロール位置は実機で確認が必要。JSテストは余白・clip・insetの設定を検証する。

### 4：ルーティン解除の意味

- `app/AnalysisScreen.tsx`：記録0件時の行と通常の継続カード、両方の「×」を「外す」に変更。通常カードも最小44ptの操作領域へ。accessibilityLabel・onRemoveRoutine・解除歴処理は維持。確認ダイアログは追加していない。
- `qa-ui-guidance.test.js`の既存3テーマケースに「外す」表示と「×」非表示のassertionを追加し、従来のcallback引数検証も維持。

### 5：和式日付（表示だけ）

- 新規`app/features/schedule/dateDisplay.ts`：YYYY-MM-DDキーをYYYY年M月D日のラベルへ変換する表示専用関数。Date生成・日付演算はしない。呼び出し元の保存キーはそのまま。
- `app/components/ScheduleCalendar.tsx`：Free7日表示・Premium月表示の日別見出し。
- `app/screens/TimelineScreen.tsx`：出発予定の日付、スケジュールの日付、予定カウントダウンの詳細。
- `app/SharedEventScreen.tsx`：共有予定のサブタイトル・参加予定カード。
- `app/screens/HistoryScreen.tsx`：日記エディタ（通常/プレビュー）、検索の日付・タスク完了日、日別見出し、集中完了日、出発チェックイン、出発行動詳細、通知回答日、検索プレビューの完了日。
- 既に和式のHeader・ルーティン等は変更しない。曜日を持たなかった場所に曜日を追加せず、既存の曜日併記も削除しない。入力欄・保存・sort・Widget識別子は変更しない。
- `qa-date-display.test.js` 5件追加（年境界・うるう日・Free/Premiumの実カレンダー見出し）。既存の日付テストの期待値を緩める変更はなし。

## 保護範囲・確認

- SettingsScreen、PhotoThemeSettingsCard、usePhotoTheme、Premium機能ID、型、保存本体、Widgetの色/柄インデックス・永続識別子に今回の変更なし。
- 写真入口の操作を再実装していない。Freeの広告案内、EARNEDだけで解放、Premium/StoreKit購入済みの広告なし、既存cropへの受け渡しは既存テストを維持。
- Reactレビュー：Hooksを無条件で呼び出す、ヒントの非操作表示、44pt領域、シートの終了順序を維持。新規依存なし。
- 既存`qa-first-run-app.test.js`の紹介再表示テストは、ホーム初回表示receiptと再表示操作を混同しないよう、fixtureにphotoEntryHintShown=trueを明記した。保存状態の完全一致assertionは維持。未設定からの初回/再起動は新規テストで検証。
- 項目別テストを通してから次の項目へ進行。初回ヒントテストのAsyncStorage Native境界mockを修正したのみで、製品の保存処理をテスト都合で変更していない。

## 最終検証

- 全Jest：49 suites / 420件全PASS（今回11件追加）。最終実行178.997秒。
- 型チェック：PASS。
- iOS JS export：PASS（1,168 modules / 4.26MB / 28 assets）。Nativeビルド・実機確認ではない。
- diff whitespaceチェック：PASS。
- 増分・第1弾基準パッチの両方を、一時indexで厳格適用チェック→実適用し、適用結果と最終作業ツリーの一致を確認。実際のGit indexやHEADは変更せず、未コミット・未push。
- 写真シート関数の本文が直近写真実装と一致すること、設定の写真UI・広告/購入・picker/crop・PersistedStateに今回差分がないことも機械確認。
- 見た目・設定ヘッダーのNativeスクロール・拡大文字時の日記はオーナーが実機で最終確認する。
