import { render } from '@testing-library/react-native';
// モックモジュールから実際のコンポーネント参照を取得する
import MapLibreGL from '@maplibre/maplibre-react-native';
import { RouteMap } from '../../components/gps/route-map';
import type { SessionPoint } from '../../lib/session-points-store';

// @maplibre/maplibre-react-native は jest.setup.ts でモック済み

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

describe('RouteMap', () => {
  it('renders the MapView when MapLibre is available', () => {
    const { getByTestId } = render(<RouteMap points={[]} />);
    expect(getByTestId('route-map')).toBeTruthy();
  });

  it('renders Camera even when no points are provided (default center)', () => {
    const { UNSAFE_getAllByType } = render(<RouteMap points={[]} />);
    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras.length).toBeGreaterThan(0);
  });

  it('centers camera on the latest point when points exist', () => {
    const points = [
      makePoint({ id: 1, latitude: 35.0, longitude: 139.0, timestamp: 1000 }),
      makePoint({ id: 2, latitude: 36.0, longitude: 140.0, timestamp: 2000 }),
    ];
    const { UNSAFE_getAllByType } = render(<RouteMap points={points} />);
    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);

    expect(cameras[0].props.centerCoordinate).toEqual([140.0, 36.0]);
  });

  it('renders a LineLayer when there are 2 or more points', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 2000 }),
    ];
    const { UNSAFE_getAllByType } = render(<RouteMap points={points} />);
    const lines = UNSAFE_getAllByType(MapLibreGL.LineLayer);

    expect(lines.length).toBeGreaterThan(0);
  });

  it('does not render a LineLayer for a single point', () => {
    const { UNSAFE_queryAllByType } = render(
      <RouteMap points={[makePoint()]} />,
    );
    const lines = UNSAFE_queryAllByType(MapLibreGL.LineLayer);

    expect(lines.length).toBe(0);
  });

  it('renders a CircleLayer marker for the latest point', () => {
    const points = [makePoint({ id: 1 }), makePoint({ id: 2 })];
    const { UNSAFE_getAllByType } = render(<RouteMap points={points} />);
    const circles = UNSAFE_getAllByType(MapLibreGL.CircleLayer);

    expect(circles.length).toBeGreaterThan(0);
  });

  it('does not render a CircleLayer when there are no points', () => {
    const { UNSAFE_queryAllByType } = render(<RouteMap points={[]} />);
    const circles = UNSAFE_queryAllByType(MapLibreGL.CircleLayer);

    expect(circles.length).toBe(0);
  });
});
