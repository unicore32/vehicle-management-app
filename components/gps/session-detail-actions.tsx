import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';

type Props = {
  onExport: () => void;
  onDelete: () => void;
  isExporting?: boolean;
  isDeleting?: boolean;
};

export function SessionDetailActions({
  onExport,
  onDelete,
  isExporting = false,
  isDeleting = false,
}: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, styles.exportButton, isExporting && styles.disabled]}
        onPress={onExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>GPX エクスポート</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.button, styles.deleteButton, isDeleting && styles.disabled]}
        onPress={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>削除</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  exportButton: {
    backgroundColor: '#1d4ed8',
  },
  deleteButton: {
    backgroundColor: '#991b1b',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
