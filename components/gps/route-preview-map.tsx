/**
 * プレイバック対応のルート表示マップ。
 *
 * - currentTimestamp までのポイントを青いラインで描画
 * - 全ルートをグレーで背景表示
 * - 欠損区間（session_gaps）をオレンジの破線で可視化
 * - ズームイン / アウトボタンをマップ上に重ねて表示
 *
 * ⚠️ @maplibre/maplibre-react-native はネイティブモジュールを必要とするため
 *    Expo Go では動作しない（development build 専用）。
 */
import type MapLibreModule from '@maplibre/maplibre-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildRasterStyle,
  getTileAttribution,
  getTileAttributionUrl,
  resolveTileServerKey,
} from '../../constants/map-config';
import type { SessionGap } from '../../lib/session-gaps-store';
import type { SessionPoint } from '../../lib/session-points-store';

type MapLibreGLType = typeof MapLibreModule;

const loadMapLibre = (): MapLibreGLType | null => {
  try {
    return (
      require('@maplibre/maplibre-react-native') as { default: MapLibreGLType }
    ).default;
  } catch {
    return null;
  }
};

const MapLibreGL = loadMapLibre();
if (MapLibreGL !== null) {
  MapLibreGL.setAccessToken(null);
}

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const DEFAULT_CENTER: [number, number] = [139.6917, 35.6895];
const DEFAULT_ZOOM = 15;
const MIN_ZOOM = 1;
const MAX_ZOOM = 20;

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  /** 全セッションポイント（時系列昇順） */
  points: SessionPoint[];
  /** 欠損区間リスト */
  gaps: SessionGap[];
  /** 現在表示中のタイムスタンプ。このタイムスタンプ以前のポイントのみ青線で描画 */
  currentTimestamp: number;
  /** コンテナに適用するスタイル */
  style?: StyleProp<ViewStyle>;
  /** ボトムシートを避けるためのカメラ下余白 */
  cameraPaddingBottom?: number;
  /** マップ内クレジット表示を有効化するか */
  showAttribution?: boolean;
};

// ─── GeoJSON ヘルパー ─────────────────────────────────────────────────────────

type LineFeature = {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: Record<string, never>;
};

type FeatureCollection = {
  type: 'FeatureCollection';
  features: LineFeature[];
};

function toLineFeature(pts: SessionPoint[]): LineFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: pts.map((p) => [p.longitude, p.latitude]),
    },
    properties: {},
  };
}

/**
 * 欠損区間を FeatureCollection として返す。
 * 各区間は「区間開始直前のポイント → 区間終了直後のポイント」を結ぶ線分。
 */
function buildGapFeatureCollection(
  gaps: SessionGap[],
  allPoints: SessionPoint[],
  currentTimestamp: number,
): FeatureCollection {
  const features: LineFeature[] = [];

  for (const gap of gaps) {
    // 現在のタイムスタンプより先の区間は表示しない
    if (gap.gap_started_at > currentTimestamp) continue;

    const before = [...allPoints].reverse().find((p) => p.timestamp <= gap.gap_started_at);
    const after = allPoints.find((p) => p.timestamp >= gap.gap_ended_at);
    if (!before || !after) continue;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [before.longitude, before.latitude],
          [after.longitude, after.latitude],
        ],
      },
      properties: {},
    });
  }

  return { type: 'FeatureCollection', features };
}

// ─── サブコンポーネント ────────────────────────────────────────────────────────

function MapUnavailablePlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderText}>地図は development build でのみ表示されます</Text>
    </View>
  );
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

/**
 * プレイバック対応ルートマップ。
 */
