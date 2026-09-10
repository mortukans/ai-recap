import { DEFAULT_SETTINGS, NO_ENTITLEMENTS, resolveCapabilities } from '@ai-recap/core';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

function Row({ label, value, color, secondary }: { label: string; value: string; color: string; secondary: string }) {
  return (
    <View style={[styles.row, { borderBottomColor: secondary }]}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: secondary }]}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const caps = resolveCapabilities(NO_ENTITLEMENTS);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{t('settings.title')}</Text>

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.plan')}</Text>
        <Row label={t('settings.plan')} value={t('settings.planFree')} color={c.text} secondary={c.backgroundElement} />
        <Row
          label="Max recording"
          value={`${caps.maxRecordingMinutes} min`}
          color={c.text}
          secondary={c.backgroundElement}
        />
        <Row
          label="Recaps / day"
          value={caps.maxRecapsPerDay === null ? '∞' : String(caps.maxRecapsPerDay)}
          color={c.text}
          secondary={c.backgroundElement}
        />

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.recording')}</Text>
        <Row label={t('settings.language')} value={t('settings.languageAuto')} color={c.text} secondary={c.backgroundElement} />
        <Row
          label={t('settings.chunkDuration')}
          value={`${DEFAULT_SETTINGS.chunkDurationSeconds}s`}
          color={c.text}
          secondary={c.backgroundElement}
        />
        <Row
          label={t('settings.audioQuality')}
          value={DEFAULT_SETTINGS.audioQuality}
          color={c.text}
          secondary={c.backgroundElement}
        />

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.about')}</Text>
        <Row label="Version" value={Constants.expoConfig?.version ?? '0.0.1'} color={c.text} secondary={c.backgroundElement} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.six },
  h1: { fontSize: 28, fontWeight: '700' },
  section: {
    marginTop: Spacing.four,
    marginBottom: Spacing.one,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16 },
});
