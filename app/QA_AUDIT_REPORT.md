# RhythmPace 全機能QA一次点検

## 最新：2026-11-22 WishActionとTODOの1対1連動

基準：branch `qa-checkpoint-20261117`、HEAD `7a17a30a7e374a7dda3c536ab351a185f51ae601`、既存194 PASS。開始時のLOCAL変更・未追跡ファイルをすべて保持。今回commit・push・EAS Buildは行わない。

### 実装

- Taskのoptional `origin: { monthKey, wishId, actionId }` を追加。WishActionや保存キーは変更せず、旧Task・旧Wish・関連なしTaskをそのまま読み込む。同名から推測して関連付けない。
- `features/wish/wishTaskLink.ts` がID・関連先・1対1の一意性を検査。破損・不在・曖昧な複数関連・繰り返し/ルーティンは自動連動から除外する。
- Appの最新refに対するWish変更入口と、既存のTask完了/取消入口を接続。相互監視useEffectは追加しない。通知取消・再予約、Focus等からの完了、既存の分析イベント生成を同じ共通入口で維持する。
- Task/WishActionを同じApp全体snapshotに含め、既存グローバル保存キューの一回のJSON書込みで保存する。Wish専用の別保存経路は作らない。保存保留中の他TODO編集・連続取消/完了で、古いsnapshotによる片方だけの更新を防ぐ。
- 同じoriginが既に存在する場合は完了済みでも新規Taskを作らず案内。新規作成/再試行の成功Alertは既存の永続化receiptが成功してから出す。失敗時はEditorと入力を保持し、再試行で同じTaskを保存する。
- Task編集は最新Taskのorigin・完了状態を保持し、元行動の文章は変更しない。編集中の通知完了を、古い編集開始時のdoneで巻き戻さない。
- Task削除は元行動/完了状態を維持。行動・親目標削除はTaskを残してoriginだけ解除。関連Taskを繰り返しへ変更する場合は明示確認し、取消なら変更しない。複製/次回生成Taskへoriginを複製しない。
- 関連TaskのNative保留完了は、最新の両状態の保存成功後だけNativeキューへACK。保存失敗時はキューを残す。保存中の取消・削除を古い完了で上書きせず、最新状態の保存を待ってACKする。

### 必須ケースの検証範囲

| 項目 | 実行した検証 | 結果 |
| --- | --- | --- |
| 行動→TODO作成・関連ID保存・重複防止 | 本番Wish UI、ボタン連打、同じ行動から再作成、同名独立TODO | PASS |
| TODO完了/取消→行動 | 本番今日画面、完了一覧から取消、永続データ・再読込 | PASS |
| 行動完了/取消→TODO | 本番Wishチェック操作、Task状態と保存内容 | PASS |
| 進捗率 | 既存calculateWishProgressを直接検証＋Wish UIの50%表示。目標自体を勝手に完了させない | PASS |
| タイトル編集と同名別TODO | 本番TaskModalで編集、origin維持、元行動の文章/別TODOが変わらない | PASS |
| Task削除 | 本番UI削除後に再読込、元行動を保持。共通関数でも削除による行動の未完了化なしを確認 | PASS |
| 行動削除 | 本番Wish UI削除、Taskを独立化、再読込後もTaskの完了操作可能 | PASS |
| 旧データ・不在/破損参照 | 本番関連関数・saveRhythmState/loadRhythmStateで互換性、不正origin6種、null月、存在しない目標を確認 | PASS |
| 過去月 | 本番今日操作から過去月の行動だけを更新、現在月は変更せず再読込 | PASS |
| 保存保留・失敗・再試行 | 本番作成と完了で失敗を制御。成功表示抑制、Editor保持、UI再試行、両データの復元を確認 | PASS |
| 非同期競合 | 書込を保留中に別TODOを編集、全書込snapshotでTaskと行動の完了状態を比較。編集途中の通知完了も確認 | PASS |
| 連続操作 | 連打による一件生成、行動チェックの連続取消/完了、再読込後の整合 | PASS |
| Widget/App Intents | Native完了キュー→本番JS→保存→ACK→Widget goal snapshot。保存失敗と再試行、保存中のWish側取消も確認 | PASS（JS境界まで） |
| 通知 | 本番通知DONEコールバック→共通完了→関連行動。既存取消処理も実行 | PASS（OS配信は対象外） |
| 繰り返し | 本番編集UIで解除確認取消/承認、通常の次回生成。共通繰り返し関数でorigin非継承を確認 | PASS |
| 保存直前のiOS強制終了・Siri発話・Native描画 | Windowsのunmount/remountとNative APIのMockでは実際のOS停止・発話・描画を再現できない | 実機必須 |

### テスト結果

- 既存194件を含む **29 suite / 218 PASS・0 FAIL**。追加24ケース＝共通本番処理13件＋本番App連動11件。
- テスト：`__tests__/qa-wish-task-link.test.js`、`__tests__/qa-wish-task-app.test.js`。本番App、WishScreen、HomeScreen、TaskModal、本番保存・関連処理はMockに置き換えていない。
- Mock境界：AsyncStorage、Native通知API、Widget Native Module、StoreKit/広告SDK。Native SDKのテストfixture不足（getStorefront）、複数の同名UI/checkbox、一覧と今タブの違いはテスト実装を訂正し、期待する連動結果は緩和していない。
- `pnpm typecheck`、iOS向けJS export、`git diff --check` PASS。Jest終了時の非同期ハンドル警告は継続しており、全ハンドル解放済みとは判定しない。
- 既存の写真保護・日記/Wish保存・通知復旧・権限・オンボーディングを含む全回帰がPASS。Native compile・iPhoneの表示は未実施。

### 変更ファイル（今回分のみ）

