# GPS セッション基盤

## 目的
- GPS セッション機能で共通して使うデータモデル、ナビゲーション構成、設定、再利用 UI を定義する。

## スコープ
### 対象
- 共通のセッション用データモデル
- アプリのナビゲーション構成
- 記録フローと閲覧フローで共有する設定画面
- GPS 関連画面で横断利用する UI コンポーネント
- デバッグログの挙動

### 対象外
- 記録ライフサイクルのルール
- ギャップ検出と補正のルール
- GPX エクスポートの詳細仕様
- セッション単位の集計ロジック

## データモデル
### sessions
- `id`
- `started_at`
- `ended_at`
- `status` (`idle` / `recording` / `paused` / `finished`)
- `is_background_active`
- `paused_reason`
- `distance_m`
- `moving_time_s`
- `avg_speed`
- `max_speed`
- `point_count`
- `note`
- `created_at`
- `updated_at`

### session_points
- `id`
- `session_id`
- `latitude`
- `longitude`
- `altitude`
- `accuracy`
- `speed`
- `timestamp`
- `created_at`

### session_gaps
- `id`
- `session_id`
- `gap_started_at`
- `gap_ended_at`
- `reason`
- `correction_mode`

### playback_state
- `session_id`
- `current_timestamp`
- `playback_position`
- `is_playing`
- `zoom_level`

### app_state
- `session_id`
- `last_foreground_at`
- `last_motion_at`
- `is_background_notified`
- `auto_pause_threshold_s`

## 画面/UI
### ナビゲーション
- ボトムタブバーは置かない。
- アプリはスタックナビゲーションを使う。
- ルートは Home 画面 (`app/index.tsx`)。
- Session list は Home 画面からボタンで遷移できる。
- Session detail は Session list から push 遷移する (`app/session/[id].tsx`)。
- Settings は Home 画面からボタンで遷移できる。
- explore / placeholder タブは削除済みとする。

### 設定
- ハードコードすべきでない挙動を設定する画面とする。
- GPS 記録間隔を秒単位の数値入力で設定できるようにし、初期値は 2 秒とする。
- GPS 精度設定を含める。
- 自動一時停止の閾値と、それに関連する停止検出設定を含める。
- ギャップ検出閾値を含める。既定値を 10 秒とし、範囲は 5〜300 秒とする。
- バックグラウンド記録挙動と通知設定を含める。
- GPX のファイル名ルールや共有フローなど、エクスポート挙動を含める。
- 開発用のデバッグ情報を含める。
- 永続デバッグログ保存のオン/オフ切り替えを含める。
- 保存済みデバッグログのエクスポートと全削除アクションを含める。
- 保持期間設定は、必要になるまでは対象外でよい。
- この画面は、アプリのデフォルト挙動を説明できる内容にする。

## コンポーネント分割
### ホーム画面
- `RecordingControlCard`
	- start / pause / resume / stop actions
	- 現在の状態ラベル
- `RouteMap`
	- 位置情報権限が許可されたら、Home ですぐ現在地マーカーを表示する
	- 現在地表示の丸マーカーは 1 種類に統一し、最新記録点マーカーと重複表示しない
	- 最新の live 軌跡を優先して描画し、長時間セッションでも現在地付近の線が見えやすい状態を保つ
	- attribution は左上に表示する
	- 地図中心が現在地から外れたときだけ、左下付近に現在地へ戻すボタンを表示する
	- ユーザーが地図をパンまたはズームした場合は自動追従を解除し、現在地へ戻すボタン押下時のみ追従を再開する
- Live stats row (Home 画面内のインライン表示で、別カードにはしない)
	- 経過時間、現在速度 (km/h)、距離 (km または m)
	- セッションが active のときだけ表示する（recording または paused）
	- 経過時間は live points ではなく active session の `started_at` を基準に計算する
- `BackgroundStatusBanner`
	- バックグラウンド記録状態
	- 通知に関する補足
- `ErrorBanner`
	- 権限 / GPS / pause-resume 失敗
- 右上ナビゲーションボタン
	- session list / settings へのショートカット

### セッション一覧
- `SessionListItem`
	- 日付
	- 時間
	- 距離
	- ステータス
- `SessionListEmptyState`
	- 記録がないことを示すメッセージ
- `SessionListHeader`
	- 全体サマリーのプレビュー

### セッション詳細
- `SessionDetailHeader`
	- セッション日付、ステータス、サマリー
- `RoutePreviewMap`
	- ズーム操作
	- attribution はセッション詳細の地図領域左上に表示する
	- recenter / focus-current-location ボタンは表示しない
	- ルート再生 / スクラブ
	- ギャップの可視化
	- 通常区間と gap 区間を別色で表現できる
	- playback 追従モードと手動閲覧モードを持つ
	- ユーザーがパンまたはズームした場合は playback 追従を解除し、その操作を尊重する
	- ボトムシート展開による padding 変更だけではカメラ中心や縮尺をリセットしない
- `RoutePlaybackSlider`
	- 時間スライダーと再生位置
- `SessionDetailStats`
	- 距離、時間、速度、ポイント数
- `SessionDetailActions`
	- export、delete、補正画面への導線
- `GapCorrectionPanel`
	- 欠損区間一覧と補正導線

### 設定画面
- `AutoPauseSettings`
	- 閾値と停止検出に関する設定
- `BackgroundBehaviorSettings`
	- バックグラウンド通知とログ挙動の設定
- `ExportSettings`
	- GPX 命名規則と共有挙動
- `DebugSettings`
	- 開発用の詳細設定

### 共通要素
- `ConfirmDialog`
- `StatusChip`
- `MetricRow`
- `EmptyState`
- `ErrorState`
- `LoadingState`

### デバッグログ
- デバッグ出力は引き続き開発コンソールに表示する。
- 永続デバッグログが有効な場合、ログはタイムスタンプとメッセージ内容付きで保存する。
- ログエクスポートはプレーンテキストファイルとして共有する。
- 全削除アクションでは保存済みデバッグログをすべて削除する。

## メモ
- 実装は現在の SQLite-first アーキテクチャとの互換性を維持する。
- セッションモデリングは、機能拡張を続ける前に導入する。