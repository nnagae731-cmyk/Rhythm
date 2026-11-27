# Wish連携：保存中の取消がNative完了で再適用される競合

## 基準・権限

2026-11-28、オーナーがWish側の調査・修正を承認。HEADは17ffcc0、未コミットの家族共有基盤16ファイルは保護した。家族共有の個人保存変更禁止とは別件の、明示承認された修正。共有Nativeコード・個人storage・KVS・保存形式・キーは変更しない。

## 原因

Nativeから関連Taskを完了→保存待ち中にWishから取消、という順で現在のTask配列が変わると、保存receiptの条件がsupersedeされ待機がrejectされる。従来はここで処理を終了し、Nativeに残った同じaction IDを後続の読取りで未処理と判定して再完了していた。ACKそのものがfalseを返した時も同じ再適用が可能だった。テスト実行タイミングで顕在化が変わるため、単独PASSだけでは否定できなかった。

## 修正

- Appの同一mount内で、一度適用した関連完了のaction IDを記憶する。ACKが成功するまでは同じIDの完了を再適用しない。Taskの関連解除／削除後も、処理済みactionの分類を保って保存待ちを省略しない。
- 保存待ち開始時のTask配列を固定してreceiptと照合する。待機のreject時や成功時に現在のTask/Wish refが変わっていれば、Nativeの完了を再実行せず最新snapshotの保存待ちへ移る。
- 本当の保存失敗ではACKせず終了し、既存の保存再試行へ任せる。新しい独自の書込み・タイマー・即時retryループを作らない。
- 空キュー読取りは「Native利用不可」の場合もあるため、処理済みIDを消す根拠にしない。ACKがtrueで返ったIDだけ記憶から除く。
- 通常のTask完了、通知、既存Native追加、進捗計算、Wish/Taskの識別子・対応関係、UI、80ms debounce、既存直列save queue、STORAGE_KEY、PersistedState、KVS処理はそのまま。

## 変更ファイル

1. app/App.tsx：関連Native完了の再適用防止と、最新意図のreceipt待機。
2. app/__tests__/qa-wish-task-app.test.js：回帰1件追加。既存19件の期待値は変更していない。
3. app/features/wish/README.md：取消競合の説明。
4. 本報告。

## 検証

追加ケースは「Native ACK失敗→一時的な空キュー読取り→Wish取消の保存→同じNative actionを再読取り」。ACK時点の実際の保存JSONがTask/Wishとも未完了であること、ACK後の再起動でも未完了のままであることを確認する。本番AppとWishScreenを使い、AsyncStorage・Native API等の境界だけをmockした。

修正前に追加テストを実行して **FAIL（ACK時のTask.doneがtrue）** を確認。修正後にWish連携 **20件全PASS**。既存の保存中取消・保存失敗／再試行・通知完了・Task編集・相互削除等も維持する。最終は **59 suites / 647件全PASS**（125.893秒、skipなし）、`pnpm typecheck` PASS、`npx expo export --platform ios` PASS（Hermes bundle 4.36MB）、`git diff --check` PASS。家族共有追加63件も含む結果であり、家族共有の初回報告に記載したWishテスト失敗はこの修正で解消した。Native／実機の完了条件が未達である点は変わらない。

`Rhythm-wish-native-completion-race-after-17ffcc0.patch` はこの4ファイルだけを含み、家族共有未適用の17ffcc0へも単独適用できる。家族共有の16ファイルを変更していないことと、パッチのstrict check／一時indexへの実適用を確認する。現在の作業ツリーには実装済みのため再適用しない。

## 範囲・未検証

再適用の記憶は当該App mount内のみで、別の永続IDストアを増やしていない。ACKが不能のままプロセスを終了した場合の「既に適用した古いアクションか、新しい外部操作か」の完全な区別は、このJS修正だけでは保証しない。現行Widgetの完了action IDはtask単位で再利用されるため、プロセスをまたぐexactly-onceや新規タップとの厳密な区別には、別途Nativeイベント識別・永続receiptの設計が必要。保存前の強制終了も従来どおり未保存変更を失う可能性がある。

WindowsのJestは状態・保存待ち・再取込・ACK API呼出しを検証する。実機のWidgetタップやApp Intents実行／App Groupロックを直接検証したものではない。家族共有基盤のNativeビルド・別Apple ID実機2台確認も、引き続き未検証／Phase D未完了。

commit/pushは今回実施しない。
