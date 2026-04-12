/**
 * 地図タイルサーバー設定。
 * すべて API キー不要・無料で利用可能。
 *
 * 利用規約:
 * - OSM: https://operations.osmfoundation.org/policies/tiles/
 * - GSI: https://maps.gsi.go.jp/development/ichiran.html
 */
export const TILE_SERVERS = {
  /** OpenStreetMap 標準タイル（全世界・英語地名中心） */
  OSM: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** 国土地理院 標準地図（日本国内・高精細） */
  GSI: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
  /** 国土地理院 淡色地図（UI に馴染みやすい、夜間使用推奨） */
  GSI_PALE: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
} as const;

export type TileServerKey = keyof typeof TILE_SERVERS;

/** デフォルトタイルサーバー（変更する場合はここを書き換える） */
export const DEFAULT_TILE_SERVER: TileServerKey = 'OSM';

const JAPAN_BOUNDS = {
  minLongitude: 122,
  maxLongitude: 154,
  minLatitude: 20,
  maxLatitude: 46,
} as const;

type Coordinate = [number, number];

function isCoordinateInJapan([longitude, latitude]: Coordinate): boolean {
  return (
    longitude >= JAPAN_BOUNDS.minLongitude
    && longitude <= JAPAN_BOUNDS.maxLongitude
    && latitude >= JAPAN_BOUNDS.minLatitude
    && latitude <= JAPAN_BOUNDS.maxLatitude
  );
}

export function resolveTileServerKey(centerCoordinate?: Coordinate | null): TileServerKey {
  if (centerCoordinate && isCoordinateInJapan(centerCoordinate)) {
    return 'GSI';
  }

  return DEFAULT_TILE_SERVER;
}

export function getTileAttribution(tileServerKey: TileServerKey): string {
  return tileServerKey === 'OSM'
    ? '© OpenStreetMap Contributors'
    : '© 国土地理院';
}

export function getTileAttributionUrl(tileServerKey: TileServerKey): string {
  return tileServerKey === 'OSM'
    ? 'https://www.openstreetmap.org/copyright'
    : 'https://maps.gsi.go.jp/development/ichiran.html';
}

/**
 * MapLibre に渡す Mapbox GL Style Spec 形式のスタイルオブジェクトを生成する。
 * ラスタータイルを唯一のレイヤーとして持つ最小構成。
 */
export function buildRasterStyle(tileServerKey: TileServerKey = DEFAULT_TILE_SERVER) {
  const tileUrl = TILE_SERVERS[tileServerKey];
  return {
    version: 8 as const,
    sources: {
      'raster-tiles': {
        type: 'raster' as const,
        tiles: [tileUrl],
        tileSize: 256,
        attribution: tileServerKey === 'OSM'
          ? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Contributors'
          : '© 国土地理院',
      },
    },
    layers: [
      {
        id: 'raster-tiles-layer',
        type: 'raster' as const,
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 22,
        paint: {
          'raster-resampling': 'nearest' as const,
        },
      },
    ],
  };
}
