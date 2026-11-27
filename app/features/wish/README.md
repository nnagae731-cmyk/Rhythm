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
- 関連TODOがある行動の削除時は「行動だけ削除」「関連TODOも一緒に削除」を選ぶ。「行動だけ削除」はTaskを残しoriginだけを外す。同時削除は確認時のTask IDとmonthKey/wishId/actionIdを再検査し、一意に関連する単発Taskだけを削除する。同名・別月のTaskは対象にしない。
- 同時削除は既存のTODO通知取消とApp全体snapshot保存キューを使用する。実際の保存完了までEditorを閉じず、保存失敗時は入力と削除意図を保持し「削除を再試行」できる。他のTaskの更新を古いsnapshotで巻き戻さない。
- 親Wishの削除や、別のWishへ行動を移動して元の組合せが無効になった場合は、従来どおりTaskを残してoriginだけを外す。
- 複製したTaskと繰り返し生成した次回Taskにoriginを継承しない。
- 関連済みTaskを繰り返し/ルーティンへ変更する保存時は、解除の確認を出す。取消なら編集を続け、確認時だけoriginを解除する。元の行動・完了状態を保持し、通常の繰り返し機能は維持する。

## 永続化と外部経路

TaskとWishActionを同じイベント内で更新し、既存のApp全体snapshot・`saveRhythmState`の直列キューで一つのJSONとして保存する。別のWish専用保存ファイルや通知専用の連動ストアは追加しない。

関連TODOのWidget/App Intents完了は、最新のTask/Wish状態の永続化成功後だけNativeキューへACKする。保存失敗時はACKせず、既存の未保存表示・保存再試行・次回App起動/復帰から再取り込みできる。保存中にユーザーが完了取消/削除した場合も、古い完了ではなく最新の意図を保存してからACKする。

2026-11-28の取消競合修正：同一mount内で適用した関連NativeアクションIDをACK成功まで記憶し、保存のsupersedeやACK失敗後に再完了しない。保存待ちの間にTask/Wishが変わった場合は、最新snapshotの保存待ちへ切り替えてからACKする。空キューの読取りだけでは適用済み記憶を消さない（Native利用不可も空配列として返るため）。新しい保存経路や永続フィールドは追加しない。詳細とプロセス終了時の限界は `docs/wish-native-completion-race.md`。

NativeのTODO追加（Siriを含む）は独立したTaskであり、同じタイトルだけでは目標と関連付けない。Swift側のWidget描画・Siri発話・App Intents起動そのものはWindowsで検証できない。

## 限界

- 保存が完了する前の即時のプロセス強制終了・OS停止では、最後の変更が未保存になる可能性がある。Reactのstate変更や通知取消を保存完了とは扱わない。
- Nativeキュー由来の連動はAppが起動/復帰してJSで取り込んだ時点で行う。JSが停止している間にSwiftだけでWishデータを書き換える変更はしていない。
- 1行動に複数Task、部分進捗、繰り返しTaskの自動連動は対象外。

## 回帰テスト

`__tests__/qa-wish-task-link.test.js` は本番の関連処理・既存進捗・保存/読込・既存繰り返し生成を直接使用する。
`__tests__/qa-wish-task-app.test.js` は本番App・WishScreen・今日画面・TaskModalから操作し、保存データと再描画後の表示を確認する。AsyncStorage・通知・広告/課金SDK・Widget Native Moduleだけを境界としてMockする。

## ひと言日記の導線・入力・保存確認（2026-11-27）

- ホーム全タブの上部に「ひと言日記」を配置。保存した文章・写真のプレビューと「今日の日記を書く／見る」を表示する。
- ホームの保存済み表示は、読込済みデータと既存のroot保存キューの成功通知から作るUI用のreceiptだけで判定。楽観更新や保存失敗では新しい内容を保存済みと表示しない。保存形式・保存キー・Premium境界は変更しない。
- 日記シートはKeyboardAvoidingViewとスクロール時のキーボードdismissを使用。スクロール外の固定ヘッダーに「キーボードを閉じる」を置き、ひとことのReturnキーとフォーム内の「入力を終える」もKeyboard.dismissへ接続する。
- 複数行入力は改行を保持。キーボードを閉じても入力・写真は消さない。保存開始時にはキーボードを閉じる。
- 保存成功後は本文・写真の確認表示と、消えない「保存済みの日記」を表示。保存中/失敗時は入力を保持し、既存の再試行経路を維持する。
- HistoryScreen内の日記フォームを共通化し、単独シートと履歴カレンダーで編集・削除・保存待ちを同じ処理へ通す。
- WindowsのテストはJS状態・保存待ち・失敗/再試行・再起動・Keyboard.dismiss呼出しとレイアウト用propsを検証する。実際のiPhoneのキーボード高さ・小画面・文字拡大・スクロールは別途実機で確認する。
- 検証：全Jest 39 suites・342件PASS（今回4件追加）。最終のFree本文/写真保護ケースも再実行PASS。型チェック・iOS向けJS export・diffチェックPASS。commit・pushは未実施。
