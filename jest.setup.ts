// ─── expo-location mock ───────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: {
      latitude: 35.681236,
      longitude: 139.767125,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  watchPositionAsync: jest.fn().mockResolvedValue({ remove: jest.fn() }),
  Accuracy: {
    BestForNavigation: 6,
    Best: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Lowest: 1,
  },
}));

// ─── expo-task-manager mock ───────────────────────────────────────────────────
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

// ─── expo-sqlite mock ─────────────────────────────────────────────────────────
jest.mock('expo-sqlite', () => {
  const mockDb = {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
  };
  return {
    openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
  };
});

// ─── react-native-safe-area-context mock ─────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// ─── @maplibre/maplibre-react-native mock ────────────────────────────────────
jest.mock('@maplibre/maplibre-react-native', () => {
  const React = require('react');

  const MapView = ({ children, mapStyle, testID, ...rest }: Record<string, unknown>) =>
    React.createElement('MapLibreGL.MapView', { testID, 'data-map-style': mapStyle, ...rest }, children);

  const Camera = (props: Record<string, unknown>) =>
    React.createElement('MapLibreGL.Camera', props);

  const ShapeSource = ({ children, ...props }: Record<string, unknown>) =>
    React.createElement('MapLibreGL.ShapeSource', props, children);

  const LineLayer = (props: Record<string, unknown>) =>
    React.createElement('MapLibreGL.LineLayer', props);

  const CircleLayer = (props: Record<string, unknown>) =>
    React.createElement('MapLibreGL.CircleLayer', props);

  return {
    __esModule: true,
    default: {
      MapView,
      Camera,
      ShapeSource,
      LineLayer,
      CircleLayer,
      setAccessToken: jest.fn(),
    },
    MapView,
    Camera,
    ShapeSource,
    LineLayer,
    CircleLayer,
    setAccessToken: jest.fn(),
  };
});
