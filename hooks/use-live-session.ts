import { useQuery } from '@tanstack/react-query';
import {
  getSessionPoints,
  getLatestSessionPoint,
  computeLiveDistance,
} from '../lib/session-points-store';
import { SESSION_POINTS_QUERY_KEY } from '../constants/task-names';

/** 地図表示・統計表示に使うライブデータのポーリング間隔 [ms] */
const LIVE_POLL_INTERVAL = 3_000;

/** 地図に表示する最新ポイントの上限 */
const MAP_POINT_LIMIT = 200;

// ─── ライブポイント取得（地図用） ────────────────────────────────────────────

/**
 * 現在のセッションの最新ポイントをポーリングで取得する。
 * 記録中のみ refetch し、一時停止中は最後の状態を保持する。
 */
export function useLiveSessionPoints(
  sessionId: number | null,
  isRecording: boolean,
) {
  return useQuery({
    queryKey: [SESSION_POINTS_QUERY_KEY, sessionId, 'map'],
    queryFn: () => getSessionPoints(sessionId!, MAP_POINT_LIMIT),
    enabled: sessionId !== null,
    refetchInterval: isRecording ? LIVE_POLL_INTERVAL : false,
    staleTime: LIVE_POLL_INTERVAL,
  });
}

// ─── 最新ポイント（速度・座標表示用） ────────────────────────────────────────

/**
 * 現在のセッションの最新 GPS ポイントをポーリングで取得する。
 * 速度・座標の表示に使用する。
 */
export function useLiveLatestPoint(
  sessionId: number | null,
  isRecording: boolean,
) {
  return useQuery({
    queryKey: [SESSION_POINTS_QUERY_KEY, sessionId, 'latest'],
    queryFn: () => getLatestSessionPoint(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: isRecording ? LIVE_POLL_INTERVAL : false,
    staleTime: LIVE_POLL_INTERVAL,
  });
}

// ─── 累積走行距離（ライブ表示用） ─────────────────────────────────────────────

/**
 * 現在のセッションの累積走行距離（km）をポーリングで取得する。
 * 全ポイントの lat/lon を取得してハバーサイン計算するため、
 * 停止時の精確な値は finishSession 時の computeSessionStats を使うこと。
 */
export function useLiveDistance(
  sessionId: number | null,
  isRecording: boolean,
) {
  return useQuery({
    queryKey: [SESSION_POINTS_QUERY_KEY, sessionId, 'distance'],
    queryFn: () => computeLiveDistance(sessionId!),
    enabled: sessionId !== null,
    refetchInterval: isRecording ? LIVE_POLL_INTERVAL : false,
    staleTime: LIVE_POLL_INTERVAL,
  });
}
