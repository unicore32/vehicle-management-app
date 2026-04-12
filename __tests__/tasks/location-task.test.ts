const mockTaskDb = {
  execSync: jest.fn(),
  getFirstSync: jest.fn(),
  runSync: jest.fn(),
  closeSync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockTaskDb),
}));

jest.mock('../../lib/app-state-store', () => ({
  AUTO_PAUSE_MIN_POINTS: 5,
  AUTO_PAUSE_SPEED_THRESHOLD_MPS: 0.5,
  getAutoPauseEnabledSync: jest.fn(),
  getAutoPauseThresholdSSync: jest.fn(),
  getGapThresholdSSync: jest.fn(),
  getGpsLoggingEnabledSync: jest.fn(),
}));

jest.mock('../../lib/debug-log-store', () => ({
  appendDebugLogSync: jest.fn(),
}));

import { getGpsLoggingEnabledSync } from '../../lib/app-state-store';
import { appendDebugLogSync } from '../../lib/debug-log-store';

type DevGlobal = typeof globalThis & { __DEV__?: boolean };

describe('location task logging', () => {
  const originalDev = (globalThis as DevGlobal).__DEV__;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as DevGlobal).__DEV__ = false;
    jest.mocked(getGpsLoggingEnabledSync).mockReturnValue(true);
    jest.mocked(mockTaskDb.getFirstSync).mockReturnValue(null);
    jest.mocked(mockTaskDb.execSync).mockClear();
    jest.mocked(mockTaskDb.runSync).mockClear();
    jest.mocked(mockTaskDb.closeSync).mockClear();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    (globalThis as DevGlobal).__DEV__ = originalDev;
    jest.clearAllMocks();
  });

  it('persists task diagnostics when GPS logging is enabled', async () => {
    let taskHandler:
      | ((payload: { data: { locations: unknown[] }; error: null }) => Promise<void>)
      | undefined;

    jest.isolateModules(() => {
      const TaskManager = require('expo-task-manager');
      require('../../tasks/location-task');
      taskHandler = TaskManager.defineTask.mock.calls[0][1];
    });

    await taskHandler?.({ data: { locations: [] }, error: null });

    expect(appendDebugLogSync).toHaveBeenCalledWith(mockTaskDb, {
      message: '[GPS][TASK] no active session; dropping incoming locations',
      details: '{"count":0}',
    });
  });
});