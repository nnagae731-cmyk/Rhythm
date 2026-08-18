# Rhythm Notification Permission

Rhythmの通知許可に関する
共通仕様を管理する。

テスト通知機能は作らない。

---

# 基本方針

通知許可は必要。

ただし、
アプリ初回起動直後には要求しない。

通知が必要になる操作を
ユーザーが行ったタイミングで案内する。

---

# 初回起動

初回起動時：

通知許可ダイアログを表示しない。

まずRhythmの基本操作を
Todoから体験してもらう。

---

# 通知許可を出すタイミング

通知を利用する機能を
初めて使用するときに案内する。

例：

- Todoのリマインド
- 予定・出発通知
- 集中タイマー終了通知
- アファメーション通知

実際に最初にどの操作で
通知許可を要求するかは、
各画面のUX設計時に決定する。

---

# 許可前のRhythm案内

iOSのシステムダイアログを
突然表示しない。

先にRhythm側で短く説明する。

CTA：

「通知を許可する」

CTAを押した後に

requestRhythmNotificationPermission()

を呼ぶ。

---

# 許可状態

authorized

通知利用可能。

provisional

通知利用可能な状態として扱う。

notDetermined

まだ通知許可を要求していない状態。

denied

ユーザーが通知を拒否した状態。

---

# deniedの場合

システム許可ダイアログを
何度も要求しない。

必要な場合は

「iPhoneの設定から通知をオンにできます」

という案内へ切り替える。

将来、
設定アプリを開く導線を追加する。

---

# 設定画面

SettingsScreenにはすでに

NotificationManagerCard

が存在する。

新しい通知設定画面を作らない。

将来Codexで、
既存の通知管理へ

- 通知ON
- 通知OFF
- 設定から変更

などの状態表示を追加する。

---

# 個別通知

この機能は
通知許可だけを担当する。

Todo
予定・出発
Focus
Affirmation

などの個別通知ロジックは
それぞれの機能側で管理する。

---

# Focus

Focus終了通知でも
Rhythm共通の通知許可状態を利用する。

AlarmKitのauthorizationは
通常の通知許可とは別なので、
将来AlarmKit実装時に分離して扱う。

---

# Onboardingとの違い

Feature Onboarding：

機能の使い方を説明する。

Notification Permission：

iOS通知許可へ進む前の
意味説明と状態管理を担当する。

---

# デザイン

通知許可のRhythm側案内は
表示されている画面のテーマへ追従する。

Feature Onboardingの
Mono Light固定仕様とは別。

---

# Codex実装時

1. notificationPermission.tsを共通利用する
2. 初回起動時に自動要求しない
3. 通知が必要になる操作で案内する
4. Rhythm側の説明後にiOS許可を表示する
5. denied時に許可要求を繰り返さない
6. 既存NotificationManagerCardを利用する
7. 新しい通知設定画面を作らない
8. テスト通知機能を追加しない
9. 個別通知ロジックを統合しない
10. App.tsxのNotification Handlerを増やさない