`App.tsx`、`WishScreen.tsx`、`types.ts`、`features/tasks/taskUtils.ts`、`features/wish/wishTaskLink.ts`（新規）、`features/wish/README.md`（新規）、上記テスト2ファイル（新規）、本レポート。その他の開始時LOCAL差分はそのまま保持。

### 残るリスクと実機確認

- 保存完了前にプロセスが即時終了すると、直前の変更が未保存になる可能性は残る。今回は一つのsnapshotに両方を含めることで、アプリがTaskと行動を別々の書込みとして保存しない設計。iOSのOS停止・電源断まで保証したとはしない。
- Widget/App Intents由来の変更は、既存どおりApp起動/復帰後のJS取込みで目標データへ反映する。JS未稼働中にSwiftだけでWishを保存する新経路は追加していない。Siriの実際の発話からIntentの選択・実行成功は未検証。
- 実機最小手順：①行動からTODO作成→TODO完了/取消→目標進捗確認→再起動、②目標側の完了/取消→TODO確認、③Widgetから完了→App復帰→目標/Widget更新、④繰り返し変更の取消/解除確認。保存中は未保存表示も確認する。
- 目標の一つに複数Task、部分進捗、繰り返し自動連動は実装しない。既存の月間振り返り・日記・写真・課金・テーマ・画面構成・Widget種類・Live Activity仕様は変更していない。

## 前回：2026-11-22 独立レビュー追加対応（PHASE 1優先）

生活の一元管理をコンセプトとして維持。既存LOCAL差分を保持し、Native・商品ID・写真crop・通知仕様は変更していない。commit・push・EAS Buildは未実施。

### 指摘の分類

| 指摘 | 分類 | 対応・確認結果 |
| --- | --- | --- |
| 初回5枚の内容・順序 | 1：未対応だったため修正 | 今日→登録/音声→予定/集中→目標/記録→デザイン。依頼されたタイトル・説明・最終CTAを採用。写真日記等のPremium条件も明記。 |
| 本番UIのread-onlyプレビュー | 1：不足分を修正 | HomeScreen・TaskModal・VoiceInputModal・DailyScheduleTimeline・集中/記録画面・WishScreen・DesignAppliedPreviewを使用。Voiceは権限要求・Nativeイベント購読なしのinlinePreview。DesignはCapture Studio専用captureDesignOnlyを呼ばない。 |
| 新規ユーザーのスキップ | 1：未対応だったため修正 | 最終CTAと同じ任意Design選択へ。intro完了とstage=designを直列化した一回の書込みで確定。設定からの再表示は完了状態を変更せず閉じる。 |
| あとで選ぶ | 1：未対応だったため修正 | 初回だけ表示。無料Mono Plainへ設定して今日へ。購入・広告は必須ではない旨、設定で後から変更できる旨を表示。Design完了とstage=doneを同時保存。 |
| GUIDE・再起動の競合 | 1：未対応だったため修正 | Design復帰と今日GUIDEの同時実行でhomeへ戻される競合を新規Appテストで検出・修正。intro dismiss中/Design途中はGUIDEを開始しない。Premium購入だけで旧自動連続ツアーを起動しない。 |
| 既存完了状態、旧demo状態 | 2：すでに対応済み | 完了済みの通常起動では紹介/Designを自動再表示しない。旧demoをDesign途中と解釈しない既存normalizeを維持。 |
| PHASE2 A WishとTODO | 3：仕様確認が必要 | Taskには元WishActionのIDがなく、未完了の同名タイトルで重複を抑えるだけ。自動完了連動は実装していない。下記設計案を参照。 |
| PHASE2 B 日記権限 | 2：現行導線では整合 | Freeの「今日を記録」はPremium案内へ進むことを本番Appでテスト。Historyの編集はPremium条件、Premium紹介のFree利用不可と一致。写真2枚のFree分岐は正規の無料編集入口を開放するものではない。権限仕様は変更しない。 |
| PHASE2 C 広告保存失敗・例外 | 1：安全な範囲を修正／3：強制終了の保証は別設計 | grantRewardedとDesign専用経路を同じ保存確認へ接続。永続化前は権限を公開せず、失敗時は視聴済み受領情報を同一起動内で保持し、再視聴なしで再保存。受領時刻固定で再試行による12h延長を防ぐ。Modal例外を表示し、連打・処理中の閉じる操作・古い自動閉じタイマーを抑制。下記残存リスクあり。 |
| PHASE2 D Widget重複 | 1：未対応だったため修正 | ギャラリー見出し・自動保存説明を一回に整理。カテゴリ/種類数は維持。種類・権限・保存機能は削除しない。 |
| 多対多の目標連動やFree日記への仕様拡張 | 4：公開後の改善候補 | 今回実装しない。購入価値・既存保存データに影響するため、別途仕様を決める。 |

### A：Wish–TODO連携の変更設計（未実装）

- Taskにoptionalなorigin `{monthKey, wishId, actionId}` を追加する案。既存Task/Wishはそのまま読み込む。同名タイトルから旧データを推測関連付けしない。
- 新規の同じoriginからの生成は一つのTaskへ誘導する。タイトル編集で関連が切れない設計とする。
- 完了/取消はTask更新を共通入口としてWishActionと一つの保存操作で反映する案。UI以外のWidget/Siri経路も同じ処理を通す必要がある。相互useEffectで同期しない。
- 確認が必要：一行動に複数Taskを許すか、繰り返しTask・スキップ・部分進捗をどう数えるか、Task/Action削除時に何を残すか。削除をもう一方へ自動伝播してデータ損失させないことを優先。
- Native共有形式・月替わり・分析・TODO削除/取消への回帰が必要。今回はデータ形式を変更していない。

### C：広告受領情報の残存リスク（未解決として明記）

