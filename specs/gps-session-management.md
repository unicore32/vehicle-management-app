# GPS セッション管理

## 目的
- GPS ログを単純なポイント収集ではなく、セッション単位の機能として扱う。
- pause/resume、GPX export、セッション単位の閲覧、削除、サマリー表示をサポートする。
- 欠損または劣化した GPS 区間を後から補正できるようにする。

## 関連仕様
- 共通のナビゲーション、設定、データモデル、再利用 UI は [specs/gps-session-foundation.md](specs/gps-session-foundation.md) で定義する。

## スコープ
### 対象
- GPS ログの start / pause / resume / stop
- Session list と Session detail 画面
- セッション単位のサマリー
- GPX export
- 1 件ずつのセッション削除
- 欠損区間補正のサポート
- バックグラウンド GPS 記録
- バックグラウンド記録通知
- 長時間停止 / アイドリング時の自動一時停止
- セッションとエクスポート済みファイルの手動削除

### 対象外
- クラウド同期
- 複数端末間共有
- 公開ストア配布向け UX
- 基本的な補正を超える高度なルート編集

## 用語
- **Session**: 1 回の drive / trip / logging 期間。
- **Track point**: 記録された 1 件の GPS サンプル。
- **Missing segment**: GPS を十分な信頼性で記録できなかった時間帯。

## 挙動
### 記録状態
- `idle`: not recording
- `recording`: actively collecting GPS points
- `paused`: session exists, but point collection is temporarily stopped
- `background`: recording continues while the app is backgrounded

### 位置サンプリング間隔
- GPS 記録では設定可能なサンプリング間隔を使う。
- 設定値は秒単位の数値入力とする。
- 既定値は 2 秒とする。
- 設定した間隔は、記録開始時または再開時に適用する。

### Pause / resume
- Pause してもセッションは閉じない。
- Resume では同じセッションを継続する。
- Pause 中の時間は moving time に含めない。
- UI ではセッションが paused であることを明確に表示する。

### バックグラウンド記録
- 権限が許可されている場合、アプリがバックグラウンドでも GPS 記録を継続する。
- Active なセッション中にアプリがバックグラウンドへ移行したら、記録継続中であることを示す push/local notification を表示する。
- 通知では、バックグラウンド記録が active であることを明確に伝える。
- バックグラウンド記録でも、同じ session と point のデータモデルを使う。
- バックグラウンド位置情報権限が拒否されている場合、バックグラウンド中は記録を停止する。
- 通知権限が拒否されている場合でも記録は継続し、通知表示だけをスキップする。

### セッション単位の表示項目
各セッションでは最低限次を表示する。
- start time
- end time
- duration
- distance
- average speed
- max speed
- point count
- route preview map

### GPX export
- Export はセッション単位で実行できるようにする。
- 出力は、順序付き track point を含む `.gpx` ファイルとする。
- ファイル名はタイムスタンプベースにし、例として `trip-2026-04-05-0830.gpx` のような形式にする。
- Export では生のタイムスタンプをできるだけ保持する。

### ルートプレビュー再生
- Session detail の preview map は zoom in / zoom out をサポートする。
- ズーム操作は地図コンテンツ領域の右上に固定する。
- プレビューは、ぱっと見でルートを確認しやすいよう、初期状態でやや拡大した表示にする。
- プレビューは、時刻スライダーによるスクラブをサポートする。
- スライダーが動いたら、表示中の軌跡は選択中の timestamp に合わせて更新する。
- プレビューは、開始から終了までの段階的な再生をサポートする。
- 初期再生位置は最新記録ポイントとし、デフォルト表示でルート終端が見えるようにする。
- GPS データのギャップは、プレビュー内で見分けられる状態を維持する。
- Session detail の preview map では attribution を左上に表示し、recenter control は表示しない。

### ホーム地図の挙動
- Home 地図では、foreground の現在地が取得できしだい現在地マーカーを表示する。
- ユーザーが地図をパンして現在地が中心でなくなった場合、左下付近に現在地へ戻すアイコンを表示する。
- 現在地へ戻すアイコンを押したら、地図を現在地へ戻し、アイコンを再び非表示にする。
- 地図中心が現在地に留まっている場合、現在地へ戻すアイコンは表示しない。

### 削除
- 削除はセッション単位で行う。
- セッション削除時には、その track point と関連する missing-segment record も削除する。
- 削除前には確認ダイアログを必須とする。
- Export 済み GPX ファイルは、すでに共有または別保存されている場合、セッション削除後も残ってよい。

### サマリー
#### セッションサマリー
- duration
- distance
- average speed
- max speed
- point count
- start / end time

サマリー計算方針は次のとおり。
- Total distance は、有効な連続 track point の順序付き座標から計算する。
- Average speed は総経過時間ではなく moving time を基準に計算する。
- Wall-clock duration には停止中の時間が含まれてよいが、paused の時間は moving time から除外する。
- セッションにギャップがある場合、サマリー値は記録済みまたは補正済みルートを source of truth とする。

#### 全体サマリー
- total sessions
- total distance
- total moving time
- average speed
- max speed

### Missing GPS 補正
- ポイントが欠けた場合でも、セッションには missing-segment record を保持する。
- Session detail では後から補正できるようにする。
- 初期実装では、前後ポイント間の単純補間を使ってよい。
- 必要なら手動補正は後から追加できるようにする。
- GPS 取得が一時的に失敗した場合でも、missing segment は保持し、後で補正できるようにする。
- ギャップは、連続する GPS point 間の timestamp 差が設定閾値を超えたときに検出する。
- ギャップ検出閾値は設定画面から変更可能とし、既定値を 10 秒、範囲を 5〜300 秒とする。
- 検出したギャップは `session_gaps` に `reason: 'gps_timeout'` として保存する。
- 補間では、10 秒間隔で座標、高度、速度を線形補間した中間ポイントを生成する。
- 補間ポイントは `session_points` に追加し、元のポイントは変更しない。
- 補正後は `correction_mode` を `'interpolated'` に更新する。

### 長時間停止時の自動一時停止
- 端末が設定時間以上停止していた場合、記録は自動で pause する。
- Pause 判定は移動有無と経過時間の両方を使う。
- 停止閾値は設定画面から変更可能にする。
- 初期版では妥当な既定値を持ってよいが、後からユーザーが変更できるようにする。
- Auto-pause してもセッションは終了しない。
- 可能であれば、UI で pause 理由を表示する。
- 実装では固定の既定閾値を定義しつつ、その値は将来的にユーザー変更可能であることを前提にする。

## メモ
- セッションモデリングは、機能拡張を続ける前に導入する。
