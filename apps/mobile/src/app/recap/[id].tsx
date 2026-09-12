import { type RecapDocument, formatDuration, isAiRecapError, parseRecapDocument } from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { DEFAULT_SUMMARY_MODEL, generateRecap, getByokLLMProvider } from '../../ai';
import { artifactsRepo, contextsRepo, recapsRepo, segmentsRepo } from '../../db';
import { RecapDocumentView } from '../../features/recap/RecapDocumentView';
import { ensureTranscript } from '../../features/recap/ensureTranscript';
import { getSummaryModel } from '../../lib/prefs';

function parseArtifactContent(content: string): RecapDocument | null {
  try {
    return parseRecapDocument(JSON.parse(content));
  } catch {
    return null;
  }
}

export default function RecapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [title, setTitle] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [status, setStatus] = useState('recorded');
  const [segmentCount, setSegmentCount] = useState(0);
  const [doc, setDoc] = useState<RecapDocument | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const recap = await recapsRepo.getRecap(id);
      if (recap) {
        setTitle(recap.title);
        setDurationSeconds(recap.durationSeconds);
        setStatus(recap.status);
      }
      setSegmentCount((await segmentsRepo.listSegments(id)).length);
      const latest = await artifactsRepo.latestArtifactOfType(id, 'summary');
      setDoc(latest ? parseArtifactContent(latest.content) : null);
    } catch {
      /* db not ready */
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onGenerate = useCallback(async () => {
    if (!id) return;
    setError(null);
    setGenerating(true);
    try {
      // DEMO: synthesize a transcript if none exists yet (real transcription lands in M2).
      const segments = await ensureTranscript(id);

      const context =
        (await contextsRepo.getContext(presetContextId('workMeeting'))) ?? null;
      const model = (await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL;

      await recapsRepo.updateRecapStatus(id, 'summarizing');
      const { doc: generated } = await generateRecap({
        recapId: id,
        meta: {
          title: title || undefined,
          detectedLanguages: ['lv', 'en'],
          durationSeconds,
          speakers: [...new Set(segments.map((s) => s.speakerLabel).filter(Boolean))] as string[],
        },
        context,
        transcript: segments,
        provider: getByokLLMProvider(),
        model,
      });

      if (!title && generated.title) {
        await recapsRepo.updateRecap(id, { title: generated.title });
        setTitle(generated.title);
      }
      await recapsRepo.updateRecapStatus(id, 'ready');
      await load();
    } catch (e) {
      if (isAiRecapError(e) && e.code === 'llm/missing-key') {
        setError('Set your OpenRouter key in Settings first, then try again.');
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      await recapsRepo.updateRecapStatus(id, 'transcribed').catch(() => undefined);
    } finally {
      setGenerating(false);
    }
  }, [id, title, durationSeconds, load]);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{title || t('app.name')}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>
          {formatDuration(durationSeconds)} · {t(`status.${status}`)} · {segmentCount} segments
        </Text>

        {doc ? (
          <RecapDocumentView doc={doc} palette={c} />
        ) : (
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.cardText, { color: c.textSecondary }]}>
              Generate a structured recap from this meeting. (Demo: uses a sample Latvian+English
              transcript until on-device transcription lands in M2.)
            </Text>
          </View>
        )}

        {error ? <Text style={[styles.err, { color: '#E5484D' }]}>{error}</Text> : null}

        <Pressable
          disabled={generating}
          onPress={onGenerate}
          style={[styles.button, { backgroundColor: '#208AEF', opacity: generating ? 0.6 : 1 }]}>
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{doc ? 'Regenerate recap' : 'Generate recap'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: id ?? '' } })}
          style={[styles.button, { backgroundColor: c.backgroundSelected }]}>
          <Text style={[styles.buttonText, { color: c.text }]}>{t('chat.open')}</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/settings')} style={styles.link}>
          <Text style={[styles.linkText, { color: c.textSecondary }]}>Set OpenRouter key in Settings →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  h1: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 14 },
  card: { borderRadius: 16, padding: Spacing.four },
  cardText: { fontSize: 15, lineHeight: 22 },
  err: { fontSize: 13 },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  link: { alignItems: 'center', paddingVertical: Spacing.two },
  linkText: { fontSize: 14 },
});
