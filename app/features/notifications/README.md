# Rhythm Notification Permission

Rhythmの通知許可に関する
共通仕様と現在地。

通知Permissionそのものと、
Todo / 予定 / Focus / Affirmationなどの
個別通知ロジックは分離して管理する。

---

# 1. 基本方針

Rhythmでは通知を使用する。

ただし、

**アプリ初回起動直後には
iOSシステムの通知許可を要求しない。**

まずRhythmの基本操作を体験してもらう。

通知が必要になる機能を
ユーザーが実際に使用する時に案内する。

---

# 2. 正しい案内順

通知が必要な操作をした時：

1. Rhythm側で短く説明
2. ユーザーがCTAを押す
3. 現在のPermission状態を確認
4. 必要なactionを決定
5. iOSシステムPermissionまたは設定案内へ進む

突然iOSシステムダイアログだけを
表示しない。

---

# 3. 共通Permission基盤

既に、

`app/features/notifications/notificationPermission.ts`

が存在する。

このファイルを
Rhythm共通の通知Permission基盤として使用する。

各機能で同じPermission判定を
重複実装しない。

---

# 4. 現在実装済みの機能

## getNotificationPermissionStatus()

現在の通知Permission状態を取得する。

返却：

- authorized
- provisional
- denied
- notDetermined

---

## canUseNotifications()

以下の場合は
通知利用可能として扱う。

- authorized
- provisional

---

## requestRhythmNotificationPermission()

現在が

- authorized
- provisional
- denied

の場合は
システムPermissionを再要求しない。

`notDetermined`

の場合のみ
iOSシステムPermissionを要求する。

要求内容：

- Alert
- Sound
- Badge

---

## getNotificationPermissionAction()

現在状態から
次に行うactionを決定する。

### authorized

`none`

### provisional

`none`

### notDetermined

`request`

### denied

`openSettings`

---

# 5. Permission状態の意味

## authorized

通知利用可能。

通常の通知機能へ進める。

---

## provisional

iOSの暫定許可状態。

Rhythmでは
通知利用可能として扱う。

---

## notDetermined

まだ通知Permissionを
ユーザーへ要求していない。

Rhythm側説明後に
システムPermissionへ進む。

---

## denied

ユーザーが
通知Permissionを拒否済み。

同じシステムPermissionを
何度も要求しない。

iPhone設定への案内へ切り替える。

---

# 6. Rhythm側の共通説明

通知を使用する前に
Rhythm側で短い説明を出す。

基本構成：

### タイトル

その機能で
通知が必要な理由が分かるタイトル。

### 本文

何を通知するのかを
短く説明する。

### CTA

Permission未要求の場合：

`通知を許可する`

拒否済みの場合：

`iPhoneの設定を開く`

必要に応じて：

`あとで`

---

# 7. 初回起動

アプリ初回起動時は、

**Notification Permissionを表示しない。**

初回7枚Onboardingにも
iOS通知Permissionを組み込まない。

初回起動カルーセルと
Notification Permissionは別責務。

---

# 8. Feature Onboardingとの違い

Feature Onboarding：

機能の使い方を説明する。

Notification Permission：

通知を使う理由の説明と
iOS Permission状態を管理する。

Notification Permissionを

`OnboardingFeatureId`

へ追加しない。

---

# 9. 通知を使用する主な機能

現在・将来の対象：

- Todo Reminder
- 予定通知
- 出発通知
- Focus終了通知
- Affirmation通知
- Nudge関連

各機能は、
共通Permission helperを利用する。

---

# 10. Todo通知

Todoで通知を設定する時に、
Permissionが必要なら案内する。

文言例：

### タイトル

`時間になったらお知らせします`

### 本文

`Todoを忘れないように、設定した時間にRhythmから通知します。`

Permission未要求CTA：

`通知を許可する`

拒否済みCTA：

`iPhoneの設定を開く`

Todo保存そのものを
通知Permission未許可だけで禁止しない。

---

# 11. 予定・出発通知

予定や出発時刻の通知を
ユーザーが使用する時に案内する。

文言例：

### タイトル

`出発のタイミングをお知らせします`

### 本文

`準備や出発の時間になったらRhythmから通知します。`

Notification Permissionがない場合でも、
予定データ自体を削除・変更しない。

---

# 12. Focus終了通知

Focusでも
Rhythm共通のNotification Permissionを使用する。

Focus側で
独自Permissionシステムを作らない。

詳細：

`app/features/focus/README.md`

Focus用文言例：

### タイトル

`集中が終わったらお知らせします`

