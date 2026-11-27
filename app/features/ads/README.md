# Rhythm Rewarded Ads

## 視聴済み報酬の保存・復旧（2026-11-23）

広告開始前に保存先への書込・読戻しを確認し、失敗時は広告を開始しない。SDKのEARNED_REWARD時点で記録を開始し、CLOSEDまで待たない。重複EARNEDイベントは1回だけ処理する。保存保留・失敗時は画面を移動しても未保存案内を保持し、広告なしの手動再試行とApp active時の再試行を行う。保存中は二重操作を防ぐ。

`earnedRewardStorage.ts` はSDKのEARNED_REWARD後、権限保存前に視聴済み記録を `rhythm-earned-reward-v1` へ保存する。権限stateのoptionalな `lastAppliedRewardId` により、付与後の記録削除失敗・再起動でも二重付与しない。消費済みcreditも復活させない。期限は元の視聴日時を起点にし、再試行・再起動で延長しない。

起動時の復旧に失敗した場合は権限を未確認のまま保ち、Appがactiveに戻る際に再試行する。記録と権限の両方を保存できない場合はメモリ内の記録で広告なしに再試行できるが、その状態でのプロセス終了までは復旧を保証できない。正常な権限保存が終わる前に解放済み表示にしない。既存の広告回数・解放期間・TestIds切替・StoreKit判定は維持する。

RhythmのFreeユーザー向け
Rewarded広告機能の共通仕様と現在地。

Rewarded広告では、

- 広告SDK
- 広告回数ルール
- Rewarded状態保存
- 解放判定
- Premium判定
- 各画面のUI

を分離して管理する。

---

# 1. 基本方針

Rhythmの一部Premium機能は、
FreeユーザーでもRewarded広告を見ることで利用可能にする。

ただし、

**Rewarded広告による一時的・回数制の利用権**

と

**Premium（月額サブスク）によるアクセス**

は別概念。

Premiumユーザーには
Rewarded広告を要求しない。

---

# 2. 現在の構成

## rewardedAccess.ts

Rewarded広告の
必要回数・解放条件を定義する。

重要：

広告回数や上限を
各UIへ再ハードコードしない。

UIは原則
この定義を参照する。

---

## rewardedAccessStorage.ts

Rewarded広告による

- 視聴進捗
- 解放期限
- 利用権
- 利用可能回数

などをAsyncStorageへ保存する。

Storage Key：

`rhythm-rewarded-access-v1`

Rhythm本体のPersistedStateとは分離する。

Rewarded状態を
既存Rhythmユーザーデータへ直接混ぜない。

---

## rewardedAccessLogic.ts

保存済みRewarded stateから、

- 現在解放中か
- 追加可能か
- 利用可能creditがあるか
- 視聴進捗
- 解放期限

などを判定する。

UIやGoogle Mobile Ads SDKへ
直接依存させない。

---

## app/services/rewardedAds.ts

Google Mobile Adsの
Rewarded SDK担当。

現在はTest Rewarded Ad用基盤。

使用：

`TestIds.REWARDED`

監視：

- LOADED
- EARNED_REWARD
- CLOSED
- ERROR

本番AdMob IDは
リリース準備まで使用しない。

---

# 3. Reward付与の絶対条件

Rewarded広告による権利付与は、

**RewardedAdEventType.EARNED_REWARD**

を受信した場合だけ行う。

以下では権利を付与しない。

- 広告load
- 広告表示開始
- 広告途中終了
- CLOSEDだけ
- ERROR
- 表示失敗
- Reward event未発生

---

# 4. 二重付与防止

以下を防止する。

- ボタン連打
- 同じ広告の二重表示
- EARNED_REWARDの二重処理
- CLOSED時にもRewardを付ける
- 1回の広告で複数creditを付ける

広告視聴中は、
同じRewarded CTAを連打できないようにする。

---

# 5. Premium

Premium判定は、

`app/premiumAccess.ts`

を使用する。

Rewarded側で
別のPremium判定を作らない。

Premiumユーザー：

