import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBanner } from '../../components/gps/error-banner';

describe('ErrorBanner', () => {
  it('displays the error message', () => {
    const { getByText } = render(<ErrorBanner message="権限が必要です" />);
    expect(getByText('権限が必要です')).toBeTruthy();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const { getByText } = render(
      <ErrorBanner message="error" onDismiss={jest.fn()} />,
    );
    expect(getByText('✕')).toBeTruthy();
  });

  it('does not show dismiss button when onDismiss is omitted', () => {
    const { queryByText } = render(<ErrorBanner message="error" />);
    expect(queryByText('✕')).toBeNull();
  });

  it('calls onDismiss when the dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <ErrorBanner message="error" onDismiss={onDismiss} />,
    );

    fireEvent.press(getByText('✕'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
