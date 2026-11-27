# 写真テーマの責務

## バックアップ復元時のパス再ベース

`rebaseManagedPhotoUris`は保存状態の全フィールドを非破壊で走査し、管理写真の同名ファイルが現在のDocuments/rhythm-photosに存在する場合だけURIを付け替える。見つからない参照は消さない。失敗時は原本を返し、ファイルの作成・移動・コピー・削除や直接保存は行わない。

Appのhydrationでは再ベース→未知フィールドも含む参照スキャン→各stateへ適用の順。通常保存と起動後cleanupは従来どおり。Widgetは既存のApp Group写真コピーに新URIを渡す。検証範囲・実機未検証事項は`docs/photo-path-rebase.md`を参照。

## 写真最終パッケージ（現在の仕様）

写真・広告条件は `docs/photo-final-package.md` を正とする。以下のPhase 4-2や入口分離の説明は導入時の記録であり、旧永久解放/枠数のルールは廃止した。

- 同梱7枚は安定したsample IDで識別。個人写真のURI/cropとは別の任意metadataを持つ。元の同梱ファイルはコピー・削除しない。トップ再調整時に生成する表示用ファイルだけは既存の管理・参照保護を利用する。
- Freeは枠ごとに広告1回でサンプル無期限、2回で個人写真72時間。購入者は無期限。期限切れでも保存データは消さず表示用設定だけを隠す。
- 全体背景の設定成功時のみPhotoへ。権限拒否・キャンセル・ファイル保存失敗・広告開始だけではモードを変えない。Root状態は既存の保存キューでまとめて保存する。
- トップ解除は参照のみを外す。Nativeシートのdismiss後に確認ダイアログを出す。


## Phase 4-2（2026-11-27）

`usePhotoTheme` は写真選択・トップ画像cropの一時状態と操作をまとめる。
既存の13宣言をAppから移動したもので、利用権限・文言・画像処理・削除条件は変更しない。

- hook内：pending写真、crop再開token、購入フロー再開ref、処理中フラグ、dismiss意図、選択・再調整・crop確定。
- App内：`photoTheme`本体、hydration、全体snapshot保存キュー、保存失敗の再試行、起動時の管理写真掃除、cropモーダルの表示・dismiss配線、デザイン試着。
- 入力：最新の写真設定とsetter、Premium/Designアクセス、報酬アクセス、現在時刻、既存の報酬案内callback。
- 永続化形式・キー、管理ファイルの保護規則は変えない。hook内に独立した保存経路を追加しない。
- hookはAppで無条件に1回呼び、stateの初期値・ref・コールバック本文と依存配列を保持する。

`qa-photo-theme-hook.test.js` はReactのstate更新を実行し、Freeの既存枠・新規枠、写真許可拒否、キャンセル、購入後再開、背景置換時の他参照保持、crop二重実行防止、成功/処理失敗時の状態と一時画像の後片付けを検証する。
画像picker・画像処理・管理ファイルIOはNative境界としてMockする。実際のファイル書込やiPhoneのpicker/cropモーダル動作を検証したことにはしない。

## 設定外の写真入口（2026-11-27）

各画面の写真入口はPhotoEntrySheetで適用先を選び、Nativeシートのdismiss後に既存pickPhotoTheme/adjustTopPhotoを呼ぶ。入口自身は権利を付与せずbypassも渡さない。設定→デザイン→写真タブ、hook本体、crop、保存形式は変更しない。仕様・検証・先行UIパッチとの適用順はdocs/photo-entry-home-compact.mdを参照する。

## crop枠の位置ずれ修正

TopImageCropModalの表示座標は、計算用のx/yをReact Nativeのleft/topに変換して描画する。以前は白枠が原点に残り、マスクと別の固定枠に見えていた。内側の重複Viewも削除し、移動する選択枠とハンドルだけを残す。crop計算・保存形式は変更しない。qa-crop-selection.test.jsで初期位置・移動・確定値・リセットを検証する。