- 現在の保存失敗リトライは同一App起動中のメモリ受領情報を使う。保存が一度も成功しないまま強制終了した場合、この情報の復元は保証できない。「アプリを閉じずに保存を再試行」と案内するが、全ケース解決とはしない。
- 全プロセス終了に耐えるには、earned受領記録の耐久保存と付与済みIDによる冪等化、他の広告クレジット消費/Trial更新との直列化が必要。ストレージ自体が書込不能な間の終了まで保証することはできない。今回は初回UI改善と大きな保存形式変更を混在させず、別設計として残す。
- 課金/Trial/広告の全更新経路が競合する状況を今回のテストで網羅したとはしない。

### 自動検証と限界

- 既存182件 + 新規12件 = **27 suite / 194 PASS・0 FAIL**。既存UIテストにもWidget見出し/説明が一回だけであることを追加。
- 新規 `qa-first-run-app.test.js` 9ケース：新規/5枚/最初・途中スキップ/無料選択/あとで選ぶ/intro途中とDesign途中の再描画/Free・Premium既存ユーザー/設定再表示/Free日記入口。本番App・本番保存を使用。Modal dismissのイベントとNative API、AsyncStorageのみ境界を模擬。
- 新規 `qa-rewarded-save-app.test.js`：実際の設定画面から広告→書込保留→失敗→権限未公開→同じ広告の保存再試行→dot実表示→再読込。Native SDKのearnedのみ模擬、広告生成回数が一回であることも確認。
- 新規 `qa-independent-review-ui.test.js` 2件：本番Voice inlineのNative非実行、本番RewardedAccessModalの例外表示/連打防止/再試行表示。後者のonRewardは境界例外を返すテスト用コールバックであり、権限付与成功の証明には使わない。
- 紹介を閉じている間はプレビュー子画面をアンマウントし、通常利用中の不要な本番画面描画を停止。完了後にinline音声プレビューが残らないことも検証。
- 再実行の一回で既存のTODO編集キャンセルテストが編集メニューの表示直前に失敗したため、固定待機ではなく実際の「編集」表示を待つように修正。保存内容・キャンセル・再読込の期待値は変更していない。単独再実行PASS後、全体を再実行した。
- `pnpm typecheck`、iOS向けJS `expo export`、`git diff --check` PASS。Windows上の確認であり、iOS Native compile・物理的なModal dismiss・写真選択・小画面のスクロール/読みやすさ・実広告の表示は未確認。
- 最終全体実行は194 PASS、終了コード0。ただしJest終了直後に未終了の非同期ハンドル警告が出た。テストは終了したが、テスト基盤の全ハンドル解除まで検証済みとはしない。
- Appのunmount/remountで永続状態の復元を確認したが、iOSの実際の強制終了を再現したとはしない。Capture Studioのcapture経路は変更しておらず、実機撮影操作の回帰は未実施。

### 今回の変更ファイル（前からあるLOCAL変更は別途保持）

`App.tsx`、`screens/SettingsScreen.tsx`、`components/VoiceInputModal.tsx`、`components/RewardedAccessModal.tsx`、`components/WidgetSettingsCard.tsx`、`features/onboarding/OnboardingCarousel.tsx`、`onboardingSteps.ts`、`onboardingStorage.ts`、`useOnboarding.ts`、同README、新規テスト3ファイル、`__tests__/qa-ui-first-pass.test.js`、`__tests__/qa-app-root-probe.test.js`、本レポート。

## 前回：2026-11-22 ビルド前レビューの追加修正

対象：push済み `7a17a30` を基準に、ユーザー承認された9項目を修正。既存機能・保存形式・課金条件を維持。今回commit・push・EAS Buildは行わない。

### 対応内容

1. **今日の完了表示**：未完了の「あとで／待ち」がある場合に「今日の分は完了」と案内しない。「今やる分は完了。あとで・待ちは一覧へ」とし、残数のラベルも「今やる残り」に限定。
2. **Widget手動更新**：同期結果を更新済み・変更なし・確認待ち/世代交代・失敗として返す。Nativeのfalseや同期未実行を成功Alertに変換しない。自動同期の世代管理と保存キューは維持。
3. **読込・書込失敗からの復帰**：読込失敗時は通常編集画面を出さず、既存保存データを残した復帰画面から再読込する。読込が不明な間はWidget/Live Activity/通知再照合等も保存状態不明のまま操作しない。書込失敗は未保存表示を継続し、既存の全体保存キューへ最新状態を再送できる。正常保存後に失敗通知抑制を解除し、次の失敗も検知できる。
4. **日記削除**：既存のWish保存待機へ削除要求も接続し、AsyncStorage成功後だけ完了表示。失敗時は削除対象の記録を戻し、他の月・目標・TODOや既に編集された同日の記録を古いsnapshotで上書きしない。写真参照を保持し再試行可能。編集画面と写真閲覧側の削除経路を対応。
5. **通知管理**：`components/NotificationManagerCard.tsx`へ最小限の切り出し。一覧取得失敗を0件と表示しない。「現在の予約をすべて取り消す」とし、集中・アファメーション等も対象であることと、通知設定OFFとは異なり再予約され得ることを確認文へ明記。取消直前に再取得したIDだけを操作し、途中で新規予約された通知をcancelAllで巻き込まない。個別失敗・取得失敗を表示し、再試行と連打防止に対応。
6. **音声入力の用語**：Routine/Wish/Wish Actionをルーティン/叶えたいこと/目標の行動へ統一。
7. **ユーザー向けエラー**：音声入力・月間カード共有のエラーからDevelopment Buildという案内を除き、一般ユーザー向けの更新・再試行案内へ変更。
8. **AI共有確認**：内容選択→共有文の全文確認/編集→明示的な共有操作→Sheet dismiss後にOS共有画面。確認だけ・キャンセル・空文章では共有せず、ユーザーが編集した文章だけを渡す。ネットワーク送信・AI API・新しい永続保存は追加しない。
9. **選択月の表記**：「今月を振り返る」を「この月を振り返る」に変更し、過去月にも適合。見出しやカード説明も選択月に合わせる。

