# バックアップ安全性：写真パス再ベース

## 基準・適用順

基準はHEAD `28ed081`＋枠別解放の写真最終パッケージ（50 suites / 458件PASS）の作業ツリー。既存の未コミット変更は保持した。納品はこの状態への追加パッチ。写真最終パッケージへ重ねるが、適用済みの現在の作業ツリーには再適用しない。commit/pushはしない。iCloud同期コードはまだ追加していない。

## 変更ファイルと順序

- `app/features/photo/persistentPhoto.ts`：`rebaseManagedPhotoUris`追加。管理対象判定は既存関数を共有。現在のDocuments/rhythm-photos内の同名ファイルが存在した場合だけURIを変更する。現在URIと同一なら何もしない。候補が無ければ元が存在する/しないに関係なく原URIを保持する。ファイル・ディレクトリ作成/コピー/移動/削除はしない。
- `app/App.tsx`：hydrationのload成功後、active/saved確認直後に再ベース。続く参照スキャン、各stateへのsetter、Widget受け渡しはすべて再ベース後の値を使用。通常保存スナップショットで永続化。cleanupは既存のhydrated後タイマーで、起動参照と最新保存参照を保護する。順序は再ベース→参照スキャン→state適用→通常保存/cleanup。
- `app/features/photo/README.md`：責務と順序を追記。
- `app/__tests__/qa-photo-rebase.test.js`：11件追加。
- `app/__tests__/qa-photo-rebase-app.test.js`：本番App hydration・通常保存・Widget Nativeへの新URI引数・再マウントの回帰1件追加。
- 本報告。

入力を変更しないcopy-on-write走査。未知/旧形式フィールドも配列も走査する。循環・getter・ファイルシステム例外等があれば途中成果を破棄し、ログとともに原本を返す。変更のない部分は参照も維持する。既存の参照スキャナ自身のfail-closed動作は変更していない（JSON保存から循環は生じない）。

PersistedState・保存キー・Premium ID・ファイル名・crop計算/値・保存キュー・80ms debounce・失敗時retry・cleanup本体は変更していない。未知フィールドのURIも読み込んだオブジェクトでは付け替わるが、もともとrootスナップショットが保存しない未知フィールドの保存方式を拡張するものではない。

## 自動テスト範囲

最終検証：52 suites / 470件全PASS（128.632秒、skipなし）。基準50 suites / 458件から2 suites / 12件追加。`pnpm typecheck` PASS、`git diff --check` PASS。追加パッチは写真最終パッチを適用した一時indexでstrict check・実適用を行い、現在の作業ツリーと完全一致することを確認した。実際のindex・HEADは変更していない。

最初の全体実行では追加Appテストのcleanup hookがタイムアウトしたため、購入モックを毎レンダー新規生成せず安定した状態を返すよう修正。既存テストの期待値やtimeoutは変更せず、単独再実行と最終全体実行がPASSした。

単体：旧prefix、現在prefix、候補無し（原本あり/なし）、両方あり、管理対象外、深い未知/Wish/Widget参照、冪等性、循環時の非破壊復帰、IO/getter失敗、通常保存と再読込、cleanup同名保護。

| 対象 | Jestでの模擬復元確認 | 実機/シミュレータ表示 |
| --- | --- | --- |
| 全体背景・ホームトップ・集中背景 | 本番hydrationで新URI適用、通常保存、再起動相当の再マウント | 未検証 |
| Widget個別写真・アファメーション写真 | 本番Appから既存NativeコピーAPIへ新URIが渡る | 未検証 |
| Wish日記・旧review・reflectionCard・未知参照 | 深い走査とJSON往復、参照スキャン/cleanup保護 | 未検証 |

全体背景/トップ/集中/Widget/日記の5種類で、ファイルシステムをモックしたJSON模擬復元→通常保存→cleanup→再読込を確認。未参照のファイルだけが削除され、参照ファイルは残る。これは実ファイルを置いた端末の模擬復元試験の代わりではない。

## Widget追随の確認

既存のWidget同期はhydratedとStoreKit解決後に実行される。再ベース後のwidgetSettingsを受け、URI単位のプロセス内コピー済みrefと比較する。起動時refは空なので、個別写真はsaveRhythmWidgetPhotoForWidget、アファメーション写真はsaveRhythmAffirmationPhotoに新URIを渡すことをJestで確認。

Swift側は受け取ったfile URIをApp Groupの既存固定名へコピーする設計（読み取り可能性確認→一時ファイル→置換）。Widgetスナップショットが持つのはその固定ファイル名で、旧Documentsパスを持ち続ける設計ではない。Nativeコピー失敗時は従来どおり再試行し、成功やWidgetKit更新は保証しない。Widgetの仕組み自体は変更していない。

## 未検証・次工程

- iOS実機/シミュレータ上で実ファイルのprefixだけを書き換えての表示・cleanup・再起動試験：未検証。
- iCloudバックアップ→別端末復元：未検証。この開発環境ではiOS端末/シミュレータを操作できない。
- Native App Groupへの実コピー・WidgetKit表示：未検証。

自動検証後はiCloud Phase A（土台のみ・同期無効）の着手条件をコード上満たす。実機復元保証ではなく、Phase B/Cの同期有効化・2台試験とは切り分ける。
