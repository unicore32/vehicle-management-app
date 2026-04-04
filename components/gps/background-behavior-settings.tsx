import { StyleSheet, View, Text } from 'react-native';

/**
 * バックグラウンド記録の挙動設定セクション。
 *
 * バックグラウンドタスクの ON/OFF は expo-location の権限に依存するため、
 * OS の位置情報設定へ誘導する説明テキストを表示する。
 */
export function BackgroundBehaviorSettings() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>バックグラウンド記録</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoTitle}>バックグラウンドで GPS を記録</Text>
        <Text style={styles.infoBody}>
          アプリをバックグラウンドに移動した後もGPS記録を継続します。{'\n'}
          この機能を使うには、端末の設定でアプリの位置情報アクセスを
          「常に許可」に設定してください。
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoTitle}>通知</Text>
        <Text style={styles.infoBody}>
          バックグラウンド記録中はシステム通知を表示します。{'\n'}
          通知を非表示にするには端末の通知設定でアプリの通知をオフにしてください
          （記録は継続されます）。
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    color: '#f1f5f9',
  },
  infoBody: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
});
