/**
 * Ieraksta — the recording screen (HANDOFF.md §5.2). Live indicator + context chip on top, the big
 * Newsreader timer with an amber halo, a live waveform, chunk/language line, Pauzēt + Pabeigt.
 */
import { formatTimestamp, recordingLimitState } from '@ai-recap/core';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { contextsRepo } from '../db';
import { Button, Chip, Dot, IconButton, LiveIndicator } from '../design/components';
import { LiveWaveform, VoiceHalo } from '../design/LiveWaveform';
import { Layout } from '../design/tokens';
import { Type } from '../design/typography';
import { useTheme } from '../design/useTheme';
import { ContextPicker } from '../features/contexts/ContextPicker';
import { useRecording } from '../features/recording/useRecording';
import { registerRecordingControls } from '../features/recording/watchBridge';
import { processingCoordinator } from '../processing/coordinator';
import { useCapabilities } from '../purchases/useCapabilities';

export default function RecordingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();
  useKeepAwake();
  const { status, seconds, error, start, pause, resume, finish, cancel, chunkCount, contextId, setContext, level } = useRecording();
  const insets = useSafeAreaInsets();
  const caps = useCapabilities();
  const limit = recordingLimitState(seconds, caps.maxRecordingMinutes);
  const autoStopped = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contextName, setContextName] = useState<string>('');

  useEffect(() => {
    void start(caps.maxRecordingMinutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!contextId) {
      setContextName('');
      return;
    }
    contextsRepo
      .getContext(contextId)
      .then((c) => setContextName(c?.name ?? ''))
      .catch(() => setContextName(''));
  }, [contextId]);

  const isPaused = status === 'paused';
  const isActive = status === 'recording' || status === 'paused';

  const onFinish = async () => {
    const id = await finish();
    if (id) {
      void processingCoordinator.enqueue(id);
      router.replace({ pathname: '/recap/[id]', params: { id } });
    } else {
      router.back();
    }
  };

  const onCancel = () => {
    Alert.alert(t('ui.discardTitle'), t('ui.discardMessage'), [
      { text: t('ui.cancel'), style: 'cancel' },
      {
        text: t('ui.discard'),
        style: 'destructive',
        onPress: () => {
          void cancel().then(() => router.back());
        },
      },
    ]);
  };

  useEffect(() => {
    registerRecordingControls({ pause, resume, finish: onFinish });
    return () => registerRecordingControls(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pause, resume, status]);

  useEffect(() => {
    if (limit.shouldStop && !autoStopped.current && isActive) {
      autoStopped.current = true;
      void onFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit.shouldStop, isActive]);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg, paddingTop: Math.max(insets.top, 20) + 8 }]} edges={['bottom']}>
      {/* Soft amber halo behind the timer. */}
      <View pointerEvents="none" style={styles.halo}>
        <VoiceHalo level={level} active={status === 'recording'} size={380} />
      </View>

      <View style={styles.top}>
        <IconButton name="close" accessibilityLabel={t('ui.discard')} onPress={onCancel} style={{ marginLeft: -10 }} strokeWidth={2} />
        <Chip label={contextName || t('contexts.selectLabel')} chevron size="md" onPress={() => setPickerOpen(true)} />
      </View>

      <View style={styles.center}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <LiveIndicator label={isPaused ? t('recording.paused') : t('recording.recording')} />
          <Text style={[Type.timer, { color: th.text }]} maxFontSizeMultiplier={1}>
            {formatTimestamp(seconds)}
          </Text>
          {limit.warn || limit.strongWarn ? (
            <Text style={[Type.metaStrong, { color: limit.strongWarn ? th.record : th.accentText }]}>
              {t('free.limitIn', { time: formatTimestamp(limit.remainingSeconds) })}
            </Text>
          ) : (
            <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.ofMaxContinuous', { min: caps.maxRecordingMinutes })}</Text>
          )}
        </View>

        <View style={styles.wave}>
          <LiveWaveform level={level} active={status === 'recording'} width={350} height={120} />
        </View>

        <View style={styles.meta}>
          <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.fragmentsSent', { count: chunkCount })}</Text>
          <Dot size={4} />
          <Text style={[Type.meta, { color: th.text2 }]}>LV + EN</Text>
        </View>

        {error === 'permission' ? (
          <Text style={[Type.meta, { color: th.record, textAlign: 'center' }]}>{t('recording.permissionNeeded')}</Text>
        ) : error ? (
          <Text style={[Type.caption, { color: th.record, textAlign: 'center', paddingHorizontal: 24 }]}>{error}</Text>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Button
          label={isPaused ? t('recording.resume') : t('recording.pause')}
          icon={isPaused ? 'play' : 'pause'}
          variant="secondary"
          height={64}
          flex={1}
          disabled={!isActive}
          onPress={() => void (isPaused ? resume() : pause())}
        />
        <Button label={t('recording.finish')} icon="stop" variant="primary" height={64} flex={1.4} onPress={() => void onFinish()} />
      </View>

      <ContextPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} selectedId={contextId} onSelect={(id) => void setContext(id)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: Layout.screenPadding, paddingBottom: 14 },
  halo: { position: 'absolute', left: 0, right: 0, top: '22%', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  wave: { height: 120, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  controls: { flexDirection: 'row', gap: 12 },
});
