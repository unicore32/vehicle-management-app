import { render } from '@testing-library/react-native';
import { StatusChip } from '../../components/shared/status-chip';
import type { RecordingStatus } from '../../hooks/use-session-recording';

const cases: Array<[RecordingStatus, string]> = [
  ['idle',      '待機中'],
  ['recording', '記録中'],
  ['paused',    '一時停止中'],
  ['loading',   '処理中...'],
];

describe('StatusChip', () => {
  it.each(cases)('renders correct label for status "%s"', (status, label) => {
    const { getByText } = render(<StatusChip status={status} />);
    expect(getByText(label)).toBeTruthy();
  });

  it('shows a dot indicator only when recording', () => {
    const { queryByTestId: queryRecording } = render(<StatusChip status="recording" />);
    const { queryByTestId: queryIdle }      = render(<StatusChip status="idle" />);
    const { queryByTestId: queryPaused }    = render(<StatusChip status="paused" />);

    expect(queryRecording('status-dot')).not.toBeNull();
    expect(queryIdle('status-dot')).toBeNull();
    expect(queryPaused('status-dot')).toBeNull();
  });
});
