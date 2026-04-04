import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  isRecording: boolean;
  isLoading: boolean;
  onPress: () => void;
};

/**
 * GPS 記録の開始・停止を切り替えるボタン。
 * 常時ダークモードに最適化したカラーパレットを使用する。
 */
export function RecordingButton({ isRecording, isLoading, onPress }: Props) {
  const handlePress = () => {
    if (!isLoading) onPress();
  };

  const bg = isLoading
    ? '#374151'
    : isRecording
      ? '#991b1b'
      : '#15803d';

  const label = isLoading
    ? '処理中...'
    : isRecording
      ? '■  記録を停止'
      : '●  記録を開始';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: bg }]}
      onPress={handlePress}
      disabled={isLoading}
      activeOpacity={0.8}
      testID="recording-button"
    >
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
