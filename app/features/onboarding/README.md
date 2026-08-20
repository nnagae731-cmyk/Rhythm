# Rhythm Feature Onboarding

Rhythmの初回使い方案内を管理する。

オンボーディングは、

- アプリ初回起動時の7枚カルーセル
- 各機能を初めて使う時の短いGUIDE

の2種類に分ける。

長い説明を一度に読ませず、

短い説明
↓
実際の操作
↓
そのままRhythmを使う

という流れを基本とする。

---

# 1. 初回起動カルーセル

初回起動時のみ自動表示する。

設定画面の

`Rhythmの使い方`

から同じカルーセルを再表示できる。

設定から再表示しても、
各Onboardingの完了状態はリセットしない。

---

# 2. 初回7枚の構成

## 1枚目

### やることを、そのまま入力

例：

`明日15時に美容院`

のように入力すると、
日時も含めてTodoへ登録できる。

マイク入力も利用可能。

---

## 2枚目

### 今日やることを整理しよう

Todoを

- 今やる
- あとで
- 待ち

に分けて確認できる。

終わったTodoは○で完了。

完了した内容は
「今日できたこと」から確認できる。

---

## 3枚目

### 予定と1日の流れをひとつに

Todoと予定を
時間の流れで確認できる。

予定登録では、

- 予定表だけ
- 出発時刻
- 到着から逆算

を利用する。

`到着から逆算` は

`Premium（月額サブスク）`

対象。

---

## 4枚目

### 今やる1つに集中

Todoを選択し、
集中タイマーを開始できる。

他のアプリを開いている間も
実時間を基準にタイマーは進む。

---

## 5枚目

### できたことを残そう

完了したTodoや集中記録を確認できる。

写真と一言・メモを残すこともできる。

写真記録そのものはFreeで利用可能。

---

## 6枚目

### 叶えたいことを、行動へ

Wishでは、

今月のテーマ
↓
叶えたいこと
↓
叶えるための行動

へつなげる。

基本機能は

`Premium（月額サブスク）`

として扱う。

Freeユーザーも、
対象機能はRewarded広告を見ることで
利用可能にする。

広告回数や解放条件は
Onboarding側へ実装しない。

`app/features/ads/`

を参照する。

---

## 7枚目

### Rhythmを、自分らしく

Rhythmの見た目を

- Mono
- Design
- Photo

から選べる。

アファメーションなど
一部機能はPremium対象。

最終CTA：

`Rhythmをはじめる`

---

# 3. 初回7枚の操作

- 横スワイプ
- ページドット
- 1〜6枚目：次へ
- 1〜6枚目：スキップ
- 7枚目：Rhythmをはじめる

スキップまたは
`Rhythmをはじめる`
で `intro` を完了扱いにする。

---

# 4. 初回7枚のビジュアル

重要。

初回7枚の文章・順番・操作・保存の仕組みは確定。

ただし、
現在の `OnboardingCarousel.tsx` にある

- ＋
- ✓
- ↗
- 25:00
- ▦
- ✿
- Aa

などの簡易プレビューは仮実装。

最終版では使用しない。

---

# 5. カード内には実際のRhythm画面を使用する

初回カルーセル内で
機能を紹介する画面は、

**実際のRhythm画面そのもの**

を使用する。

禁止：

- 実画面に似せた架空UIを作る
- 存在しない画面を手書きで再現する
- 実際と違う文言・配置を使う
- スクリーンショットをAIで描き直す
- 架空の分析データを作る

優先順位：

1. 既存画面・既存コンポーネントを安全に再利用
2. 大規模改修になる場合は実機スクリーンショットを使用
3. 正確な素材がない場合は必要なスクリーンショットを用意する
4. 素材不足を理由に偽UIを作らない

スクリーンショット差し替え作業は
後から行ってよい。

---

# 6. Onboarding自体のテーマ

Onboardingの説明カード・外枠は

`Mono Light / minimal`

を基準に固定する。

ユーザーが現在

- Mono Dark
- Design
- Photo

を使用していても、
Onboardingの説明部分はMono Lightで表示する。

`onboardingSteps.ts`

の

`ONBOARDING_DESIGN_MODE`

を使用する。

値：

`minimal`

専用の新しいカラーパレットは作らない。

既存 `theme.ts` の
Mono Lightを使用する。

---

# 7. 実画面紹介とOnboardingテーマは別

Onboarding外枠はMono Light固定。

ただし、
カード内で紹介する画面は

**本物のRhythm画面**

を優先する。

特に7枚目のDesign紹介では、

- Mono
- Design
- Photo

の実際の見た目を使用する。

全機能を全テーマで作り直す必要はない。

---

# 8. Feature Onboarding

初回カルーセル終了後は、
ユーザーが各機能を初めて使用するタイミングで
短いGUIDEを表示する。

対象ID：

- intro
- todo
- todoComplete
- completedTasks
- taskBuckets
- taskDetails
- schedule
- planRegistration
- calendarImport
- focus
- analysis
- routine
- history
- photoLog
- wish
- affirmation
- design
- recovery

Notification permissionは
OnboardingFeatureIdへ追加しない。

---

# 9. Todo Onboarding

## todo

実装・実機確認済み。

初回カルーセル完了後、
今日画面へ短いGUIDEを表示する。

