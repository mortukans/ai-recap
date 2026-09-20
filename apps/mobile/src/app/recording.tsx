/**
 * Ieraksta — the recording screen (HANDOFF.md §5.2). Live indicator + context chip on top, the big
 * Newsreader timer with an amber halo, a live waveform, chunk/language line, Pauzēt + Pabeigt.
 */
import { formatTimestamp, recordingLimitState } from '@ai-recap/core';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { contextsRepo } from '../db';
import { Button, Chip, Dot, LiveIndicator } from '../design/components';
import { Lottie } from '../design/Lottie';
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
  const { status, seconds, error, start, pause, resume, finish, chunkCount, contextId, setContext } = useRecording();
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
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]}>
      {/* Soft amber halo behind the timer. */}
      <View pointerEvents="none" style={styles.halo}>
        <Lottie name="halo-breathe" style={{ width: 400, height: 400, opacity: isPaused ? 0.06 : 0.12 }} play={!isPaused} />
      </View>

      <View style={styles.top}>
        <LiveIndicator label={isPaused ? t('recording.paused') : t('recording.recording')} />
        <Chip label={contextName || t('contexts.selectLabel')} chevron size="md" onPress={() => setPickerOpen(true)} />
      </View>

      <View style={styles.center}>
        <View style={{ alignItems: 'center', gap: 6 }}>
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
          <Lottie name="waveform-live" style={{ width: 350, height: 120 }} play={status === 'recording'} />
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
  halo: { position: 'absolute', left: 0, right: 0, top: '28%', alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  wave: { height: 120, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  controls: { flexDirection: 'row', gap: 12 },
});
