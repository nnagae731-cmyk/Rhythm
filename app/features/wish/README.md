# WishActionとTODOの連動（2026-11-22）

画面・タブ・進捗計算式を変更せず、明示的に関連する単発TODOだけを連動する。

## 保存形式と互換性

Taskにoptionalな `origin: { monthKey, wishId, actionId }` を保持する。WishActionの既存IDを使用し、タイトルや作成順から旧データを推測関連付けしない。WishAction側にTask IDのミラーは追加しない。既存の保存キー・ルート形式・通常Taskを維持する。

`wishTaskLink.ts` がorigin・関連先・1対1の一意性を検査する。不正なorigin、存在しない目標/行動、曖昧な重複関連は自動完了連動の対象にしない。元のデータを勝手に削除・統合しない。

## 更新の入口

- Task → WishAction：Appの `completeTaskIds`、`restoreTaskById`、完了済みTaskのサブタスク取消から `wishMonthsAfterTaskCompletion` を呼ぶ。Focus・通知・Widget/App Intents保留完了も既存の共通入口を使う。
- WishAction → Task：Appの `setWishMonths` mutation boundaryで、最新のrefに対して変更を適用し `taskChangesAfterWishEdit` で明示的な完了差分だけを抽出する。実際のTask変更は上記共通完了/取消入口を使い、通知・分析イベントも維持する。
- 相互監視するuseEffectを使わない。Taskが既に要求状態なら再完了せず、WishActionが既に同じ状態なら同じオブジェクトを返す。
- 目標そのものの `Wish.completed` は自動変更しない。画面の進捗率は既存式を維持し、Widgetも `calculateWishProgress` で同じ目標・行動を母数にする（目標未完了＋行動1件完了は両方50%）。

## 作成・編集・削除

- 同じoriginのTaskがあれば、完了済みでも再作成しない。既存Taskがある旨を案内する。同名でもoriginのないTaskは別物。
- 行動の横の「ToDoを確認」は、一意に関連するTaskだけを直接開く。行動Editor上に別のNative Modalを重ねず、元の画面から移動する。
- 単体Task削除は約6秒間「元に戻す」で取り消せる。最新Task配列へ対象だけ戻し、別Taskの変更を巻き戻さない。アプリ終了後の取り消しや、確認済みの一括削除の取り消しは対象外。
- 行動Editorの「保存してToDoに追加」は、新規行動でも保存・開き直しを挟まず利用できる。行動の永続化完了後に既存のToDo作成処理へ進み、`waitForSettingsSave` がToDoの実際の永続化成功を受け取ってからEditorを閉じる。成功AlertをModal上へ重ねず、閉じた後に既存の2.8秒メッセージを表示する。
- 保存失敗時は行動Editorと入力を保持する。行動だけ保存済みの場合はそのIDをEditorに保持し、再試行で同じ行動・Taskを保存する。行動追加権利の消費も二重にしない。
- Taskのタイトル・日時・メモ等はoriginを維持する。編集保存では編集開始時の古いTaskではなく、最新Taskの完了状態とoriginを引き継ぐ。WishActionの文章は変更しない。
- Task削除はWishActionを削除せず、行動の完了状態も変えない。
- WishAction/親Wishを削除した場合、Taskは残してoriginだけを外す。別のWishへ行動を移動して元の組合せが無効になった場合も同様。
- 複製したTaskと繰り返し生成した次回Taskにoriginを継承しない。
- 関連済みTaskを繰り返し/ルーティンへ変更する保存時は、解除の確認を出す。取消なら編集を続け、確認時だけoriginを解除する。元の行動・完了状態を保持し、通常の繰り返し機能は維持する。

## 永続化と外部経路

TaskとWishActionを同じイベント内で更新し、既存のApp全体snapshot・`saveRhythmState`の直列キューで一つのJSONとして保存する。別のWish専用保存ファイルや通知専用の連動ストアは追加しない。

関連TODOのWidget/App Intents完了は、最新のTask/Wish状態の永続化成功後だけNativeキューへACKする。保存失敗時はACKせず、既存の未保存表示・保存再試行・次回App起動/復帰から再取り込みできる。保存中にユーザーが完了取消/削除した場合も、古い完了ではなく最新の意図を保存してからACKする。

NativeのTODO追加（Siriを含む）は独立したTaskであり、同じタイトルだけでは目標と関連付けない。Swift側のWidget描画・Siri発話・App Intents起動そのものはWindowsで検証できない。

## 限界

- 保存が完了する前の即時のプロセス強制終了・OS停止では、最後の変更が未保存になる可能性がある。Reactのstate変更や通知取消を保存完了とは扱わない。
- Nativeキュー由来の連動はAppが起動/復帰してJSで取り込んだ時点で行う。JSが停止している間にSwiftだけでWishデータを書き換える変更はしていない。
- 1行動に複数Task、部分進捗、繰り返しTaskの自動連動は対象外。

## 回帰テスト

`__tests__/qa-wish-task-link.test.js` は本番の関連処理・既存進捗・保存/読込・既存繰り返し生成を直接使用する。
`__tests__/qa-wish-task-app.test.js` は本番App・WishScreen・今日画面・TaskModalから操作し、保存データと再描画後の表示を確認する。AsyncStorage・通知・広告/課金SDK・Widget Native Moduleだけを境界としてMockする。
