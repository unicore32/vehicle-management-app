import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import {
    getDebugLoggingEnabled,
    getGpsLoggingEnabled,
    setDebugLoggingEnabled,
    setGpsLoggingEnabled,
} from '../../lib/app-state-store';
import {
    buildDebugLogExportText,
    clearDebugLogs,
    getDebugLogs,
} from '../../lib/debug-log-store';
import { getSessionPointCount } from '../../lib/session-points-store';
import {
    getActiveSession,
    getFinishedSessionCount,
} from '../../lib/session-store';
import { ConfirmDialog } from '../shared/confirm-dialog';

const SETTINGS_QUERY_KEY = 'app_settings';
const DEBUG_LOG_LIMIT = 20;

export function DebugSettings() {
  const queryClient = useQueryClient();
  const [showClearDialog, setShowClearDialog] = useState(false);

  const { data: activeSession } = useQuery({
    queryKey: ['debug', 'active_session'],
    queryFn: getActiveSession,
  });

  const { data: finishedCount = 0 } = useQuery({
    queryKey: ['debug', 'finished_count'],
    queryFn: getFinishedSessionCount,
  });

  const { data: pointCount = 0 } = useQuery({
    queryKey: ['debug', 'point_count', activeSession?.id],
    queryFn: () =>
      activeSession !== null && activeSession !== undefined
        ? getSessionPointCount(activeSession.id)
        : Promise.resolve(0),
    enabled: activeSession !== null && activeSession !== undefined,
  });

  const { data: debugEnabled = false } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'app_logging_enabled'],
    queryFn: getDebugLoggingEnabled,
  });

  const { data: gpsEnabled = false } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, 'gps_logging_enabled'],
    queryFn: getGpsLoggingEnabled,
  });

  const { data: debugLogs = [] } = useQuery({
    queryKey: ['debug', 'logs', DEBUG_LOG_LIMIT],
    queryFn: () => getDebugLogs(DEBUG_LOG_LIMIT),
    refetchInterval: 3_000,
  });

  const enabledMutation = useMutation({
    mutationFn: setDebugLoggingEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'app_logging_enabled'] });
    },
  });

  const gpsMutation = useMutation({
    mutationFn: setGpsLoggingEnabled,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY, 'gps_logging_enabled'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearDebugLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debug', 'logs'] });
    },
  });

  const handleExportLogs = useCallback(async () => {
    const text = buildDebugLogExportText(debugLogs);
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileUri = `${FileSystem.cacheDirectory ?? ''}debug-logs-${stamp}.txt`;

    await FileSystem.writeAsStringAsync(fileUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'デバッグログを共有',
      });
    }
  }, [debugLogs]);

  const handleClearConfirm = useCallback(() => {
    setShowClearDialog(false);
    clearMutation.mutate();
  }, [clearMutation]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>デバッグ情報</Text>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>アプリ/エラーログを保存</Text>
          <Text style={styles.description}>
            console.log / warn / error などのアプリログを日付付きで端末内に蓄積します
          </Text>
        </View>
        <Switch
          value={debugEnabled}
          onValueChange={(v) => enabledMutation.mutate(v)}
          trackColor={{ false: '#374151', true: '#0a7ea4' }}
          thumbColor="#f1f5f9"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowLabel}>
          <Text style={styles.label}>GPS ログを保存</Text>
          <Text style={styles.description}>
            GPS 関連のデバッグログを日付付きで端末内に蓄積します
          </Text>
        </View>
        <Switch
          value={gpsEnabled}
          onValueChange={(v) => gpsMutation.mutate(v)}
          trackColor={{ false: '#374151', true: '#0a7ea4' }}
          thumbColor="#f1f5f9"
        />
      </View>

      <DebugRow label="DB ファイル" value="gps_logger.db" />
      <DebugRow
        label="アクティブセッション ID"
        value={activeSession !== null && activeSession !== undefined ? String(activeSession.id) : 'なし'}
      />
      <DebugRow
        label="セッションステータス"
        value={activeSession !== null && activeSession !== undefined ? activeSession.status : '—'}
      />
      <DebugRow
        label="現在セッションのポイント数"
        value={activeSession !== null && activeSession !== undefined ? String(pointCount) : '—'}
      />
      <DebugRow label="完了済みセッション数" value={String(finishedCount)} />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
          <Text style={styles.actionButtonText}>ログをエクスポート</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={() => setShowClearDialog(true)}>
          <Text style={styles.actionButtonText}>全削除</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logList}>
        <Text style={styles.logListTitle}>最近のログ</Text>
        {debugLogs.length === 0 ? (
          <Text style={styles.emptyText}>まだログはありません</Text>
        ) : (
          debugLogs.map((entry) => (
            <View key={entry.id} style={styles.logItem}>
              <Text style={styles.logDate}>
                {new Date(entry.created_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </Text>
              <Text style={styles.logMessage}>{entry.message}</Text>
              {entry.details !== null && <Text style={styles.logDetails}>{entry.details}</Text>}
            </View>
          ))
        )}
      </View>

      <ConfirmDialog
        visible={showClearDialog}
        title="ログを全削除"
        message="保存済みのデバッグログをすべて削除しますか？この操作は元に戻せません。"
        confirmLabel="削除"
        destructive
        onConfirm={handleClearConfirm}
        onCancel={() => setShowClearDialog(false)}
      />
    </View>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
    paddingVertical: 12,
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
    fontSize: 14,
    color: '#9ca3af',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  value: {
    fontSize: 13,
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#111827',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
  },
  dangerButton: {
    backgroundColor: '#b91c1c',
  },
  actionButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
    fontSize: 14,
  },
  logList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 8,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  logListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  logItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    gap: 4,
  },
  logDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  logMessage: {
    fontSize: 14,
    color: '#f8fafc',
  },
  logDetails: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
});
