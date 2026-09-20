/**
 * Recap detail — Kopsavilkums (HANDOFF.md §5.3). Custom nav (back / share / more), Newsreader title
 * (tap to rename), meta + context chip, player card, segmented Kopsavilkums | Transkripts | Jautāt AI,
 * the structured summary, and a floating "Pārģenerēt ar piezīmēm" pill that opens the notes sheet.
 */
import {
  AiRecapError,
  type Context,
  type GeneratedArtifact,
  type IntegrityReport,
  type RecapDocument,
  type RecapStatus,
  checkRecordingIntegrity,
  distinctSpeakerLabels,
  formatRecapMarkdown,
  isAiRecapError,
  parseRecapDocument,
  titleFromTranscript,
  formatRecapHtml,
} from '@ai-recap/core';
import { presetContextId } from '@ai-recap/prompts';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_SUMMARY_MODEL, generateRecap, resolveLLMRoute } from '../../ai';
import { artifactsRepo, attachmentsRepo, chunksRepo, contextsRepo, recapsRepo, segmentsRepo } from '../../db';
import { Button, Chip, Dot, IconButton, Input, ProcessingBars, Rise, Segmented } from '../../design/components';
import { dayAndClock, shortDuration } from '../../design/format';
import { Icon } from '../../design/icons';
import { Sheet } from '../../design/Sheet';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { ContextPicker } from '../../features/contexts/ContextPicker';
import { RecordingPlayer, type SeekRequest } from '../../features/recap/RecordingPlayer';
import { SummaryBody } from '../../features/recap/SummaryBody';
import { chunkUri } from '../../features/recap/audioUri';
import { deleteRecapCompletely } from '../../features/recap/deleteRecap';
import { ensureTranscript } from '../../features/recap/ensureTranscript';
import { MARKDOWN, exportTextFile, safeFilename, shareRichText } from '../../features/share/shareService';
import { getDoneTasks } from '../../lib/prefs';
import { newId } from '../../lib/ids';
import { getSummaryModel, setDefaultContextId } from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';

