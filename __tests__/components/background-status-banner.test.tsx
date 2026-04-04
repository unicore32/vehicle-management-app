import { render } from '@testing-library/react-native';
import { BackgroundStatusBanner } from '../../components/gps/background-status-banner';

describe('BackgroundStatusBanner', () => {
  it('renders nothing when isBackgroundActive is false', () => {
    const { toJSON } = render(<BackgroundStatusBanner isBackgroundActive={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the banner when isBackgroundActive is true', () => {
    const { getByText } = render(<BackgroundStatusBanner isBackgroundActive={true} />);
    expect(getByText(/バックグラウンドで GPS を記録/)).toBeTruthy();
  });
});
