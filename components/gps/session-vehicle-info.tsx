import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../../lib/session-store';

type Props = {
  session: Session;
  onEdit?: () => void;
};

function formatOdometer(value: number | null): string {
  if (value === null) return '未入力';
  return `${value.toLocaleString('ja-JP')} km`;
}

export function SessionVehicleInfo({ session, onEdit }: Props) {
  const meterDelta =
    session.odometer_start_km !== null && session.odometer_end_km !== null
      ? session.odometer_end_km - session.odometer_start_km
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>車両情報</Text>
        {onEdit !== undefined && (
          <Pressable style={styles.editButton} onPress={onEdit}>
            <Text style={styles.editButtonText}>編集</Text>
          </Pressable>
        )}
      </View>

      <InfoRow label='車両' value={session.vehicle_display_name ?? '未選択'} />
      <InfoRow label='開始メーター距離' value={formatOdometer(session.odometer_start_km)} />
      <InfoRow label='終了メーター距離' value={formatOdometer(session.odometer_end_km)} />
      <InfoRow
        label='メーター差分'
        value={meterDelta !== null ? `${meterDelta.toLocaleString('ja-JP')} km` : '未計算'}
      />
      <InfoRow label='GPS 距離' value={`${(session.distance_m / 1000).toFixed(2)} km`} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  editButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f8fafc',
    textAlign: 'right',
  },
});