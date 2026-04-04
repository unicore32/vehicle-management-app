import { act, renderHook } from '@testing-library/react-native';
import { useSessionPlayback } from '../../hooks/use-session-playback';
import type { SessionPoint } from '../../lib/session-points-store';

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

// ─── テスト ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── 初期状態 ──────────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('initializes currentTimestamp to the latest point timestamp', () => {
    const points = [
      makePoint({ id: 1, timestamp: 2000 }),
      makePoint({ id: 2, timestamp: 8000 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    expect(result.current.currentTimestamp).toBe(8000);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.playbackSpeed).toBe(1);
  });

  it('initializes to 0 when given no points', () => {
    const { result } = renderHook(() => useSessionPlayback([]));

    expect(result.current.currentTimestamp).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });
});

// ── play() ────────────────────────────────────────────────────────────────────

describe('play()', () => {
  it('sets isPlaying to true', () => {
    const points = [makePoint({ id: 1, timestamp: 1000 }), makePoint({ id: 2, timestamp: 9000 })];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
  });

  it('does nothing when there are no points', () => {
    const { result } = renderHook(() => useSessionPlayback([]));

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('advances currentTimestamp over time when playing', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 100_000 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });

    act(() => {
      jest.advanceTimersByTime(500); // 5 ticks × 100ms = 500ms advance at 1x
    });

    expect(result.current.currentTimestamp).toBeGreaterThan(1000);
    expect(result.current.isPlaying).toBe(true);
  });

  it('resets to the start and plays when called at the end', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 1500 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });

    expect(result.current.currentTimestamp).toBe(1000);
    expect(result.current.isPlaying).toBe(true);
  });
});

// ── pause() ───────────────────────────────────────────────────────────────────

describe('pause()', () => {
  it('stops the playback and freezes currentTimestamp', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 100_000 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current.pause();
    });

    const frozenTs = result.current.currentTimestamp;
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // タイマーが止まっているので変化しないこと
    expect(result.current.currentTimestamp).toBe(frozenTs);
  });
});

// ── seek() ────────────────────────────────────────────────────────────────────

describe('seek()', () => {
  it('immediately moves currentTimestamp to the given value', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 5000 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.seek(3500);
    });

    expect(result.current.currentTimestamp).toBe(3500);
  });

  it('does not affect isPlaying', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 5000 }),
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });
    act(() => {
      result.current.seek(2000);
    });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentTimestamp).toBe(2000);
  });
});

// ── 自動停止 ──────────────────────────────────────────────────────────────────

describe('auto-stop', () => {
  it('stops playing and clamps to maxTs when reaching the end', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 1300 }), // range: 300ms
    ];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.play();
    });

    // range は 300ms なので 1000ms 進めると必ず末尾を超える
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.currentTimestamp).toBe(1300);
    expect(result.current.isPlaying).toBe(false);
  });
});

// ── setSpeed() ────────────────────────────────────────────────────────────────

describe('setSpeed()', () => {
  it('changes playbackSpeed', () => {
    const points = [makePoint({ id: 1, timestamp: 1000 }), makePoint({ id: 2, timestamp: 100_000 })];
    const { result } = renderHook(() => useSessionPlayback(points));

    act(() => {
      result.current.setSpeed(4);
    });

    expect(result.current.playbackSpeed).toBe(4);
  });

  it('higher speed advances currentTimestamp faster per tick', () => {
    const points = [
      makePoint({ id: 1, timestamp: 1000 }),
      makePoint({ id: 2, timestamp: 100_000 }),
    ];

    // 1x: 2 ticks = 200ms advance
    const { result: r1 } = renderHook(() => useSessionPlayback(points));
    act(() => {
      r1.current.play();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const advance1x = r1.current.currentTimestamp - 1000;

    // 4x: 2 ticks = 800ms advance
    const { result: r4 } = renderHook(() => useSessionPlayback(points));
    act(() => {
      r4.current.setSpeed(4);
    });
    act(() => {
      r4.current.play();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const advance4x = r4.current.currentTimestamp - 1000;

    expect(advance4x).toBeGreaterThan(advance1x);
  });
});