スマート入力から
最初のTodoを1件登録した時に完了。

ここは作り直さない。

---

## todoComplete

次に実装する。

表示条件：

- intro完了
- todo完了
- todoComplete未完了
- 未完了Todoが存在

文言：

`終わったら○をタップ`

実際にTodoを1件完了した時だけ
完了扱いにする。

GUIDEを見ただけでは完了しない。

---

## completedTasks

todoComplete完了後。

文言：

`今日できたことを確認`

既存の

`今日の進み`
↓
`今日できたことを確認`
↓
`今日できたこと`

を利用する。

ユーザーが実際に初めて開いた時に完了。

---

## taskBuckets

文言：

`今の状態に合わせて整理`

対象：

- 今やる
- あとで
- 待ち

実際にbucketを操作・変更した時に完了。

---

## taskDetails

文言：

`必要な時だけ、細かく設定`

既存Todo詳細設定を利用する。

説明対象：

- 通知
- 期限
- 繰り返し
- ルーティン
- サブタスク

Onboarding用の別Todo編集画面を作らない。

---

# 10. Todo以降の順番

Today完了後：

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

---

# 11. 完了タイミング

単に画面を開いただけで
すぐ完了扱いにしない。

基本は、

- 実際に操作した
- CTAを押した
- 対象機能を初めて使用した

など、
ユーザーが内容を認識・使用した時に完了させる。

例：

- focus → タイマー開始
- planRegistration → 予定保存
- routine → ルーティン保存
- photoLog → 写真記録保存

---

# 12. Storage

Onboarding状態は

`app/features/onboarding/onboardingStorage.ts`

で管理する。

Storage Key：

`rhythm-feature-onboarding-v1`

Rhythm本体のPersistedStateへ
Onboarding状態を直接追加しない。

既存ユーザーデータと分離する。

---

# 13. 再表示

通常は初回のみ。

設定画面の
`Rhythmの使い方`
から初回カルーセルを再表示可能。

再表示しても、
Feature Onboardingの完了状態をリセットしない。

開発時は必要に応じて

- resetOnboardingFeature()
- resetAllOnboarding()

を使用する。

---

# 14. Premium

Premium判定は

`app/premiumAccess.ts`

を使用する。

Onboarding側で
Premium判定ロジックを重複実装しない。

初回にPremiumを説明する場合は、

`Premium（月額サブスク）`

と表記する。

価格は確定するまで
Onboardingへハードコードしない。

---

# 15. Rewarded広告

Rewarded広告仕様は

`app/features/ads/`

を使用する。

Onboardingでは、

`Freeでも広告を見ることで利用できます`

などの説明だけ行う。

以下をOnboardingへ実装しない：

- 必要広告回数
- 視聴進捗
- 解放期限
- 解放回数
- Reward判定
- Premium判定

---

# 16. Notification

Notification permissionは
Feature Onboardingとは別管理。

アプリ初回起動直後に
iOSシステム通知許可を表示しない。

通知が必要な機能を
ユーザーが使用した時に、

Rhythm側説明
↓
iOSシステム許可

の順で案内する。

`app/features/notifications/`

を参照する。

---

# 17. Focus

集中タイマー詳細は

`app/features/focus/`

を参照する。

Onboarding側では、

- Todoを選ぶ
- 時間を選ぶ
- スタートする

という基本導線だけ説明する。

Focusの

- background処理
- notification
- navigation guard
- AlarmKit

などのロジックを
Onboarding側へ実装しない。

---

# 18. Analysis

初回はデータが少ない可能性がある。

Onboardingの見栄えのために
架空の分析データを保存しない。

本物のユーザーデータだけを使用する。

---

# 19. Routine

GUIDEのために

- streak
- history
- skip
- 中断状態

を変更しない。

既存ユーザーデータを守る。

---

# 20. Photo

写真記録そのものはFree。

Photoカスタマイズの一部が
Premium / Rewarded対象でも、

写真を記録する機能自体を
Premium扱いにしない。

---

# 21. Codex実装ルール

CodexがOnboardingを変更する場合：

1. `AGENTS.md` を読む
2. `docs/RHYTHM_HANDOFF.md` を読む
3. このREADMEを読む
4. `TODO_FLOW.md` を読む
5. 既存実装を確認する
6. App.tsxを全面改修しない
7. 既存データを初期化しない
8. 架空データを保存しない
9. Premium判定を重複実装しない
10. Rewarded判定を重複実装しない
11. Notification permissionをOnboardingへ統合しない
12. 1機能ずつ実装する
13. 各まとまりで `pnpm typecheck`
14. 勝手に次の機能へ進まない

---

# 22. 現在地

完了：

- Onboarding Storage
- useOnboarding
- 初回7枚の文言
- 初回7枚の順番
- 横スワイプ
- ページドット
- スキップ
- Rhythmをはじめる
- intro完了保存
- 初回のみ自動表示
- 設定から再表示
- Todo最初のGUIDE
- Todo登録時のGUIDE完了
- Todo GUIDE実機確認

未完了：

- 初回7枚の仮プレビューを実画面へ差し替え
- todoComplete
- completedTasks
- taskBuckets
- taskDetails
- その他Feature Onboarding

現在は
スクリーンショット差し替えを後回しにしてもよい。

先に、
画像不要・ロジック接続不要の
文書整理や小さい修正を進める。