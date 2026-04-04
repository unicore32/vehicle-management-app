import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, View, YStack, XStack, Card, Button } from 'tamagui';

import { useGPSLogger } from '../../hooks/use-gps-logger';
import {
  useLocationCount,
  useLocationHistory,
  useClearLocations,
} from '../../hooks/use-location-history';
import { RecordingButton } from '../../components/gps/recording-button';
import { LocationStats } from '../../components/gps/location-stats';
import { LocationMap } from '../../components/gps/location-map';

export default function GPSDashboardScreen() {
  const { isRecording, isLoading, error, startRecording, stopRecording } =
    useGPSLogger();

  const { data: count } = useLocationCount(isRecording);
  const { data: locations = [] } = useLocationHistory(50);
  const { mutate: clearAll, isPending: isClearing } = useClearLocations();

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClear = () => {
    Alert.alert(
      '記録を削除',
      '保存済みの全 GPS ログを削除しますか？この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => clearAll() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <YStack gap="$4" paddingHorizontal="$4" paddingTop="$4" paddingBottom="$8">

          {/* ヘッダー */}
          <YStack gap="$1">
            <Text style={styles.title}>GPS ロガー</Text>
            <XStack alignItems="center" gap="$2">
              <View
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor={isRecording ? '#22c55e' : '#555'}
                animation="bouncy"
              />
              <Text style={styles.statusLabel}>
                {isRecording ? '記録中' : '待機中'}
              </Text>
            </XStack>
          </YStack>

          {/* エラー表示 */}
          {error != null && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          )}

          {/* 記録ボタン */}
          <RecordingButton
            isRecording={isRecording}
            isLoading={isLoading}
            onPress={handleToggle}
          />

          {/* 統計情報 */}
          <LocationStats
            count={count}
            isRecording={isRecording}
            latestLocation={locations[0]}
          />

          {/* 地図表示 */}
          {locations.length > 0 && (
            <YStack gap="$2">
              <Text style={styles.sectionLabel}>走行ルート（直近 50 件）</Text>
              <LocationMap locations={locations} />
            </YStack>
          )}

          {/* 記録クリアボタン */}
          {(count ?? 0) > 0 && (
            <Button
              size="$3"
              chromeless
              borderWidth={1}
              borderColor="#7f1d1d"
              color="#f87171"
              disabled={isClearing}
              onPress={handleClear}
              testID="clear-button"
            >
              {isClearing ? 'クリア中...' : '全記録を削除'}
            </Button>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  errorCard: {
    backgroundColor: '#2d1515',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
});
