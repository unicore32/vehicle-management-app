import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  startRecordingService,
  pauseRecordingService,
  resumeRecordingService,
  stopRecordingService,
  isBackgroundTaskRunning,
  getActiveSession,
} from '../services/gps-service';
import { updateSessionStatus } from '../lib/session-store';
import { SESSION_POINTS_QUERY_KEY, SESSION_QUERY_KEY } from '../constants/task-names';

/** 自動一時停止検知のポーリング間隔 [ms] */
const AUTO_PAUSE_POLL_INTERVAL = 5_000;

// ─── 型定義 ───────────────────────────────────────────────────────────────────

/**
 * 記録の状態マシン。
 *
 * idle       → recording  : start()
 * recording  → paused     : pause()
 * recording  → idle       : stop()
 * paused     → recording  : resume()
 * paused     → idle       : stop()
 * *          → *          : loading 中は全操作を無効化
 */
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'loading';

export type SessionRecordingState = {
  /** 現在の記録状態 */
  status: RecordingStatus;
  /** アクティブセッションの ID（idle のときは null） */
  activeSessionId: number | null;
  /** アクティブセッションの開始時刻（idle のときは null） */
  activeSessionStartedAt: number | null;
  /** 直近のエラーメッセージ（エラーなしの場合は null） */
  error: string | null;
  /** 新規セッションを作成して記録開始 */
  start: () => Promise<void>;
  /** 記録を一時停止（セッションは維持） */
  pause: () => Promise<void>;
  /** 一時停止中のセッションを再開 */
  resume: () => Promise<void>;
  /** セッションを完了して記録終了 */
  stop: () => Promise<void>;
};

// ─── Hook 実装 ────────────────────────────────────────────────────────────────

/**
 * GPS セッション記録の状態管理 Hook。
 *
 * - 起動時にクラッシュリカバリを行い、未完了セッションを paused に復元する
 * - start/pause/resume/stop の遷移を管理する
 * - 操作完了後に TanStack Query のセッションキャッシュを無効化する
 */
export function useSessionRecording(): SessionRecordingState {
  const [status, setStatus] = useState<RecordingStatus>('loading');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeSessionStartedAt, setActiveSessionStartedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const statusRef = useRef(status);

  // statusRef を status と同期させ、クロージャのキャプチャ問題を回避する
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── 起動時: 状態復元 & クラッシュリカバリ ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function restoreState() {
      try {
        const session = await getActiveSession();

        if (session === null) {
          if (!cancelled) {
            setStatus('idle');
            setActiveSessionId(null);
            setActiveSessionStartedAt(null);
          }
          return;
        }

        if (session.status === 'paused') {
          if (!cancelled) {
            setStatus('paused');
            setActiveSessionId(session.id);
            setActiveSessionStartedAt(session.started_at);
          }
          return;
        }

        // status === 'recording': バックグラウンドタスクが実際に動いているか確認
        const taskRunning = await isBackgroundTaskRunning();
        if (!cancelled) {
          if (taskRunning) {
            setStatus('recording');
            setActiveSessionId(session.id);
            setActiveSessionStartedAt(session.started_at);
          } else {
            // クラッシュリカバリ: タスクが止まっているが DB は recording のまま
            await updateSessionStatus(session.id, 'paused', 'crash_recovery');
            setStatus('paused');
            setActiveSessionId(session.id);
            setActiveSessionStartedAt(session.started_at);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '状態の復元に失敗しました');
          setStatus('idle');
          setActiveSessionStartedAt(null);
        }
      }
    }

    restoreState();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 自動一時停止の検知ポーリング ─────────────────────────────────────────────
  // バックグラウンドタスクがセッションを 'paused' に更新した場合、
  // 次のポーリングで UI 側の状態に反映する。
  useEffect(() => {
    if (activeSessionId === null) return;

    const id = setInterval(async () => {
      if (statusRef.current !== 'recording') return;
      try {
        const session = await getActiveSession();
        if (session !== null && session.status === 'paused') {
          setStatus('paused');
        }
      } catch {
        // ポーリング失敗は無視する（次回リトライ）
      }
    }, AUTO_PAUSE_POLL_INTERVAL);

    return () => clearInterval(id);
  }, [activeSessionId]);

  // ── 操作 ─────────────────────────────────────────────────────────────────

  const start = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const session = await startRecordingService();
      queryClient.removeQueries({ queryKey: [SESSION_POINTS_QUERY_KEY] });
      setActiveSessionId(session.id);
      setActiveSessionStartedAt(session.started_at);
      setStatus('recording');
      await queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '記録の開始に失敗しました');
      setStatus('idle');
      setActiveSessionId(null);
      setActiveSessionStartedAt(null);
    }
  }, [queryClient]);

  const pause = useCallback(async () => {
    if (activeSessionId === null) return;
    setStatus('loading');
    setError(null);
    try {
      await pauseRecordingService(activeSessionId);
      setStatus('paused');
    } catch (e) {
      setError(e instanceof Error ? e.message : '一時停止に失敗しました');
      setStatus('recording');
    }
  }, [activeSessionId]);

  const resume = useCallback(async () => {
    if (activeSessionId === null) return;
    setStatus('loading');
    setError(null);
    try {
      await resumeRecordingService(activeSessionId);
      setStatus('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : '再開に失敗しました');
      setStatus('paused');
    }
  }, [activeSessionId]);

  const stop = useCallback(async () => {
    if (activeSessionId === null) return;
    setStatus('loading');
    setError(null);
    try {
      await stopRecordingService(activeSessionId);
      queryClient.removeQueries({ queryKey: [SESSION_POINTS_QUERY_KEY] });
      setActiveSessionId(null);
      setActiveSessionStartedAt(null);
      setStatus('idle');
      await queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '停止に失敗しました');
      // 停止失敗時は recording に戻さず paused に落とす（安全側）
      setStatus('paused');
    }
  }, [activeSessionId, queryClient]);

  return {
    status,
    activeSessionId,
    activeSessionStartedAt,
    error,
    start,
    pause,
    resume,
    stop,
  };
}
