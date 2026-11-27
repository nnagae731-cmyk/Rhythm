# 写真テーマの責務

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
