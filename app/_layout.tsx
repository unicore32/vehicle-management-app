import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';

// バックグラウンドタスクはモジュール import の副作用として登録される
// アプリが OS により再起動された際もタスク定義が復元されるよう、
// ルートレイアウトで必ず import する
import { installAppLogCapture } from '../lib/app-log-capture';
import '../tasks/location-task';

import tamaguiConfig from '../tamagui.config';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5_000,
    },
  },
});

export default function RootLayout() {
  const pathname = usePathname();
  const isRecordingScreen = pathname === '/' || pathname === '/index';

  useEffect(() => {
    installAppLogCapture();
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    NavigationBar.setStyle('light');
    SystemUI.setBackgroundColorAsync('#081420').catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
          <ThemeProvider value={DarkTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen
                name="sessions/index"
                options={{ headerShown: true, title: 'セッション一覧' }}
              />
              <Stack.Screen name="settings" />
              {/* Phase 4: セッション詳細 */}
              <Stack.Screen
                name="session/[id]"
                options={{ headerShown: true, title: 'セッション詳細' }}
              />
            </Stack>
            <StatusBar style={isRecordingScreen ? 'dark' : 'light'} />
          </ThemeProvider>
        </TamaguiProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
