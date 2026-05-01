import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import type { Vehicle } from '../../lib/vehicle-store';

type Props = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  startOdometerValue?: string;
  endOdometerValue?: string;
  errorMessage?: string | null;
  description?: string;
  isSubmitting?: boolean;
  vehicleSelectionDisabled?: boolean;
  extraActionLabel?: string;
  onSelectVehicle: (vehicleId: number | null) => void;
  onChangeStartOdometer?: (value: string) => void;
  onChangeEndOdometer?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onExtraAction?: () => void;
};

export function SessionVehicleModal({
  visible,
  title,
  confirmLabel,
  vehicles,
  selectedVehicleId,
  startOdometerValue,
  endOdometerValue,
  errorMessage,
  description,
  isSubmitting = false,
  vehicleSelectionDisabled = false,
  extraActionLabel,
  onSelectVehicle,
  onChangeStartOdometer,
  onChangeEndOdometer,
  onConfirm,
  onCancel,
  onExtraAction,
}: Props) {
  const showStartInput = onChangeStartOdometer !== undefined;
  const showEndInput = onChangeEndOdometer !== undefined;
  const canEditOdometer = selectedVehicleId !== null;

  return (
    <Modal
      transparent
      animationType='fade'
      visible={visible}
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <View
          style={styles.dialog}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title}>{title}</Text>
          {description !== undefined && (
            <Text style={styles.description}>{description}</Text>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>車両</Text>
            {vehicleSelectionDisabled ? (
              <View style={[styles.vehicleOption, styles.vehicleOptionSelected]}>
                <Text style={[styles.vehicleOptionText, styles.vehicleOptionTextSelected]}>
                  {vehicles.find((vehicle) => vehicle.id === selectedVehicleId)?.display_name ?? '未選択'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.vehicleList} contentContainerStyle={styles.vehicleListContent}>
                <Pressable
                  style={[
                    styles.vehicleOption,
                    selectedVehicleId === null && styles.vehicleOptionSelected,
                  ]}
                  onPress={() => onSelectVehicle(null)}
                >
                  <Text
                    style={[
                      styles.vehicleOptionText,
                      selectedVehicleId === null && styles.vehicleOptionTextSelected,
                    ]}
                  >
                    未選択
                  </Text>
                </Pressable>

                {vehicles.map((vehicle) => (
                  <Pressable
                    key={vehicle.id}
                    style={[
                      styles.vehicleOption,
                      selectedVehicleId === vehicle.id && styles.vehicleOptionSelected,
                    ]}
                    onPress={() => onSelectVehicle(vehicle.id)}
                  >
                    <Text
                      style={[
                        styles.vehicleOptionText,
                        selectedVehicleId === vehicle.id && styles.vehicleOptionTextSelected,
                      ]}
                    >
                      {vehicle.display_name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {vehicles.length === 0 && (
              <Text style={styles.emptyText}>登録済みの車両はありません。</Text>
            )}
          </View>

          {showStartInput && canEditOdometer && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>開始メーター距離</Text>
              <TextInput
                style={styles.input}
                value={startOdometerValue}
                onChangeText={onChangeStartOdometer}
                keyboardType='number-pad'
                placeholder='例: 12345'
                placeholderTextColor='#64748b'
              />
            </View>
          )}

          {showEndInput && canEditOdometer && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>終了メーター距離</Text>
              <TextInput
                style={styles.input}
                value={endOdometerValue}
                onChangeText={onChangeEndOdometer}
                keyboardType='number-pad'
                placeholder='例: 12410'
                placeholderTextColor='#64748b'
              />
            </View>
          )}

          {errorMessage !== null && errorMessage !== undefined && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {extraActionLabel !== undefined && onExtraAction !== undefined && (
            <Pressable style={styles.extraAction} onPress={onExtraAction}>
              <Text style={styles.extraActionText}>{extraActionLabel}</Text>
            </Pressable>
          )}

          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.actionText}>キャンセル</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.confirmButton, isSubmitting && styles.actionDisabled]}
              onPress={onConfirm}
              disabled={isSubmitting}
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
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#94a3b8',
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  vehicleList: {
    maxHeight: 220,
  },
  vehicleListContent: {
    gap: 8,
  },
  vehicleOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
  },
  vehicleOptionSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#082f49',
  },
  vehicleOptionText: {
    fontSize: 14,
    color: '#e2e8f0',
  },
  vehicleOptionTextSelected: {
    color: '#e0f2fe',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  errorText: {
    fontSize: 13,
    color: '#fca5a5',
  },
  extraAction: {
    alignSelf: 'flex-start',
  },
  extraActionText: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  confirmButton: {
    backgroundColor: '#0f766e',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
});