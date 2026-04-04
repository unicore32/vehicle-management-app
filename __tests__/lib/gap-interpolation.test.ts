import { interpolateGap } from '../../lib/gap-interpolation';
import type { SessionPoint } from '../../lib/session-points-store';

// ─── テスト用ポイントファクトリ ───────────────────────────────────────────────

function makePoint(overrides: Partial<SessionPoint> = {}): SessionPoint {
  return {
    id: 1,
    session_id: 1,
    latitude: 35.68,
    longitude: 139.76,
    altitude: null,
    accuracy: null,
    speed: null,
    timestamp: 0,
    created_at: 0,
    ...overrides,
  };
}

// ─── interpolateGap ───────────────────────────────────────────────────────────

describe('interpolateGap', () => {
  it('returns empty array when duration is zero', () => {
    const p = makePoint({ timestamp: 1000 });
    expect(interpolateGap(p, p)).toEqual([]);
  });

  it('returns empty array when after is before before', () => {
    const before = makePoint({ timestamp: 2000 });
    const after = makePoint({ timestamp: 1000 });
    expect(interpolateGap(before, after)).toEqual([]);
  });

  it('returns empty array when gap is shorter than one interval', () => {
    const before = makePoint({ timestamp: 0 });
    const after = makePoint({ timestamp: 5_000 }); // 5s < 10s interval
    expect(interpolateGap(before, after)).toEqual([]);
  });

  it('returns one midpoint for a 20-second gap with 10s interval', () => {
    const before = makePoint({ timestamp: 0, latitude: 0, longitude: 0 });
    const after = makePoint({ timestamp: 20_000, latitude: 2, longitude: 4 });

    const result = interpolateGap(before, after, 10_000);

    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(10_000);
    expect(result[0].latitude).toBeCloseTo(1, 5);
    expect(result[0].longitude).toBeCloseTo(2, 5);
  });

  it('returns two midpoints for a 30-second gap with 10s interval', () => {
    const before = makePoint({ timestamp: 0 });
    const after = makePoint({ timestamp: 30_000 });

    const result = interpolateGap(before, after, 10_000);

    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(10_000);
    expect(result[1].timestamp).toBe(20_000);
  });

  it('does not include a point at exactly the after timestamp', () => {
    const before = makePoint({ timestamp: 0 });
    const after = makePoint({ timestamp: 20_000 });

    const result = interpolateGap(before, after, 10_000);

    expect(result.every((p) => p.timestamp < after.timestamp)).toBe(true);
  });

  it('interpolates altitude when both points have altitude', () => {
    const before = makePoint({ timestamp: 0, altitude: 100 });
    const after = makePoint({ timestamp: 20_000, altitude: 200 });

    const result = interpolateGap(before, after, 10_000);

    expect(result[0].altitude).toBeCloseTo(150, 5);
  });

  it('sets altitude to null when either point has null altitude', () => {
    const before = makePoint({ timestamp: 0, altitude: null });
    const after = makePoint({ timestamp: 20_000, altitude: 200 });

    const result = interpolateGap(before, after, 10_000);

    expect(result[0].altitude).toBeNull();
  });

  it('interpolates speed when both points have speed', () => {
    const before = makePoint({ timestamp: 0, speed: 0 });
    const after = makePoint({ timestamp: 20_000, speed: 20 });

    const result = interpolateGap(before, after, 10_000);

    expect(result[0].speed).toBeCloseTo(10, 5);
  });

  it('sets accuracy to null for all interpolated points', () => {
    const before = makePoint({ timestamp: 0, accuracy: 5 });
    const after = makePoint({ timestamp: 20_000, accuracy: 10 });

    const result = interpolateGap(before, after, 10_000);

    expect(result.every((p) => p.accuracy === null)).toBe(true);
  });

  it('assigns correct session_id from before point', () => {
    const before = makePoint({ timestamp: 0, session_id: 42 });
    const after = makePoint({ timestamp: 20_000, session_id: 42 });

    const result = interpolateGap(before, after, 10_000);

    expect(result.every((p) => p.session_id === 42)).toBe(true);
  });

  it('respects a custom interval', () => {
    const before = makePoint({ timestamp: 0 });
    const after = makePoint({ timestamp: 60_000 });

    // 5s interval → points at 5, 10, 15, ..., 55s = 11 points
    const result = interpolateGap(before, after, 5_000);

    expect(result).toHaveLength(11);
    expect(result[0].timestamp).toBe(5_000);
    expect(result[10].timestamp).toBe(55_000);
  });
});
