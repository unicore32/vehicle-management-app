import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGpxFilenamePrefix,
  setGpxFilenamePrefix,
} from '../../lib/app-state-store';

const SETTINGS_QUERY_KEY = 'app_settings';
const DEFAULT_PREFIX = 'trip';

export function ExportSettings() {
  const queryClient = useQueryClient();

  const { data: prefix = DEFAULT_PREFIX } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'gpx_filename_prefix'],
    queryFn: getGpxFilenamePrefix,
  });

  const mutation = useMutation({
    mutationFn: setGpxFilenamePrefix,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'gpx_filename_prefix'] });
    },
  });

  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(prefix);
  }, [prefix]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const trimmed = inputValue.trim();
    if (trimmed.length > 0) {
      mutation.mutate(trimmed);
    }
    setInputValue('');
  }, [inputValue, mutation]);

  const today = new Date();
  const exampleDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
  const exampleFilename = `${isEditing && inputValue.trim() ? inputValue.trim() : prefix}-${exampleDate}.gpx`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>エクスポート</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>GPX ファイル名プレフィックス</Text>
          <Text style={styles.description}>
            例: {exampleFilename}
          </Text>
        </View>
        <TextInput
          style={styles.input}
          value={isEditing ? inputValue : prefix}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={setInputValue}
          selectTextOnFocus
          maxLength={32}
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
    width: 100,
    height: 36,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#f1f5f9',
    fontSize: 14,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#374151',
  },
});
