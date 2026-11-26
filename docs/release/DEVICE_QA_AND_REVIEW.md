# RhythmPace 実機QAと審査資料

対象Build番号：未記入 / commit：未記入 / 端末・iOS：未記入 / 実施日時：未記入。

以下は次回Buildに対する確認表。過去の実機確認を最新BuildのPASSとして転記しない。既存データが入った端末のアンインストールは避け、空状態は別のテスト環境で確認する。

## 最優先の実機QA

- [ ] PC・Metroなしで起動、バックグラウンド復帰、強制終了後の再起動。
- [ ] 新規ユーザーの初回紹介→スキップ／完了→デザインをあとで選ぶ→今日画面。設定からの紹介再表示も確認。
- [ ] TODO登録・編集・完了取消・削除→再起動。残数と未来日の除外が一致。
- [ ] Wish行動→TODO作成→Widgetから完了→Wishで取消→完全終了／再起動。両方の状態と重複なしを確認。
- [ ] 予定の登録・時刻／準備／移動時間の編集・削除。通知許可／拒否、集中モード、アプリ終了後も確認。
- [ ] 集中を開始→別画面へ移動→一時停止→再開→終了。記録と分析に反映。正常な状態遷移を異なる時刻の画像だけで不具合扱いしない。
- [ ] 日記の文章・写真を保存／編集／削除して再起動。他の写真参照が残る。
- [ ] Mono Light/Dark・Design・Photo、小画面・文字拡大で文字が極小化せず、操作に重ならない。
- [ ] 広告の成功・取消・失敗、解放後の再起動、期限切れ。実広告を繰り返してQAしない。テスト広告用Buildで確認し、本番設定との差を記録。
- [ ] Sandbox/TestFlightで購入・復元・キャンセル・通信失敗・有効期限変化。Free / Premium / Design Customizeを混同しない。
- [ ] 通知・写真・カレンダー・音声・Live Activityの権限拒否でも、通常操作に戻れる。

## Widget 9種類

| 種類 | サイズ | 対象の利用権 | 確認結果 |
| --- | --- | --- | --- |
| 今やるTODO | M/L | Free | 未実施 |
| 次に控える予定 | M | Free | 未実施 |
| TODOと次の予定 | M | Design Customize / Premium | 未実施 |
| 月間カレンダー | L | Design Customize / Premium | 未実施 |
| 週間カレンダー | M/L | Design Customize / Premium | 未実施 |
| 今日の予定 | M | Design Customize / Premium | 未実施 |
| TODOチェックリスト | M | Design Customize / Premium | 未実施 |
| 叶えたいこと | M | Premium | 未実施 |
| アファメーション | M | Premium | 未実施 |

各サイズで空データ・長文・TODO完了／取消／削除・予定変更／削除・日付越え・月末・写真／柄・権限失効を確認する。最新のカレンダー要約表示と文字サイズはNative Build後に確認する。Widget更新はiOSの制御を受けるため、即時更新を保証する文言にしない。

## Live Activity

- [ ] 開始・更新・終了、ロック画面とDynamic Island。
- [ ] 集中の開始／停止／再開／終了、予定／出発時刻の変更。
- [ ] 二重開始・古いActivity残留・アプリ終了／再起動・端末側の許可OFF。
- [ ] 長いタスク名・アファメーション・文字設定で、読めるサイズと表示枠を両立。

## スクリーンショット 構成案

最新の本番画面を使い、文字だけの架空UIや未実装機能は載せない。撮影用データを用意し、開発バッジ・個人情報・他アプリの通知を除く。課金対象の機能を示す場合は、その区別を併記する。

1. 今日：「毎日のことを、ひとつに。」TODOと次の予定がある状態。
2. タスク入力／予定表：「思いついたら、すぐ残せる。」
3. 集中：「今やることに、自分のペースで。」
4. Wish：「目標と、今日の一歩がつながる。」関連TODOと行動を表示。
5. ルーティン／分析：「続けたことが、見えてくる。」実際に保存したサンプル記録。
6. デザイン：「毎日開きたくなる、私のRhythm。」利用条件を小さすぎない文字で補足。
7. Widget／Live Activity：「アプリを開かず、今を確認。」対応機種・利用条件に配慮。

Apple公式の必要サイズとASCのアップロード欄を提出日に照合する。2026年11月26日確認の公式ページは、Dynamic Island対応iPhoneのmedium display向け最低1枚を案内している。以前の6.5インチ／6.9インチという記憶だけでサイズを決めない。PNG/JPEG、透過なしとし、表示端末の対応解像度を確認してから撮影／制作する。

## App Review向け英語メモ 下書き

以下は最終Buildで再確認してから転記する。連絡先氏名・電話番号・メールはASCの非公開欄へ入力し、Gitへ個人の審査連絡先を保存しない。

> RhythmPace helps users manage tasks, schedules, routines, goals, focus sessions, and personal records in one app. No app account or sign-in is required for the core experience. Data is primarily stored on the device; the app does not provide its own cloud backup or cross-device sync.
>
> Premium is available as monthly and annual auto-renewable subscriptions. Design Customize is a separate non-consumable purchase, and its features are also included while Premium is active. Premium does not remove ads. Please use the purchase and restore controls in Settings. Product availability and prices come from StoreKit.
>
> The 24-hour design trial and the 12-hour rewarded-ad design access are separate from any StoreKit introductory subscription offer. Cancelling or failing a rewarded ad must not grant access.
>
> To test goal/task integration: open the goals tab, create a goal and an action, then use the action's Add to ToDo option. Completion and undo-completion sync only for the explicitly linked one-off task/action pair.
>
> Widgets are added from the iPhone Home Screen. Live Activities appear on the Lock Screen and supported Dynamic Island devices after the relevant feature is enabled. These use the app's local shared data and the system's update schedule. Photo, calendar, microphone, speech-recognition and notification permissions are requested for the corresponding features; declining permissions does not intentionally block unrelated features.

審査担当者の操作で広告が配信されない場合の経路、購入商品の実際の画面文言、権限を拒否した場合の挙動を最終Buildで追記する。上記英文を試験済みという証拠にはしない。

参考：[Apple Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)、[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)。
