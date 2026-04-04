import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';

// バックグラウンドタスクはモジュール import の副作用として登録される
// アプリが OS により再起動された際もタスク定義が復元されるよう、
// ルートレイアウトで必ず import する
import '../tasks/location-task';

import tamaguiConfig from '../tamagui.config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5_000,
    },
  },
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 車・バイクでの夜間使用を想定し、デバイス設定に関わらず常にダークテーマで表示 */}
      <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
        <ThemeProvider value={DarkTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </TamaguiProvider>
    </QueryClientProvider>
  );
}