### 検証

- 前回169件に追加13件。全24 suite / **182件 PASS・0 FAIL**を確認。
- 本番App：新規再現2件、読込失敗/再読込、書込失敗/再試行/再度の失敗、日記削除の保存保留/失敗/復元/再試行/再読込、Widget Native保存false→true。
- 本番UI：通知管理4件、AI共有3件。通知API・Share等のNative境界とAsyncStorageはMock。保存・状態管理・共有文生成・通知管理をMockに置き換えていない。
- 初回の全体実行でApp依存の初回読込/変換が最初のUIテストの30秒枠を超えたため、Appのrequireをsuite準備へ移動。固定待機や期待値緩和で成功扱いにはしていない。
- 最終コードで `pnpm typecheck`、iOS向けJS export、`git diff --check` はPASS。改行コード変換の警告のみ。全24 suite / 182件 PASS・0 FAIL。
- Native表示・OSへの通知到達・iPhoneでのキーボードと共有画面の実レイアウトは未確認。通知取消は現在の予約に対する操作であり、アプリ全体の通知を恒久OFFにする新設定は追加していない。

## 前回：2026-11-22 一括改修

ユーザー承認に基づき、再現済み不具合3件とUI/UX候補16項目を改修。既存LOCAL差分を保持。commit・push・EAS Buildは未実施。
改修前159件（156 PASS / 3 FAIL）に10件追加し、169件 PASS / 0 FAILを確認。下の改修前FAIL記録・提案・過去の一次点検は履歴として保持する。

### 不具合3件の修正

- **予定**：グローバル保存キューが対象予定を含むsnapshotをAsyncStorageへ書き終えた後にのみ成功を返す。失敗時は編集を保持し、生成済みIDで再試行。保存中は二重送信・終了・フォーム変更を抑止。通知失敗とデータ保存失敗を分離し、永続化後の通知エラーで保存成功を取り消さない。
- **アファメーション**：取消/予約の失敗・重複時刻・上限等を正常returnにしない。画面が失敗を受け取り入力を保持。永続化完了も待つ。再試行で同一IDを使い、二重登録を抑止。Switch更新のrejectも画面側で処理。
- **Live Activity**：effectの世代を照合し、古いavailability結果を無効化。Native開始/更新/終了を同じキューで順序付ける。開始API中にOFFになった場合も、開始の後で終了する。古い完了結果でruntime状態を上書きしない。

予定/アファメーションの保存待ちは既存の全体保存を利用する。他データを読み直して古いsnapshotを個別保存する方式にはしていない。保存完了通知はその書込み開始時に存在した待機要求だけを対象とし、対象設定が変更された場合は再試行可能なエラーにする。既存Wish/日記の保存待機は維持。

### UI/UXの対応結果

| 候補 | 反映内容 |
|---|---|
| UX01 | 下部ナビ48pt領域、11ptラベル、tabの名称・選択状態 |
| UX02 | リストのチェック・削除・閉じるを44pt程度へ。チェックの見た目は25ptのまま。サブタスクの移動/削除も44pt、入力欄と操作行を折返し可能に |
| UX03 | アファメーション本文と操作を折返し可能にし、編集・削除・保存した言葉の操作領域を拡大 |
| UX04 | Widget/Live Activityの36/40/42ptの主要設定ボタンを44ptへ。縮小プレビュー内文字は一律拡大しない |
| UX05 | Premium説明・規約リンク等の10～11ptを13ptへ。価格・契約条件・購入/復元経路を維持 |
| UX06 | 集中セッションが一時停止中なら「再開」。未開始の「スタート」と区別 |
| UX07 | 「Routine解除」を「ルーティンを解除」に統一。「今日は休む」と繰返し自体の解除を区別 |
| UX08 | Premium比較表の「行動はプレミアム限定」を、広告でも追加可能な実際の条件へ修正。権限判定自体は変更なし |
| UX09 | 写真Sheetの背景選択入口を上の無料プレビューへ一本化。重複する直接適用ボタンを廃止し、正式適用はプレビュー内へ。保存済み背景の表示・外す・トップ画像5枠・集中背景は残す。単体Photoカードの背景選択機能も維持 |
| UX10 | Widgetの自動保存と、Live Activityの「設定を保存」での反映を短く明記。保存方式の変更なし |
| UX11 | 分析の出発/準備0件では大きな0指標を出さず短い説明へ。記録があれば従来の実績カード |
| UX12 | 日記の保存成功を閲覧側でも表示。約2.8秒で消し、表示ごとにタイマーを更新。アンマウント時に解除。永続化成功前には表示しない |
| UX13 | 月間カードの編集用テンプレート/色選択を13ptにし、選択にチェックとaccessibilityStateを追加。生成画像の作風は変更なし |
| UX14 | 今日画面の編集・延期・リスト・振分け等を、操作Modalのdismiss後に実行。削除/解除確認も同じ順序。iOSはonDismiss、他OSはInteractionManager。タップ数は追加しない |
| UX15 | 自分の言葉の保存と通知予約を、見出し・「言葉を保存」で区別 |
| UX16 | Native未搭載・システム利用不可・API失敗を区別。無料版制限との誤解を防ぐ。Nativeの追加実装やSwift変更ではない |

### テストと確認の限界