export function RoutePreviewMap({
  points,
  gaps,
  currentTimestamp,
  style,
  cameraPaddingBottom = 0,
  showAttribution = true,
}: Props) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const { top } = useSafeAreaInsets();

  if (MapLibreGL === null) {
    return <MapUnavailablePlaceholder style={style} />;
  }

  // currentTimestamp 以前のポイントのみ描画（進捗ライン用）
  const visiblePoints = points.filter((p) => p.timestamp <= currentTimestamp);

  // カメラの中心: 可視ポイントの末尾 → 全ポイントの先頭 → デフォルト
  const cameraCenter: [number, number] =
    visiblePoints.length > 0
      ? [visiblePoints[visiblePoints.length - 1].longitude, visiblePoints[visiblePoints.length - 1].latitude]
      : points.length > 0
        ? [points[0].longitude, points[0].latitude]
        : DEFAULT_CENTER;

  const tileServerKey = resolveTileServerKey(cameraCenter);
  const mapStyle = JSON.stringify(buildRasterStyle(tileServerKey));
  const gapCollection = buildGapFeatureCollection(gaps, points, currentTimestamp);
  const compassMarginTop = top + 20;
  const compassMarginRight = 60;
  const overlayTop = 12;
  const attributionTop = top + 12;

  return (
    <View style={[styles.container, style]}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassViewPosition={1}
        compassViewMargins={{ x: compassMarginRight, y: compassMarginTop }}
        testID='route-preview-map'
      >
        <MapLibreGL.Camera
          centerCoordinate={cameraCenter}
          zoomLevel={zoom}
          padding={{ paddingBottom: cameraPaddingBottom }}
          animationMode='moveTo'
          testID='route-preview-map-camera'
        />

        {/* 全ルート（グレー背景線） */}
        {points.length >= 2 && (
          <MapLibreGL.ShapeSource id='full-route-source' shape={toLineFeature(points)}>
            <MapLibreGL.LineLayer
              id='full-route-line'
              style={{
                lineColor: '#334155',
                lineWidth: 2,
                lineOpacity: 0.6,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* 進捗ライン（青） */}
        {visiblePoints.length >= 2 && (
          <MapLibreGL.ShapeSource id='visible-route-source' shape={toLineFeature(visiblePoints)}>
            <MapLibreGL.LineLayer
              id='visible-route-line'
              style={{
                lineColor: '#3b82f6',
                lineWidth: 3,
                lineOpacity: 0.9,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* 欠損区間（オレンジ破線） */}
        {gapCollection.features.length > 0 && (
          <MapLibreGL.ShapeSource id='gap-source' shape={gapCollection}>
            <MapLibreGL.LineLayer
              id='gap-line'
              style={{
                lineColor: '#f97316',
                lineWidth: 2,
                lineDasharray: [4, 4],
                lineOpacity: 0.85,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* 現在位置マーカー */}
        {visiblePoints.length > 0 && (
          <MapLibreGL.ShapeSource
            id='current-pos-source'
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [
                  visiblePoints[visiblePoints.length - 1].longitude,
                  visiblePoints[visiblePoints.length - 1].latitude,
                ],
              },
              properties: {},
            }}
          >
            <MapLibreGL.CircleLayer
              id='current-pos-circle'
              style={{
                circleRadius: 7,
                circleColor: '#3b82f6',
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* ズームボタン */}
      <View style={[styles.zoomButtons, { top: overlayTop }]}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoom((z) => Math.min(z + 1, MAX_ZOOM))}
          testID='zoom-in-button'
        >
          <Text style={styles.zoomButtonText}>＋</Text>
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={() => setZoom((z) => Math.max(z - 1, MIN_ZOOM))}
          testID='zoom-out-button'
        >
          <Text style={styles.zoomButtonText}>－</Text>
        </TouchableOpacity>
      </View>

      {showAttribution && (
        <View style={[styles.overlayColumn, { top: attributionTop }]} pointerEvents='box-none'>
          <TouchableOpacity
            style={styles.attribution}
            onPress={() => Linking.openURL(getTileAttributionUrl(tileServerKey))}
            testID='route-preview-attribution-link'
          >
            <Text style={styles.attributionText}>{getTileAttribution(tileServerKey)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── スタイル ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#0d1117',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
  overlayColumn: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    elevation: 20,
  },
  zoomButtons: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 20,
  },
  zoomButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#1e293b',
  },
  attribution: {
    alignSelf: 'flex-start',
  },
  attributionText: {
    fontSize: 10,
    color: '#cbd5e1',
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