- Rewarded広告不要
- 対象Premium機能へ通常アクセス

Freeユーザー：

- 対象機能ごとのRewardedルールを利用

---

# 6. 月の目標と今月のテーマ

重要。

既存Wishには、

- 今月のテーマ
- 叶えたいこと
- 叶えるための行動

が存在する。

`月の目標` は、

**既存の「今月のテーマ」と別機能。**

既存の今月のテーマを
月の目標へ置き換えない。

既存データを削除しない。

---

# 7. 叶えたいこと追加

Rewarded Feature：

`wishCreate`

必要広告：

**2回**

表示例：

`0 / 2`
↓
1回視聴
↓
`1 / 2`
↓
2回視聴
↓
1件追加可能

追加権を使用したら、
次の1件には再び2回必要。

Premiumユーザーは広告不要。

---

# 9. 叶えるための行動追加

Rewarded Feature：

`wishActionCreate`

必要広告：

**2回**

2回完了すると、
行動を1件追加可能。

利用後、
次の1件には再び2回必要。

Premiumユーザーは広告不要。

---

# 10. Premium Design

Rewarded Feature：

`premiumDesign`

必要広告：

**1回**

解放：

**3日間**

3日間経過後は
再度広告が必要。

Premiumユーザーは広告不要。

---

# 11. Calendar Import

Rewarded Feature：

`calendarImport`

必要広告：

**1回**

1広告につき、

**1回のカレンダー取り込み**

を可能にする。

利用したらcreditを消費する。

Premiumユーザーは広告不要。

---

# 12. Premium Design試着

プレビュー画面で全Designを確認するだけなら広告は不要です。
Freeユーザーが初めて選んだPremium Designは、`premiumDesignTrial` に
`used`・`designId`・`expiresAt` を保存し、24時間だけ本体へ適用できます。

試着終了後に3日間だけ使う場合は、既存の `premiumDesign`（広告1回・3日間）を
利用します。広告を閉じただけでは解放せず、報酬受領時だけ `unlockedUntil` を更新します。

Premiumユーザーは試着・広告ともに不要です。

---

# 13–15. Photo Top / Background / Focus（最終統合仕様）

`photoTop` / `photoBackground` / `photoFocus` は対象枠ごとに独立した視聴進捗・期限を使う。他枠には引き継がない。

- 1回目：7種類の同梱サンプルを期限なしで解放。
- 2回目：自分の画像を3日間（72時間）解放。期限は2回目のEARNED日時を起点にする。
- 自分の画像の期限が切れたら進捗0から再度2回。サンプル解放は残る。
- 旧`photoCustomization`の永久解放/枠数は互換読込のため保持するだけで、利用判定には使わない（リリース前のため旧方式を廃止するオーナー決定）。
- `photoAccessByTarget`はRewarded保存内の任意フィールド。誤った旧共通`photoAccess`は権利として使わない。receiptには対象枠を保持し、対象不明の旧photoTop receiptは付与せず保持する。保存キー・version・receiptの重複防止・保存キューは維持。
- Premium / Design Customize購入者は広告不要・期限なし。Designの広告解放や24時間無料試着だけでは個人写真を解放しない。
- Widget写真も広告1回で3日間。Widgetの選択対象の扱いは変えない。
- 写真の期限切れは表示用コピーからURIを隠すだけ。保存済みの写真とcropは保持し、再解放すれば再選択なしで復帰する。

Nativeシートを閉じてからpicker/再調整へ復帰する方式を、背景・集中にも適用。継続callbackは最新権限を読むrefを通す。詳細は `docs/photo-final-package.md`。

---

# 16. Routine Skip

Rewarded Feature：

`routineSkip`

必要広告：

**1回**

1広告につき
1日分のskipを取得。

skipを使用しても
連続記録を維持する設計。

Premiumユーザーは広告不要。

---

# 17. Routine Skip Bonus

Rewarded Feature：

`routineSkipBonus`

必要広告：

**2回**

2広告完了すると、

skip可能日を
**+1日**

