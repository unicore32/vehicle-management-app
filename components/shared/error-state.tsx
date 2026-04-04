import { View, Text, StyleSheet } from 'react-native';

type Props = {
  message?: string;
};

/** フル画面のエラー表示。 */
export function ErrorState({
  message = 'データの取得に失敗しました',
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d0d',
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
