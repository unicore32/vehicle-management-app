import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { VEHICLES_QUERY_KEY } from '../constants/task-names';
import {
    createVehicle,
    getVehicles,
    setVehicleActive,
    updateVehicle,
    type Vehicle,
} from '../lib/vehicle-store';

type EditorState = {
  vehicle: Vehicle | null;
  name: string;
  error: string | null;
};

const EMPTY_EDITOR: EditorState = {
  vehicle: null,
  name: '',
  error: null,
};

export default function VehiclesScreen() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [visible, setVisible] = useState(false);

  const { data: vehicles = [] } = useQuery({
    queryKey: [VEHICLES_QUERY_KEY, 'all'],
    queryFn: () => getVehicles({ includeInactive: true }),
  });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      setVisible(false);
      setEditor(EMPTY_EDITOR);
      await queryClient.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
    },
    onError: (error) => {
      setEditor((current) => ({
        ...current,
        error: error instanceof Error ? error.message : '車両の作成に失敗しました',
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ vehicleId, displayName }: { vehicleId: number; displayName: string }) =>
      updateVehicle(vehicleId, { displayName }),
    onSuccess: async () => {
      setVisible(false);
      setEditor(EMPTY_EDITOR);
      await queryClient.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
    },
    onError: (error) => {
      setEditor((current) => ({
        ...current,
        error: error instanceof Error ? error.message : '車両の更新に失敗しました',
      }));
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ vehicleId, isActive }: { vehicleId: number; isActive: boolean }) =>
      setVehicleActive(vehicleId, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
    },
  });

  function openCreateEditor() {
    setEditor(EMPTY_EDITOR);
    setVisible(true);
  }

  function openEditEditor(vehicle: Vehicle) {
    setEditor({ vehicle, name: vehicle.display_name, error: null });
    setVisible(true);
  }

  function closeEditor() {
    setVisible(false);
    setEditor(EMPTY_EDITOR);
  }

  function submitEditor() {
    if (editor.vehicle === null) {
      createMutation.mutate({ displayName: editor.name });
      return;
    }

    updateMutation.mutate({
      vehicleId: editor.vehicle.id,
      displayName: editor.name,
    });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '車両管理' }} />
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>管理する車両</Text>
          <Pressable style={styles.addButton} onPress={openCreateEditor}>
            <Text style={styles.addButtonText}>追加</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {vehicles.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>車両がまだ登録されていません</Text>
              <Text style={styles.emptyText}>最初の 1 台を追加すると記録開始前に選択できます。</Text>
            </View>
          )}

          {vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleCardHeader}>
                <View>
                  <Text style={styles.vehicleName}>{vehicle.display_name}</Text>
                  <Text style={styles.vehicleMeta}>
                    {vehicle.is_active === 1 ? '選択可能' : 'アーカイブ済み'}
                  </Text>
                </View>
                <Pressable style={styles.editPill} onPress={() => openEditEditor(vehicle)}>
                  <Text style={styles.editPillText}>編集</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.toggleButton, vehicle.is_active === 1 ? styles.archiveButton : styles.restoreButton]}
                onPress={() => activeMutation.mutate({ vehicleId: vehicle.id, isActive: vehicle.is_active !== 1 })}
              >
                <Text style={styles.toggleButtonText}>
                  {vehicle.is_active === 1 ? 'アーカイブ' : '再有効化'}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <Modal transparent visible={visible} animationType='fade' onRequestClose={closeEditor}>
          <Pressable style={styles.modalOverlay} onPress={closeEditor}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>
                {editor.vehicle === null ? '車両を追加' : '車両名を編集'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={editor.name}
                onChangeText={(name) => setEditor((current) => ({ ...current, name, error: null }))}
                placeholder='例: フィット GK3'
                placeholderTextColor='#64748b'
              />
              {editor.error !== null && (
                <Text style={styles.modalError}>{editor.error}</Text>
              )}
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.modalCancelButton]} onPress={closeEditor}>
                  <Text style={styles.modalButtonText}>キャンセル</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.modalConfirmButton]} onPress={submitEditor}>
                  <Text style={styles.modalButtonText}>保存</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  addButton: {
    borderRadius: 999,
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    marginTop: 40,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#94a3b8',
  },
  vehicleCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 12,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  vehicleMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#94a3b8',
  },
  editPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editPillText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  toggleButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  archiveButton: {
    backgroundColor: '#3f1d1d',
  },
  restoreButton: {
    backgroundColor: '#163b31',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  modalError: {
    fontSize: 13,
    color: '#fca5a5',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#374151',
  },
  modalConfirmButton: {
    backgroundColor: '#0f766e',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
});