# Rhythm Full Handoff

更新基準: 2026-08-20

この文書はRhythmの現在仕様、
実装済み基盤、
未接続部分、
今後の作業順をCodexへ引き継ぐための全体スナップショット。

詳細な作業ルールは
ルートの `AGENTS.md` も必ず参照する。

---

# 0. 現在の作業方針

現在はCodexの使用量をできるだけ抑える。

先に手作業で安全にできるものを進める。

優先：

1. README / handoff整理
2. 文言・定数確認
3. 小さいファイルの差し替え
4. 誤字・文字化け
5. UIの軽微な修正
6. Expo Goで確認できる範囲
7. `pnpm typecheck`
8. commit / push

その後、

- 複数画面
- 複数state
- navigation
- notifications
- Rewarded Ads
- 大きいApp.tsxとの接続

など、
広いコード確認が必要な作業だけCodexへ渡す。

---

# 1. Onboarding画像作業について

初回7枚カルーセルの
現在の記号・簡易プレビューは仮実装。

最終版では
実際のRhythm画面を使う。

ただし、

**スクリーンショット準備・画像差し替えは現在後回し。**

先に画像不要の作業を終わらせる。

画像作業を再開した時は、

- 本物のRhythm画面
- 実機スクリーンショット
- 安全に再利用できる既存component

だけを使用する。

禁止：

- 架空UI
- 実画面に似せた偽UI
- AIによるスクリーンショット描き直し
- 存在しないカード・文言
- 架空分析データ

---

# 2. プロダクト

Rhythmは、

**「忘れない」から、「間に合う」へ。**

を軸にした予定・行動管理アプリ。

単なるTodo一覧ではなく、

現在時刻・予定・行動状態から
「次にやる1つ」を分かりやすくする。

予定が崩れた場合は、
その時点から立て直せることを重視する。

初期リリース：

**iOS優先**

主要Bottom Navigation：

- 今日
- 予定
- 分析
- 叶えたいこと
- 設定

Screen type：

`home`
`timeline`
`analysis`
`settings`
`wish`

---

# 3. 開発環境

Repo root：

`C:\Users\natsumi\Documents\Codex\Apps\Rhythm`

App root：

`C:\Users\natsumi\Documents\Codex\Apps\Rhythm\app`

主要環境：

- Expo `~54.0.37`
- React Native `0.81.5`
- React `19.1.0`
- AsyncStorage `2.2.0`
- expo-notifications `~0.32.17`
- expo-dev-client `~6.0.21`
- react-native-google-mobile-ads `16.4.0`
- @react-native-community/datetimepicker `8.4.4`

package manager：

`pnpm`

型チェック：

```powershell
pnpm typecheck
```

---

# 2026-08-21 Release-prep batch status

## Completed / connected

- Feature GUIDE is shown as a compact bottom sheet. Dismissing a GUIDE does not
  complete it; completion remains connected to the real operation.
- The current basic flow is Todo registration → Todo completion → Design choice
  → schedule registration → Focus start. Auxiliary Todo guides are held until
  the basic Focus step is complete.
- Free Design is limited to Mono and Design plain for persistent application.
  Premium patterns and Photo remain previewable without changing persisted
  Theme state.
- A first Premium Design trial is stored in `rhythm-rewarded-access-v1` as
  `premiumDesignTrial.used`, `designId`, and `expiresAt`. It is applied by
  wall-clock expiry rather than a running timer. After expiry, the existing
  `premiumDesign.unlockedUntil` path is used for the 12-hour Rewarded unlock.
- Wish is visible to Free users; only the existing `wish_planning` operation
  limit uses the existing Rewarded access logic.
- Notification permission flows use `notificationPermission.ts` before task,
  departure, Focus, and affirmation notification registration. Notification
  permission is not an onboarding feature.
- Focus navigation guard, wall-clock timer, completion notification cancel/
  reschedule, and real operation completion callbacks remain in place.

## Not completed / release blockers

- `OnboardingCarousel.tsx` still contains the old symbol-based preview. Replacing
  it safely requires either real device screenshots or a separately extracted
  screen component; no such approved assets were present in this checkout.
- `PremiumModal.tsx` still contains the existing hand-authored mini previews for
  feature explanations. Replacing them with real screens has the same asset /
  extraction requirement and was intentionally not faked in this batch.
- Phase 7 individual GUIDE placement and Phase 8 full device audit remain
  pending until the preview source decision is made.

## Verification

- `cd app && pnpm typecheck`: passed.
- `npx expo export --platform ios`: passed in the preceding implementation batch.
- Expo Go cannot verify native Rewarded ads or iOS notification prompt behavior;
  those require a Development Build / physical device.
