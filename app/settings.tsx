import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AutoPauseSettings } from '../components/gps/auto-pause-settings';
import { BackgroundBehaviorSettings } from '../components/gps/background-behavior-settings';
import { DebugSettings } from '../components/gps/debug-settings';
import { ExportSettings } from '../components/gps/export-settings';
import { GapDetectionSettings } from '../components/gps/gap-detection-settings';
import { RecordingIntervalSettings } from '../components/gps/recording-interval-settings';
import { VehicleManagementSettings } from '../components/gps/vehicle-management-settings';

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '設定' }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <RecordingIntervalSettings />
        <View style={styles.divider} />
        <VehicleManagementSettings />
        <View style={styles.divider} />
        <AutoPauseSettings />
        <View style={styles.divider} />
        <GapDetectionSettings />
        <View style={styles.divider} />
        <BackgroundBehaviorSettings />
        <View style={styles.divider} />
        <ExportSettings />
        <View style={styles.divider} />
        <DebugSettings />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    paddingBottom: 40,
  },
  divider: {
    height: 20,
  },
});
