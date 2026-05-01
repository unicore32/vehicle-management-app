import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    SESSION_DETAIL_QUERY_KEY,
    SESSION_QUERY_KEY,
    VEHICLES_QUERY_KEY,
} from '../constants/task-names';
import type { SessionGap } from '../lib/session-gaps-store';
import { getSessionGaps } from '../lib/session-gaps-store';
import type { SessionPoint } from '../lib/session-points-store';
import { getSessionPoints } from '../lib/session-points-store';
import type { Session } from '../lib/session-store';
import {
    deleteSession,
    getSession,
    updateSessionVehicleInfo,
    type UpdateSessionVehicleInfoInput,
} from '../lib/session-store';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type SessionDetailData = {
  session: Session;
  points: SessionPoint[];
  gaps: SessionGap[];
};

// ─── フック ───────────────────────────────────────────────────────────────────

/**
 * 指定セッションの詳細データ（セッション本体・ポイント・ギャップ）を取得する。
 */
export function useSessionDetail(sessionId: number) {
  return useQuery({
    queryKey: [SESSION_DETAIL_QUERY_KEY, sessionId],
    queryFn: async (): Promise<SessionDetailData> => {
      const [session, points, gaps] = await Promise.all([
        getSession(sessionId),
        getSessionPoints(sessionId),
        getSessionGaps(sessionId),
      ]);
      if (session === null) {
        throw new Error(`セッション ${sessionId} が見つかりません`);
      }
      return { session, points, gaps };
    },
    staleTime: 30_000,
  });
}

/**
 * セッションを削除して関連キャッシュを無効化する。
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => deleteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.removeQueries({
        queryKey: [SESSION_DETAIL_QUERY_KEY, sessionId],
      });
      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
    },
  });
}

export function useUpdateSessionVehicleInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: number;
      input: UpdateSessionVehicleInfoInput;
    }) => updateSessionVehicleInfo(sessionId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [SESSION_DETAIL_QUERY_KEY, variables.sessionId],
      });
      queryClient.invalidateQueries({ queryKey: [SESSION_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [VEHICLES_QUERY_KEY] });
    },
  });
}
