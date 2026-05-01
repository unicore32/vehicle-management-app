/**
 * MapLibre を使ったルート表示マップ。
 *
 * ⚠️ @maplibre/maplibre-react-native はネイティブモジュールを必要とするため
 *    Expo Go では動作しない（development build 専用）。
 *    モジュールが取得できない場合はプレースホルダーを表示する。
 */
import type MapLibreModule from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildRasterStyle,
  getTileAttribution,
  getTileAttributionUrl,
  resolveTileServerKey,
} from '../../constants/map-config';
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
const RECENTER_DISTANCE_THRESHOLD = 0.0003;
const CAMERA_EPSILON = 0.000001;
const ZOOM_EPSILON = 0.01;

// ─── 型定義 ───────────────────────────────────────────────────────────────────

type Props = {
  /** 表示するポイントのリスト（時系列昇順） */
  points: SessionPoint[];
  /** 記録前に表示する現在地 */
  currentLocation?: CurrentLocation | null;
  /** コンテナに適用する追加スタイル（flex:1 や absoluteFill を渡せる） */
  style?: StyleProp<ViewStyle>;
  /** 下部 UI を避けるためのリセンターボタン下余白 */
  recenterBottomOffset?: number;
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

function extractCenterCoordinate(event: unknown): [number, number] | null {
  if (typeof event !== 'object' || event === null) return null;

  const candidate = event as {
    geometry?: { coordinates?: unknown };
    properties?: { center?: unknown; visibleBounds?: unknown };
  };

  if (Array.isArray(candidate.geometry?.coordinates) && candidate.geometry.coordinates.length >= 2) {
    const [longitude, latitude] = candidate.geometry.coordinates;
    if (typeof longitude === 'number' && typeof latitude === 'number') {
      return [longitude, latitude];
    }
  }

  if (Array.isArray(candidate.properties?.center) && candidate.properties.center.length >= 2) {
    const [longitude, latitude] = candidate.properties.center;
    if (typeof longitude === 'number' && typeof latitude === 'number') {
      return [longitude, latitude];
    }
  }

  return null;
}

function extractZoomLevel(event: unknown): number | null {
  if (typeof event !== 'object' || event === null) return null;

  const candidate = event as {
    properties?: { zoomLevel?: unknown; zoom?: unknown };
  };

  const zoomCandidate = candidate.properties?.zoomLevel ?? candidate.properties?.zoom;
  return typeof zoomCandidate === 'number' ? zoomCandidate : null;
}

function isOutsideRecenterThreshold(
  centerCoordinate: [number, number],
  currentLocation: CurrentLocation,
): boolean {
  const longitudeDelta = Math.abs(centerCoordinate[0] - currentLocation.longitude);
  const latitudeDelta = Math.abs(centerCoordinate[1] - currentLocation.latitude);
  return longitudeDelta > RECENTER_DISTANCE_THRESHOLD || latitudeDelta > RECENTER_DISTANCE_THRESHOLD;
}

function areCoordinatesClose(
  left: [number, number],
  right: [number, number],
): boolean {
  return (
    Math.abs(left[0] - right[0]) <= CAMERA_EPSILON
    && Math.abs(left[1] - right[1]) <= CAMERA_EPSILON
  );
}

function areZoomLevelsClose(left: number, right: number): boolean {
  return Math.abs(left - right) <= ZOOM_EPSILON;
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
export function RouteMap({ points, currentLocation, style, recenterBottomOffset = 0 }: Props) {
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const initialCenter: [number, number] = currentLocation !== null && currentLocation !== undefined
    ? [currentLocation.longitude, currentLocation.latitude]
    : latest !== null
      ? [latest.longitude, latest.latitude]
      : DEFAULT_CENTER;
  const initialZoom = currentLocation !== null && currentLocation !== undefined
    ? 16
    : latest !== null
      ? 14
      : DEFAULT_ZOOM;

  const [isFollowingUser, setIsFollowingUser] = useState(
    currentLocation !== null && currentLocation !== undefined,
  );
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(initialCenter);
  const [cameraZoom, setCameraZoom] = useState(initialZoom);
  const [showRecenterButton, setShowRecenterButton] = useState(false);
  const hasManualCameraOverrideRef = useRef(false);
  const lastProgrammaticCameraRef = useRef<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const { top, bottom } = useSafeAreaInsets();

  const followTargetCenter: [number, number] = currentLocation !== null && currentLocation !== undefined
    ? [currentLocation.longitude, currentLocation.latitude]
    : latest
      ? [latest.longitude, latest.latitude]
      : DEFAULT_CENTER;
  const tileServerKey = resolveTileServerKey(cameraCenter);
  const mapStyle = JSON.stringify(buildRasterStyle(tileServerKey));
  const compassMarginTop = top + 12;
  const attributionTop = top + 72;
  const recenterBottom = recenterBottomOffset > 0
    ? recenterBottomOffset + 8
    : bottom + 8;

  const applyProgrammaticCameraUpdate = useCallback((nextCenter: [number, number], nextZoom: number) => {
    lastProgrammaticCameraRef.current = {
      center: nextCenter,
      zoom: nextZoom,
    };

    setCameraCenter((previousCenter) => (
      areCoordinatesClose(previousCenter, nextCenter) ? previousCenter : nextCenter
    ));
    setCameraZoom((previousZoom) => (
      areZoomLevelsClose(previousZoom, nextZoom) ? previousZoom : nextZoom
    ));
  }, []);

  useEffect(() => {
    if (
      currentLocation !== null
      && currentLocation !== undefined
      && !hasManualCameraOverrideRef.current
      && !isFollowingUser
    ) {
      setIsFollowingUser(true);
    }
  }, [currentLocation, isFollowingUser]);

  useEffect(() => {
    if (!isFollowingUser) return;
    applyProgrammaticCameraUpdate(followTargetCenter, cameraZoom);
  }, [applyProgrammaticCameraUpdate, cameraZoom, followTargetCenter[0], followTargetCenter[1], isFollowingUser]);

  if (MapLibreGL === null) {
    return <MapUnavailablePlaceholder style={style} />;
  }

  function handleRegionDidChange(event: unknown) {
    const centerCoordinate = extractCenterCoordinate(event);
    const zoomLevel = extractZoomLevel(event);

    if (lastProgrammaticCameraRef.current !== null) {
      const centerMatches = centerCoordinate === null
        || areCoordinatesClose(centerCoordinate, lastProgrammaticCameraRef.current.center);
      const zoomMatches = zoomLevel === null
        || areZoomLevelsClose(zoomLevel, lastProgrammaticCameraRef.current.zoom);

      if (centerMatches && zoomMatches) {
        return;
      }

      lastProgrammaticCameraRef.current = null;
    }

    const nextCenter = centerCoordinate ?? cameraCenter;
    const nextZoom = zoomLevel ?? cameraZoom;
    const centerChanged = centerCoordinate !== null && !areCoordinatesClose(centerCoordinate, cameraCenter);
    const zoomChanged = zoomLevel !== null && !areZoomLevelsClose(zoomLevel, cameraZoom);

    if (centerChanged) {
      setCameraCenter(nextCenter);
    }
    if (zoomChanged) {
      setCameraZoom(nextZoom);
    }

    if (centerChanged || zoomChanged) {
      hasManualCameraOverrideRef.current = true;
      setIsFollowingUser(false);
    }

    if (currentLocation === null || currentLocation === undefined) {
      setShowRecenterButton(false);
      return;
    }

    const shouldShowRecenter = isOutsideRecenterThreshold(nextCenter, currentLocation);
    setShowRecenterButton(shouldShowRecenter);
  }

  function handleRecenterPress() {
    if (currentLocation === null || currentLocation === undefined) return;

    hasManualCameraOverrideRef.current = false;
    setShowRecenterButton(false);
    setIsFollowingUser(true);
    applyProgrammaticCameraUpdate([currentLocation.longitude, currentLocation.latitude], cameraZoom);
  }

  return (
    <View style={[styles.container, style]}>
      <MapLibreGL.MapView
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        compassViewPosition={1}
        compassViewMargins={{ x: 12, y: compassMarginTop }}
        onRegionDidChange={handleRegionDidChange}
        testID="route-map"
      >
        <MapLibreGL.Camera
          centerCoordinate={cameraCenter}
          zoomLevel={cameraZoom}
          animationMode="moveTo"
          testID="route-map-camera"
        />

        {/* ルートライン */}
        {points.length >= 2 && (
          <MapLibreGL.ShapeSource id="route-source" shape={toLineGeoJSON(points)}>
            <MapLibreGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#3b82f6',
                lineWidth: 5,
                lineOpacity: 0.9,
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* 最新ポイントマーカー */}
        {latest !== null && (currentLocation === null || currentLocation === undefined) && (
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

        {currentLocation !== null && currentLocation !== undefined && (
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

      <View style={[styles.attributionOverlay, { top: attributionTop }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.attribution}
          onPress={() => Linking.openURL(getTileAttributionUrl(tileServerKey))}
          testID="route-map-attribution-link"
        >
          <Text style={styles.attributionText}>{getTileAttribution(tileServerKey)}</Text>
        </TouchableOpacity>
      </View>

      {showRecenterButton && (
        <View style={[styles.recenterOverlay, { bottom: recenterBottom }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={handleRecenterPress}
            accessibilityRole="button"
            accessibilityLabel="現在位置にフォーカス"
            testID="route-map-recenter-button"
          >
            <View style={styles.recenterIconOuter}>
              <View style={styles.recenterIconInner} />
              <View style={[styles.recenterCrosshair, styles.recenterCrosshairVertical]} />
              <View style={[styles.recenterCrosshair, styles.recenterCrosshairHorizontal]} />
            </View>
          </TouchableOpacity>
        </View>
      )}
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
  attributionOverlay: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    elevation: 20,
  },
  recenterOverlay: {
    position: 'absolute',
    left: 12,
    zIndex: 20,
    elevation: 20,
  },
  recenterButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  recenterIconOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  recenterCrosshair: {
    position: 'absolute',
    backgroundColor: '#f8fafc',
  },
  recenterCrosshairVertical: {
    width: 2,
    height: 30,
  },
  recenterCrosshairHorizontal: {
    width: 30,
    height: 2,
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