- 改修前のFAIL3件は削除・期待値緩和せずPASS。既存の「スタート」や重複写真ボタンの期待値は、承認されたUI仕様の変更に合わせて更新。Modalのdismissは必要なテストでNative境界イベントとして明示発火。
- 追加10件：本番Appで予定の失敗/再試行/再読込、予定保存中のTODO更新、アファメーションの失敗/再試行/再読込・保存保留、Native開始API中のOFF、利用不可理由の判定、4件の本番UIコンポーネント操作。
- 本番Appテストでは状態管理・保存・利用権・通知管理を置換していない。ストレージとNative APIがMock。コンポーネント単体テストの外部コールバックMockは、その画面の操作制御だけを検証し、永続化の証明には含めない。
- 最終コードで全22 suite / 169件 PASS・0 FAIL。追加の画面操作テストは本番コンポーネントを使用。`pnpm typecheck`・`npx expo export --platform ios`・`git diff --check`もPASS（改行コード変換の警告あり、diffエラーなし）。
- 実寸の見切れ、物理タッチ、VoiceOverの実際の読み上げ、Swiftコンパイル、Widget/Live ActivityのNative表示は今回未確認。
- 以前のNative deployment target修正はそのまま保持。今回Swift/autolinking/App Group/StoreKit商品ID/本番広告ID/写真保存形式・crop/利用権仕様は変更していない。既存BuildのNative module未解決はJSの改修だけで解消した扱いにしない。

## 改修前：2026-11-22 LOCAL総点検

対象：HEAD de1064b と既存未commit差分。過去の記録は下に保存する。
今回は本番コードを変更せず、再現テスト3件を追加。Native API・AsyncStorageは境界Mock。
全Jest：159件中156 PASS / 3 FAIL。既存156件は回帰なし。
typecheck・iOS JS export・git diff --check：PASS。Swiftコンパイルや実機全画面操作の証明ではない。

### 全20領域の一次点検範囲

「既存テストあり」は今回再実行した特定の処理に限る。領域全体PASSを意味しない。

| 領域 | 確認した本番入口 | 実行結果・残作業 |
|---|---|---|
| 今日・タスク | HomeScreen / TaskModal / Appのタスク更新 | CRUD・再読込等の既存AppテストPASS。全サブタスク操作は未網羅 |
| 予定 | DeparturePlanForm / saveDeparturePlan | 既存CRUD PASS。永続化前の成功Alertを追加テストで再現 |
| 通知 | tasks/departure/focus/notifications | 既存復旧テストPASS。OS到達・全画面との競合は未網羅 |
| 集中 | AppのFocus画面・focusState | 開始/停止/再開/記録の既存テストPASS。バックグラウンド実機待ち |
| ルーティン | Appの次回生成・skip / routineInterruptionAnalysis | 既存重複/日付等のテストPASS。全CRUDのApp連動未網羅 |
| 分析 | AnalysisScreen / insightDashboard / aiShareText | 既存境界・集計テストPASS。全グラフの視覚評価未実施 |
| 目標 | WishScreen / saveCurrentWishEditor | 保存失敗・再試行・再読込の既存AppテストPASS |
| 日記 | HistoryScreen / saveDailyReview | 文章CRUD・保存保留/失敗/再試行PASS。写真付き同時保存は未網羅 |
| アファメーション | AffirmationSettingsCard / saveAffirmation | 取消API失敗時に入力消失を追加Appテストで再現 |
| Widget | syncRhythmWidgetSnapshot / Swift WidgetBundle | 9種類のカタログ確認。既存JS更新テストPASS。Native修正後Build待ち |
| Live Activity | App同期effect / rhythmLiveActivity | 既存Focus連動PASS。OFF中の古い開始を追加Appテストで再現 |
| デザイン | DesignSettingsSheet / effectiveChicPattern | 既存広告解放・実画面への柄受渡しPASS。背景写真の入口が重複 |
| 課金 | useRhythmStoreKit / PremiumModal | 判定テストPASS。実購入・復元・失効は実機必須。紹介文に不一致あり |
| 広告・Trial | rewardedAds / rewardedAccessStorage | 既存広告成功/キャンセル・期限テストPASS。SDKエラー全組合せ未網羅 |
| 初回・GUIDE | useOnboarding / onboardingStorage / embedded preview | 既存保存競合・初回判定テストPASS。全ツアー実機操作未実施 |
| 音声 | VoiceInputModal / voiceParser / voiceUsage | 既存解析・回数テストPASS。認識・権限は実機必須 |
| 設定 | SettingsScreen / 各Sheet | 写真/テーマ等の既存UIテストPASS。全設定の再読込は未網羅 |
| 永続化 | rhythmStorage / persistentPhoto / historyCleanup | 既存キュー・破損/写真保護テストPASS。強制終了原子性は未保証 |
| Siri・外部連携 | Swift App Intents / SharedEventScreen / travelApps | コード確認のみ。Siri実行・他端末間共有・外部アプリは未実施 |
| 起動・遷移・UI全体 | App / Modal / BottomNav | App描画・一部再起動テストPASS。全Modalの物理タッチ/全端末表示は未実施 |

### 再現済み：修正優先度A

1. **予定の保存成功が早い**：画面から予定表用予定を追加し、STORAGE_KEYへの書込みを保留。永続データには予定がないのに「予定を追加しました」が出る。`saveDeparturePlan`はstate変更と通知処理後にAlertを出すが、主データ保存は別の80ms debounce effect。保存Promise連携を追加し、失敗時の編集保持も検証する必要がある。`qa-app-root-probe.test.js`にFAILを保存。
2. **アファメーション失敗時の入力消失**：Premiumで管理画面を開き、通知一覧取得を失敗させて追加。Appの`saveAffirmation`はcatch後に正常returnし、画面は`await onSave()`後にclose/resetする。成功/失敗を返して成功時だけ閉じる必要がある。重複時刻や上限によるreturnも同構造で、別途再現が必要。`qa-app-root-probe.test.js`にFAILを保存。
3. **Live Activity OFF後の古い開始**：availabilityを保留し、UIでOFF→endを確認した後にavailabilityを成功させる。古いeffectがstartOrUpdateを呼ぶ。Appの同期effectに取消/世代確認がない。開始・更新・終了の直列化や最新世代照合が必要。availability後だけのチェックでは既に開始API中の競合を防げない。`qa-widget-live-app.test.js`にFAILを保存。実ActivityKit表示は未確認。

