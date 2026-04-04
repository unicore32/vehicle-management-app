/**
 * 秒数を `MM:SS` / `H:MM:SS` 形式で整形する。
 * 1時間未満は `MM:SS`、1時間以上は `H:MM:SS` とする。
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * ミリ秒を `MM:SS` / `H:MM:SS` 形式で整形する。
 */
export function formatElapsedTimeMs(totalMs: number): string {
  return formatDuration(totalMs / 1_000);
}