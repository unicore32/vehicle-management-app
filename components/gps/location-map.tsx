import { StyleSheet, Text, View } from 'react-native';
// `import type` は型情報のみ（モジュールコードを実行しない）
import type MapLibreModule from '@maplibre/maplibre-react-native';

import { buildRasterStyle, DEFAULT_TILE_SERVER } from '../../constants/map-config';
import type { StoredLocation } from '../../lib/location-store';

// ─── ネイティブモジュールの遅延ロード ─────────────────────────────────────────
//
// 静的 import だとモジュール初期化時（require 解決時）に throw するため、
// Expo Go や初回ビルド前にアプリ全体がクラッシュする。
// try/catch で包んだ require() で遅延ロードし、
// 未登録時は null を返して gracefully にフォールバックする。

type MapLibreGLType = typeof MapLibreModule;
type Coordinate = [number, number];

type LineStringFeature = {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: Coordinate[] };
  properties: Record<string, never>;
};

type PointFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: Coordinate };
  properties: Record<string, never>;
};

const loadMapLibre = (): MapLibreGLType | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@maplibre/maplibre-react-native') as { default: MapLibreGLType }).default;
  } catch {
    return null;
  }
};

const MapLibreGL = loadMapLibre();

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  locations: StoredLocation[];
  /** タイルサーバーキー（省略時は DEFAULT_TILE_SERVER = 'OSM'） */
  tileServerKey?: Parameters<typeof buildRasterStyle>[0];
};

// ─── GeoJSON ヘルパー ─────────────────────────────────────────────────────────

function buildRouteGeoJSON(locations: StoredLocation[]): LineStringFeature {
  // locations は新しい順（DESC）なので古い順に戻してルートを構成する
  const coords = locations
    .slice()
    .reverse()
    .map((loc): [number, number] => [loc.longitude, loc.latitude]);

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  };
}

function buildLatestPointGeoJSON(loc: StoredLocation): PointFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [loc.longitude, loc.latitude],
    },
    properties: {},
  };
}

// ─── プレースホルダー ─────────────────────────────────────────────────────────

function MapUnavailablePlaceholder() {
  return (
    <View style={[styles.container, styles.placeholder]} testID="location-map">
      <Text style={styles.placeholderIcon}>🗺️</Text>
      <Text style={styles.placeholderTitle}>
        地図は Development Build でのみ表示されます
      </Text>
      <Text style={styles.placeholderSub}>
        npx expo run:android でビルドしてください
      </Text>
    </View>
  );
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

/**
 * GPS ログを OSM タイル上にポリラインと最終地点マーカーで表示するコンポーネント。
 *
 * @remarks
 * - API キー不要。OpenStreetMap タイルを使用（ライセンス: ODbL）
 * - タイルサーバーは `tileServerKey` で切り替え可能（OSM / GSI / GSI_PALE）
 * - MapLibre ネイティブモジュールは Development Build が必要（Expo Go 非対応）
 *   → 未登録時はプレースホルダーを表示しクラッシュを回避する
 */
export function LocationMap({
  locations,
  tileServerKey = DEFAULT_TILE_SERVER,
}: Props) {
  if (locations.length === 0) {
    return null;
  }

  // ネイティブモジュール未登録（Expo Go 等）の場合はプレースホルダーを表示
  if (MapLibreGL === null) {
    return <MapUnavailablePlaceholder />;
  }

  // --- 以下は MapLibreGL が null でないことが保証されたスコープ ---
  const GL = MapLibreGL;

  // API キー不要（OSM タイルを使用）
  GL.setAccessToken(null);

  const latest = locations[0];
  const mapStyle = buildRasterStyle(tileServerKey);
  const routeGeoJSON = buildRouteGeoJSON(locations);
  const latestPointGeoJSON = buildLatestPointGeoJSON(latest);

  return (
    <View style={styles.container} testID="location-map">
      <GL.MapView
        style={styles.map}
        mapStyle={mapStyle}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled
        attributionPosition={{ bottom: 4, right: 4 }}
      >
        {/* カメラを最終記録地点に合わせる */}
        <GL.Camera
          zoomLevel={14}
          centerCoordinate={[latest.longitude, latest.latitude]}
          animationMode="moveTo"
          animationDuration={500}
        />

        {/* 走行ルート（ポリライン） */}
        <GL.ShapeSource
          id="route-source"
          shape={routeGeoJSON}
          testID="route-source"
        >
          <GL.LineLayer
            id="route-line"
            style={layerStyles.routeLine}
          />
        </GL.ShapeSource>

        {/* 最終記録地点マーカー */}
        <GL.ShapeSource
          id="latest-point-source"
          shape={latestPointGeoJSON}
          testID="latest-point-source"
        >
          <GL.CircleLayer
            id="latest-point-circle"
            style={layerStyles.latestPoint}
          />
        </GL.ShapeSource>
      </GL.MapView>
    </View>
  );
}

// ─── スタイル ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 32,
  },
  placeholderTitle: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  placeholderSub: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

const layerStyles = {
  routeLine: {
    lineColor: '#0a7ea4',
    lineWidth: 3,
    lineOpacity: 0.9,
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  },
  latestPoint: {
    circleColor: '#0a7ea4',
    circleRadius: 8,
    circleStrokeColor: '#ffffff',
    circleStrokeWidth: 2,
  },
};
