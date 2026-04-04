/**
 * MapLibre を使ったルート表示マップ。
 *
 * ⚠️ @maplibre/maplibre-react-native はネイティブモジュールを必要とするため
 *    Expo Go では動作しない（development build 専用）。
 *    モジュールが取得できない場合はプレースホルダーを表示する。
 */
import type MapLibreModule from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { buildRasterStyle } from '../../constants/map-config';
import type { CurrentLocation } from '../../hooks/use-current-location';
import type { SessionPoint } from '../../lib/session-points-store';

type MapLibreGLType = typeof MapLibreModule;

/** require を試みてネイティブモジュールを取得する */
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

/** 初期カメラ位置（ポイントがない場合のデフォルト: 東京） */
const DEFAULT_CENTER: [number, number] = [139.6917, 35.6895];
const DEFAULT_ZOOM = 10;

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  /** 表示するポイントのリスト（時系列昇順） */
  points: SessionPoint[];
  /** 記録前に表示する現在地 */
  currentLocation?: CurrentLocation | null;
  /** コンテナに適用する追加スタイル（flex:1 や absoluteFill を渡せる） */
  style?: StyleProp<ViewStyle>;
};

// ─── GeoJSON ヘルパー ─────────────────────────────────────────────────────────

function toLineGeoJSON(points: SessionPoint[]) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((p) => [p.longitude, p.latitude]),
    },
    properties: {},
  };
}

function toPointGeoJSON(point: { longitude: number; latitude: number }) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [point.longitude, point.latitude],
    },
    properties: {},
  };
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

function MapUnavailablePlaceholder({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderText}>
        地図は development build でのみ表示されます
      </Text>
    </View>
  );
}

/**
 * GPS ルートを OpenStreetMap タイル上に描画するマップ。
 *
 * - 青いポリラインでルートを表示
 * - 最新ポイントを青い丸でマーク
 * - カメラは最新ポイントを自動追従（zoom 14）
 * - ポイントがない場合は東京をデフォルト表示（MapLibre 利用可能時のみ）
 * - style prop でコンテナサイズを自由に制御可能
 */
export function RouteMap({ points, currentLocation, style }: Props) {
  if (MapLibreGL === null) {
    return <MapUnavailablePlaceholder style={style} />;
  }

  const latest = points.length > 0 ? points[points.length - 1] : null;
  const center: [number, number] = latest
    ? [latest.longitude, latest.latitude]
    : currentLocation !== null && currentLocation !== undefined
      ? [currentLocation.longitude, currentLocation.latitude]
      : DEFAULT_CENTER;
  const zoom = latest
    ? 14
    : currentLocation !== null && currentLocation !== undefined
      ? 16
      : DEFAULT_ZOOM;
  const mapStyle = JSON.stringify(buildRasterStyle('OSM'));

  return (
    <View style={[styles.container, style]}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        testID="route-map"
      >
        <MapLibreGL.Camera
          centerCoordinate={center}
          zoomLevel={zoom}
          animationMode="moveTo"
        />

        {/* ルートライン */}
        {points.length >= 2 && (
          <MapLibreGL.ShapeSource id="route-source" shape={toLineGeoJSON(points)}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#3b82f6',
                lineWidth: 3,
                lineOpacity: 0.9,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* 最新ポイントマーカー */}
        {latest !== null && (
          <MapLibreGL.ShapeSource id="latest-source" shape={toPointGeoJSON(latest)}>
            <MapLibreGL.CircleLayer
              id="latest-circle"
              style={{
                circleRadius: 7,
                circleColor: '#3b82f6',
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {latest === null && currentLocation !== null && currentLocation !== undefined && (
          <MapLibreGL.ShapeSource
            id="current-location-source"
            shape={toPointGeoJSON(currentLocation)}
          >
            <MapLibreGL.CircleLayer
              id="current-location-circle"
              style={{
                circleRadius: 8,
                circleColor: '#22c55e',
                circleStrokeWidth: 2,
                circleStrokeColor: '#ffffff',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      <View style={styles.attribution}>
        <Text style={styles.attributionText}>© OpenStreetMap Contributors</Text>
      </View>
    </View>
  );
}

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
  attribution: {
    position: 'absolute',
    bottom: 6,
    right: 8,
  },
  attributionText: {
    fontSize: 9,
    color: '#94a3b8',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
});
