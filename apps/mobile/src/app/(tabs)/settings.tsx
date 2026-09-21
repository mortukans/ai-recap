/**
 * Iestatījumi (HANDOFF.md §5.7): dark plan card with stat tiles, "AI modeļi · OpenRouter" group,
 * "Ierakstīšana" group, usage tiles, storage card with retention segmented control, destructive
 * delete, and About. Key management lives in sheets behind the key rows.
 */
import { DEFAULT_SETTINGS } from '@ai-recap/core';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { DEFAULT_SUMMARY_MODEL, DEFAULT_TRANSCRIPTION_MODEL, type LlmModel, getByokLLMProvider } from '../../ai';
import { supabase } from '../../api/supabase';
import { usageRepo } from '../../db';
import type { UsageSummary } from '../../db/repositories/usage';
import { Button, Card, Group, Input, Rise, Row, SectionLabel, Segmented } from '../../design/components';
import { startOfMonth } from '../../design/format';
import { Icon, LogoMark } from '../../design/icons';
import { Lottie } from '../../design/Lottie';
import { Sheet } from '../../design/Sheet';
import { BRAND, Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { ModelPicker } from '../../features/settings/ModelPicker';
import { applyAudioRetention, deleteAllRecordings, formatBytes, getAudioStorageBytes } from '../../features/storage/audioStorage';
import i18n, { resolveLanguage } from '../../i18n';
import {
  type AppLanguage,
  getAppLanguage,
  setAppLanguage,
  getAudioRetentionDays,
  getSummaryModel,
  getTranscriptionModel,
  setAudioRetentionDays,
  setSummaryModel,
  setTranscriptionModel,
} from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';
import { useCapabilities } from '../../purchases/useCapabilities';
import { clearOpenAiKey, clearOpenRouterKey, getOpenAiKey, getOpenRouterKey, setOpenAiKey, setOpenRouterKey } from '../../security/byok-store';

type Retention = '7' | '30' | '90' | 'always';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const th = useTheme();
  const legacy = Colors[th.scheme];
  const router = useRouter();
  const caps = useCapabilities();
  const planName = caps.maxRecapsPerDay === null ? 'Unlimited' : caps.byokEnabled ? 'BYOK' : t('ui.planFree');

  const [hasKey, setHasKey] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(DEFAULT_SUMMARY_MODEL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [openAiInput, setOpenAiInput] = useState('');
  const [transcriptionModel, setTranscriptionModelState] = useState(DEFAULT_TRANSCRIPTION_MODEL);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [picker, setPicker] = useState<'summary' | 'transcription' | null>(null);
  const [sheet, setSheet] = useState<'key' | 'whisper' | null>(null);
  const [audioBytes, setAudioBytes] = useState<number | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>('auto');

  const refreshStorage = useCallback(async () => setAudioBytes(await getAudioStorageBytes()), []);

  const loadModels = useCallback(async () => {
    try {
      const list = await getByokLLMProvider().availableModels();
      setModels(list);
      setKeyVerified(list.length > 0);
    } catch {
      setModels([]);
      setKeyVerified(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const keyPresent = (await getOpenRouterKey()) !== null;
      setHasKey(keyPresent);
      setModel((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
      setTranscriptionModelState((await getTranscriptionModel()) ?? DEFAULT_TRANSCRIPTION_MODEL);
      setHasOpenAiKey((await getOpenAiKey()) !== null);
      setRetentionDays(await getAudioRetentionDays());
      setAppLanguageState(await getAppLanguage());
      void refreshStorage();
      usageRepo.summarizeUsageSince(startOfMonth()).then(setUsage).catch(() => undefined);
      if (keyPresent) void loadModels();
    })();
    supabase.auth
      .getSession()
      .then(({ data }) => setAccountId(data.session?.user.id ?? null))
      .catch(() => setAccountId(null));
  }, [loadModels, refreshStorage]);

  const onRetention = async (value: Retention) => {
    const days = value === 'always' ? null : Number(value);
    setRetentionDays(days);
    await setAudioRetentionDays(days);
    await applyAudioRetention();
    await refreshStorage();
  };

  const onDeleteAll = () => {
    Alert.alert(t('ui.deleteAll'), t('home.deleteMessage'), [
      { text: t('ui.cancel'), style: 'cancel' },
      { text: t('home.delete'), style: 'destructive', onPress: () => void deleteAllRecordings().then(refreshStorage) },
    ]);
  };

  const onSaveKey = async () => {
    if (keyInput.trim()) {
      await setOpenRouterKey(keyInput.trim());
      setHasKey(true);
      setKeyInput('');
      void loadModels();
    }
    setSheet(null);
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const list = await getByokLLMProvider().availableModels();
      setModels(list);
      setKeyVerified(list.length > 0);
      setTestResult(list.length > 0 ? t('ui.testOk', { count: list.length }) : t('ui.noModels'));
    } catch (e) {
      setKeyVerified(false);
      setTestResult(e instanceof Error ? e.message : t('ui.connectionFailed'));
    } finally {
      setTesting(false);
    }
  };

  const onRemoveKey = async () => {
    await clearOpenRouterKey();
    setHasKey(false);
    setKeyVerified(false);
    setModels([]);
    setSheet(null);
  };

  const onSaveOpenAi = async () => {
    if (openAiInput.trim()) {
      await setOpenAiKey(openAiInput.trim());
      setHasOpenAiKey(true);
      setOpenAiInput('');
    }
    setSheet(null);
  };

  const onPickModel = async (id: string) => {
    if (picker === 'transcription') {
      setTranscriptionModelState(id);
      await setTranscriptionModel(id || DEFAULT_TRANSCRIPTION_MODEL);
    } else {
      setModel(id);
      await setSummaryModel(id);
    }
  };

  const retentionValue: Retention = retentionDays === null ? 'always' : (String(retentionDays) as Retention);
  const costEur = usage ? usage.estimatedCostMicros / 1_000_000 : 0;
  let rise = 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Rise index={rise++}>
          <Text style={[Type.screenTitle, { color: th.text }]}>{t('tabs.settings')}</Text>
        </Rise>

        {/* Plan card — ink in both themes. */}
        <Rise index={rise++}>
          <Pressable onPress={() => router.push('/paywall')} style={[styles.plan, th.shadows.float]}>
            <View style={styles.between}>
              <View style={{ gap: 2 }}>
                <Text style={[Type.meta, { color: '#A6A29B' }]}>{t('ui.plan')}</Text>
                <Text style={[Type.detailTitle, { color: BRAND.amber, fontFamily: 'Newsreader_400Regular' }]}>{planName}</Text>
              </View>
              <View style={{ width: 44, height: 44 }}>
                <Lottie name="logo-mark" style={{ width: 44, height: 44 }} />
              </View>
            </View>
            <View style={styles.tiles}>
              <View style={styles.planTile}>
                <Text style={[Type.body, { fontSize: 20, lineHeight: 24, fontFamily: 'HankenGrotesk_600SemiBold', color: BRAND.bone }]}>{caps.maxRecordingMinutes} min</Text>
                <Text style={[Type.caption, { color: '#A6A29B' }]}>{t('ui.maxDuration')}</Text>
              </View>
              <View style={styles.planTile}>
                <Text style={[Type.body, { fontSize: 20, lineHeight: 24, fontFamily: 'HankenGrotesk_600SemiBold', color: BRAND.bone }]}>
                  {caps.maxRecapsPerDay === null ? t('ui.noLimit') : String(caps.maxRecapsPerDay)}
                </Text>
                <Text style={[Type.caption, { color: '#A6A29B' }]}>{t('ui.perDay')}</Text>
              </View>
            </View>
          </Pressable>
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.general')}</SectionLabel>
          <Card style={{ gap: 10 }}>
            <Text style={[Type.body, { fontSize: 16, lineHeight: 20, color: th.text }]}>{t('ui.appLanguage')}</Text>
            <Segmented<AppLanguage>
              value={appLanguage}
              onChange={(v) => {
                setAppLanguageState(v);
                void setAppLanguage(v);
                void i18n.changeLanguage(resolveLanguage(v));
              }}
              options={[
                { value: 'auto', label: t('ui.langAuto') },
                { value: 'lv', label: t('ui.langLv') },
                { value: 'en', label: t('ui.langEn') },
              ]}
            />
          </Card>
          <Group>
            <Row
              title={t('ui.forceStop')}
              subtitle={t('ui.forceStopHint')}
              onPress={() => void processingCoordinator.forceStop()}
              right={<View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: th.record }} />}
              last
            />
          </Group>
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.aiModels')}</SectionLabel>
          <Group>
            <Row
              title={t('ui.ownKey')}
              subtitle={hasKey ? t('ui.keyInKeychain') : t('ui.keyNotAdded')}
              onPress={() => setSheet('key')}
              right={
                hasKey && keyVerified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="check" size={14} color={th.success} strokeWidth={2.5} />
                    <Text style={[Type.metaStrong, { color: th.success }]}>{t('ui.connected')}</Text>
                  </View>
                ) : !hasKey ? (
                  <Text style={[Type.buttonMini, { color: th.accentText }]}>{t('ui.add')}</Text>
                ) : undefined
              }
              chevron={hasKey && !keyVerified}
            />
            <Row title={t('ui.summary')} subtitle={model} onPress={() => (hasKey ? setPicker('summary') : setSheet('key'))} chevron />
            <Row
              title={t('settings.transcriptionModel').split(' (')[0] ?? 'Transcription'}
              subtitle={`${transcriptionModel} · ${t('ui.withAudio')}`}
              onPress={() => (hasKey ? setPicker('transcription') : setSheet('key'))}
              chevron
            />
            <Row
              title={t('ui.whisper')}
              subtitle={hasOpenAiKey ? t('ui.optionalAdded') : t('ui.optionalNotAdded')}
              onPress={() => setSheet('whisper')}
              right={<Text style={[Type.buttonMini, { color: th.accentText }]}>{hasOpenAiKey ? t('ui.more') : t('ui.add')}</Text>}
              last
            />
          </Group>
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.recordingSection')}</SectionLabel>
          <Group>
            <Row title={t('ui.language')} value={t('ui.languageAuto')} chevron />
            <Row title={t('ui.chunkLength')} value={`${DEFAULT_SETTINGS.chunkDurationSeconds} s`} chevron />
            <Row title={t('ui.audioQuality')} value={t('ui.standard')} chevron last />
          </Group>
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.usage')}</SectionLabel>
          <View style={styles.tiles}>
            <Card style={styles.tile}>
              <Text style={[Type.tileNumber, { color: th.text }]}>{usage ? Math.round(usage.recordingSeconds / 60) : '…'}</Text>
              <Text style={[Type.caption, { color: th.text2 }]}>{t('ui.minRecorded')}</Text>
            </Card>
            <Card style={styles.tile}>
              <Text style={[Type.tileNumber, { color: th.text }]}>{usage ? `${((usage.inputTokens + usage.outputTokens) / 1000).toFixed(1)}k` : '…'}</Text>
              <Text style={[Type.caption, { color: th.text2 }]}>{t('ui.aiTokens')}</Text>
            </Card>
            <Card style={styles.tile}>
              <Text style={[Type.tileNumber, { color: th.accentText }]}>{usage ? `€${costEur.toFixed(2)}` : '…'}</Text>
              <Text style={[Type.caption, { color: th.text2 }]}>{t('ui.ownKeyCost')}</Text>
            </Card>
          </View>
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.storage')}</SectionLabel>
          <Card style={{ gap: 14 }}>
            <View style={styles.between}>
              <Text style={[Type.body, { fontSize: 16, lineHeight: 20, color: th.text }]}>{t('ui.audioOnDevice')}</Text>
              <Text style={[Type.input15, { color: th.text2 }]}>{audioBytes === null ? '…' : formatBytes(audioBytes)}</Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.retentionHint')}</Text>
              <Segmented<Retention>
                value={retentionValue}
                onChange={(v) => void onRetention(v)}
                options={[
                  { value: '7', label: t('ui.days', { n: 7 }) },
                  { value: '30', label: t('ui.days', { n: 30 }) },
                  { value: '90', label: t('ui.days', { n: 90 }) },
                  { value: 'always', label: t('ui.always') },
                ]}
              />
            </View>
          </Card>
          <Button label={t('ui.deleteAll')} variant="destructive" height={48} onPress={onDeleteAll} textStyle={Type.buttonSmall} />
        </Rise>

        <Rise index={rise++} style={{ gap: 8 }}>
          <SectionLabel>{t('ui.about')}</SectionLabel>
          <Group>
            <Row title={t('settings.version')} value={`${Constants.expoConfig?.version ?? '0.0.1'} (${Constants.nativeBuildVersion ?? '-'})`} />
            <Row title={t('settings.accountId')} subtitle={accountId ?? '—'} last />
          </Group>
          <Text style={[Type.caption, { color: th.text2, paddingHorizontal: 2 }]}>{t('settings.accountIdHint')}</Text>
          <View style={{ alignItems: 'center', paddingTop: 12, gap: 6 }}>
            <LogoMark size={28} dot={th.record} />
            <Text style={[Type.caption, { color: th.text3 }]}>AI Recap</Text>
          </View>
        </Rise>
      </ScrollView>

      <ModelPicker
        visible={picker !== null}
        title={picker === 'transcription' ? t('settings.transcriptionModel') : t('settings.summaryModel')}
        models={models}
        selectedId={picker === 'transcription' ? transcriptionModel : model}
        requireModality={picker === 'transcription' ? 'audio' : undefined}
        palette={legacy}
        onSelect={(mid) => void onPickModel(mid)}
        onClose={() => setPicker(null)}
      />

      <Sheet visible={sheet === 'key'} onClose={() => setSheet(null)} title={t('ui.keySheetTitle')}>
        <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.keySheetText')}</Text>
        <Input
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder={hasKey ? t('settings.keySavedPlaceholder') : 'sk-or-...'}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        {testResult ? <Text style={[Type.meta, { color: th.text2 }]}>{testResult}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label={t('ui.save')} height={48} flex={1} onPress={() => void onSaveKey()} disabled={!keyInput.trim() && !hasKey} />
          {hasKey ? (
            <Pressable onPress={() => void onTest()} disabled={testing} style={[styles.secondaryBtn, { backgroundColor: th.surface, borderColor: th.line }]}>
              {testing ? <ActivityIndicator color={th.text} /> : <Text style={[Type.buttonSmall, { color: th.text }]}>{t('ui.testConnection')}</Text>}
            </Pressable>
          ) : null}
        </View>
        {hasKey ? <Button label={t('ui.removeKey')} variant="destructive" height={44} onPress={() => void onRemoveKey()} /> : null}
      </Sheet>

      <Sheet visible={sheet === 'whisper'} onClose={() => setSheet(null)} title={t('ui.whisper')}>
        <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.whisperSheetText')}</Text>
        <Input
          value={openAiInput}
          onChangeText={setOpenAiInput}
          placeholder={hasOpenAiKey ? t('settings.keySavedPlaceholder') : 'sk-...'}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Button label={t('ui.save')} height={48} onPress={() => void onSaveOpenAi()} disabled={!openAiInput.trim()} />
        {hasOpenAiKey ? (
          <Button
            label={t('ui.removeKey')}
            variant="destructive"
            height={44}
            onPress={() => {
              void clearOpenAiKey().then(() => setHasOpenAiKey(false));
              setSheet(null);
            }}
          />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: Layout.tabBarClearance, gap: 22 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plan: { backgroundColor: '#16181D', borderRadius: 20, padding: 18, gap: 14, overflow: 'hidden' },
  tiles: { flexDirection: 'row', gap: 10 },
  planTile: { flex: 1, gap: 2, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  tile: { flex: 1, gap: 4, padding: 14, borderRadius: 16 },
  secondaryBtn: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
