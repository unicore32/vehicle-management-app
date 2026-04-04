import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionPoint } from '../lib/session-points-store';

// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type PlaybackSpeed = 1 | 2 | 4 | 8;

export type SessionPlaybackState = {
  /** 現在表示中のタイムスタンプ（ms） */
  currentTimestamp: number;
  /** 再生中かどうか */
  isPlaying: boolean;
  /** 再生速度 (1x / 2x / 4x / 8x) */
  playbackSpeed: PlaybackSpeed;
  /** 再生を開始する（末尾にいる場合は先頭から再生） */
  play: () => void;
  /** 再生を一時停止する */
  pause: () => void;
  /** 任意のタイムスタンプに移動する */
  seek: (ts: number) => void;
  /** 再生速度を変更する */
  setSpeed: (speed: PlaybackSpeed) => void;
};

/** インターバルの実行頻度 (ms) */
const TICK_MS = 100;

// ─── Hook 実装 ────────────────────────────────────────────────────────────────

/**
 * セッションのプレイバック状態を管理する Hook。
 *
 * - play(): TICK_MS ごとに currentTimestamp を速度倍率分だけ進める
 * - pause(): インターバルを停止する
 * - seek(ts): 任意のタイムスタンプに即時移動する
 * - 末尾に達すると自動的に停止する
 *
 * @param points 時系列昇順のセッションポイント
 */
export function useSessionPlayback(points: SessionPoint[]): SessionPlaybackState {
  const firstTs = points.length > 0 ? points[0].timestamp : 0;
  const lastTs = points.length > 0 ? points[points.length - 1].timestamp : 0;

  const [currentTimestamp, setCurrentTimestamp] = useState(lastTs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // ステールクロージャを避けるための Ref
  const lastTsRef = useRef(lastTs);
  const firstTsRef = useRef(firstTs);
  const currentTsRef = useRef(currentTimestamp);
  const speedRef = useRef(playbackSpeed);

  useEffect(() => {
    lastTsRef.current = lastTs;
  }, [lastTs]);
  useEffect(() => {
    firstTsRef.current = firstTs;
  }, [firstTs]);
  useEffect(() => {
    currentTsRef.current = currentTimestamp;
  }, [currentTimestamp]);
  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // ポイントが初めて読み込まれたとき currentTimestamp を末尾に合わせる
  const prevLastTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (points.length > 0 && prevLastTsRef.current !== lastTs) {
      prevLastTsRef.current = lastTs;
      setCurrentTimestamp(lastTs);
    }
  }, [lastTs, points.length]);

  // ── インターバル管理 ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const id = setInterval(() => {
      setCurrentTimestamp((prev) => {
        const next = prev + TICK_MS * speedRef.current;
        return next >= lastTsRef.current ? lastTsRef.current : next;
      });
    }, TICK_MS);

    return () => clearInterval(id);
  }, [isPlaying]);

  // 末尾に達したら自動停止
  useEffect(() => {
    if (isPlaying && firstTs < lastTs && currentTimestamp >= lastTs) {
      setIsPlaying(false);
    }
  }, [currentTimestamp, firstTs, isPlaying, lastTs]);

  // ── 操作 ─────────────────────────────────────────────────────────────────

  const play = useCallback(() => {
    if (points.length === 0) return;
    // 末尾にいる場合は先頭から再生
    if (lastTsRef.current > firstTsRef.current && currentTsRef.current >= lastTsRef.current) {
      setCurrentTimestamp(firstTsRef.current);
    }
    setIsPlaying(true);
  }, [points.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seek = useCallback((ts: number) => {
    setCurrentTimestamp(ts);
  }, []);

  return {
    currentTimestamp,
    isPlaying,
    playbackSpeed,
    play,
    pause,
    seek,
    setSpeed: setPlaybackSpeed,
  };
}
