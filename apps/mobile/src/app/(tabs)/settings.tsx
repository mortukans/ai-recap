import { DEFAULT_SETTINGS, NO_ENTITLEMENTS, resolveCapabilities } from '@ai-recap/core';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import { DEFAULT_SUMMARY_MODEL, getByokLLMProvider } from '../../ai';
import {
  clearOpenAiKey,
  clearOpenRouterKey,
  getOpenAiKey,
  getOpenRouterKey,
  setOpenAiKey,
  setOpenRouterKey,
} from '../../security/byok-store';
import { getSummaryModel, setSummaryModel } from '../../lib/prefs';

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

  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(DEFAULT_SUMMARY_MODEL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [openAiInput, setOpenAiInput] = useState('');

  useEffect(() => {
    (async () => {
      setHasKey((await getOpenRouterKey()) !== null);
      setModel((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
      setHasOpenAiKey((await getOpenAiKey()) !== null);
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
    setTestResult(null);
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const models = await getByokLLMProvider().availableModels();
      setTestResult(models.length > 0 ? `OK — ${models.length} models available` : 'No models returned');
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
        <Row label={t('settings.plan')} value={t('settings.planFree')} color={c.text} secondary={c.backgroundElement} />
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
        <TextInput
          placeholder="Summary model (e.g. openai/gpt-4o-mini)"
          placeholderTextColor={c.textSecondary}
          value={model}
          onChangeText={setModel}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: c.backgroundElement, color: c.text }]}
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
            : 'Optional. Add an OpenAI API key for Latvian/English transcription. Without it, recordings use Apple on-device speech.'}
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
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  clear: { paddingVertical: Spacing.two },
  clearText: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16 },
});
