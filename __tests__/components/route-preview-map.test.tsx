import { fireEvent, render } from '@testing-library/react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Linking } from 'react-native';
import { RoutePreviewMap } from '../../components/gps/route-preview-map';
import type { SessionPoint } from '../../lib/session-points-store';
import type { SessionGap } from '../../lib/session-gaps-store';

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
});
