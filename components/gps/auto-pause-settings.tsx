import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, Switch, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAutoPauseThresholdS,
  setAutoPauseThresholdS,
  getAutoPauseEnabled,
  setAutoPauseEnabled,
  AUTO_PAUSE_THRESHOLD_S_DEFAULT,
} from '../../lib/app-state-store';

const SETTINGS_QUERY_KEY = 'app_settings';

export function AutoPauseSettings() {
  const queryClient = useQueryClient();

  const { data: thresholdS = AUTO_PAUSE_THRESHOLD_S_DEFAULT } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'auto_pause_threshold_s'],
    queryFn: getAutoPauseThresholdS,
  });

  const { data: enabled = true } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'auto_pause_enabled'],
    queryFn: getAutoPauseEnabled,
  });

  const thresholdMutation = useMutation({
    mutationFn: setAutoPauseThresholdS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'auto_pause_threshold_s'] });
    },
  });

  const enabledMutation = useMutation({
    mutationFn: setAutoPauseEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'auto_pause_enabled'] });
    },
  });

  // テキスト入力の一時バッファ（確定前の入力値）
  const [inputValue, setInputValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(String(thresholdS));
  }, [thresholdS]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = Number(inputValue);
    if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 3600) {
      thresholdMutation.mutate(parsed);
    }
    setInputValue('');
  }, [inputValue, thresholdMutation]);

  const displayValue = isEditing ? inputValue : String(thresholdS);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>自動一時停止</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>自動一時停止を有効にする</Text>
          <Text style={styles.description}>
            一定時間停止した場合に自動で一時停止します
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => enabledMutation.mutate(v)}
          trackColor={{ false: '#374151', true: '#0a7ea4' }}
          thumbColor="#f1f5f9"
        />
      </View>

      {enabled && (
        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Text style={styles.label}>停止判定時間（秒）</Text>
            <Text style={styles.description}>
              10〜3600 秒で設定（デフォルト: 300 秒）
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
      )}
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
