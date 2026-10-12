/**
 * Live Rewind (beta). Keep the last ~60 s of audio while you listen, and save it as a recap the moment
 * you realize you want it. The mic is on while listening (iOS shows its own indicator too); nothing is
 * kept beyond the rolling minute until you tap Save. See features/rewind/liveRewind.ts.
 */
import { Stack, useRouter } from 'expo-router';
import { useEffect, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VoiceHalo } from '../design/LiveWaveform';
import { Button, LiveIndicator } from '../design/components';
import { Layout } from '../design/tokens';
import { Type } from '../design/typography';
import { useTheme } from '../design/useTheme';
import { captureRewind, onRewindChange, rewindState, startRewind, stopRewind } from '../features/rewind/liveRewind';

export default function LiveRewindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onRewindChange(() => force()), []);
  const { active, bufferedSeconds, level } = rewindState();
  const canSave = bufferedSeconds >= 3;

  const onStart = async () => {
    const ok = await startRewind();
    if (!ok) Alert.alert(t('rewind.micDeniedTitle'), t('rewind.micDeniedBody'));
  };
  const onSave = async () => {
    const id = await captureRewind();
    if (id) router.replace({ pathname: '/recap/[id]', params: { id } });
    else router.back();
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('rewind.title') }} />
      <View style={styles.content}>
        <View style={styles.beta}>
          <Text style={[Type.captionStrong, { color: th.accentText }]}>{t('rewind.beta')}</Text>
        </View>
        <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center' }]}>{t('rewind.explainer')}</Text>

        <View style={styles.stage}>
          {active ? <VoiceHalo level={level} active size={300} /> : null}
          <View style={styles.center} pointerEvents="none">
            {active ? (
              <>
                <Text style={[Type.heroNumber, { color: th.accentText }]}>{Math.round(bufferedSeconds)}s</Text>
                <Text style={[Type.caption, { color: th.text2 }]}>{t(bufferedSeconds >= 60 ? 'rewind.full' : 'rewind.buffering')}</Text>
              </>
            ) : (
              <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center', maxWidth: 240 }]}>{t('rewind.idle')}</Text>
            )}
          </View>
        </View>

        <View style={styles.indicator}>{active ? <LiveIndicator label={t('rewind.listening')} /> : null}</View>

        <View style={styles.actions}>
          {active ? (
            <>
              <Button label={t('rewind.save')} height={56} icon="check" disabled={!canSave} onPress={() => void onSave()} />
              <Button label={t('rewind.stop')} variant="secondary" onPress={() => void stopRewind()} />
            </>
          ) : (
            <Button label={t('rewind.start')} height={56} icon="mic" onPress={() => void onStart()} />
          )}
        </View>

        <Text style={[Type.caption, { color: th.text2, textAlign: 'center' }]}>{t('rewind.micNote')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Layout.screenPadding, paddingTop: 16, paddingBottom: 24, gap: 16, alignItems: 'center' },
  beta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 4 },
  indicator: { height: 24, justifyContent: 'center' },
  actions: { width: '100%', gap: 12 },
});
