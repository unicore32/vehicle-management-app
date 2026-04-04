import { StyleSheet, View, Text } from 'react-native';

type Props = {
  /** バックグラウンド記録が有効かどうか */
  isBackgroundActive: boolean;
};

/**
 * バックグラウンド記録中であることをユーザーに通知するバナー。
 * isBackgroundActive が false のときは何も描画しない。
 *
 * Android では expo-location の foregroundService 通知と併用される。
 * このバナーはアプリが前景に戻ったとき「バックグラウンドでも動いていた」
 * ことを確認できるよう残す。
 */
export function BackgroundStatusBanner({ isBackgroundActive }: Props) {
  if (!isBackgroundActive) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>
        バックグラウンドで GPS を記録しています
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0c1a2e',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  text: {
    flex: 1,
    color: '#93c5fd',
    fontSize: 13,
  },
});
