# 通知リスナー分離・重複実装の棚卸し（2026-11-27）

## 基準と適用順

- main `1dcdfa6`、既存342テストを基準とする。UI、保存形式、課金・広告復帰フローは変更しない。
- 前段のPhase 5保存hookは作業ツリーに適用済み。保存回帰4件を含む差分を維持し、その上に今回の変更を重ねた。hydration内のリスナー分離との競合なし。
- 成果物はmain向けの累積パッチ（Phase 5込み）とする。commit/pushは行わない。

## 改修1

- 通知レスポンスリスナーは独立したeffectでマウントごとに登録し、unmountで解除。hydration retryでも張り替えない。
- 毎render更新する`notificationCallbacksRef`で出発アクション、通知行動記録、行動記録、共有同期・共有画面表示の最新callbackを参照する。既存のタスク完了ref・状態ref・保留キューは維持。
- hydration effectは`[hydrationRetry]`だけに依存する。読込失敗時の保存停止・データ保護、activeによる中断判定は変更なし。
- 保留再生順序は元のまま：通知完了 → 出発アクション → 保留行動イベント/通知行動記録 → 共有パケット → 共有トークン → 画面遷移。
- ref経由呼出し・effect境界・空白を除き、移動前後の復元/リスナー本文の一致を機械確認。
- `qa-notification-subscription.test.js`：callback identityを意図的に変え、Free/Premium切替でも読込・登録が1回、最新callback呼出し、unmount解除、読込中DONEの保留と読込失敗→明示retryでの再生を検証。

## 改修2：統合前の全棚卸し

`repeatUtils.ts`と`taskUtils.ts`の直接重複は6関数。依存する日付計算のドリフトも防ぐため、`dateTimeUtils.ts`と`taskUtils.ts`の11関数も対象にした。

| ペア | 判定・配置 |
| --- | --- |
| `isOccurrenceAfterToday` | 一致。`repeatDateUtils.ts`へ共通化 |
| `advanceDateBySteps` | 一致。同上 |
| `nextFutureOccurrence` | 一致。同上 |
| `repeatSeriesKey` | 分岐/三項演算子とコメントの違いのみ。共通化 |
| `completeTasksWithRepeats` | 相違あり。両実装を維持 |
| `completeTasksAndCollectEvents` | collector自体は同じ結果抽出だが、呼ぶ完了処理が異なる。両実装を維持 |
| `parseClock` | 一致。`dateTimeUtils.ts`へ集約しtaskUtilsから再export |
| `dateForClock` | 一致。同上 |
| `dateKey` | 一致。同上 |
| `dateForReminder` | 一致。同上 |
| `todayInputValue` | 一致。同上 |
| `advanceDateValue` | コメント以外は一致。同上 |
| `deadlineLabel` | 一致。同上 |
| `getTargetDate` | 一致。同上 |
| `formatLiveDate` | 一致。同上 |
| `formatLiveTime` | 一致。同上 |
| `countdownToClock` | 不正clock時の扱いが相違。両実装を維持 |

重複型`TaskCompletionResult`も構造が一致しており、taskUtilsからrepeatUtilsの型を再exportする。公開export名を削除しない。繰り返し共通部はscheduleConflict/taskUtilsをimportしない独立moduleに置き、循環依存を作らない。

### 統合しなかった差異

- 完了処理：Task IDとlistItems IDの生成形式・乱数使用回数が異なる。
- リマインド：App/repeatUtilsは`remindAt`がある場合に日付を進め、日付なしならscheduledDate/今日を補完する。taskUtilsは`remindDate`がある場合だけ進める。どちらの契約も維持する。
- 時計：taskUtilsはバッチ単位の`now`、App/repeatUtilsは各次回Task生成時の`now`を使用する。これも変更しない。
- `countdownToClock`：Appは正規のHH:mm以外を「予定なし」にするが、taskUtilsは従来のparseClock補正を適用する。
- collectorも上記完了処理の差を返すため、本文だけ同じでも再exportに置換しない。

### テストを先に実行

`qa-repeat-equivalence.test.js`の当初19件は統合前にPASSし、統合後もPASS。さらに日付をまたぐバッチの時計差異を固定する2件を追加し、計21件PASS。fixtureは統合前mainのtaskUtilsから対象17関数をそのまま抽出した独立oracleで、本番からはimportしない。

- 繰り返し全5ルール、未指定日、月末、閏年、週末、年越し、古い予定からの繰越、複数steps。
- skipped/completed、routineEndedAt、routineResumedAt付き、既存次回Task、メモ/サブタスク、入力非破壊性。
- 一致しない完了ID・リマインド補完、不正clockは相違を固定するテストとする。
- 時刻/乱数を固定して比較。既存taskUtilsの結果は統合後も旧fixtureと完全一致する。

## 検証

- 新規2 suites・23件PASS（通知2、等価性/相違固定21）。前段Phase 5回帰4件は別。
- `pnpm typecheck` PASS。
- 全Jest：42 suites・369件PASS、0件FAIL（既存342＋Phase 5回帰4＋今回23）。
- 初回全体実行は関連メモdarkの保存待ち1件が既定1秒でタイムアウトした。実書込と全テーマApp描画を待つ既存assertionは維持し、同suiteの他のI/O待ちと同じ7秒へ揃えた後、全体一括実行がPASS。アプリの保存待ち時間や保存処理は変更していない。
- iOS向けJS export PASS（1,163 modules、4.24MB、28 assets）。Native Buildとは別。
- `git diff --check` PASS。
- Reactレビュー用スキルで、購読固定・最新callback参照・cleanupを確認した。新しいReact APIへの置換や依存ライブラリ更新はしない。
- iPhone Native通知配信・OSによるbackground動作は今回のJSテストの範囲外。
