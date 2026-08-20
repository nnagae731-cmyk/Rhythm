# Rhythm Todo Onboarding Flow

TodoまわりのFeature Onboardingの
表示順・完了条件・実装ルールを管理する。

初回起動7枚カルーセルとは別。

---

# 1. 現在地

## 完了済み

### intro

初回起動7枚カルーセル。

完了条件：

- スキップ
- 最終画面「Rhythmをはじめる」

完了状態は保存済み。

---

### todo

最初のTodo登録GUIDE。

表示条件：

- intro完了
- todo未完了

実装済み。

初回カルーセル終了後、
今日画面でTodo入力欄付近にGUIDEを表示する。

スマート入力から
最初のTodoを1件登録した時に完了。

実機確認済み。

ここは作り直さない。

---

# 2. 次に実装する順番

Todo関連は以下の順番で進める。

1. todoComplete
2. completedTasks
3. taskBuckets
4. taskDetails

この4つをまとめて大量実装せず、
既存イベントへ最小差分で接続する。

---

# 3. todoComplete

目的：

Todoを登録するだけでなく、
「終わったら完了する」
基本操作を覚えてもらう。

## 表示条件

- onboarding.ready
- intro完了
- todo完了
- todoComplete未完了
- 未完了Todoが1件以上存在

## 文言

`終わったら○をタップ`

補足文は必要最小限にする。

例：

`できたTodoは○で完了できます`

## 完了条件

ユーザーが
実際にTodoを1件完了した時。

その既存完了処理の成功後に、

`onboarding.complete('todoComplete')`

を接続する。

## やってはいけないこと

- GUIDEを表示しただけで完了
- 画面を開いただけで完了
- 架空Todoを追加
- GUIDE専用の完了処理を作る
- 既存Todo完了処理を書き直す

---

# 4. completedTasks

目的：

完了したTodoが消えるだけではなく、
「今日できたこと」として確認できることを知ってもらう。

## 表示条件

- todoComplete完了
- completedTasks未完了
- 今日完了したTodoが存在

## 文言

`今日できたことを確認`

補足：

`終わったTodoはここから振り返れます`

## 対象

既存のTodayWinStrip。

既存導線：

`今日の進み`
↓
`今日できたことを確認`
↓
Modal
`今日できたこと`

新しい完了一覧画面は作らない。

## 完了条件

ユーザーが
実際に「今日できたこと」を
初めて開いた時。

その既存open処理へ、

`onboarding.complete('completedTasks')`

を接続する。

## やってはいけないこと

- Todo完了と同時にcompletedTasksも完了させる
- Modalを自動で強制表示
- 完了Todoデータを変更
- GUIDE用の架空完了Todoを作る

---

# 5. taskBuckets

目的：

Todoを現在の状態に合わせて

- 今やる
- あとで
- 待ち

へ整理できることを知ってもらう。

## 表示条件

- completedTasks完了
- taskBuckets未完了
- 操作可能なTodoが存在

## 文言

`今の状態に合わせて整理`

補足：

`今やる・あとで・待ち に分けられます`

## 完了条件

ユーザーが
実際にTodoのbucketを操作・変更した時。

既存のbucket変更成功後に、

`onboarding.complete('taskBuckets')`

を接続する。

## やってはいけないこと

- GUIDE表示だけで完了
- 初期bucketを勝手に変更
- Todoを自動で移動
- GUIDE専用のbucket stateを作る
- 既存bucketロジックを作り直す

---

# 6. taskDetails

目的：

Todoには必要な時だけ
詳細設定を追加できることを知らせる。

## 表示条件

- taskBuckets完了
- taskDetails未完了
- Todo詳細画面へ進める状態

## 文言

`必要な時だけ、細かく設定`

補足例：

`通知・期限・繰り返しなども設定できます`

## 説明対象

既存TaskModalにある機能。

- 通知
- 期限
- 繰り返し
- ルーティン
- サブタスク

必要に応じて、

- 優先度
- カテゴリ
- 実行日時

