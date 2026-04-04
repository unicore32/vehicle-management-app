import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  startBackgroundLocationService,
  stopBackgroundLocationService,
  isRecordingActive,
} from '../services/gps-service';
import { LOCATION_QUERY_KEY } from '../constants/task-names';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type GPSLoggerState = {
  /** バックグラウンド記録が現在アクティブか */
  isRecording: boolean;
  /** 開始・停止処理の実行中か */
  isLoading: boolean;
  /** 直近のエラーメッセージ（エラーなしの場合は null） */
  error: string | null;
  /** GPS 記録を開始する */
  startRecording: () => Promise<void>;
  /** GPS 記録を停止する */
  stopRecording: () => Promise<void>;
};

// ─── Hook 実装 ────────────────────────────────────────────────────────────────

/**
 * GPS ロガーの状態管理を担う Custom Hook。
 *
 * - 起動時に既存のバックグラウンドタスクが動作中かどうかを復元する
 * - 開始・停止後に TanStack Query のキャッシュを無効化し
 *   ダッシュボードの件数表示を自動更新する
 *
 * @returns {GPSLoggerState} ロガーの状態と制御関数
 */
export function useGPSLogger(): GPSLoggerState {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // アプリ起動時: バックグラウンドタスクが既に動いているか確認
  useEffect(() => {
    let cancelled = false;
    isRecordingActive().then((active) => {
      if (!cancelled) {
        setIsRecording(active);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const startRecording = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await startBackgroundLocationService();
      setIsRecording(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '予期しないエラーが発生しました',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await stopBackgroundLocationService();
      setIsRecording(false);
      // 停止後に位置情報リストのキャッシュを無効化
      await queryClient.invalidateQueries({
        queryKey: [LOCATION_QUERY_KEY],
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '予期しないエラーが発生しました',
      );
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  return { isRecording, isLoading, error, startRecording, stopRecording };
}