### 表記・導線（コード確認で確定、機能FAILと区別）

- `PremiumModal.tsx`比較表は「叶えたいこと：行動はプレミアム限定」と説明するが、`App.tsx`のcanCreateWishActionは広告利用権でもtrue。`WishScreen.tsx`にも広告2回で行動追加の案内がある。実装を変えず紹介文を揃えるのが妥当。
- 写真設定は「写真を選んでプレビュー」「写真デザインを適用」とPhotoThemeSettingsCardの「背景写真を選ぶ」が併存する。単純削除せず、権限確認・Picker・CropのModal復帰を維持する統合設計が必要。
- 小さい説明・操作領域はアファメーション等に残る。コード上の改善候補であり、全画面の見切れを実機確認したわけではない。

### リリース判断

現時点で「全機能に問題なし」とはしない。上記Aの3件を優先修正し、Native deployment target修正を反映したBuildでRhythmWidgetのruntime解決と書込みを確認する。
Native設定修正後のBuildは未実施。現在インストール済みBuildのavailable:falseは既知。
今回commit・push・EAS Buildは実行していない。本番コードに今回の新規修正はない。

---

## 2026-11-22 追加：不具合以外も含むUI・UX改善の一括候補

目的：不具合だけを小出しに直すのではなく、毎日の操作・文言・見た目・導線をまとめて改善するための対象を確定する。
この追加作業は監査・提案のみ。本番コードは変更していない。上記159件（156 PASS / 3 FAIL）は直前の実行結果であり、以下の改善候補をテストで再現した件数ではない。
ユーザー提供の写真2枚以外について、新しい実画面・スクリーンショットは取得していない。以下は最新LOCALのコンポーネント・スタイル・状態遷移を根拠とする。物理タッチ、実寸、文字拡大時の見切れ、視覚的な完成度は未検証。

### 一括改修候補16項目

優先度：P1＝保存・誤操作・利用条件に関わるものを先行、P2＝日常の読みやすさ・操作性、P3＝既存デザインを保つ仕上げ。上記の再現済み不具合A・3件は別枠で最優先。

| ID / 優先 | 対象・現状の根拠 | 改善内容・効果 | 操作数・副作用・維持条件 |
|---|---|---|---|
| UX01 / P2 | `components/BottomNav.tsx`：ラベル10、navItemは高さ指定なし。選択状態のアクセシビリティ指定なし | アイコンの見た目は維持し、各タブの操作領域を44以上に確保。選択状態・名称を読み上げ可能にする。文字は幅と両立する範囲で調整 | 画面切替1→1タップ。5タブ構成は変更しない。長い「叶えたいこと」の折返しを確認 |
| UX02 / P2 | `components/TaskListSheet.tsx`：チェック25×25、削除・閉じるは文字だけのPressable。`TaskModal.tsx`にも小さい並替え操作 | 見た目のチェック径を増やさず外側の操作領域を拡大。項目名付き操作ラベル。削除と並替えを離す | 各操作1→1。hitSlopの重なりで隣の操作を拾わせない。リストの下書き・保存仕様は維持 |
| UX03 / P2 | `components/AffirmationSettingsCard.tsx`：本文・Switch・編集・削除が横1行、編集/削除に最小領域なし | 本文と操作行を分離できる可変レイアウト、44程度の独立した操作領域。削除は他操作から離す | 編集・削除の操作数は維持。長文と小画面に対応。通知Switchの権限制御を変えない |
| UX04 / P2 | `WidgetSettingsCard.tsx`の写真操作42・確認操作36、`LiveActivitySettingsSheet.tsx`の文字サイズ/間隔選択36 | 主な設定コントロールを44程度に揃える。必要な行のみ折返す | 操作数不変。縮小Widgetプレビュー自体を拡大しない。設定項目・権限は維持 |
| UX05 / P2 | `components/PremiumModal.tsx`：重要説明10～11、規約リンク11 | 利用条件・購入説明・リンクを優先して読みやすくする。装飾コピーより購入判断情報に強弱を付ける | 購入確認回数不変。価格・更新条件・復元・法的説明を省略しない。縦スクロール維持 |
| UX06 / P2 | `App.tsx`の集中画面：running=falseかつ残時間ありは一律「スタート」 | 未開始は「スタート」、実際の一時停止中は「再開」。既存セッション状態に基づき出し分ける | 1→1。タイマー・履歴・通知処理に変更不要。残時間だけで一時停止と決めない |
| UX07 / P2 | `screens/HomeScreen.tsx`：「Routine解除」と「今日は休む」 | 「ルーティンを解除」など日本語に統一し、当日の休みと繰返し自体の解除の意味を区別 | 操作数不変。スキップの連続記録・分析への扱いは一切変えない |
| UX08 / P1 | `components/PremiumModal.tsx`：「行動はプレミアム限定」。App/Wishでは広告利用権でも行動追加可 | 比較表を実際の広告・Premium条件に合わせる。購入・一時解放・無料プレビューの文言を混同しない | 購入導線不変。権限実装を文言に合わせて制限しない。広告回数/期間は機能別仕様を参照 |
| UX09 / P2・導線設計 | `screens/SettingsScreen.tsx`と`PhotoThemeSettingsCard.tsx`：背景写真にプレビュー選択・正式適用・背景を選ぶ入口が併存 | 背景写真の主入口を1つに整理し、その先の無料プレビュー→正式適用を明確化。トップ画像・タイマー写真は別用途として残す | 選択後に再度別入口を探す負担を削減。現状の全経路の正確なタップ差は未計測。購入判定、元画像、Crop、Sheet suspend/resume維持が必須 |
| UX10 / P2 | `WidgetSettingsCard.tsx`は変更ごとにonChange、`LiveActivitySettingsSheet.tsx`はdraftと「設定を保存」 | 自動反映される設定と、保存が必要な設定を短い表示で区別する | 操作数不変。自動保存へ統一するなど保存方式を勝手に変更しない。永続化未完了で「保存済み」と出さない |
| UX11 / P3 | `AnalysisScreen.tsx`：出発・準備とも0でも実績カード全体を表示。提供画像1でも大きな空カードが上部を占有 | 記録0件では説明を短い空状態へ縮約、記録ありでは既存実績表示。日記・カレンダーへ早く到達できる密度にする | 必須操作数不変、縦スクロール量の削減見込みは未実測。数値や機能は削除しない |
| UX12 / P2 | `screens/HistoryScreen.tsx`：保存後setJournalEditing(false)、完了文言は編集側の分岐内に配置 | 編集→閲覧へ移った後も見える共通位置に短い完了表示。成功確定のタイミングは現在の永続化完了を維持 | 追加タップ0。新しいAlertに戻さない。Modal背面へ隠さない。現行構造の確認であり、今回の表示再現テストは未追加 |
| UX13 / P3 | `screens/HistoryScreen.tsx`：月間カード編集のテンプレート/パレット選択文字10 | 操作用UIだけ読みやすくし、選択状態を文字と枠でも判別可能にする | 操作数不変。生成画像内の装飾文字は一律拡大しない。カードの作風・保存形式を維持 |
| UX14 / P1・導線設計 | `screens/HomeScreen.tsx`：操作メニューの編集はonEditとclose同時、リスト等はsetTimeout(0)で次Modalへ | 親Sheetの終了を確認して次を開く遷移へ揃える。Cropで用いた競合防止の原則を適用 | メニュー→編集の2操作は維持。現在の経路でフリーズを再現したわけではなく予防候補。戻る先・キャンセル時の下書きを保持 |
| UX15 / P2 | `components/AffirmationSettingsCard.tsx`：「通知を追加」と自分の言葉の「保存」が同じ画面に存在 | 「言葉の保存」と「時刻を指定した通知」の役割を見出し・ボタン名で区別。「言葉を保存」等の具体名にする | 操作数不変。保存した言葉だけで通知が始まるような仕様変更をしない。テンプレートも維持 |
| UX16 / P1・状態設計 | `screens/SettingsScreen.tsx`：Live Activityの利用不可案内と基本ON/OFF、別途Native module available:falseが既知 | Free制限ではないことを明示。判別できる場合に限り、端末/OS・システム許可・Native未搭載・一時エラーを区別して次の行動を示す | 基本スイッチはFreeでも使用可能を維持。原因未判定を「設定で直る」と案内しない。Native原因解決の代わりに文言だけ変えて完了扱いしない |

