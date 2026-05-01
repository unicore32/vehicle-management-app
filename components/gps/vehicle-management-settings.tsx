import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function VehicleManagementSettings() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>車両管理</Text>
      <Pressable style={styles.row} onPress={() => router.push('/vehicles')}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>管理する車両</Text>
          <Text style={styles.description}>
            追加、名称変更、アーカイブを行います
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111827',
  },
  rowLabel: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  label: {
    fontSize: 15,
    color: '#f1f5f9',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 22,
    color: '#64748b',
  },
});