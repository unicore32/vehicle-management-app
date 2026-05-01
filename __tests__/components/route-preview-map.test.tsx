import MapLibreGL from '@maplibre/maplibre-react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { RoutePreviewMap } from '../../components/gps/route-preview-map';
import type { SessionGap } from '../../lib/session-gaps-store';
import type { SessionPoint } from '../../lib/session-points-store';

// @maplibre/maplibre-react-native は jest.setup.ts でモック済み

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function makePoint(overrides: Partial<SessionPoint> = {}): SessionPoint {
  return {
    id: 1,
    session_id: 1,
    latitude: 35.68,
    longitude: 139.76,
    altitude: null,
    accuracy: null,
    speed: null,
    timestamp: 1000,
    created_at: 1000,
    ...overrides,
  };
}

function makeGap(overrides: Partial<SessionGap> = {}): SessionGap {
  return {
    id: 1,
    session_id: 1,
    gap_started_at: 2000,
    gap_ended_at: 3000,
    reason: null,
    correction_mode: 'none',
    ...overrides,
  };
}

const basePoints = [
  makePoint({ id: 1, timestamp: 1000, latitude: 35.0, longitude: 139.0 }),
  makePoint({ id: 2, timestamp: 2000, latitude: 35.1, longitude: 139.1 }),
  makePoint({ id: 3, timestamp: 4000, latitude: 35.2, longitude: 139.2 }),
];

// ─── テスト ───────────────────────────────────────────────────────────────────

