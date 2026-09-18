import { DEFAULT_SETTINGS } from '@ai-recap/core';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { DEFAULT_SUMMARY_MODEL, DEFAULT_TRANSCRIPTION_MODEL, type LlmModel, getByokLLMProvider } from '../../ai';
import { ModelPicker } from '../../features/settings/ModelPicker';
import { useCapabilities } from '../../purchases/useCapabilities';
import {
  clearOpenAiKey,
  clearOpenRouterKey,
  getOpenAiKey,
  getOpenRouterKey,
  setOpenAiKey,
  setOpenRouterKey,
} from '../../security/byok-store';
import {
  applyAudioRetention,
  deleteAllRecordings,
  formatBytes,
  getAudioStorageBytes,
} from '../../features/storage/audioStorage';
import {
  getAudioRetentionDays,
  getSummaryModel,
  getTranscriptionModel,
  setAudioRetentionDays,
  setSummaryModel,
  setTranscriptionModel,
} from '../../lib/prefs';

const RETENTION_OPTIONS: { label: string; days: number | null }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Forever', days: null },
];

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
  const router = useRouter();
  const caps = useCapabilities();
  const planName = caps.maxRecapsPerDay === null ? 'Unlimited' : caps.byokEnabled ? 'BYOK lifetime' : t('settings.planFree');

  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(DEFAULT_SUMMARY_MODEL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [openAiInput, setOpenAiInput] = useState('');
  const [transcriptionModel, setTranscriptionModelState] = useState(DEFAULT_TRANSCRIPTION_MODEL);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [picker, setPicker] = useState<'summary' | 'transcription' | null>(null);
  const [audioBytes, setAudioBytes] = useState<number | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);

  const refreshStorage = async () => setAudioBytes(await getAudioStorageBytes());

  const onRetention = async (days: number | null) => {
    setRetentionDays(days);
    await setAudioRetentionDays(days);
    await applyAudioRetention();
    await refreshStorage();
  };

  const onDeleteAll = () => {
    Alert.alert(
      'Delete all recordings?',
      'Every recording, transcript and recap on this device will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            void deleteAllRecordings().then(refreshStorage);
          },
        },
      ],
    );
  };

  // Live model list from OpenRouter (only when a key exists); feeds the pickers.
  const loadModels = async () => {
    try {
      setModels(await getByokLLMProvider().availableModels());
    } catch {
      setModels([]);
    }
  };

  useEffect(() => {
    (async () => {
      const keyPresent = (await getOpenRouterKey()) !== null;
      setHasKey(keyPresent);
      setModel((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
      setTranscriptionModelState((await getTranscriptionModel()) ?? DEFAULT_TRANSCRIPTION_MODEL);
      setHasOpenAiKey((await getOpenAiKey()) !== null);
      setRetentionDays(await getAudioRetentionDays());
      void refreshStorage();
      if (keyPresent) void loadModels();
    })();
  }, []);

  const onSaveOpenAi = async () => {
    if (openAiInput.trim()) {
      await setOpenAiKey(openAiInput.trim());
      setHasOpenAiKey(true);
      setOpenAiInput('');
    }
  };

  const onClearOpenAi = async () => {
    await clearOpenAiKey();
    setHasOpenAiKey(false);
  };

  const onSave = async () => {
    if (keyInput.trim()) {
      await setOpenRouterKey(keyInput.trim());
      setHasKey(true);
      setKeyInput('');
    }
    await setSummaryModel(model);
    await setTranscriptionModel(transcriptionModel || DEFAULT_TRANSCRIPTION_MODEL);
    setTestResult(null);
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const list = await getByokLLMProvider().availableModels();
      setModels(list);
      setTestResult(list.length > 0 ? `OK — ${list.length} models available` : 'No models returned');
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const onClear = async () => {
    await clearOpenRouterKey();
    setHasKey(false);
    setTestResult(null);
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{t('settings.title')}</Text>

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.plan')}</Text>
        <Pressable onPress={() => router.push('/paywall')}>
          <Row label={t('settings.plan')} value={planName + '  ›'} color={c.text} secondary={c.backgroundElement} />
        </Pressable>
        <Row label="Max recording" value={`${caps.maxRecordingMinutes} min`} color={c.text} secondary={c.backgroundElement} />
        <Row
          label="Recaps / day"
          value={caps.maxRecapsPerDay === null ? '∞' : String(caps.maxRecapsPerDay)}
          color={c.text}
          secondary={c.backgroundElement}
        />

        <Text style={[styles.section, { color: c.textSecondary }]}>OpenRouter (BYOK)</Text>
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          {hasKey ? 'A key is saved on this device (in the keychain).' : 'Paste your OpenRouter API key (sk-or-…). It stays on-device and is sent only to OpenRouter.'}
        </Text>
        <TextInput
          placeholder={hasKey ? '•••••••••••• (saved)' : 'sk-or-...'}
          placeholderTextColor={c.textSecondary}
          value={keyInput}
          onChangeText={setKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
        />
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Summary model</Text>
        <View style={styles.fieldRow}>
          <TextInput
            placeholder="e.g. openai/gpt-4o-mini"
            placeholderTextColor={c.textSecondary}
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.fieldInput, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
          <Pressable
            onPress={() => setPicker('summary')}
            disabled={models.length === 0}
            style={[styles.choose, { backgroundColor: c.backgroundSelected, opacity: models.length === 0 ? 0.4 : 1 }]}>
            <Text style={[styles.chooseText, { color: c.text }]}>Choose</Text>
          </Pressable>
        </View>
        <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Transcription model (audio-capable)</Text>
        <View style={styles.fieldRow}>
          <TextInput
            placeholder={`e.g. ${DEFAULT_TRANSCRIPTION_MODEL}`}
            placeholderTextColor={c.textSecondary}
            value={transcriptionModel}
            onChangeText={setTranscriptionModelState}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.fieldInput, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
          <Pressable
            onPress={() => setPicker('transcription')}
            disabled={models.length === 0}
            style={[styles.choose, { backgroundColor: c.backgroundSelected, opacity: models.length === 0 ? 0.4 : 1 }]}>
            <Text style={[styles.chooseText, { color: c.text }]}>Choose</Text>
          </Pressable>
        </View>
        <ModelPicker
          visible={picker !== null}
          title={picker === 'transcription' ? 'Transcription model' : 'Summary model'}
          models={models}
          selectedId={picker === 'transcription' ? transcriptionModel : model}
          requireModality={picker === 'transcription' ? 'audio' : undefined}
          palette={c}
          onSelect={(id) => (picker === 'transcription' ? setTranscriptionModelState(id) : setModel(id))}
          onClose={() => setPicker(null)}
        />
        <View style={styles.buttonRow}>
          <Pressable onPress={onSave} style={[styles.btn, { backgroundColor: '#208AEF' }]}>
            <Text style={styles.btnText}>Save</Text>
          </Pressable>
          <Pressable onPress={onTest} disabled={testing} style={[styles.btn, { backgroundColor: c.backgroundSelected }]}>
            {testing ? <ActivityIndicator color={c.text} /> : <Text style={[styles.btnText, { color: c.text }]}>Test connection</Text>}
          </Pressable>
        </View>
        {hasKey ? (
          <Pressable onPress={onClear} style={styles.clear}>
            <Text style={[styles.clearText, { color: '#E5484D' }]}>Remove key</Text>
          </Pressable>
        ) : null}
        {testResult ? <Text style={[styles.hint, { color: c.textSecondary }]}>{testResult}</Text> : null}

        <Text style={[styles.section, { color: c.textSecondary }]}>Transcription (OpenAI Whisper)</Text>
        <Text style={[styles.hint, { color: c.textSecondary }]}>
          {hasOpenAiKey
            ? 'An OpenAI key is saved — recordings transcribe with Whisper (handles Latvian + English).'
            : hasKey
              ? 'Optional. Recordings already transcribe through your OpenRouter key (model above). Add an OpenAI key only if you prefer Whisper.'
              : 'Optional. With an OpenRouter key above, transcription runs through it too. Without any key, recordings use Apple on-device speech.'}
        </Text>
        <TextInput
          placeholder={hasOpenAiKey ? '•••••••••••• (saved)' : 'sk-...'}
          placeholderTextColor={c.textSecondary}
          value={openAiInput}
          onChangeText={setOpenAiInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
        />
        <View style={styles.buttonRow}>
          <Pressable onPress={onSaveOpenAi} style={[styles.btn, { backgroundColor: '#208AEF' }]}>
            <Text style={styles.btnText}>Save</Text>
          </Pressable>
          {hasOpenAiKey ? (
            <Pressable onPress={onClearOpenAi} style={[styles.btn, { backgroundColor: c.backgroundSelected }]}>
              <Text style={[styles.btnText, { color: c.text }]}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.section, { color: c.textSecondary }]}>{t('settings.recording')}</Text>
        <Row label={t('settings.language')} value={t('settings.languageAuto')} color={c.text} secondary={c.backgroundElement} />
        <Row label={t('settings.chunkDuration')} value={`${DEFAULT_SETTINGS.chunkDurationSeconds}s`} color={c.text} secondary={c.backgroundElement} />
        <Row label={t('settings.audioQuality')} value={DEFAULT_SETTINGS.audioQuality} color={c.text} secondary={c.backgroundElement} />

        <Text style={[styles.section, { color: c.textSecondary }]}>Storage & privacy</Text>
        <Row
          label="Audio on this device"
          value={audioBytes === null ? '…' : formatBytes(audioBytes)}
          color={c.text}
          secondary={c.backgroundElement}
        />
        <Text style={[styles.hint, { color: c.textSecondary, marginTop: Spacing.two }]}>
          Keep audio after processing. Transcripts and recaps are always kept.
        </Text>
        <View style={styles.chipRow}>
          {RETENTION_OPTIONS.map((opt) => {
            const selected = opt.days === retentionDays;
            return (
              <Pressable
                key={opt.label}
                onPress={() => void onRetention(opt.days)}
                style={[styles.chip, { backgroundColor: selected ? '#208AEF' : c.backgroundElement }]}>
                <Text style={[styles.chipText, { color: selected ? '#fff' : c.text }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={onDeleteAll} style={styles.clear}>
          <Text style={[styles.clearText, { color: '#E5484D' }]}>Delete all recordings, transcripts and recaps</Text>
        </Pressable>

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
  hint: { fontSize: 13, lineHeight: 19, marginBottom: Spacing.two },
  input: { height: 44, borderRadius: 12, paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', gap: Spacing.two },
  fieldInput: { flex: 1 },
  choose: { height: 44, borderRadius: 12, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  chooseText: { fontSize: 14, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  clear: { paddingVertical: Spacing.two },
  clearText: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16 },
});
