import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal ベースの汎用確認ダイアログ。
 * destructive=true のとき確認ボタンを赤にする。
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View
          style={styles.dialog}
          // タッチがオーバーレイに伝播しないようにする
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                destructive ? styles.destructiveButton : styles.confirmButton,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.actionText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  destructiveButton: {
    backgroundColor: '#dc2626',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
