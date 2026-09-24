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
import { Button, Chip, Dot, Group, IconButton, Input, ProcessingBars, Rise, Row, Segmented } from '../../design/components';
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
import { newId } from '../../lib/ids';
import { type RecapModels, getDoneTasks, getRecapModels, getSummaryModel, setDefaultContextId, setRecapModels } from '../../lib/prefs';
import { Colors } from '@/constants/theme';
import { DEFAULT_TRANSCRIPTION_MODEL, type LlmModel, getByokLLMProvider } from '../../ai';
import { ModelPicker } from '../../features/settings/ModelPicker';
import { retranscribe, shortModel } from '../../features/recap/retranscribe';
import { clock } from '../../design/format';
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
  // Model experiments (quality tuning): per-recap overrides, picker, compare mode.
  const [recapModels, setRecapModelsState] = useState<RecapModels>({});
  const [globalSummaryModel, setGlobalSummaryModel] = useState(DEFAULT_SUMMARY_MODEL);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [picker, setPicker] = useState<'summary' | 'transcription' | null>(null);
  const [compare, setCompare] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

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
      setRecapModelsState(await getRecapModels(id));
      setGlobalSummaryModel((await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
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

  const loadModels = useCallback(async () => {
    if (models.length > 0) return;
    try {
      setModels(await getByokLLMProvider().availableModels());
    } catch {
      setError(t('ui.needKeyForModels'));
    }
  }, [models.length, t]);

  const openModelPicker = (which: 'summary' | 'transcription') => {
    void loadModels();
    setNotesOpen(false);
    setReopenNotes(true);
    setTimeout(() => setPicker(which), 350);
  };
  const closeModelPicker = () => {
    setPicker(null);
    if (reopenNotes) {
      setReopenNotes(false);
      setTimeout(() => setNotesOpen(true), 350);
    }
  };
  const pickModel = async (mid: string) => {
    if (!id) return;
    const next = picker === 'transcription' ? { ...recapModels, transcriptionModel: mid } : { ...recapModels, summaryModel: mid };
    setRecapModelsState(next);
    await setRecapModels(id, next);
  };

  const onGenerate = useCallback(async () => {
    if (!id) return;
    setError(null);
    setGenerating(true);
    try {
      const segments = await ensureTranscript(id);
      if (segments.length === 0) throw new AiRecapError({ code: 'transcription/failed', message: t('processing.noTranscript') });
      const context = (await contextsRepo.getContext(contextId ?? presetContextId('workMeeting'))) ?? null;
      const route = await resolveLLMRoute(recapModels.summaryModel ?? (await getSummaryModel()) ?? DEFAULT_SUMMARY_MODEL);
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
  }, [id, title, durationSeconds, contextId, notes, load, t, recapModels.summaryModel]);

  /** Quality experiment: transcribe again with the chosen model, then regenerate the recap. */
  const onRetranscribe = useCallback(async () => {
    if (!id) return;
    const model = recapModels.transcriptionModel ?? DEFAULT_TRANSCRIPTION_MODEL;
    setError(null);
    setBusyLabel(t('ui.retranscribing', { model: shortModel(model) }));
    try {
      await recapsRepo.updateRecapStatus(id, 'transcribing');
      await retranscribe(id, model);
      await recapsRepo.updateRecapStatus(id, 'transcribed');
      await load();
      await onGenerate();
    } catch (e) {
      setError(isAiRecapError(e) && e.code === 'llm/missing-key' ? t('ui.needKeyForModels') : e instanceof Error ? e.message : String(e));
      await recapsRepo.updateRecapStatus(id, 'transcribed').catch(() => undefined);
    } finally {
      setBusyLabel(null);
    }
  }, [id, recapModels.transcriptionModel, t, load, onGenerate]);

  const onTab = (tab: Tab) => {
    if (!id || tab === 'summary') return;
    if (tab === 'transcript') router.push({ pathname: '/transcript/[id]', params: { id } });
    else router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const isFailed = status === 'transcriptionFailed' || status === 'summaryFailed';
  const inPipeline = status === 'transcribing' || status === 'summarizing' || status === 'recorded' || status === 'waitingForNetwork';
  const isActive = inPipeline && ((id ? processingCoordinator.isActive(id) : false) || status === 'transcribing' || status === 'summarizing');
  const isResting = inPipeline && !isActive; // stopped or waiting — nothing is running for this recap
  const isBusy = isActive;
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
              <Button label={t('ui.stop')} variant="secondary" height={36} onPress={() => void processingCoordinator.forceStop()} style={{ paddingHorizontal: 14 }} />
              <Button label={t('ui.restart')} variant="secondary" height={36} onPress={() => id && void processingCoordinator.restart(id)} style={{ paddingHorizontal: 14 }} />
            </View>
          </Rise>
        ) : null}

        {isResting ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <Text style={[Type.metaStrong, { color: th.text2, flex: 1 }]}>
                {status === 'waitingForNetwork' ? t('processing.waitingForNetwork') : t('ui.stoppedRestingHint')}
              </Text>
              <Button label={t('ui.run')} icon="play" variant="primary" height={36} onPress={() => id && void processingCoordinator.enqueue(id)} style={{ paddingHorizontal: 14 }} />
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
                const selected = !compare && (selectedVersionId ?? versions[0]?.id) === v.id;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => {
                      setCompare(false);
                      setSelectedVersionId(v.id);
                    }}
                    style={[styles.version, { backgroundColor: selected ? th.primaryBtn : th.surface, borderColor: th.line }]}>
                    <Text style={[Type.captionStrong, { color: selected ? th.onPrimaryBtn : th.text }]}>
                      {`#${versions.length - i} · ${shortModel(v.model || '?')}`}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCompare((c) => !c)}
                style={[styles.version, { backgroundColor: compare ? th.accentTint : th.surface, borderColor: compare ? th.accent : th.line }]}>
                <Text style={[Type.captionStrong, { color: th.accentText }]}>{compare ? t('ui.hideCompare') : t('ui.compare')}</Text>
              </Pressable>
            </ScrollView>
          </Rise>
        ) : null}

        {compare && id ? (
          <View style={{ gap: 24 }}>
            {versions.map((v, i) => {
              const d = parseArtifactContent(v.content);
              const ctxName = contexts.find((ctx) => ctx.id === v.contextVersion)?.name;
              return (
                <View key={v.id} style={[styles.compareCard, { borderColor: th.line, backgroundColor: th.surface }]}>
                  <Text style={[Type.metaStrong, { color: th.accentText }]}>
                    {`#${versions.length - i} · ${shortModel(v.model || '?')}${ctxName ? ` · ${ctxName}` : ''} · ${clock(v.createdAt)}`}
                  </Text>
                  {d ? <SummaryBody doc={d} recapId={`${id}:${v.id}`} /> : <Text style={[Type.meta, { color: th.text2 }]}>—</Text>}
                </View>
              );
            })}
          </View>
        ) : doc && id ? (
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

        {busyLabel ? (
          <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
            <ActivityIndicator color={th.accentText} />
            <Text style={[Type.metaStrong, { color: th.accentText, flex: 1 }]}>{busyLabel}</Text>
          </View>
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
       <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={[Type.meta, { color: th.text2 }]}>{t('notes.label')}</Text>
        <Input value={notes} onChangeText={setNotes} placeholder={t('notes.placeholder')} multiline height={120} style={Type.bodyText} />
        <Text style={[Type.sectionLabel, { color: th.text2 }]}>{t('ui.models')}</Text>
        <Group>
          <Row
            title={t('ui.summaryModelRow')}
            subtitle={recapModels.summaryModel ?? `${shortModel(globalSummaryModel)} · ${t('ui.defaultModel')}`}
            onPress={() => openModelPicker('summary')}
            chevron
          />
          <Row
            title={t('ui.transcriptionModelRow')}
            subtitle={recapModels.transcriptionModel ?? `${shortModel(DEFAULT_TRANSCRIPTION_MODEL)} · ${t('ui.defaultModel')}`}
            onPress={() => openModelPicker('transcription')}
            chevron
            last
          />
        </Group>
        <Text style={[Type.caption, { color: th.text2 }]}>{t('ui.modelsHint')}</Text>
        <Button
          label={t('ui.retranscribe')}
          variant="secondary"
          height={48}
          icon="refresh"
          iconColor={th.accentText}
          disabled={generating || busyLabel !== null}
          onPress={() => {
            setNotesOpen(false);
            void onRetranscribe();
          }}
        />
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
       </ScrollView>
      </Sheet>

      <ContextPicker visible={pickerOpen} onClose={closePicker} selectedId={contextId} onSelect={(cid) => void selectContext(cid)} />
      <ModelPicker
        visible={picker !== null}
        title={picker === 'transcription' ? t('ui.transcriptionModelRow') : t('ui.summaryModelRow')}
        models={models}
        selectedId={picker === 'transcription' ? recapModels.transcriptionModel ?? DEFAULT_TRANSCRIPTION_MODEL : recapModels.summaryModel ?? globalSummaryModel}
        requireModality={picker === 'transcription' ? 'audio' : undefined}
        palette={Colors[th.scheme]}
        onSelect={(mid) => void pickModel(mid)}
        onClose={closeModelPicker}
      />
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
  compareCard: { gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 40 },
  pill: { height: 48, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
