const mockDb = {};

jest.mock('../../lib/app-state-store', () => ({
  getGpsLoggingEnabledSync: jest.fn(),
}));

jest.mock('../../lib/database/sync-client', () => ({
  getMainSyncDatabase: jest.fn(),
}));

jest.mock('../../lib/debug-log-store', () => ({
  appendDebugLogSync: jest.fn(),
}));

import { getGpsLoggingEnabledSync } from '../../lib/app-state-store';
import { getMainSyncDatabase } from '../../lib/database/sync-client';
import { appendDebugLogSync } from '../../lib/debug-log-store';

type DevGlobal = typeof globalThis & { __DEV__?: boolean };

describe('gpsDebug', () => {
  const originalDev = (globalThis as DevGlobal).__DEV__;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as DevGlobal).__DEV__ = false;
    jest.mocked(getGpsLoggingEnabledSync).mockReturnValue(true);
    jest.mocked(getMainSyncDatabase).mockReturnValue(mockDb as never);
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    (globalThis as DevGlobal).__DEV__ = originalDev;
    jest.clearAllMocks();
  });

  it('persists GPS logs when not in development', () => {
    jest.isolateModules(() => {
      const { gpsDebug } = require('../../lib/gps-debug');
      gpsDebug('recording started', { sessionId: 42 });
    });

    expect(appendDebugLogSync).toHaveBeenCalledWith(mockDb, {
      message: 'recording started',
      details: '{"sessionId":42}',
    });
  });
});