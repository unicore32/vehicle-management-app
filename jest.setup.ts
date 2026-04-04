// ─── expo-location mock ───────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestBackgroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  startLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
  stopLocationUpdatesAsync: jest.fn().mockResolvedValue(undefined),
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
