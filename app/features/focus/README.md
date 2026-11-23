# Rhythm Focus

Rhythmの集中タイマーに関する共通仕様と現在地。

既存の集中タイマーを全面的に作り直さず、
現在動いているタイマーへ必要な機能を段階的に接続する。

---

# 1. 目標

Rhythmの集中タイマーは、

「今やる1つに集中する」

ための機能。

目標体験：

- Todoを選ぶ
- 集中時間を設定
- タイマー開始
- 集中中もRhythm内の各画面へ自由に移動できる
- iPhoneホームへ戻ることは可能
- 他アプリを開くことも可能
- バックグラウンド中も実時間は進む
- 終了時に通知またはアラーム
- 将来はLock Screen / Dynamic Islandへ表示

---

# 2. 現在のタイマー方式

現在の `App.tsx` では、

`endAtRef`

へ終了予定時刻を保持している。

残り時間は、

`終了時刻 - Date.now()`

を基準に再計算する。

この方式は維持する。

---

# 3. バックグラウンド時間の考え方

JavaScriptの `setInterval` が
バックグラウンド中も正確に動き続けることを
前提にしない。

残り時間の正解は、

「前回から何秒減ったか」

ではなく、

「終了予定時刻 - 現在時刻」

から求める。

例：

25分タイマー開始
↓
10分後に別アプリへ移動
↓
5分後Rhythmへ戻る
↓
残り時間は約10分

となるのが正しい。

---

# 4. OSへの移動は許可する

集中タイマー実行中でも、

- iPhoneホームへ戻る
- 他アプリを開く
- Rhythmをバックグラウンドへ移す

ことは許可する。

Rhythmを常に前面表示させる仕様にはしない。

---

# 5. Rhythm内の画面遷移

集中の実行処理は `features/focus/useFocusController.ts` の `FocusRuntimeProvider` がApp配下で保持する。Focus画面は同じcontrollerを表示・操作するだけなので、画面をアンマウントしても通知・終了判定・記録は継続する。

今日・予定表・分析・叶えたいこと・設定へ自由に移動できる。他画面には小さな状態バーを表示し、「集中へ」で元のタイマーへ戻れる。一時停止中も同じセッションID・残り時間を保持する。

Providerの時計更新はContextの購読先だけに伝え、無関係な画面全体を500msごとに再描画しない。

---

# 6. focusUsagePolicy.ts

既に、

`app/features/focus/focusUsagePolicy.ts`

が存在する。

集中タイマー利用中の
navigation policyを管理するための基盤。

このファイルを再利用する。

同じ判定を `App.tsx` や各Screenへ
重複実装しない。

---

# 7. navigation guardの現在地

`focusUsagePolicy.ts` は画面移動を許可する。旧ナビゲーション制限Modalは実画面から削除済み。Timeline内の「出発・スケジュール・予定表・集中」の切替でも実行処理を停止しない。

初回案内・Capture StudioのFocusプレビューは専用の独立controllerを使い、本番の実行中セッションへ接続しない。

---

# 8. 集中中の案内

他画面では「集中中 / 一時停止中」と残り時間を表示し、「集中へ」で戻れる。

案内バーはBottomNavと同じSafe Area内に置き、ナビ上端から8pt離す。実際のバー高さに応じてスクロール末尾の余白を確保し、文字拡大や複数案内でも内容を隠さない。

Focus画面は準備中・集中中・一時停止中・完了を区別して表示する。タスクが0件でも利用できることを明示し、Darkでは時間選択・リセット・空表示・タスク一覧も既存のテーマ色へ揃える。

他画面で終了しても作業中のEditor・入力を閉じない。集中記録・分析・Live ActivityのJSデータを更新し、終了案内からユーザーが明示的に結果確認へ進む。別のNative Modalの上へ終了確認Modalを重ねない。

Appがactiveに戻った際も終了予定時刻から再計算する。保存完了後の再起動では既存のFocusPersistedStateを復元する。OSプロセスの強制終了そのものや実機描画はWindowsのJestでは確認できない。

---

# 9. Focus終了通知

既に、

`app/features/focus/focusNotifications.ts`

が存在する。

Expo Notificationsを使用した
Focus終了通知の基盤。

新しい通知ロジックを
別ファイルへ重複して作らない。

---

# 10. Focus終了通知の動作

将来の接続では、

## Start

タイマー開始時に
終了予定時刻で通知を予約。

## Pause

予約済み終了通知をキャンセル。

## Resume

新しい終了時刻で
終了通知を再予約。

## Reset

予約通知をキャンセル。

## Stop / Cancel

予約通知をキャンセル。

## Complete

終了済みの不要な予約通知を残さない。

---

# 11. 通知重複禁止

同じFocus timerについて、

複数の終了通知を残さない。

例：

Start
↓
Pause
↓
Resume

した場合、

最初の終了通知
＋
再開後の終了通知

の2つが残る状態は禁止。

必ず古い通知をキャンセルしてから
新しい終了通知を予約する。

---

# 12. Notification Handler

`App.tsx` には既存の

`Notifications.setNotificationHandler()`

がある。

Focus用に
別のNotification Handlerを登録しない。

既存Handlerを利用する。

---

# 13. Notification Permission

Focus専用のPermissionシステムを作らない。

共通の、

`app/features/notifications/notificationPermission.ts`

を使用する。

初回アプリ起動直後には
iOS通知Permissionを要求しない。