### 全体をまとめて改修する順序

1. 再現済みAの3件：予定の永続化完了判定、アファメーションの失敗伝達/入力保持、Live Activityの古い非同期処理の無効化。
2. UX08・UX12・UX16：利用条件と操作結果の表示を正確にする。UX16は取得可能な状態の範囲を確認して設計。
3. UX01～05・UX07・UX13・UX15：押しやすさ、文字、名称、操作の意味を一括統一。
4. UX06・UX10・UX11：開始/再開、保存方式、空状態を整理。
5. UX09・UX14：写真入口の統合とModal遷移は、既存経路を記録してから段階的に変更し回帰テストする。ボタンの削除だけで済ませない。

### 維持する設計・今回不要な変更

- Mono/Design/Photoの方向性とテーマトークンを維持。全面リデザイン、タブ削減、背景色の固定化は不要。
- デザイン試着は無料、正式適用時のみTrial/広告/購入判定。現在の全画面プレビュー・各画面rendererを維持。
- 写真は元画像から最終crop。高解像度preview、編集中写真の保護、全機能共有参照、cleanupを維持。
- カレンダーの幅・4本帯・＋N・今日・選択日・シール・無料7日/Premium月表示を維持。
- Wish/日記の実永続化後の成功判定、失敗時の入力保持を維持。他画面を成功表示だけで取り繕わない。
- Widget9種類の整理済み構成、基本Live Activityの無料ON/OFF、課金・広告仕様は変更しない。
- 初回案内の静的埋込みプレビューと明示CTA、GUIDE/FAQの再確認経路を維持。案内Modalを増やさない。
- 音声・Siri・カレンダー取込・外部アプリの実動作は、今回コードだけで使いやすさまで確認済みとはしない。根拠のない画面追加・仕様変更は提案しない。

今回まとめたものは、再現済み機能不具合3件＋UI/UX改善候補16件。改善候補を確定バグ件数に加算しない。ユーザーの「点検して、その後に全改修する」に合わせた改修台帳であり、この追記時点では一括改修は未実施。

## 以下は過去の一次点検記録（最新状況ではない）

対象: LOCAL HEAD 229be98 と既存未コミット差分。2026-11-15。iOS実機操作なし。

## 検証表

各行は網羅的な項目数ではなく、各領域の**代表的な重要シナリオ1件**を選定した実測値。テスト件数ではない。PASSでも領域全体の正常性は保証されない。Aはこの代表項目の仮の優先度であり、危険な未選定項目がないという意味ではない。

