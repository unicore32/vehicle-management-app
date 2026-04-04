import { View, ActivityIndicator, StyleSheet } from 'react-native';

/** フル画面のローディング表示。 */
export function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#94a3b8" size="large" />
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
});