ユーザーが
通知を必要とするFocus機能を利用する時に、

Rhythm側説明
↓
iOSシステムPermission

の順で進める。

---

# 14. Focus通知の現在地

完了済み：

- Focus notification用ファイル作成
- schedule用基盤
- cancel用基盤
- notification policy整理

未完了：

- 既存Focus timer開始処理への接続
- Pauseへの接続
- Resumeへの接続
- Resetへの接続
- Stopへの接続
- notification重複防止の実機確認

---

# 15. FocusのUI

既存の集中タイマーUIを
全面的に作り直さない。

UI調整が必要な場合は、

- 文言
- ボタン名
- 余白
- 文字サイズ
- 配置
- Theme対応
- 案内文

など、
必要な箇所だけ修正する。

---

# 16. Theme

Rhythmアプリ内のFocus UIは
現在選択中のThemeへ追従する。

対象：

- Mono Light
- Mono Dark
- Design
- Photo

Focus専用の固定カラーパレットを作らない。

既存 `theme.ts` を使用する。

---

# 17. Onboardingとの関係

FocusのFeature Onboardingでは、

- Todoを選択
- 集中時間を選択
- スタート

という基本操作だけ説明する。

完了条件は、

**ユーザーが初めてFocus timerをStartした時。**

タイマー終了まで待たない。

Onboarding側へ、

- background logic
- navigation guard
- notification logic

を実装しない。

---

# 18. Focus Session

完了した集中セッションの記録は、

`app/focusSession.ts`

が担当する。

この責務を、

- focusUsagePolicy.ts
- focusNotifications.ts
- Onboarding

へ移動しない。

既存Focus履歴を
削除・初期化しない。

---

# 19. 手動で先にできること

Codexを使用する前に
手動で対応可能：

- Focus画面の文言修正
- UIの軽微な調整
- 集中中案内の文言決定
- README更新
- Onboarding用スクリーンショット
- backgroundへ移動して戻った時の残り時間確認
- Start / Pause / Resume / Resetの現状確認

これらは
複雑なロジック変更を伴わない限り
Codexを使わなくてよい。

---

# 20. Codexへ残す部分

以下は複数のstate / navigation / notificationが絡むため
Codexで実装する。

- 集中中のApp内navigation guard
- Bottom Navigationとの接続
- 集中中Modal表示
- `focusNotifications.ts` と既存timerの接続
- Start時notification予約
- Pause時cancel
- Resume時再予約
- Reset / Stop時cancel
- notification重複防止
- background復帰同期に問題があった場合の修正

---

# 21. AlarmKit

AlarmKitは
Apple Developer / native環境が整ってから実装する。

今は実装を急がない。

将来的な第一候補：

iOS 26以降
＋
AlarmKit利用可能
＋
必要なauthorizationあり

↓

AlarmKit

それ以外：

Expo local notification

---

# 22. AlarmKitで目指すもの

将来：

- システム管理Countdown
- Lock Screen
- Dynamic Island
- StandBy
- 終了Alarm
- Stop
- Pause
- Resume

を検討する。

必要に応じて、

- Widget Extension
- ActivityKit
- WidgetKit

を使用する。

---

# 23. AlarmKitとExpo通知の重複禁止

将来AlarmKitが
正常にtimerを管理できた場合、

同じ終了時刻に
Expo Notificationsも鳴らさない。

使用するsystem timer providerは
1つにする。

---

# 24. iOS System UI

Lock Screen / Dynamic Island / AlarmKitでは、
AppleのUIルールを優先する。

Rhythm側で調整できる範囲だけ、

- tint
- accent
- text
- icon

などへデザインを反映する。

アプリ内画面と
完全に同じUIを再現しようとしない。

---

# 25. 現在地

## 完了・準備済み

- 既存Focus timer
- wall-clock方式
- endAtRef
- Focus session記録
- focusUsagePolicy.ts
- focusNotifications.ts
- Focus仕様整理
- EAS Development Build準備

## 未接続

- App内navigation guard
- 集中中Modal
- Focus timerと終了通知
- Pause / Resume / Reset notification制御
- notification重複防止
- Focus Feature Onboarding

## Apple Developer後

- Development Build実機確認
- native notification確認
- AlarmKit
- Lock Screen
- Dynamic Island
- Widget Extension

---

# 26. Codex実装順

Focusを実装する時は、

1. `AGENTS.md`
2. `docs/RHYTHM_HANDOFF.md`
3. このREADME
4. `focusUsagePolicy.ts`
5. `focusNotifications.ts`
6. `app/focusSession.ts`
7. 現在の `App.tsx` Focus処理

を確認する。

その後：

1. 既存 `endAtRef / secondsLeft / running` を確認
2. navigation guardを最小差分で接続
3. 集中中Modalを接続
4. focusNotificationsをtimerへ接続
5. Start / Pause / Resume / Reset / Stopを接続
6. background復帰を確認
7. notification重複を確認
8. `pnpm typecheck`
9. ここで一旦停止
10. 実機確認後に次へ進む

---

# 27. 絶対にしないこと

- App.tsx全面改修
- Focus timerの全面作り直し
- setIntervalだけを時間の正解にする
- 他アプリへの移動を禁止する
- Focus専用Notification Permissionを作る
- Notification Handlerを重複登録する
- Focus Session履歴を初期化する
- Onboarding側へFocusロジックを複製する
- Apple Developer環境前にAlarmKitを無理に実装する

既存実装へ
最小差分で接続する。
