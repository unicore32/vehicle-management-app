import type { SessionPoint, SessionPointInput } from './session-points-store';

/**
 * 2 点間の値を線形補間する。
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpNullable(
  a: number | null,
  b: number | null,
  t: number,
): number | null {
  if (a === null || b === null) return null;
  return lerp(a, b, t);
}

/**
 * GPS 欠損区間を線形補間して中間ポイントを生成する純粋関数。
 *
 * - `before` と `after` の間を `intervalMs` 間隔でサンプリングする
 * - 座標・高度・速度はすべて線形補間
 * - accuracy は null（補間点は精度不明のため）
 * - 生成されたポイントの挿入は呼び出し側が insertSessionPoints で行う
 *
 * @param before  欠損区間直前の実測ポイント
 * @param after   欠損区間直後の実測ポイント
 * @param intervalMs 補間ポイント間隔（ミリ秒）。デフォルト 10 秒
 * @returns before と after の間に挿入すべき補間ポイントの配列
 */
export function interpolateGap(
  before: SessionPoint,
  after: SessionPoint,
  intervalMs = 10_000,
): SessionPointInput[] {
  const duration = after.timestamp - before.timestamp;
  if (duration <= 0 || intervalMs <= 0) return [];

  const points: SessionPointInput[] = [];
  let t = intervalMs;

  while (t < duration) {
    const ratio = t / duration;
    points.push({
      session_id: before.session_id,
      latitude: lerp(before.latitude, after.latitude, ratio),
      longitude: lerp(before.longitude, after.longitude, ratio),
      altitude: lerpNullable(before.altitude, after.altitude, ratio),
      accuracy: null,
      speed: lerpNullable(before.speed, after.speed, ratio),
      timestamp: Math.round(before.timestamp + t),
    });
    t += intervalMs;
  }

  return points;
}
