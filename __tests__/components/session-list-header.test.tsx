import { render, screen } from '@testing-library/react-native';

import { SessionListHeader } from '../../components/gps/session-list-header';
import type { SessionSummary } from '../../hooks/use-session-list';

describe('SessionListHeader', () => {
  it('セッション数を表示する', () => {
    const summary: SessionSummary = { totalCount: 7, totalDistanceM: 0, totalMovingTimeS: 0 };
    render(<SessionListHeader summary={summary} />);
    expect(screen.getByText('7 回')).toBeTruthy();
  });

  it('総距離が 1000m 未満のとき m 表示', () => {
    const summary: SessionSummary = { totalCount: 1, totalDistanceM: 450, totalMovingTimeS: 0 };
    render(<SessionListHeader summary={summary} />);
    expect(screen.getByText('450 m')).toBeTruthy();
  });

  it('総距離が 1000m 以上のとき km 表示', () => {
    const summary: SessionSummary = { totalCount: 1, totalDistanceM: 12345, totalMovingTimeS: 0 };
    render(<SessionListHeader summary={summary} />);
    expect(screen.getByText('12.35 km')).toBeTruthy();
  });

  it('総移動時間を MM:SS 形式で表示', () => {
    const summary: SessionSummary = { totalCount: 1, totalDistanceM: 0, totalMovingTimeS: 125 };
    render(<SessionListHeader summary={summary} />);
    expect(screen.getByText('02:05')).toBeTruthy();
  });

  it('総移動時間を H:MM:SS 形式で表示', () => {
    const summary: SessionSummary = { totalCount: 1, totalDistanceM: 0, totalMovingTimeS: 7384 };
    render(<SessionListHeader summary={summary} />);
    expect(screen.getByText('2:03:04')).toBeTruthy();
  });
});
