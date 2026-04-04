import { render, fireEvent } from '@testing-library/react-native';
import { RecordingControlCard } from '../../components/gps/recording-control-card';

const defaultProps = {
  activeSessionId: null,
  onStart:  jest.fn(),
  onPause:  jest.fn(),
  onResume: jest.fn(),
  onStop:   jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

// ─── ステータスごとのボタン表示 ───────────────────────────────────────────────

describe('idle status', () => {
  it('shows only the start button', () => {
    const { getByTestId, queryByTestId } = render(
      <RecordingControlCard {...defaultProps} status="idle" />,
    );

    expect(getByTestId('btn-start')).toBeTruthy();
    expect(queryByTestId('btn-pause')).toBeNull();
    expect(queryByTestId('btn-resume')).toBeNull();
    expect(queryByTestId('btn-stop')).toBeNull();
  });

  it('calls onStart when start button is pressed', () => {
    const { getByTestId } = render(
      <RecordingControlCard {...defaultProps} status="idle" />,
    );

    fireEvent.press(getByTestId('btn-start'));

    expect(defaultProps.onStart).toHaveBeenCalledTimes(1);
  });
});

describe('recording status', () => {
  it('shows pause and stop buttons', () => {
    const { getByTestId, queryByTestId } = render(
      <RecordingControlCard {...defaultProps} status="recording" />,
    );

    expect(getByTestId('btn-pause')).toBeTruthy();
    expect(getByTestId('btn-stop')).toBeTruthy();
    expect(queryByTestId('btn-start')).toBeNull();
    expect(queryByTestId('btn-resume')).toBeNull();
  });

  it('calls onPause when pause button is pressed', () => {
    const { getByTestId } = render(
      <RecordingControlCard {...defaultProps} status="recording" />,
    );

    fireEvent.press(getByTestId('btn-pause'));

    expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onStop when stop button is pressed', () => {
    const { getByTestId } = render(
      <RecordingControlCard {...defaultProps} status="recording" />,
    );

    fireEvent.press(getByTestId('btn-stop'));

    expect(defaultProps.onStop).toHaveBeenCalledTimes(1);
  });
});

describe('paused status', () => {
  it('shows resume and stop buttons', () => {
    const { getByTestId, queryByTestId } = render(
      <RecordingControlCard {...defaultProps} status="paused" />,
    );

    expect(getByTestId('btn-resume')).toBeTruthy();
    expect(getByTestId('btn-stop')).toBeTruthy();
    expect(queryByTestId('btn-start')).toBeNull();
    expect(queryByTestId('btn-pause')).toBeNull();
  });

  it('calls onResume when resume button is pressed', () => {
    const { getByTestId } = render(
      <RecordingControlCard {...defaultProps} status="paused" />,
    );

    fireEvent.press(getByTestId('btn-resume'));

    expect(defaultProps.onResume).toHaveBeenCalledTimes(1);
  });
});

describe('loading status', () => {
  it('shows no action buttons while loading', () => {
    const { queryByTestId } = render(
      <RecordingControlCard {...defaultProps} status="loading" />,
    );

    expect(queryByTestId('btn-start')).toBeNull();
    expect(queryByTestId('btn-pause')).toBeNull();
    expect(queryByTestId('btn-resume')).toBeNull();
    expect(queryByTestId('btn-stop')).toBeNull();
  });
});

describe('session ID display', () => {
  it('shows session ID when activeSessionId is set', () => {
    const { getByText } = render(
      <RecordingControlCard {...defaultProps} status="recording" activeSessionId={7} />,
    );

    expect(getByText(/セッション #7/)).toBeTruthy();
  });

  it('does not show session ID when null', () => {
    const { queryByText } = render(
      <RecordingControlCard {...defaultProps} status="idle" activeSessionId={null} />,
    );

    expect(queryByText(/セッション #/)).toBeNull();
  });
});