追加。

広告による追加上限：

**+2日**

Premiumユーザーは広告不要。

---

# 18. Wish画面の現在地

現在のWishは、

`wish_planning`

がPremium機能として
画面全体をロックしている。

将来のRewarded対応では、

Free
↓
Wish画面へ入れる
↓
対象操作だけRewarded制限

へ変更する。

対象例：

- 叶えたいこと追加
- 叶えるための行動追加
- 月の目標

Wish画面全体を
広告1回で解除する仕様にはしない。

---

# 19. Wishデータ

Rewarded対応のために、

- 既存Wish
- 行動
- 今月のテーマ
- 写真
- メモ

などを削除・初期化しない。

Free / Premium切替でも、
既存Wishデータを破壊しない。

---

# 20. Rewarded UIの基本表示

Freeユーザーが
Rewarded対象操作を行った場合は、
短く条件を説明する。

例：

### 叶えたいこと

`広告を2回見ると、叶えたいことを1件追加できます。`

進捗：

`0 / 2`

CTA：

`広告を見る`

---

# 21. 広告視聴中

広告load / 表示中は、

- CTA連打を防止
- 同じ広告を複数生成しない
- 重複Rewardを防止

する。

必要に応じてCTAをdisabledにする。

---

# 22. 広告load中

UIでは、

`広告を準備しています`

などの短い状態表示を使用できる。

広告が利用可能になる前に
権利を付与しない。

---

# 23. 広告load失敗

広告loadに失敗した場合：

- 権利を付与しない
- progressを増やさない
- ユーザーデータを変更しない

表示例：

`広告を読み込めませんでした。時間をおいてもう一度お試しください。`

再試行可能にする。

---

# 24. 広告を途中で閉じた場合

`EARNED_REWARD`

が発生していなければ、

- progressを増やさない
- creditを付与しない
- 解放しない

ユーザーが再度試せる状態へ戻す。

---

# 25. Reward取得後

`EARNED_REWARD`

を受信した場合だけ、
対象featureのprogressまたはcreditを更新する。

その後：

1. state更新
2. AsyncStorage保存
3. UI更新
4. 必要回数達成なら利用可能

の順で扱う。

---

# 26. 利用権の消費

「広告を見た」ことと
「権利を使用した」ことは別。

例：

Wish追加：

2広告
↓
1件追加権取得
↓
実際にWishを保存
↓
追加権を消費

保存失敗時に
追加権を失う実装にしない。

同様に、

- Wish action
- calendar import
- design trial
- routine skip

なども、
実際の対象操作が成功した時に
creditを消費する。

---

# 27. 現在のStorage

Storage Key：

`rhythm-rewarded-access-v1`

現在保存している主な状態：

- legacy wishMonthlyGoal progress / unlockedUntil (decode compatibility only)
- wishCreateProgress
- wishActionCreateProgress
- premiumDesign unlockedUntil
- premiumDesignTrial used / designId / expiresAt
- premiumDesignTrialCredits
- calendarImportCredits
- Photo customization unlock
- routine skipStock
- routine skipBonusAdded
- routine skipBonusProgress

既存schemaを
UI接続のためだけに全面変更しない。

---

# 28. 現在のLogic

既存logicには、

- isPremiumDesignUnlocked()
- canCreateWish()
- canCreateWishAction()
- canImportCalendar()
- canTryPremiumDesign()
- getUnlockedTopPhotoSlots()
- isBackgroundPhotoUnlocked()
- isFocusPhotoUnlocked()
- 各progress取得

などが存在する。

同じ判定を
各画面へコピーしない。

---

# 29. 現在のSDK基盤

`app/services/rewardedAds.ts`

では、

- Mobile Ads initialize
- Test Rewarded生成
- load
- LOADED
- EARNED_REWARD
- CLOSED
- ERROR

まで準備済み。

ただし、

**現在はTest Ad基盤。**

各featureのRewarded state更新まで
完全接続されているわけではない。

---

# 30. 現在地

## 完了・準備済み

