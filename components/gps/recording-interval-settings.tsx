import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
    getRecordingIntervalS,
    RECORDING_INTERVAL_S_DEFAULT,
    RECORDING_INTERVAL_S_MAX,
    RECORDING_INTERVAL_S_MIN,
    setRecordingIntervalS,
} from '../../lib/app-state-store';

const SETTINGS_QUERY_KEY = 'app_settings';

export function RecordingIntervalSettings() {
  const queryClient = useQueryClient();

  const { data: intervalS = RECORDING_INTERVAL_S_DEFAULT } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'recording_interval_s'],
    queryFn: getRecordingIntervalS,
  });

  const mutation = useMutation({
    mutationFn: setRecordingIntervalS,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SETTINGS_QUERY_KEY, 'recording_interval_s'],
      });
    },
  });

  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(String(intervalS));
  }, [intervalS]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = Number(inputValue);
    if (
      Number.isFinite(parsed) &&
      parsed >= RECORDING_INTERVAL_S_MIN &&
      parsed <= RECORDING_INTERVAL_S_MAX
    ) {
      mutation.mutate(parsed);
    }
    setInputValue('');
  }, [inputValue, mutation]);

  const displayValue = isEditing ? inputValue : String(intervalS);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>記録間隔</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>記録間隔（秒）</Text>
          <Text style={styles.description}>
            {`${RECORDING_INTERVAL_S_MIN}〜${RECORDING_INTERVAL_S_MAX} 秒で設定（デフォルト: ${RECORDING_INTERVAL_S_DEFAULT} 秒）`}
          </Text>
          <Text style={styles.description}>
            数値が小さいほど細かく記録しますが、電池消費は増えます
          </Text>
        </View>
        <TextInput
          style={styles.input}
          value={displayValue}
          keyboardType="number-pad"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={setInputValue}
          selectTextOnFocus
        />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
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
  input: {
    width: 80,
    height: 36,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#f1f5f9',
    fontSize: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#374151',
  },
});