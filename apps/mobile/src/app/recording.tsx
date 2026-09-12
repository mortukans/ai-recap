import { formatTimestamp } from '@ai-recap/core';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useRecording } from '../features/recording/useRecording';
import { processingCoordinator } from '../processing/coordinator';

export default function RecordingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { status, seconds, error, start, pause, resume, finish } = useRecording();

  // Auto-start when the screen opens.
  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPaused = status === 'paused';
  const isActive = status === 'recording' || status === 'paused';

  const onFinish = async () => {
    const id = await finish();
    if (id) {
      void processingCoordinator.enqueue(id); // auto transcribe → recap (respects offline + BYOK key)
      router.replace({ pathname: '/recap/[id]', params: { id } });
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={styles.center}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: isPaused ? c.textSecondary : '#E5484D' }]} />
          <Text style={[styles.statusText, { color: c.textSecondary }]}>
            {isPaused ? t('recording.paused') : t('recording.recording')}
          </Text>
        </View>

        <Text style={[styles.timer, { color: c.text }]}>{formatTimestamp(seconds)}</Text>

        {error === 'permission' ? (
          <Text style={[styles.note, { color: '#E5484D' }]}>{t('recording.permissionNeeded')}</Text>
        ) : (
          <Text style={[styles.note, { color: c.textSecondary }]}>{t('recording.savedContinuously')}</Text>
        )}
        {error && error !== 'permission' ? <Text style={[styles.err, { color: '#E5484D' }]}>{error}</Text> : null}
      </View>

      <View style={styles.controls}>
        <Pressable
          disabled={!isActive}
          onPress={() => (isPaused ? resume() : pause())}
          style={[styles.secondary, { backgroundColor: c.backgroundElement, opacity: isActive ? 1 : 0.4 }]}>
          <Text style={[styles.secondaryText, { color: c.text }]}>
            {isPaused ? t('recording.resume') : t('recording.pause')}
          </Text>
        </Pressable>
        <Pressable onPress={onFinish} style={[styles.primary, { backgroundColor: '#208AEF' }]}>
          <Text style={styles.primaryText}>{t('recording.finish')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  timer: { fontSize: 64, fontWeight: '200', fontVariant: ['tabular-nums'] },
  note: { fontSize: 14 },
  err: { fontSize: 12, marginTop: Spacing.two, paddingHorizontal: Spacing.four, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.four },
  secondary: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 17, fontWeight: '600' },
  primary: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
