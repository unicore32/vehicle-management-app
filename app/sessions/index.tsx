import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useSessionList } from '../../hooks/use-session-list';
import { SessionListHeader } from '../../components/gps/session-list-header';
import { SessionListItem } from '../../components/gps/session-list-item';
import { SessionListEmptyState } from '../../components/gps/session-list-empty-state';
import type { Session } from '../../lib/session-store';

export default function SessionsScreen() {
  const { data, isLoading, isError } = useSessionList();
  const { bottom } = useSafeAreaInsets();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#94a3b8" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>データの取得に失敗しました</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList<Session>
        data={data?.sessions ?? []}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
            <SessionListItem
              session={item}
              onPress={() => router.push(`/session/${item.id}`)}
            />
          )}
        ListHeaderComponent={
          data !== undefined ? (
            <SessionListHeader summary={data.summary} />
          ) : null
        }
        ListEmptyComponent={<SessionListEmptyState />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(bottom, 16) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d0d0d',
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  listContent: {
    flexGrow: 1,
  },
});
