# Rhythm Focus

Rhythmの集中タイマーに関する共通仕様。

既存の集中タイマーUIを
全面的に作り直さず、
必要な機能を段階的に接続する。

---

# 目標

Rhythmの集中タイマーを
iPhone標準タイマーに近い体験へする。

必要な体験：

- 集中中はRhythm内の別画面へ移動させない
- 他アプリを開くことは許可する
- Rhythmをバックグラウンドにできる
- バックグラウンド中も時間は進む
- 終了したら通知またはアラームを出す
- ロック画面に残り時間を表示する
- 対応iPhoneではDynamic Islandにも表示する

---

# 現在の既存タイマー

現在のApp.tsxでは

endAtRef

へ終了時刻を保持し、

Date.now()

との差から残り秒数を再計算している。

この考え方は維持する。

バックグラウンド中に
JavaScriptのsetIntervalが正確に動き続けることを
前提にしない。

残り時間の正解は

「前回から何秒減ったか」

ではなく

「終了時刻 - 現在時刻」

から求める。

---

# アプリ内画面遷移

focusUsagePolicy.tsを使用する。

集中タイマー実行中に
Rhythm内の別画面が押された場合：

1. 画面遷移をキャンセル
2. 集中タイマー実行中の案内を表示
3. 「集中に戻る」で案内を閉じる
4. 集中画面を維持
5. タイマーを継続

表示だけして
実際には画面遷移してしまう実装は禁止。

---

# バックグラウンド

集中タイマー実行中でも

- iPhoneホームへ戻る
- 他アプリを開く
- Rhythmをバックグラウンドへ移す

ことを許可する。

アプリ内ナビゲーション制限と
OSバックグラウンド移行を混同しない。

---

# 終了通知

focusNotifications.tsは
Expo Notificationsによる
フォールバック終了通知を担当する。

タイマー開始時に終了通知を予約する。

一時停止・リセット・中止時は
その通知をキャンセルする。

一時停止後に再開した場合は
新しい終了時刻で通知を再予約する。

同じタイマーについて
複数の終了通知を残さない。

---

# 既存Notification Handler

App.tsxにはすでに

Notifications.setNotificationHandler()

が存在する。

Focus側で
新しいNotification Handlerを
重複して登録しない。

既存Handlerを共通利用する。

---

# iOS 26以降

最終的にはAlarmKitを
iOSの第一候補として使用する。

目的：

- システム管理のカウントダウン
- ロック画面の残り時間
- Dynamic Island
- StandBy
- 終了時の目立つアラーム
- 停止
- 一時停止
- 再開

AlarmKit利用時は
Apple側のAlarmKit authorizationを使用する。

NSAlarmKitUsageDescriptionも設定する。

---

# AlarmKitと通知の重複防止

AlarmKitが正常にスケジュールできた場合は、
同じ終了時刻にExpo Notificationsの
終了通知を重複して鳴らさない。

将来Codexで

system timer provider

を1つ選択する構造へする。

推奨：

iOS 26+ ＋ AlarmKit許可
→ AlarmKit

AlarmKit利用不可・未対応・拒否
→ Expo local notification

---

# ロック画面 / Dynamic Island

AlarmKitのカウントダウン表示は
Widget Extensionを使用する。

AlarmKitを利用できないOSで
Live Activityを提供する場合は
ActivityKit + WidgetKitを使用する。

JavaScript側から
毎秒ロック画面を書き換える実装にはしない。

---

# デザイン

Rhythm内に表示する

- 集中タイマー
- 集中中の案内モーダル
- 完了表示

は現在選択中のThemeに追従する。

focusフォルダへ
独自の固定カラーパレットを作らない。

既存theme.tsを使用する。

Mono Light
Mono Dark
Design各色
花柄
Photo

すべて現在のテーマへ追従させる。

---

# iOSシステムUI

Lock Screen / Dynamic Island / AlarmKit UIでは
Appleのシステム表示ルールを優先する。

Rhythmのデザインコンセプトは
Appleが許可する範囲で

- tint
- accent
- text
- icon

へ反映する。

システムUIを
Rhythmアプリ内UIと完全一致させようとしない。

---

# 既存データ

ルートの

focusSession.ts

は完了した集中セッションの
記録担当。

この責務を
focusUsagePolicy.tsや
focusNotifications.tsへ移動しない。

既存の集中履歴を削除・初期化しない。

---

# Codex実装順

1. 現在のFocusScreen実装を確認
2. 現在のendAtRef / secondsLeft / runningを確認
3. focusUsagePolicy.tsを画面遷移へ接続
4. focusNotifications.tsを開始・停止・再開へ接続
5. バックグラウンド復帰時の残り時間を確認
6. 通知重複がないことを確認
7. Apple Developer環境が準備できたらAlarmKit実装
8. Widget Extension追加
9. Lock Screen countdown追加
10. Dynamic Island追加
11. AlarmKit成功時はExpo終了通知を停止
12. iOS実機で確認

---

# 重要

App.tsxを一度に全面改修しない。

最小差分で接続する。

まずExpo local notificationで
バックグラウンド終了通知を完成させる。

その後、
AlarmKit / Live Activityを追加する。