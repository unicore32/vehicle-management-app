/**
 * Component tests for components/gps/recording-button.tsx
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecordingButton } from '../../components/gps/recording-button';

// ─── テストケース ─────────────────────────────────────────────────────────────

describe('RecordingButton', () => {
  it('isRecording=false のとき「記録を開始」が表示される', () => {
    const { getByText } = render(
      React.createElement(RecordingButton, {
        isRecording: false,
        isLoading: false,
        onPress: jest.fn(),
      }),
    );
    // ラベルには装飾文字（●）が含まれるため部分一致で検証
    expect(getByText(/記録を開始/)).toBeTruthy();
  });

  it('isRecording=true のとき「記録を停止」が表示される', () => {
    const { getByText } = render(
      React.createElement(RecordingButton, {
        isRecording: true,
        isLoading: false,
        onPress: jest.fn(),
      }),
    );
    expect(getByText(/記録を停止/)).toBeTruthy();
  });

  it('isLoading=true のとき「処理中...」が表示される', () => {
    const { getByText } = render(
      React.createElement(RecordingButton, {
        isRecording: false,
        isLoading: true,
        onPress: jest.fn(),
      }),
    );
    expect(getByText(/処理中/)).toBeTruthy();
  });

  it('ボタン押下時に onPress が 1 回呼ばれる', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      React.createElement(RecordingButton, {
        isRecording: false,
        isLoading: false,
        onPress,
      }),
    );
    fireEvent.press(getByTestId('recording-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('isLoading=true のとき disabled になりボタンを押しても onPress が呼ばれない', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      React.createElement(RecordingButton, {
        isRecording: false,
        isLoading: true,
        onPress,
      }),
    );
    fireEvent.press(getByTestId('recording-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