describe('RoutePreviewMap', () => {
  it('renders the MapView when MapLibre is available', () => {
    const { getByTestId } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );
    expect(getByTestId('route-preview-map')).toBeTruthy();
  });

  it('uses OSM tiles for locations outside Japan', () => {
    const outsideJapanPoints = [
      makePoint({ id: 1, timestamp: 1000, latitude: 37.7749, longitude: -122.4194 }),
      makePoint({ id: 2, timestamp: 2000, latitude: 37.7755, longitude: -122.418 }),
    ];
    const { getByTestId } = render(
      <RoutePreviewMap points={outsideJapanPoints} gaps={[]} currentTimestamp={2000} />,
    );

    expect(getByTestId('route-preview-map').props['data-map-style']).toContain(
      'tile.openstreetmap.org',
    );
  });

  it('renders zoom in and zoom out buttons', () => {
    const { getByTestId, queryByTestId } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );
    expect(getByTestId('zoom-in-button')).toBeTruthy();
    expect(getByTestId('zoom-out-button')).toBeTruthy();
    expect(queryByTestId('route-preview-recenter-button')).toBeNull();
  });

  it('opens the OpenStreetMap attribution page from the attribution link', () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const outsideJapanPoints = [
      makePoint({ id: 1, timestamp: 1000, latitude: 37.7749, longitude: -122.4194 }),
      makePoint({ id: 2, timestamp: 2000, latitude: 37.7755, longitude: -122.418 }),
    ];
    const { getByTestId } = render(
      <RoutePreviewMap points={outsideJapanPoints} gaps={[]} currentTimestamp={2000} />,
    );

    fireEvent.press(getByTestId('route-preview-attribution-link'));

    expect(openUrlSpy).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright');
    openUrlSpy.mockRestore();
  });

  it('renders a Camera with a default center when no points', () => {
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={[]} gaps={[]} currentTimestamp={0} />,
    );
    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras.length).toBeGreaterThan(0);
  });

  it('renders the full-route line (grey background) when 2+ points exist', () => {
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={0} />,
    );
    const lines = UNSAFE_getAllByType(MapLibreGL.LineLayer);
    // full-route-line は常に描画される（currentTimestamp に関わらず）
    const ids = lines.map((l) => l.props.id as string);
    expect(ids).toContain('full-route-line');
  });

  it('renders the visible-route line when points are within currentTimestamp', () => {
    // currentTimestamp = 4000 → 全ポイントが可視
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );
    const lines = UNSAFE_getAllByType(MapLibreGL.LineLayer);
    const ids = lines.map((l) => l.props.id as string);
    expect(ids).toContain('visible-route-line');
  });

  it('splits the visible route so gap bridges are not included in the blue progress line', () => {
    const gaps = [makeGap({ gap_started_at: 2000, gap_ended_at: 3000 })];
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={gaps} currentTimestamp={4000} />,
    );

    const sources = UNSAFE_getAllByType(MapLibreGL.ShapeSource);
    const visibleRouteSource = sources.find((source) => source.props.id === 'visible-route-source');

    expect(visibleRouteSource?.props.shape.features).toHaveLength(1);
    expect(visibleRouteSource?.props.shape.features[0].geometry.coordinates).toEqual([
      [139.0, 35.0],
      [139.1, 35.1],
    ]);
  });

  it('does not render the visible-route line when currentTimestamp is before all points', () => {
    // currentTimestamp = 500 → 可視ポイントが 1 件以下 → visible-route-line は描画されない
    const { UNSAFE_queryAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={500} />,
    );
    const lines = UNSAFE_queryAllByType(MapLibreGL.LineLayer);
    const ids = lines.map((l) => l.props.id as string);
    expect(ids).not.toContain('visible-route-line');
  });

  it('renders the gap line when a gap falls within the visible range', () => {
    // gap: 2000–3000, currentTimestamp: 4000 → gap_started_at(2000) <= 4000 なので描画
    const gaps = [
      makeGap({ gap_started_at: 2000, gap_ended_at: 3000 }),
    ];
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={gaps} currentTimestamp={4000} />,
    );
    const lines = UNSAFE_getAllByType(MapLibreGL.LineLayer);
    const ids = lines.map((l) => l.props.id as string);
    expect(ids).toContain('gap-line');
  });

  it('does not render the gap line when the gap is beyond currentTimestamp', () => {
    // gap: 2000–3000, currentTimestamp: 1500 → gap_started_at(2000) > 1500 なので非表示
    const gaps = [
      makeGap({ gap_started_at: 2000, gap_ended_at: 3000 }),
    ];
    const { UNSAFE_queryAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={gaps} currentTimestamp={1500} />,
    );
    const lines = UNSAFE_queryAllByType(MapLibreGL.LineLayer);
    const ids = lines.map((l) => l.props.id as string);
    expect(ids).not.toContain('gap-line');
  });

  it('renders a CircleLayer marker at the latest visible point', () => {
    const { UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );
    const circles = UNSAFE_getAllByType(MapLibreGL.CircleLayer);
    expect(circles.length).toBeGreaterThan(0);
  });

  it('does not render a CircleLayer when no points are visible', () => {
    const { UNSAFE_queryAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={500} />,
    );
    const circles = UNSAFE_queryAllByType(MapLibreGL.CircleLayer);
    expect(circles.length).toBe(0);
  });

  it('keeps the user camera center and zoom when playback advances after manual pan', () => {
    const { getByTestId, rerender, UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={2000} />,
    );

    fireEvent(getByTestId('route-preview-map'), 'onRegionDidChange', {
      geometry: { coordinates: [139.45, 35.45] },
      properties: { zoomLevel: 11 },
    });

    rerender(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );

    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras[0].props.centerCoordinate).toEqual([139.45, 35.45]);
    expect(cameras[0].props.zoomLevel).toBe(11);
  });

  it('does not recenter or change zoom only because the bottom sheet padding changes', () => {
    const { getByTestId, rerender, UNSAFE_getAllByType } = render(
      <RoutePreviewMap
        points={basePoints}
        gaps={[]}
        currentTimestamp={4000}
        cameraPaddingBottom={80}
      />,
    );

    fireEvent(getByTestId('route-preview-map'), 'onRegionDidChange', {
      geometry: { coordinates: [139.33, 35.33] },
      properties: { zoomLevel: 10 },
    });

    rerender(
      <RoutePreviewMap
        points={basePoints}
        gaps={[]}
        currentTimestamp={4000}
        cameraPaddingBottom={240}
      />,
    );

    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras[0].props.centerCoordinate).toEqual([139.33, 35.33]);
    expect(cameras[0].props.zoomLevel).toBe(10);
    expect(cameras[0].props.padding).toEqual({ paddingBottom: 80 });
  });

  it('ignores region change callbacks caused by playback follow updates', () => {
    const { getByTestId, rerender, UNSAFE_getAllByType } = render(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={2000} />,
    );

    rerender(
      <RoutePreviewMap points={basePoints} gaps={[]} currentTimestamp={4000} />,
    );

    act(() => {
      fireEvent(getByTestId('route-preview-map'), 'onRegionDidChange', {
        geometry: { coordinates: [139.2, 35.2] },
        properties: { zoomLevel: 15 },
      });
    });

    rerender(
      <RoutePreviewMap
        points={basePoints}
        gaps={[]}
        currentTimestamp={5000}
        cameraPaddingBottom={120}
      />,
    );

    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras[0].props.centerCoordinate).toEqual([139.2, 35.2]);
    expect(cameras[0].props.zoomLevel).toBe(15);
    expect(cameras[0].props.padding).toEqual({ paddingBottom: 120 });
  });
});
