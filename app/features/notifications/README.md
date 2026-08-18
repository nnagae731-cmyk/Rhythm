# Rhythm Notifications

Rhythm全体の通知状態確認に関する
共通処理を管理する。

---

# 目的

設定画面から、

- 通知が許可されているか
- 通知許可を要求する
- テスト通知を送る
- 現在何件の通知が予約されているか

を確認できるようにする。

---

# 既存通知管理

SettingsScreenにはすでに

NotificationManagerCard

が存在する。

現在、

「通知管理」
「予約中の通知を確認・停止」

というUIがある。

そのため、
新しい通知管理画面を作らない。

notificationHealth.tsは
既存NotificationManagerCardへ
必要な情報を追加するために使用する。

---

# notificationHealth.ts

担当：

- 通知許可状態確認
- 通知許可要求
- テスト通知
- 予約通知件数取得

予定やTodoなど、
個別通知の予約ロジックは担当しない。

---

# 個別通知

既存の個別通知処理は維持する。

例：

tasks/taskNotifications.ts

departure関連通知

focus/focusNotifications.ts

これらを
notificationHealth.tsへ統合しない。

---

# Notification Handler

App.tsxにはすでに

Notifications.setNotificationHandler()

が存在する。

新しいHandlerを
notificationHealth.tsへ追加しない。

アプリ全体で
既存Handlerを共通利用する。

---

# 通知許可

アプリ起動直後に
突然通知許可を要求しない。

ユーザーが、

- 通知を使う機能を使用する
- 設定画面から通知を有効にする

など、
通知の意味を理解できるタイミングで要求する。

---

# 設定画面

将来Codexで
既存NotificationManagerCardへ以下を追加する。

通知状態：

許可済み
一時許可
未許可
拒否

テスト通知：

「テスト通知を送る」

予約通知：

現在の予約件数

既存の予約通知一覧や
停止機能はそのまま利用する。

---

# テスト通知

scheduleNotificationTest()

を使用する。

3秒後に

Rhythm 通知テスト

を表示する。

テスト通知のために
独自Notification Handlerを作らない。

---

# デザイン

通知管理画面は
通常の設定画面の一部。

Onboardingとは異なる。

ユーザーが現在選択している

- Mono Light
- Mono Dark
- Design
- Photo

のテーマへ追従する。

---

# Codex実装時

1. 現在のNotificationManagerCardを確認
2. 新しい通知管理画面を作らない
3. notificationHealth.tsを既存Cardへ接続
4. 通知許可状態を表示
5. 必要な場合だけ通知許可ボタンを表示
6. テスト通知ボタンを追加
7. 予約通知件数を表示
8. 既存の通知一覧・停止処理は維持
9. App.tsxのNotification Handlerを増やさない
10. Todo / 予定 / Focus通知ロジックを壊さない