も既存画面内で確認できる。

## 完了条件

TaskModalの実際の利用に合わせる。

基本方針：

Todo詳細を開き、
ユーザーが案内を認識した上で
詳細設定へ進んだタイミング。

単にHomeScreenを開いただけでは完了しない。

実装時は既存TaskModalの
open/save処理を確認して、
最も自然な完了イベントへ接続する。

## やってはいけないこと

- Onboarding専用TaskModalを作る
- TaskModal全体を作り直す
- 架空の通知・期限を設定
- GUIDE表示のためにTodoデータを変更

---

# 7. GUIDEの共通ルール

Todo関連GUIDEは
既存 `OnboardingHint.tsx` を基本的に再利用する。

新しいGUIDEコンポーネントを
機能ごとに乱立させない。

デザインは

`Mono Light / minimal`

を基準にする。

既存：

`ONBOARDING_DESIGN_MODE = 'minimal'`

を使用する。

---

# 8. GUIDEの表示量

説明は短くする。

理想：

短い説明
↓
実際に操作
↓
GUIDE完了
↓
そのままRhythmを利用

長文チュートリアルを表示しない。

CoachmarkやSpotlightを
大量に追加しない。

---

# 9. 完了状態

Onboarding状態は

`onboardingStorage.ts`

で管理。

Storage Key：

`rhythm-feature-onboarding-v1`

Todoデータ本体のPersistedStateへ
Onboarding状態を追加しない。

---

# 10. 順番の扱い

基本順：

intro
↓
todo
↓
todoComplete
↓
completedTasks
↓
taskBuckets
↓
taskDetails

ただし、
ユーザーの通常操作を
Onboardingのために禁止しない。

例：

taskDetailsが未完了でも
Todo詳細画面そのものは利用できる。

Onboardingは
機能をロックする仕組みではない。

---

# 11. 初回7枚カルーセルとの関係

初回7枚カルーセルでは
Todoの概要を説明する。

Feature Onboardingでは、
実際の操作タイミングで
短いGUIDEを出す。

同じ長文説明を
二重表示しない。

初回カルーセル内の
現在の仮プレビューは
後から実画面スクリーンショットへ差し替える。

スクリーンショット作業は
Todo Feature Onboardingの実装と独立している。

---

# 12. Notificationとの関係

Notification permissionは
Todo Onboardingへ統合しない。

Todoの通知を
ユーザーが実際に使用する時に、

Rhythm側説明
↓
iOS通知Permission

へ進む。

OnboardingFeatureIdに
notification permissionを追加しない。

---

# 13. Premiumとの関係

Todo基本操作のGUIDEで
不要にPremiumを宣伝しない。

Premium対象機能を説明する必要がある場合のみ、

`Premium（月額サブスク）`

と表記する。

Premium判定は
`app/premiumAccess.ts`
を使用する。

Onboarding側へ
Premium判定を複製しない。

---

# 14. Codex実装ルール

Todo Onboardingを実装する時は、

1. `AGENTS.md`
2. `docs/RHYTHM_HANDOFF.md`
3. `app/features/onboarding/README.md`
4. この `TODO_FLOW.md`

を確認する。

その後、
既存のTodo処理を確認する。

重要：

- App.tsx全面改修禁止
- HomeScreen全面改修禁止
- TaskModal全面改修禁止
- 既存Todo保存処理を書き直さない
- 既存完了処理を書き直さない
- 既存bucket処理を書き直さない
- 必要なcallbackだけ最小差分で追加
- 各まとまりで `pnpm typecheck`
- 4機能実装後に一旦停止
- 勝手にSchedule以降へ進まない

---

# 15. Todo Onboarding完了後

以下4つの実装・実機確認が終わったら、

- todoComplete
- completedTasks
- taskBuckets
- taskDetails

Todo Onboardingは一旦完了。

その後、

1. schedule
2. planRegistration
3. calendarImport
4. focus
5. analysis
6. routine
7. history
8. photoLog
9. wish
10. affirmation
11. design
12. recovery

へ進む。