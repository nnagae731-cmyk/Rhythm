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
- 集中中はRhythm内の別画面へ移動させない
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

集中タイマー実行中は、

Rhythm内の別画面へ移動させない。

対象：

- 今日
- 予定
- 分析
- 叶えたいこと
- 設定
- その他Rhythm内navigation

ユーザーが別画面を押した場合：

1. 画面遷移をキャンセル
2. 集中タイマー実行中の案内を表示
3. 「集中に戻る」で案内を閉じる
4. 集中画面を維持
5. タイマーは継続

表示だけ出して、
裏では別画面へ遷移する実装は禁止。

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

重要：

`focusUsagePolicy.ts`

の基盤は作成済み。

ただし、

**Rhythm全体のnavigationへの本格接続は未完了。**

今後Codexで、

- Bottom Navigation
- App内screen変更
- 集中中Modal

へ最小差分で接続する。

この接続のために
App.tsxを全面改修しない。

---

# 8. 集中中の案内

集中タイマー実行中に
別画面へ移動しようとした場合は、
短い案内を表示する。

文言案：

### タイトル

`集中タイマー実行中`

### 本文

`集中が終わるまで、Rhythm内の画面移動はできません。`

### 補足

`ホームへ戻ったり、他のアプリを使うことはできます。`

### CTA

`集中に戻る`

この案内は
現在選択中のThemeへ追従する。

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