import {
  AiRecapError,
  type Context,
  type IntegrityReport,
  type RecapDocument,
  checkRecordingIntegrity,
  formatDuration,
  formatRecapMarkdown,
  isAiRecapError,
  parseRecapDocument,
} from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { DEFAULT_SUMMARY_MODEL, generateRecap, resolveLLMRoute } from '../../ai';
import { artifactsRepo, attachmentsRepo, chunksRepo, contextsRepo, recapsRepo, segmentsRepo } from '../../db';
import { newId } from '../../lib/ids';
import { RecapDocumentView } from '../../features/recap/RecapDocumentView';
import { RecordingPlayer } from '../../features/recap/RecordingPlayer';
import { chunkUri } from '../../features/recap/audioUri';
import { ensureTranscript } from '../../features/recap/ensureTranscript';
import { MARKDOWN, exportTextFile, safeFilename, shareText } from '../../features/share/shareService';
import { getSummaryModel } from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';

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
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextId, setContextId] = useState<string | null>(null);
  const [playChunks, setPlayChunks] = useState<{ uri: string; duration: number }[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const recap = await recapsRepo.getRecap(id);
      if (recap) {
        setTitle(recap.title);
        setDurationSeconds(recap.durationSeconds);
        setStatus(recap.status);
        setProcessingError(processingCoordinator.getLastError(id));
      }
      setNotes((await attachmentsRepo.getNotes(id))?.extractedText ?? '');
      setContextId(recap?.contextId ?? null);
      setContexts(await contextsRepo.listContexts());
      setSegmentCount((await segmentsRepo.listSegments(id)).length);
      const chunks = await chunksRepo.listChunks(id);
      setPlayChunks(chunks.map((ch) => ({ uri: chunkUri(id, ch.relativePath), duration: ch.duration })));
      setIntegrity(recap && recap.status !== 'recording' ? checkRecordingIntegrity(chunks, recap.durationSeconds) : null);
      const latest = await artifactsRepo.latestArtifactOfType(id, 'summary');
      setDoc(latest ? parseArtifactContent(latest.content) : null);
    } catch {
      /* db not ready */
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live-refresh as the coordinator advances this recap (transcribing → ready) in the background.
  useEffect(() => processingCoordinator.onChange(() => void load()), [load]);

  const selectContext = useCallback(
    async (ctxId: string) => {
      if (!id) return;
      setContextId(ctxId);
      await recapsRepo.updateRecap(id, { contextId: ctxId });
    },
    [id],
  );

  // Notes (agenda, participants…) are stored as an inline text attachment and fed to generation.
  const saveNotes = useCallback(async () => {
    if (!id) return;
    await attachmentsRepo.setNotes(id, notes, newId);
    setNotesSaved(notes.trim().length > 0);
  }, [id, notes]);

  const onRetry = useCallback(() => {
    if (id) void processingCoordinator.retry(id);
  }, [id]);

  const isFailed = status === 'transcriptionFailed' || status === 'summaryFailed';
  const isBusy = status === 'transcribing' || status === 'summarizing';

  const onShare = useCallback(async () => {
    if (doc) await shareText(formatRecapMarkdown(doc, { title }), title || undefined);
  }, [doc, title]);

  const onExportMd = useCallback(async () => {
    if (doc) {
      await exportTextFile(`${safeFilename(title)}.md`, formatRecapMarkdown(doc, { title }), MARKDOWN.mime, MARKDOWN.uti);
    }
  }, [doc, title]);

  const onGenerate = useCallback(async () => {
    if (!id) return;
    setError(null);
    setGenerating(true);
    try {
      // DEMO: synthesize a transcript if none exists yet (real transcription lands in M2).
      const segments = await ensureTranscript(id);

      const context =
        (await contextsRepo.getContext(contextId ?? presetContextId('workMeeting'))) ?? null;
      const route = await resolveLLMRoute((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
      if (!route) throw new AiRecapError({ code: 'llm/missing-key', message: 'No LLM available.' });
      await attachmentsRepo.setNotes(id, notes, newId); // make sure unsaved edits count
      const extraContext = await attachmentsRepo.collectExtraContext(id);

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
        provider: route.provider,
        model: route.model,
        extraContext,
      });

      if (!title && generated.title) {
        await recapsRepo.updateRecap(id, { title: generated.title });
        setTitle(generated.title);
      }
      await recapsRepo.updateRecapStatus(id, 'ready');
      await load();
    } catch (e) {
      if (isAiRecapError(e) && e.code === 'llm/missing-key') {
        setError('Add an OpenRouter key in Settings or upgrade to Unlimited, then try again.');
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
      await recapsRepo.updateRecapStatus(id, 'transcribed').catch(() => undefined);
    } finally {
      setGenerating(false);
    }
  }, [id, title, durationSeconds, contextId, notes, load]);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerRight: () =>
            doc ? (
              <Pressable onPress={onShare} hitSlop={8}>
                <Ionicons name="share-outline" size={22} color={c.text} />
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{title || t('app.name')}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>
          {formatDuration(durationSeconds)} · {t(`status.${status}`)} · {segmentCount} segments
        </Text>

        {playChunks.length > 0 ? <RecordingPlayer chunks={playChunks} palette={c} /> : null}

        {integrity && !integrity.ok && integrity.gaps.length > 0 ? (
          <View style={[styles.banner, styles.bannerFailed]}>
            <Ionicons name="warning-outline" size={18} color="#E5484D" />
            <Text style={[styles.bannerText, styles.fill, { color: c.textSecondary }]}>
              {t('processing.gaps', { seconds: integrity.missingSeconds, count: integrity.gaps.length })}
            </Text>
          </View>
        ) : null}

        {/* Pipeline state: progress while the coordinator works, a reason + Retry when it failed. */}
        {isBusy || status === 'waitingForNetwork' ? (
          <View style={[styles.banner, { backgroundColor: c.backgroundElement }]}>
            {isBusy ? <ActivityIndicator color={c.textSecondary} /> : null}
            <Text style={[styles.bannerText, { color: c.textSecondary }]}>{t(`processing.${status}`)}</Text>
          </View>
        ) : null}
        {isFailed ? (
          <View style={[styles.banner, styles.bannerFailed]}>
            <View style={styles.fill}>
              <Text style={[styles.bannerTitle, { color: '#E5484D' }]}>{t('processing.failed')}</Text>
              {processingError ? (
                <Text style={[styles.bannerText, { color: c.textSecondary }]} numberOfLines={3}>
                  {processingError}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={onRetry} style={[styles.retry, { backgroundColor: '#E5484D' }]}>
              <Text style={styles.retryText}>{t('processing.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {contexts.length > 0 ? (
          <View>
            <Text style={[styles.ctxLabel, { color: c.textSecondary }]}>{t('contexts.selectLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ctxRow}>
              {contexts.map((ctx) => {
                const selected = (contextId ?? presetContextId('workMeeting')) === ctx.id;
                return (
                  <Pressable
                    key={ctx.id}
                    onPress={() => selectContext(ctx.id)}
                    style={[styles.ctxChip, { backgroundColor: selected ? '#208AEF' : c.backgroundElement }]}>
                    <Text style={[styles.ctxChipText, { color: selected ? '#fff' : c.text }]}>{ctx.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <Text style={[styles.ctxLabel, { color: c.textSecondary }]}>{t('notes.label')}</Text>
          <TextInput
            value={notes}
            onChangeText={(v) => {
              setNotes(v);
              setNotesSaved(false);
            }}
            onBlur={() => void saveNotes()}
            placeholder={t('notes.placeholder')}
            placeholderTextColor={c.textSecondary}
            multiline
            style={[styles.notes, { backgroundColor: c.backgroundElement, color: c.text }]}
          />
          {notesSaved ? <Text style={[styles.notesHint, { color: c.textSecondary }]}>{t('notes.saved')}</Text> : null}
        </View>

        {doc ? (
          <RecapDocumentView doc={doc} palette={c} />
        ) : (
          <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
            <Text style={[styles.cardText, { color: c.textSecondary }]}>
              Generate a structured recap from this meeting's transcript. Recordings transcribe
              on-device (or via OpenAI Whisper if you add a key in Settings), then recap.
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

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => router.push({ pathname: '/transcript/[id]', params: { id: id ?? '' } })}
            style={[styles.buttonThird, { backgroundColor: c.backgroundSelected }]}>
            <Text style={[styles.buttonThirdText, { color: c.text }]}>{t('transcript.open')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: id ?? '' } })}
            style={[styles.buttonThird, { backgroundColor: c.backgroundSelected }]}>
            <Text style={[styles.buttonThirdText, { color: c.text }]}>{t('chat.open')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/speakers/[id]', params: { id: id ?? '' } })}
            style={[styles.buttonThird, { backgroundColor: c.backgroundSelected }]}>
            <Text style={[styles.buttonThirdText, { color: c.text }]}>{t('speakers.open')}</Text>
          </Pressable>
        </View>

        {doc ? (
          <Pressable onPress={onExportMd} style={styles.link}>
            <Text style={[styles.linkText, { color: c.textSecondary }]}>{t('share.exportMd')}</Text>
          </Pressable>
        ) : null}

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
  ctxLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.one },
  ctxRow: { gap: Spacing.two, paddingRight: Spacing.four },
  ctxChip: { borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: 8 },
  ctxChipText: { fontSize: 14, fontWeight: '500' },
  card: { borderRadius: 16, padding: Spacing.four },
  notes: { minHeight: 72, borderRadius: 12, padding: Spacing.three, fontSize: 15, lineHeight: 20, textAlignVertical: 'top' },
  notesHint: { fontSize: 12, marginTop: 4 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 14,
    padding: Spacing.three,
  },
  bannerFailed: { backgroundColor: '#E5484D14' },
  bannerTitle: { fontSize: 15, fontWeight: '600' },
  bannerText: { fontSize: 13, lineHeight: 18 },
  retry: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: 8 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardText: { fontSize: 15, lineHeight: 22 },
  err: { fontSize: 13 },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  secondaryRow: { flexDirection: 'row', gap: Spacing.two },
  buttonThird: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonThirdText: { fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  link: { alignItems: 'center', paddingVertical: Spacing.two },
  linkText: { fontSize: 14 },
});
