import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGapThresholdS,
  setGapThresholdS,
  GAP_THRESHOLD_S_DEFAULT,
  GAP_THRESHOLD_S_MIN,
  GAP_THRESHOLD_S_MAX,
} from '../../lib/app-state-store';

const SETTINGS_QUERY_KEY = 'app_settings';

export function GapDetectionSettings() {
  const queryClient = useQueryClient();

  const { data: thresholdS = GAP_THRESHOLD_S_DEFAULT } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'gap_threshold_s'],
    queryFn: getGapThresholdS,
  });

  const mutation = useMutation({
    mutationFn: setGapThresholdS,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [SETTINGS_QUERY_KEY, 'gap_threshold_s'],
      });
    },
  });

  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(String(thresholdS));
  }, [thresholdS]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = Number(inputValue);
    if (
      Number.isFinite(parsed) &&
      parsed >= GAP_THRESHOLD_S_MIN &&
      parsed <= GAP_THRESHOLD_S_MAX
    ) {
      mutation.mutate(parsed);
    }
    setInputValue('');
  }, [inputValue, mutation]);

  const displayValue = isEditing ? inputValue : String(thresholdS);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>欠損区間検出</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>欠損判定時間（秒）</Text>
          <Text style={styles.description}>
            {`${GAP_THRESHOLD_S_MIN}〜${GAP_THRESHOLD_S_MAX} 秒で設定（デフォルト: ${GAP_THRESHOLD_S_DEFAULT} 秒）`}
          </Text>
          <Text style={styles.description}>
            GPS ポイント間隔がこの秒数を超えると欠損区間として記録されます
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
