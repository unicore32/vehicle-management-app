/**
 * Component tests for components/gps/location-map.tsx
 *
 * @maplibre/maplibre-react-native は jest.setup.ts でモック済み。
 * require() が成功するため MapLibreGL は null にならず、MapView がレンダリングされる。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { LocationMap } from '../../components/gps/location-map';
import { TILE_SERVERS, buildRasterStyle } from '../../constants/map-config';
import type { StoredLocation } from '../../lib/location-store';

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

const makeStoredLocation = (
  overrides: Partial<StoredLocation> = {},
): StoredLocation => ({
  id: 1,
  latitude: 35.6812,
  longitude: 139.7671,
  altitude: 10.0,
  accuracy: 5.0,
  speed: 13.88,
  timestamp: Date.now(),
  created_at: Date.now(),
  ...overrides,
});

const TWO_LOCATIONS: StoredLocation[] = [
  makeStoredLocation({ id: 2, latitude: 35.6820, longitude: 139.7680 }),
  makeStoredLocation({ id: 1, latitude: 35.6812, longitude: 139.7671 }),
];

// ─── テストケース ─────────────────────────────────────────────────────────────

describe('LocationMap', () => {
  it('locations が空の場合 null を返す（マップを描画しない）', () => {
    const { queryByTestId } = render(
      React.createElement(LocationMap, { locations: [] }),
    );
    expect(queryByTestId('location-map')).toBeNull();
  });

  it('locations に 1 件以上ある場合 MapView がレンダリングされる', () => {
    const { getByTestId } = render(
      React.createElement(LocationMap, { locations: TWO_LOCATIONS }),
    );
    expect(getByTestId('location-map')).toBeTruthy();
  });

  it('ShapeSource にルートの座標が含まれる GeoJSON が渡される', () => {
    const { getByTestId } = render(
      React.createElement(LocationMap, { locations: TWO_LOCATIONS }),
    );

    const routeSource = getByTestId('route-source');
    const shape = routeSource.props.shape as {
      geometry: { type: string; coordinates: number[][] };
    };

    expect(shape.geometry.type).toBe('LineString');
    // locations は DESC 順なので reverse して [古い順, 新しい順] になる
    // 最初の座標は id=1 (古い方) の地点
    expect(shape.geometry.coordinates[0]).toEqual([139.7671, 35.6812]);
    expect(shape.geometry.coordinates[1]).toEqual([139.7680, 35.6820]);
  });

  it('OSM タイル URL（API キー不要・googleapis を含まない）が定数に設定されている', () => {
    expect(TILE_SERVERS.OSM).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(TILE_SERVERS.OSM).not.toContain('googleapis');
    expect(TILE_SERVERS.OSM).not.toContain('apikey');
  });

  it('buildRasterStyle が OSM タイル URL を含む Mapbox GL Style を返す', () => {
    const style = buildRasterStyle('OSM');
    const tiles = style.sources['raster-tiles'].tiles;

    expect(style.version).toBe(8);
    expect(tiles[0]).toBe(TILE_SERVERS.OSM);
    expect(tiles[0]).not.toContain('googleapis');
  });

  it('buildRasterStyle(GSI) が国土地理院 URL を含むスタイルを返す', () => {
    const style = buildRasterStyle('GSI');
    const tiles = style.sources['raster-tiles'].tiles;

    expect(tiles[0]).toBe(TILE_SERVERS.GSI);
    expect(tiles[0]).toContain('cyberjapandata.gsi.go.jp');
    expect(tiles[0]).not.toContain('googleapis');
    expect(tiles[0]).not.toContain('apikey');
  });
});
