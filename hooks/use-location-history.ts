import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLocations,
  getLocationCount,
  clearLocations,
} from '../lib/location-store';
import { LOCATION_QUERY_KEY } from '../constants/task-names';

/**
 * 保存済み GPS ログを TanStack Query で取得する Hook。
 *
 * @param {number} [limit] - 最大取得件数（省略時は全件）
 */
export function useLocationHistory(limit?: number) {
  return useQuery({
    queryKey: [LOCATION_QUERY_KEY, 'list', limit],
    queryFn: () => getLocations(limit),
    staleTime: 5_000,
  });
}

/**
 * 保存済み GPS ログの件数を取得する Hook。
 * 記録中は 3 秒ごとに自動更新する。
 *
 * @param {boolean} isRecording - 記録中かどうか（ポーリング制御に使用）
 */
export function useLocationCount(isRecording: boolean = false) {
  return useQuery({
    queryKey: [LOCATION_QUERY_KEY, 'count'],
    queryFn: getLocationCount,
    refetchInterval: isRecording ? 3_000 : false,
  });
}

/**
 * 全ログを削除する Mutation Hook。
 * 完了後にキャッシュを自動無効化する。
 */
export function useClearLocations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearLocations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATION_QUERY_KEY] });
    },
  });
}
