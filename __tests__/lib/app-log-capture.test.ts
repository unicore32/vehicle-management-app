const mockDb = {};

jest.mock('../../lib/app-state-store', () => ({
  getDebugLoggingEnabledSync: jest.fn(),
}));

jest.mock('../../lib/database/sync-client', () => ({
  getMainSyncDatabase: jest.fn(),
}));

jest.mock('../../lib/debug-log-store', () => ({
  appendDebugLogSync: jest.fn(),
}));

import {
  getDebugLoggingEnabledSync,
} from '../../lib/app-state-store';
import { getMainSyncDatabase } from '../../lib/database/sync-client';
import { appendDebugLogSync } from '../../lib/debug-log-store';

type DevGlobal = typeof globalThis & { __DEV__?: boolean };

describe('setupAppLogCapture', () => {
  const originalDev = (globalThis as DevGlobal).__DEV__;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as DevGlobal).__DEV__ = false;
    jest.mocked(getDebugLoggingEnabledSync).mockReturnValue(true);
    jest.mocked(getMainSyncDatabase).mockReturnValue(mockDb as never);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    (globalThis as DevGlobal).__DEV__ = originalDev;
    jest.clearAllMocks();
  });

  it('persists console output when not in development', () => {
    jest.isolateModules(() => {
      const { setupAppLogCapture } = require('../../lib/app-log-capture');
      setupAppLogCapture();
      console.log('hello', { tripId: 7 });
    });

    expect(appendDebugLogSync).toHaveBeenCalledWith(mockDb, {
      message: '[APP][log] hello {"tripId":7}',
    });
  });
});