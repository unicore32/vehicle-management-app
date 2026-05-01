import { act, fireEvent, render } from '@testing-library/react-native';
// モックモジュールから実際のコンポーネント参照を取得する
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Linking } from 'react-native';
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

  it('uses GSI tiles for locations inside Japan', () => {
    const points = [makePoint({ latitude: 35.6812, longitude: 139.7671 })];
    const { getByTestId, getByText } = render(<RouteMap points={points} />);

    expect(getByTestId('route-map').props['data-map-style']).toContain(
      'cyberjapandata.gsi.go.jp/xyz/std',
    );
    expect(getByText('© 国土地理院')).toBeTruthy();
  });

  it('opens the official GSI tile page from the attribution link', () => {
    const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const points = [makePoint({ latitude: 35.6812, longitude: 139.7671 })];
    const { getByTestId } = render(<RouteMap points={points} />);

    fireEvent.press(getByTestId('route-map-attribution-link'));

    expect(openUrlSpy).toHaveBeenCalledWith('https://maps.gsi.go.jp/development/ichiran.html');
    openUrlSpy.mockRestore();
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

  it('centers on the live current location and renders its marker when available', () => {
    const points = [
      makePoint({ id: 1, latitude: 35.0, longitude: 139.0, timestamp: 1000 }),
      makePoint({ id: 2, latitude: 36.0, longitude: 140.0, timestamp: 2000 }),
    ];
    const currentLocation = { latitude: 35.5, longitude: 139.5 };
    const { UNSAFE_getAllByType } = render(
      <RouteMap points={points} currentLocation={currentLocation} />,
    );
    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    const circles = UNSAFE_getAllByType(MapLibreGL.CircleLayer);

    expect(cameras[0].props.centerCoordinate).toEqual([139.5, 35.5]);
    expect(circles.map((circle) => circle.props.id as string)).toContain('current-location-circle');
    expect(circles.map((circle) => circle.props.id as string)).not.toContain('latest-circle');
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
    const { UNSAFE_getAllByType, queryByTestId } = render(<RouteMap points={points} />);
    const circles = UNSAFE_getAllByType(MapLibreGL.CircleLayer);

    expect(circles.length).toBeGreaterThan(0);
    expect(queryByTestId('route-map-recenter-button')).toBeNull();
  });

  it('shows the focus button when the map center moves away from current location', () => {
    const currentLocation = { latitude: 35.5, longitude: 139.5 };
    const { getByLabelText, getByTestId } = render(
      <RouteMap points={[]} currentLocation={currentLocation} />,
    );

    act(() => {
      getByTestId('route-map').props.onRegionDidChange({
        geometry: { coordinates: [139.501, 35.501] },
      });
    });

    expect(getByTestId('route-map-recenter-button')).toBeTruthy();
    expect(getByLabelText('現在位置にフォーカス')).toBeTruthy();
  });

  it('keeps the user camera position and zoom while follow is disabled', () => {
    const currentLocation = { latitude: 35.5, longitude: 139.5 };
    const { getByTestId, rerender, UNSAFE_getAllByType } = render(
      <RouteMap points={[]} currentLocation={currentLocation} />,
    );

    act(() => {
      getByTestId('route-map').props.onRegionDidChange({
        geometry: { coordinates: [139.6, 35.6] },
        properties: { zoomLevel: 12 },
      });
    });

    rerender(
      <RouteMap
        points={[]}
        currentLocation={{ latitude: 35.7, longitude: 139.7 }}
      />,
    );

    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras[0].props.centerCoordinate).toEqual([139.6, 35.6]);
    expect(cameras[0].props.zoomLevel).toBe(12);
  });

  it('recenters on the current location without resetting zoom', () => {
    const currentLocation = { latitude: 35.5, longitude: 139.5 };
    const { getByTestId, UNSAFE_getAllByType } = render(
      <RouteMap points={[]} currentLocation={currentLocation} />,
    );

    act(() => {
      getByTestId('route-map').props.onRegionDidChange({
        geometry: { coordinates: [139.6, 35.6] },
        properties: { zoomLevel: 12 },
      });
    });

    fireEvent.press(getByTestId('route-map-recenter-button'));

    const cameras = UNSAFE_getAllByType(MapLibreGL.Camera);
    expect(cameras[0].props.centerCoordinate).toEqual([139.5, 35.5]);
    expect(cameras[0].props.zoomLevel).toBe(12);
  });

  it('ignores region change callbacks caused by programmatic follow updates', () => {
    const currentLocation = { latitude: 35.5, longitude: 139.5 };
    const { getByTestId, queryByTestId, rerender } = render(
      <RouteMap points={[]} currentLocation={currentLocation} />,
    );

    rerender(
      <RouteMap
        points={[]}
        currentLocation={{ latitude: 35.6, longitude: 139.6 }}
      />,
    );

    act(() => {
      getByTestId('route-map').props.onRegionDidChange({
        geometry: { coordinates: [139.6, 35.6] },
        properties: { zoomLevel: 16 },
      });
    });

    rerender(
      <RouteMap
        points={[]}
        currentLocation={{ latitude: 35.7, longitude: 139.7 }}
      />,
    );

    expect(queryByTestId('route-map-recenter-button')).toBeNull();
    const cameras = getByTestId('route-map-camera');
    expect(cameras.props.centerCoordinate).toEqual([139.7, 35.7]);
  });

  it('does not render a CircleLayer when there are no points', () => {
    const { UNSAFE_queryAllByType } = render(<RouteMap points={[]} />);
    const circles = UNSAFE_queryAllByType(MapLibreGL.CircleLayer);

    expect(circles.length).toBe(0);
  });
});
