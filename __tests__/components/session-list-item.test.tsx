import { render, screen } from '@testing-library/react-native';

import { SessionListItem } from '../../components/gps/session-list-item';
import type { Session } from '../../lib/session-store';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    started_at: new Date('2025-06-15T09:00:00').getTime(),
    ended_at: null,
    status: 'finished',
    vehicle_id: null,
    odometer_start_km: null,
    odometer_end_km: null,
    is_background_active: 0,
    paused_reason: null,
    distance_m: 0,
    moving_time_s: 0,
    avg_speed: 0,
    max_speed: 0,
    point_count: 0,
    note: null,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
}

describe('SessionListItem', () => {
  it('距離が 1000m 未満のとき m 表示', () => {
    render(<SessionListItem session={makeSession({ distance_m: 800 })} />);
    expect(screen.getByText('800 m')).toBeTruthy();
  });

  it('距離が 1000m 以上のとき km 表示', () => {
    render(<SessionListItem session={makeSession({ distance_m: 5432 })} />);
    expect(screen.getByText('5.43 km')).toBeTruthy();
  });

  it('1時間未満の duration を MM:SS 形式で表示', () => {
    render(<SessionListItem session={makeSession({ moving_time_s: 185 })} />);
    expect(screen.getByText('03:05')).toBeTruthy();
  });

  it('1時間以上の duration を H:MM:SS 形式で表示', () => {
    render(<SessionListItem session={makeSession({ moving_time_s: 3723 })} />);
    expect(screen.getByText('1:02:03')).toBeTruthy();
  });

  it('started_at の日付を表示する', () => {
    const ts = new Date('2025-06-15T09:00:00').getTime();
    render(<SessionListItem session={makeSession({ started_at: ts })} />);
    // ja-JP ロケール: "2025/06/15"
    expect(screen.getByText('2025/06/15')).toBeTruthy();
  });
});
