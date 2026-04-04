import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

type Props = {
  message: string;
  onDismiss?: () => void;
};

/**
 * 権限エラー・GPS エラー・pause/resume 失敗などを表示するバナー。
 * メインコントロールを隠さずに画面上部に重ならないよう配置する。
 */
export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message} numberOfLines={3}>{message}</Text>
      {onDismiss !== undefined && (
        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#2d1515',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 10,
    padding: 12,
  },
  message: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 13,
    lineHeight: 18,
  },
  dismiss: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },
});