type Tab = 'summary' | 'transcript' | 'chat';

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
  const th = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [startedAt, setStartedAt] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [status, setStatus] = useState<RecapStatus>('recorded');
  const [speakerCount, setSpeakerCount] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [doc, setDoc] = useState<RecapDocument | null>(null);
  const [versions, setVersions] = useState<GeneratedArtifact[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextId, setContextId] = useState<string | null>(null);
  const [playChunks, setPlayChunks] = useState<{ uri: string; duration: number }[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [seek, setSeek] = useState<SeekRequest | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const recap = await recapsRepo.getRecap(id);
      if (recap) {
        setTitle(recap.title);
        setStartedAt(recap.startedAt);
        setDurationSeconds(recap.durationSeconds);
        setStatus(recap.status);
        setProcessingError(processingCoordinator.getLastError(id));
        setContextId(recap.contextId ?? null);
      }
      setNotes((await attachmentsRepo.getNotes(id))?.extractedText ?? '');
      setContexts(await contextsRepo.listContexts());
      const segments = await segmentsRepo.listSegments(id);
      setSegmentCount(segments.length);
      setSpeakerCount(distinctSpeakerLabels(segments).length);
      const chunks = await chunksRepo.listChunks(id);
      setPlayChunks(chunks.map((ch) => ({ uri: chunkUri(id, ch.relativePath), duration: ch.duration })));
      setIntegrity(recap && recap.status !== 'recording' ? checkRecordingIntegrity(chunks, recap.durationSeconds) : null);
      const summaries = (await artifactsRepo.listArtifacts(id)).filter((a) => a.type === 'summary');
      setVersions(summaries);
      const shown = summaries.find((a) => a.id === selectedVersionId) ?? summaries[0] ?? null;
      setDoc(shown ? parseArtifactContent(shown.content) : null);
    } catch {
      /* db not ready */
    }
  }, [id, selectedVersionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => processingCoordinator.onChange(() => void load()), [load]);

  const contextName = contexts.find((c) => c.id === (contextId ?? presetContextId('workMeeting')))?.name ?? '';

  const selectContext = useCallback(
    async (ctxId: string) => {
      if (!id) return;
      setContextId(ctxId);
      await recapsRepo.updateRecap(id, { contextId: ctxId });
      await setDefaultContextId(ctxId);
    },
    [id],
  );

  const commitTitle = useCallback(async () => {
    setEditingTitle(false);
    if (!id) return;
    const next = draftTitle.trim();
    if (next === title) return;
    setTitle(next);
    await recapsRepo.updateRecap(id, { title: next });
  }, [id, draftTitle, title]);

  const onShare = useCallback(async () => {
    if (!doc || !id) return;
    const labels = {
      summary: t('recapDoc.summary'),
      decisions: t('recapDoc.decisions'),
      actionItems: t('recapDoc.actionItems'),
      dates: t('recapDoc.dates'),
      openQuestions: t('recapDoc.openQuestions'),
      topics: t('recapDoc.topics'),
    };
    const doneTasks = await getDoneTasks(id);
    await shareRichText(formatRecapHtml(doc, { title, labels, doneTasks }), formatRecapMarkdown(doc, { title, timestamps: false }), title || undefined);
  }, [doc, id, title, t]);

  // iOS shows only one Modal at a time: close the notes sheet before opening the context picker,
  // and bring the sheet back once a context was picked (or the picker was dismissed).
  const [reopenNotes, setReopenNotes] = useState(false);
  const openPickerFromNotes = () => {
    setNotesOpen(false);
    setReopenNotes(true);
    setTimeout(() => setPickerOpen(true), 350);
  };
  const closePicker = () => {
    setPickerOpen(false);
    if (reopenNotes) {
      setReopenNotes(false);
      setTimeout(() => setNotesOpen(true), 350);
    }
  };

  const onExportMd = useCallback(async () => {
    if (doc) await exportTextFile(`${safeFilename(title)}.md`, formatRecapMarkdown(doc, { title }), MARKDOWN.mime, MARKDOWN.uti);
  }, [doc, title]);

  const onMore = () => {
    Alert.alert(title || t('recap.untitled'), undefined, [
      {
        text: t('ui.rename'),
        onPress: () => {
          setDraftTitle(title);
          setEditingTitle(true);
        },
      },
      ...(doc ? [{ text: t('share.exportMd'), onPress: () => void onExportMd() }] : []),
      {
        text: t('home.delete'),
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert(t('home.deleteTitle'), t('home.deleteMessage'), [
            { text: t('home.cancel'), style: 'cancel' },
            { text: t('home.delete'), style: 'destructive', onPress: () => id && void deleteRecapCompletely(id).then(() => router.back()) },
          ]),
      },
      { text: t('ui.cancel'), style: 'cancel' },
    ]);
  };

  const onRetry = useCallback(() => {
    if (id) void processingCoordinator.retry(id);
  }, [id]);

  const onGenerate = useCallback(async () => {
    if (!id) return;
    setError(null);
    setGenerating(true);
    try {
      const segments = await ensureTranscript(id);
      if (segments.length === 0) throw new AiRecapError({ code: 'transcription/failed', message: t('processing.noTranscript') });
      const context = (await contextsRepo.getContext(contextId ?? presetContextId('workMeeting'))) ?? null;
      const route = await resolveLLMRoute((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
      if (!route) throw new AiRecapError({ code: 'llm/missing-key', message: 'No LLM available.' });
      await attachmentsRepo.setNotes(id, notes, newId);
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
      const provisional = titleFromTranscript(segments.map((s) => s.text));
      if (generated.title && (!title.trim() || title.trim() === provisional)) {
        await recapsRepo.updateRecap(id, { title: generated.title });
        setTitle(generated.title);
      }
      await recapsRepo.updateRecapStatus(id, 'ready');
      setSelectedVersionId(null);
      await load();
    } catch (e) {
      setError(isAiRecapError(e) && e.code === 'llm/missing-key' ? t('recap.noLlm') : e instanceof Error ? e.message : String(e));
      await recapsRepo.updateRecapStatus(id, 'transcribed').catch(() => undefined);
    } finally {
      setGenerating(false);
    }
  }, [id, title, durationSeconds, contextId, notes, load, t]);

  const onTab = (tab: Tab) => {
    if (!id || tab === 'summary') return;
    if (tab === 'transcript') router.push({ pathname: '/transcript/[id]', params: { id } });
    else router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const isFailed = status === 'transcriptionFailed' || status === 'summaryFailed';
  const isBusy = status === 'transcribing' || status === 'summarizing' || status === 'recorded' || status === 'waitingForNetwork';
  const canGenerate = segmentCount > 0;
  let rise = 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.nav}>
        <IconButton name="chevronLeft" iconSize={24} accessibilityLabel={t('ui.back')} onPress={() => router.back()} style={{ marginLeft: -10 }} strokeWidth={2} />
        <View style={{ flexDirection: 'row', gap: 4, marginRight: -10 }}>
          {doc ? <IconButton name="share" accessibilityLabel={t('ui.share')} onPress={() => void onShare()} /> : null}
          <IconButton name="more" accessibilityLabel={t('ui.more')} onPress={onMore} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Rise index={rise++} style={{ gap: 10 }}>
          {editingTitle ? (
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              onBlur={() => void commitTitle()}
              onSubmitEditing={() => void commitTitle()}
              autoFocus
              returnKeyType="done"
              placeholder={t('recap.titlePlaceholder')}
              placeholderTextColor={th.text3}
              style={[Type.detailTitle, { color: th.text, borderBottomWidth: 1, borderColor: th.accent, paddingVertical: 2 }]}
            />
          ) : (
            <Pressable
              onPress={() => {
                setDraftTitle(title);
                setEditingTitle(true);
              }}>
              <Text style={[Type.detailTitle, { color: th.text }]}>{title || t('recap.untitled')}</Text>
            </Pressable>
          )}
          <View style={styles.metaRow}>
            <Text style={[Type.meta, { color: th.text2 }]}>{shortDuration(durationSeconds)}</Text>
            <Dot />
            <Text style={[Type.meta, { color: th.text2 }]}>{startedAt ? dayAndClock(startedAt) : ''}</Text>
            {speakerCount > 0 ? (
              <>
                <Dot />
                <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.speakersCount', { count: speakerCount })}</Text>
              </>
            ) : null}
            <View style={{ marginLeft: 'auto' }}>
              <Chip label={contextName || t('contexts.selectLabel')} onPress={() => setPickerOpen(true)} />
            </View>
          </View>
        </Rise>

        {playChunks.length > 0 && id ? (
          <Rise index={rise++}>
            <RecordingPlayer chunks={playChunks} seed={id} seekRequest={seek} />
          </Rise>
        ) : null}

        <Rise index={rise++}>
          <Segmented<Tab>
            value="summary"
            onChange={onTab}
            options={[
              { value: 'summary', label: t('ui.summary') },
              { value: 'transcript', label: t('ui.transcript') },
              { value: 'chat', label: t('ui.askAi') },
            ]}
          />
        </Rise>

        {integrity && !integrity.ok && integrity.gaps.length > 0 ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <Icon name="info" size={18} color={th.destructive} />
              <Text style={[Type.meta, { color: th.text2, flex: 1 }]}>
                {t('processing.gaps', { seconds: integrity.missingSeconds, count: integrity.gaps.length })}
              </Text>
            </View>
          </Rise>
        ) : null}

        {isBusy ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <ProcessingBars color={th.accent} />
              <Text style={[Type.metaStrong, { color: th.accentText, flex: 1 }]}>{t(`processing.${status}`, { defaultValue: t(`status.${status}`) })}</Text>
            </View>
          </Rise>
        ) : null}

        {isFailed ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.metaStrong, { color: th.destructive }]}>{t('processing.failed')}</Text>
                {processingError ? (
                  <Text style={[Type.caption, { color: th.text2 }]} numberOfLines={3}>
                    {processingError}
                  </Text>
                ) : null}
              </View>
              <Button label={t('processing.retry')} height={36} onPress={onRetry} style={{ paddingHorizontal: 14 }} />
            </View>
          </Rise>
        ) : null}

        {versions.length > 1 ? (
          <Rise index={rise++}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {versions.map((v, i) => {
                const selected = (selectedVersionId ?? versions[0]?.id) === v.id;
                const ctxName = contexts.find((ctx) => ctx.id === v.contextVersion)?.name;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setSelectedVersionId(v.id)}
                    style={[styles.version, { backgroundColor: selected ? th.primaryBtn : th.surface, borderColor: th.line }]}>
                    <Text style={[Type.captionStrong, { color: selected ? th.onPrimaryBtn : th.text }]}>
                      {`#${versions.length - i}${ctxName ? ` · ${ctxName}` : ''}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Rise>
        ) : null}

        {doc && id ? (
          <SummaryBody doc={doc} recapId={id} onSeek={(s) => setSeek({ seconds: s, nonce: Date.now() })} />
        ) : !isBusy ? (
          <Rise index={rise++} style={{ gap: 14 }}>
            <Text style={[Type.bodyText15, { color: th.text2 }]}>{canGenerate ? t('recap.empty') : t('ui.noSummaryYet')}</Text>
            {canGenerate ? (
              <Button
                label={t('recap.generate')}
                height={48}
                onPress={() => void onGenerate()}
                disabled={generating}
                icon="refresh"
                iconColor={th.onPrimaryBtn}
              />
            ) : null}
          </Rise>
        ) : null}

        {error ? <Text style={[Type.meta, { color: th.destructive }]}>{error}</Text> : null}
      </ScrollView>

      {/* Floating regenerate pill on a bottom gradient. */}
      {canGenerate ? (
        <View pointerEvents="box-none" style={[styles.floating, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}>
          <Pressable
            onPress={() => setNotesOpen(true)}
            disabled={generating}
            style={[styles.pill, { backgroundColor: th.glass, borderColor: th.line }, th.shadows.float]}>
            {generating ? <ActivityIndicator color={th.accentText} /> : <Icon name="refresh" size={16} color={th.accentText} strokeWidth={2} />}
            <Text style={[Type.buttonMini, { color: th.text }]}>{doc ? t('ui.regenerateWithNotes') : t('recap.generate')}</Text>
          </Pressable>
        </View>
      ) : null}

      <Sheet visible={notesOpen} onClose={() => setNotesOpen(false)} title={t('ui.notesTitle')}>
        <Text style={[Type.meta, { color: th.text2 }]}>{t('notes.label')}</Text>
        <Input value={notes} onChangeText={setNotes} placeholder={t('notes.placeholder')} multiline height={120} style={Type.bodyText} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Chip label={contextName || t('contexts.selectLabel')} size="md" chevron onPress={openPickerFromNotes} />
          <View style={{ flex: 1 }} />
          <Button
            label={doc ? t('ui.regenerate') : t('recap.generate')}
            height={48}
            icon="refresh"
            iconColor={th.onPrimaryBtn}
            onPress={() => {
              setNotesOpen(false);
              void onGenerate();
            }}
          />
        </View>
      </Sheet>

      <ContextPicker visible={pickerOpen} onClose={closePicker} selectedId={contextId} onSelect={(cid) => void selectContext(cid)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding, height: 52 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 6, gap: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  version: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 40 },
  pill: { height: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