- react-native-google-mobile-ads導入
- Expo plugin設定
- Google Test App ID
- TestIds.REWARDED
- Mobile Ads initialize基盤
- Rewarded load基盤
- Event監視
- Rewardルール定義
- Rewarded Storage
- Storage normalize
- Storage load/save/reset
- Rewarded判定Logic
- Premiumとの役割分離
- Rewarded README

## 未完了

- 各UIへのRewarded CTA
- SDK EventとRewarded state更新の接続
- 視聴progress更新
- credit付与
- credit消費
- 二重タップ防止UI
- load中表示
- error表示
- Free Wish画面へのアクセス変更
- Wish追加へのRewarded接続
- その他featureへの横展開
- Development Buildでの実機Test Ad確認

---

# 31. 最初に接続する機能

Rewarded広告を一気に全機能へ接続しない。

最初：

**Wish → 叶えたいこと追加**

だけを完成させる。

確認内容：

- Premiumは広告不要
- Freeは2広告
- 0/2
- 1/2
- 2/2
- EARNED_REWARDのみprogress増加
- 途中終了で増えない
- errorで増えない
- 2/2で1件追加
- 保存成功後に権利消費
- 次は0/2
- 既存Wishデータ維持

これが正常に動いてから
他featureへ横展開する。

---

# 32. Expo Go

Rewarded広告は
native moduleを使用する。

**Expo Goでは実広告テストをしない。**

Expo Goで
無理にRewarded SDKを動かそうとしない。

---

# 33. Development Build

Apple Developer環境が整ったら、
Development Buildで実機確認する。

開発中：

`TestIds.REWARDED`

を使用する。

本番広告IDは使わない。

---

# 34. Production AdMob

本番AdMob IDへの切替は
リリース準備時。

Development中に
本番広告を大量に表示・クリックしない。

---

# 35. Onboardingとの関係

Onboardingでは、

`Freeでも広告を見ることで利用できます`

程度の説明だけ行う。

Onboarding側へ、

- 広告回数
- progress
- credit
- 解放期限
- Reward Event処理

を実装しない。

Rewardedルールは
このfeatureを参照する。

---

# 36. 手動で先にできること

Codexを使用する前に決められる：

- Rewarded Modalの文言
- CTA
- progress表示
- load中文言
- error文言
- Reward取得後文言
- Premium時の表示
- README整理
- UIの軽微な見た目

SDK / Storage / Wish等をまたぐ接続は
Codexへ残す。

---

# 37. Codexへ残す部分

Codexでは、

- 既存Wish画面構造確認
- FreeでもWishへ入れる変更
- Rewarded SDKとの接続
- EARNED_REWARD処理
- state更新
- save
- credit消費
- 二重処理防止
- Premium bypass

を最小差分で実装する。

---

# 38. Codex実装順

作業開始時：

1. `AGENTS.md`
2. `docs/RHYTHM_HANDOFF.md`
3. このREADME
4. `rewardedAccess.ts`
5. `rewardedAccessStorage.ts`
6. `rewardedAccessLogic.ts`
7. `app/services/rewardedAds.ts`
8. `app/premiumAccess.ts`
9. 対象画面

を確認する。

最初は：

`Wish → 叶えたいこと追加`

だけ。

実装後：

`pnpm typecheck`

を実行し、
そこで一旦停止する。

勝手に他Rewarded機能へ進まない。

---

# 39. 絶対にしないこと

- RewardをEARNED_REWARD以外で付与
- CLOSEDでReward付与
- 広告回数を各UIへ再ハードコード
- Premium判定をRewarded側で複製
- Rewarded stateをRhythm本体PersistedStateへ混ぜる
- Wish既存データを削除
- 「今月のテーマ」を「月の目標」へ置換
- Wish全体を広告1回で解放
- Premiumユーザーへ広告要求
- Expo GoでRewarded実広告テスト
- Development中に本番AdMob ID使用
- 一気に全featureへ接続
- App.tsx全面改修

既存基盤を再利用し、
1機能ずつ接続する。
