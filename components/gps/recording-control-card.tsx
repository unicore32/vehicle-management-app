import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { StatusChip } from '../shared/status-chip';
import type { RecordingStatus } from '../../hooks/use-session-recording';

type Props = {
  status: RecordingStatus;
  activeSessionId: number | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

/**
 * GPS 記録の start / pause / resume / stop を担うコントロールカード。
 * spec: Home > RecordingControlCard
 *
 * 状態遷移:
 *   idle      → [開始] ボタン
 *   recording → [一時停止] + [停止・完了] ボタン
 *   paused    → [再開] + [停止・完了] ボタン
 *   loading   → すべてのボタンを無効化
 */
export function RecordingControlCard({
  status,
  activeSessionId,
  onStart,
  onPause,
  onResume,
  onStop,
}: Props) {
  const isLoading = status === 'loading';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>記録コントロール</Text>
        <StatusChip status={status} />
      </View>

      {activeSessionId !== null && (
        <Text style={styles.sessionId}>セッション #{activeSessionId}</Text>
      )}

      <View style={styles.buttons}>
        {status === 'idle' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={onStart}
            disabled={isLoading}
            testID="btn-start"
          >
            <Text style={styles.btnText}>● 記録を開始</Text>
          </TouchableOpacity>
        )}

        {status === 'recording' && (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnAmber, styles.btnHalf]}
              onPress={onPause}
              disabled={isLoading}
              testID="btn-pause"
            >
              <Text style={styles.btnText}>⏸ 一時停止</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnRed, styles.btnHalf]}
              onPress={onStop}
              disabled={isLoading}
              testID="btn-stop"
            >
              <Text style={styles.btnText}>■ 停止</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'paused' && (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnGreen, styles.btnHalf]}
              onPress={onResume}
              disabled={isLoading}
              testID="btn-resume"
            >
              <Text style={styles.btnText}>▶ 再開</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnRed, styles.btnHalf]}
              onPress={onStop}
              disabled={isLoading}
              testID="btn-stop"
            >
              <Text style={styles.btnText}>■ 完了</Text>
            </TouchableOpacity>
          </>
        )}

        {isLoading && (
          <View style={[styles.btn, styles.btnGray]}>
            <Text style={styles.btnText}>処理中...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  sessionId: {
    fontSize: 11,
    color: '#475569',
    marginTop: -6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalf: {
    flex: 1,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnGreen: { backgroundColor: '#15803d' },
  btnAmber: { backgroundColor: '#b45309' },
  btnRed:   { backgroundColor: '#991b1b' },
  btnGray:  { backgroundColor: '#374151' },
});
