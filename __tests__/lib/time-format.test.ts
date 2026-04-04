import { formatDuration, formatElapsedTimeMs } from '../../lib/time-format';

describe('time-format helpers', () => {
  it('formatDuration uses MM:SS under 1 hour', () => {
    expect(formatDuration(125)).toBe('02:05');
  });

  it('formatDuration uses H:MM:SS for 1 hour or more', () => {
    expect(formatDuration(7384)).toBe('2:03:04');
  });

  it('formatElapsedTimeMs converts milliseconds to the same format', () => {
    expect(formatElapsedTimeMs(125_000)).toBe('02:05');
  });
});