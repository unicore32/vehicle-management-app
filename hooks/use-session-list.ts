import { useQuery } from '@tanstack/react-query';
import { getSessions, type Session } from '../lib/session-store';
import { SESSION_QUERY_KEY } from '../constants/task-names';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionSummary = {
  totalCount: number;
  totalDistanceM: number;
  totalMovingTimeS: number;
};

export type SessionListData = {
  sessions: Session[];
  summary: SessionSummary;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * 完了済みセッション一覧と全体サマリーを取得する。
 *
 * - status === 'finished' のセッションのみを返す
 * - SESSION_QUERY_KEY を使用するため、記録停止時に自動的に再フェッチされる
 */
export function useSessionList() {
  return useQuery<SessionListData>({
    queryKey: [SESSION_QUERY_KEY],
    queryFn: async () => {
      const all = await getSessions();
      const sessions = all.filter((s) => s.status === 'finished');
      const summary: SessionSummary = {
        totalCount: sessions.length,
        totalDistanceM: sessions.reduce((sum, s) => sum + s.distance_m, 0),
        totalMovingTimeS: sessions.reduce((sum, s) => sum + s.moving_time_s, 0),
      };
      return { sessions, summary };
    },
  });
}
