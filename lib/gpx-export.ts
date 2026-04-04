import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { SessionPoint } from './session-points-store';

// ─── XML ヘルパー ──────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── GPX 生成 ─────────────────────────────────────────────────────────────────

/**
 * SessionPoint[] を GPX 1.1 形式の XML 文字列に変換する。
 *
 * @param points 時系列昇順のポイント配列
 * @param sessionName トラック名（省略時は 'Trip'）
 */
export function buildGpxString(
  points: SessionPoint[],
  sessionName = 'Trip',
): string {
  const trkpts = points
    .map((p) => {
      const ele =
        p.altitude !== null ? `<ele>${p.altitude.toFixed(1)}</ele>` : '';
      const time = new Date(p.timestamp).toISOString();
      return `      <trkpt lat="${p.latitude}" lon="${p.longitude}">${ele}<time>${time}</time></trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VehicleManagementApp"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <trk>
    <name>${escapeXml(sessionName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * ファイル名を生成する。
 * フォーマット: trip-YYYY-MM-DD-HHmm.gpx
 *
 * @param startedAt セッション開始タイムスタンプ（ms）
 */
export function buildGpxFileName(startedAt: number): string {
  const d = new Date(startedAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `trip-${yyyy}-${mm}-${dd}-${hh}${min}.gpx`;
}

// ─── エクスポート ──────────────────────────────────────────────────────────────

/**
 * SessionPoint[] を GPX ファイルとしてキャッシュディレクトリに書き出し、
 * OS の共有シートで共有する。
 *
 * @param points 時系列昇順のポイント配列
 * @param startedAt セッション開始タイムスタンプ（ms）
 * @param sessionName トラック名（省略時は 'Trip'）
 */
export async function exportGpx(
  points: SessionPoint[],
  startedAt: number,
  sessionName?: string,
): Promise<void> {
  const gpxString = buildGpxString(points, sessionName);
  const fileName = buildGpxFileName(startedAt);
  const fileUri = `${FileSystem.cacheDirectory ?? ''}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, gpxString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('このデバイスではファイル共有がサポートされていません');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/gpx+xml',
    dialogTitle: 'GPX ファイルを共有',
    UTI: 'com.topografix.gpx',
  });
}
