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
      },
    ],
  };
}
