import { buildGpxString, buildGpxFileName } from '../../lib/gpx-export';
import type { SessionPoint } from '../../lib/session-points-store';

// ─── テストデータ ──────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<SessionPoint>): SessionPoint {
  return {
    id: 1,
    session_id: 1,
    latitude: 35.6895,
    longitude: 139.6917,
    altitude: null,
    accuracy: null,
    speed: null,
    timestamp: 1_700_000_000_000,
    created_at: 1_700_000_000_000,
    ...overrides,
  };
}

// ─── buildGpxFileName ─────────────────────────────────────────────────────────

describe('buildGpxFileName', () => {
  it('フォーマット trip-YYYY-MM-DD-HHmm.gpx で生成される', () => {
    // 2024-01-15 09:05 (JST = UTC+9 として固定のタイムスタンプを使用)
    const ts = new Date('2024-01-15T09:05:00').getTime();
    const name = buildGpxFileName(ts);
    expect(name).toMatch(/^trip-\d{4}-\d{2}-\d{2}-\d{4}\.gpx$/);
    expect(name).toContain('2024');
  });

  it('.gpx 拡張子で終わる', () => {
    const name = buildGpxFileName(Date.now());
    expect(name).toMatch(/\.gpx$/);
  });
});

// ─── buildGpxString ───────────────────────────────────────────────────────────

describe('buildGpxString', () => {
  it('GPX 1.1 ヘッダーを含む', () => {
    const gpx = buildGpxString([]);
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('version="1.1"');
    expect(gpx).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
  });

  it('デフォルトのトラック名は Trip', () => {
    const gpx = buildGpxString([]);
    expect(gpx).toContain('<name>Trip</name>');
  });

  it('指定したトラック名が使われる', () => {
    const gpx = buildGpxString([], 'My Run');
    expect(gpx).toContain('<name>My Run</name>');
  });

  it('トラック名の XML 特殊文字がエスケープされる', () => {
    const gpx = buildGpxString([], '<Trip & "Test">');
    expect(gpx).toContain('&lt;Trip &amp; &quot;Test&quot;&gt;');
  });

  it('ポイントが trkpt 要素として出力される', () => {
    const points = [
      makePoint({ latitude: 35.1, longitude: 139.2, timestamp: 1_700_000_000_000 }),
      makePoint({ id: 2, latitude: 35.2, longitude: 139.3, timestamp: 1_700_000_060_000 }),
    ];
    const gpx = buildGpxString(points);
    expect(gpx).toContain('lat="35.1"');
    expect(gpx).toContain('lon="139.2"');
    expect(gpx).toContain('lat="35.2"');
    expect(gpx).toContain('lon="139.3"');
    expect((gpx.match(/<trkpt /g) ?? []).length).toBe(2);
  });

  it('altitude がある場合 ele 要素が含まれる', () => {
    const points = [makePoint({ altitude: 123.456 })];
    const gpx = buildGpxString(points);
    expect(gpx).toContain('<ele>123.5</ele>');
  });

  it('altitude が null の場合 ele 要素が含まれない', () => {
    const points = [makePoint({ altitude: null })];
    const gpx = buildGpxString(points);
    expect(gpx).not.toContain('<ele>');
  });

  it('各 trkpt に ISO 8601 形式の time 要素が含まれる', () => {
    const ts = 1_700_000_000_000;
    const points = [makePoint({ timestamp: ts })];
    const gpx = buildGpxString(points);
    expect(gpx).toContain(`<time>${new Date(ts).toISOString()}</time>`);
  });

  it('ポイントが空のとき trkseg は空になる', () => {
    const gpx = buildGpxString([]);
    expect(gpx).toContain('<trkseg>');
    expect(gpx).toContain('</trkseg>');
    expect(gpx).not.toContain('<trkpt');
  });
});