### 本文

`他のアプリを使っていても、集中時間が終わったらRhythmから通知します。`

---

# 13. Affirmation通知

Affirmationで
通知をONにする時に
Permissionが必要なら案内する。

Affirmation自体の
Premium判定はNotification側へ持たせない。

Premium判定は
既存 `premiumAccess.ts` を使用する。

---

# 14. denied時

`denied`

の場合は、

`requestPermissionsAsync()`

を繰り返さない。

Rhythm側で、

`通知はiPhoneの設定からオンにできます`

などの案内を表示する。

CTA：

`iPhoneの設定を開く`

実際の設定アプリを開く処理は、
既存アプリ構造を確認して接続する。

---

# 15. 設定画面

既存SettingsScreenには
Notification管理UIがある。

新しい通知設定画面を
別に作らない。

既存設定画面を利用する。

必要に応じて将来、

- 現在のPermission状態
- 通知利用可能
- 通知OFF
- 設定から変更

などを表示する。

---

# 16. 個別通知ロジック

このfeatureは、

**Notification Permissionの共通管理**

を担当する。

以下の個別処理は
各feature側で管理する。

### Todo

Todo Reminderの予約・取消。

### 予定 / 出発

予定・準備・出発通知。

### Focus

Focus終了通知。

### Affirmation

Affirmation通知。

すべてを
notificationPermission.tsへ統合しない。

---

# 17. Notification Handler

`App.tsx` には既存の

`Notifications.setNotificationHandler()`

がある。

各featureで
新しいHandlerを重複登録しない。

共通Handlerを利用する。

---

# 18. Theme

Rhythm側の
Notification Permission説明は、

**現在表示中のThemeへ追従する。**

対象：

- Mono Light
- Mono Dark
- Design
- Photo

Feature Onboardingの
Mono Light固定仕様とは別。

Notification用の
独自固定カラーパレットを作らない。

---

# 19. 現在地

## 完了・準備済み

- notificationPermission.ts
- Permission状態取得
- authorized判定
- provisional判定
- denied判定
- notDetermined判定
- canUseNotifications()
- requestRhythmNotificationPermission()
- getNotificationPermissionAction()
- denied時 `openSettings` 判定
- Notification Permission方針

## 未接続

- Todo Reminder利用時の共通案内
- 予定 / 出発通知利用時の共通案内
- Focus通知利用時の共通案内
- Affirmation通知利用時の共通案内
- denied時の実際のSettings遷移
- SettingsScreenでのPermission状態表示

---

# 20. 手動で先にできること

Codexを使う前に
手動で決められる：

- 各通知説明文
- CTA文言
- Modalのタイトル
- 補足文
- UIの軽微な調整
- README整理

複数featureへ
Permissionロジックを接続する作業は
Codexへ残す。

---

# 21. Codexへ残す部分

Codexでは、

- 各通知機能の既存処理確認
- notificationPermission.tsとの接続
- Permission説明Modalの接続
- request action
- openSettings action
- SettingsScreenとの接続

を行う。

既存通知予約ロジックを
全面的に作り直さない。

---

# 22. Codex実装順

Notification Permission接続時：

1. `AGENTS.md`
2. `docs/RHYTHM_HANDOFF.md`
3. このREADME
4. `notificationPermission.ts`
5. 既存Notification Handler
6. 対象featureの通知処理

を確認する。

その後：

1. 対象機能の通知利用タイミングを確認
2. Permission状態取得
3. Rhythm側説明を表示
4. actionがrequestならsystem Permission
5. actionがopenSettingsなら設定案内
6. authorized / provisionalなら通常処理
7. `pnpm typecheck`
8. 1機能ずつ実機確認

一度に
全通知機能をまとめて変更しない。

---

# 23. AlarmKit

将来Focusで使用する
AlarmKit authorizationは、

通常のNotification Permissionとは別。

notificationPermission.tsへ
AlarmKit authorizationを混ぜない。

AlarmKit詳細は
Focus READMEを参照する。

---

# 24. 絶対にしないこと

- 初回起動直後に通知Permissionを強制
- OnboardingFeatureIdへNotification Permissionを追加
- 各featureでPermission判定を重複実装
- denied時にsystem Permissionを何度も要求
- Notification Handlerを複数登録
- 新しい通知設定画面を作る
- Permission featureへ個別通知ロジックを全部集約
- AlarmKit authorizationを通常通知Permissionと混同
- App.tsxを通知対応のために全面改修

既存基盤を再利用し、
必要なfeatureへ最小差分で接続する。