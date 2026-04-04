import { EmptyState } from '../shared/empty-state';

export function SessionListEmptyState() {
  return (
    <EmptyState
      icon="〇"
      title="セッションはありません"
      subtitle={'記録を開始すると、\nここに表示されます'}
    />
  );
}