| 領域／代表項目 | 優先 | 項目数 | PASS | FAIL | 未検証 | 残る主要項目 |
|---|---:|---:|---:|---:|---:|---|
| 今日・タスク／選択と完了 | A | 1 | 1 | 0 | 0 | UI CRUD、並行保存 |
| 予定／準備・出発逆算 | A | 1 | 1 | 0 | 0 | 編集中断、通知連動 |
| 通知／取消失敗検知 | A | 1 | 1 | 0 | 0 | 予定切替・ルーティン復旧、iOS到達 |
| 集中／未来時刻の予約 | A | 1 | 1 | 0 | 0 | pause/resume競合、実機通知 |
| ルーティン／繰返し重複生成防止 | A | 1 | 1 | 0 | 0 | スキップ・分析連動 |
| 分析／期間内の未来TODO除外 | B | 1 | 1 | 0 | 0 | 実UI、全集計の組合せ |
| 目標／部分破損時の保存準備 | A | 1 | 0 | 1 | 0 | App全体での影響、TODO連動 |
| 一言日記／旧写真形式正規化 | A | 1 | 1 | 0 | 0 | 実ファイルとUI保存、失敗時表示 |
| アファメーション／通知取消 | A | 1 | 1 | 0 | 0 | UI編集と通知更新 |
| Widget／Snapshot生成 | A | 1 | 1 | 0 | 0 | 全種の実機表示、App Group写真 |
| Live Activity／設定正規化 | A | 1 | 1 | 0 | 0 | payloadとFocus遷移、Native起動 |
| デザイン／購入有無と柄判定 | A | 1 | 1 | 0 | 0 | 広告解放後の画面表示 |
| 課金／Premium機能判定 | A | 1 | 1 | 0 | 0 | 実購入・復元・失効 |
| 広告Trial／読込失敗時の開始判定 | A | 1 | 0 | 1 | 0 | 実SDK広告、報酬と保存競合 |
| 初回GUIDE／同時完了保存 | A | 1 | 1 | 0 | 0 | 初回UI・途中復帰 |
| 音声／日次利用上限 | B | 1 | 1 | 0 | 0 | 音声認識・登録UI |
| 設定／Widget設定正規化 | B | 1 | 1 | 0 | 0 | 設定保存・権限変更UI |
| 永続化／破損JSON保護 | A | 1 | 1 | 0 | 0 | 実機再起動・保存競合 |
| Siri外部連携／Intent実行から反映 | A | 1 | 0 | 0 | 1 | iOS実機とNative実行が必要 |
| アプリ全体／終了・再起動・状態同期 | A | 1 | 0 | 0 | 1 | iOS実機と操作が必要 |

代表20項目中、実施18（PASS 16、FAIL 2）、未実施2。実施率90%、未実施率10%。A代表17項目中の実施15（88.2%）。これは**選定した20項目に限る実測**であり、要求された全操作・全分岐のQA進捗率ではない。全重要項目の母数はまだ完成していないため、アプリ全体の実進捗率は算出不能。

## 再現した不具合

### QA-01：利用権読込失敗をTrial未使用と判定

- 種別: 広告・Trial、重要度A、頻度未確認。
- 条件: AsyncStorageの利用権読込が失敗。
- 期待: 状態不明としてTrial開始を保留。
- 実際: `loadRewardedAccessState` が既定値を返し、`canStartPremiumDesignTrial` がtrue。
- 根拠: `__tests__/qa-audit-access.test.js` のFAIL。Native StorageはMock。
- 影響: 使用済みか不明な体験が再開始可能と判定される。誤課金は確認していない。
- 原因・案: `features/ads/rewardedAccessStorage.ts` の例外時既定値を成功として扱わず、`App.tsx` 側も復元完了前の更新を保留する。

### QA-02：部分破損した目標データで保存準備が例外終了

- 種別: 目標・永続化、重要度A、頻度未確認。
- 条件: 月別目標に `{ '2026-05': null }` が存在。
- 期待: 不正項目を安全に扱い、例外で保存処理全体を止めない。
- 実際: `normalizeWishMonthsForSave` のnull分割代入でTypeError。
- 根拠: `__tests__/qa-wide-data.test.js` のFAIL。本番関数を直接実行。
- 影響: `App.tsx` の保存用状態作成にも同関数が使われる。起動不能・実データ損失は未確認。
- 修正案: 読込時・保存準備時に不正な月状態を検証し、互換性と既存データ保護を考慮して安全に処理。

## コード上の懸念（再現テスト未実施）

- A候補: `App.tsx` の `effectiveChicPattern` に広告12時間アクセスが直接渡らず、Trial終了後の柄表示がPlainに戻る可能性。実画面確認が必要。
- A候補: 予定切替・ルーティン通知は取得失敗時の処理中断は改善済みだが、未解決状態の永続記録と復旧がない。通知漏れや古い通知残存の可能性。
- A候補: 予定状態の永続化と通知取消・予約は別操作。強制終了や保存失敗が間に入ると状態が不一致になる可能性。
- A候補: Wish・日記の成功表示は非同期の主データ永続化完了前に表示され得る。書込失敗時は別途Alertも出るが、表示競合の実画面再現は未実施。
- Widgetの公開UI候補は9種で、Swiftの構成10件と同一ではない。意図した互換用構成か要確認であり、直ちに不具合とは判定しない。

## テスト結果と範囲

- 既存93件、新規25件、合計118件: 116 PASS / 2 FAIL。
- Jest coverage（ロードされた対象のみ）: Statements 46.35%、Branches 35.66%、Functions 44.14%、Lines 51.25%。未読込の本番ファイルは分母に含まれず、アプリ全体カバレッジではない。Native Swift、未読込画面、EAS構成等は対象外。
- `pnpm typecheck`: PASS。 `git diff --check`: PASS。
- 外部境界として通知API、AsyncStorage、ファイルシステムなどをMock。iOSの実動作を証明しない。

## 未検証

1. Windowsで可能だが未実施: 予定・Focusの画面状態と通知再照合の競合、アファメーション編集から通知更新、Widget全構成、StoreKit状態変更の画面反映、設定と初回案内のUI操作。
2. Native環境が必要: App Intent、ActivityKit、WidgetKit、App Group、通知権限、StoreKitおよび広告SDKのNative連携。
3. iPhone実機必須: 起動・更新・終了・再起動、通知到達／取消、Widget写真、Live Activity、Siri、購入・復元、権限変更、画面崩れとタッチ操作。

今回本番コードは変更していない。FAILの再現テストは残している。commit・push・EAS Buildは未実行。
