/**
 * Transkripts (HANDOFF.md §5.4): compact nav, segmented control, search + Runātāji, two-column
 * transcript (timestamp | speaker + text), playing utterance highlighted with an equalizer, floating
 * bottom player. Tap a line to seek.
 */
import { type TranscriptSegment, formatTimestamp, formatTranscriptText } from '@ai-recap/core';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { chunksRepo, recapsRepo } from '../../db';
import { IconButton, ProcessingBars, Rise, SearchField, Segmented } from '../../design/components';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { type PlayChunk, RecordingPlayer, type SeekRequest } from '../../features/recap/RecordingPlayer';
import { chunkUri } from '../../features/recap/audioUri';
import { PLAINTEXT, exportTextFile, safeFilename } from '../../features/share/shareService';
import { useTranscript } from '../../features/transcript/useTranscript';
import { type TranscriptVersion, activateTranscriptVersion, listTranscriptVersions, shortModel } from '../../features/recap/retranscribe';
import { Button } from '../../design/components';

type Tab = 'summary' | 'transcript' | 'chat';

export default function TranscriptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { segments, nameFor, reload } = useTranscript(id ?? '');
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [chunks, setChunks] = useState<PlayChunk[]>([]);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [versions, setVersions] = useState<TranscriptVersion[]>([]);
  const [viewing, setViewing] = useState<TranscriptVersion | null>(null); // null = live transcript
  const [compare, setCompare] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
      if (id) {
        void recapsRepo.getRecap(id).then((r) => setTitle(r?.title ?? ''));
        void listTranscriptVersions(id).then(setVersions).catch(() => setVersions([]));
      }
    }, [id, reload]),
  );

  useEffect(() => {
    if (!id) return;
    chunksRepo
      .listChunks(id)
      .then((rows) => setChunks(rows.map((ch) => ({ uri: chunkUri(id, ch.relativePath), duration: ch.duration }))))
      .catch(() => setChunks([]));
  }, [id]);

  // Speaker colours: first distinct speaker = accentText, second = speaker2, then alternate.
  const speakerColor = useMemo(() => {
    const labels: string[] = [];
    for (const s of segments) if (s.speakerLabel && !labels.includes(s.speakerLabel)) labels.push(s.speakerLabel);
    return (label: string | null) => (label && labels.indexOf(label) % 2 === 1 ? th.speaker2 : th.accentText);
  }, [segments, th.speaker2, th.accentText]);

  const onSeek = (segment: TranscriptSegment) => {
    setSelectedId(segment.id);
    if (chunks.length > 0) setSeek({ seconds: segment.startTime, nonce: Date.now() });
  };

  const onTime = useCallback(
    (seconds: number, isPlaying: boolean) => {
      setPlaying(isPlaying);
      if (!isPlaying) return;
      const hit = segments.find((s) => seconds >= s.startTime && seconds < Math.max(s.endTime, s.startTime + 0.5));
      if (hit) setSelectedId(hit.id);
    },
    [segments],
  );

  const onExport = () => exportTextFile(`${safeFilename('transcript')}.txt`, formatTranscriptText(segments, nameFor), PLAINTEXT.mime, PLAINTEXT.uti);

  const onTab = (tab: Tab) => {
    if (!id || tab === 'transcript') return;
    if (tab === 'summary') router.back();
    else router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const q = query.trim().toLowerCase();
  const shownSegments = viewing ? viewing.segments : segments;
  const rows = q ? shownSegments.filter((s) => s.text.toLowerCase().includes(q)) : shownSegments;

  const useVersion = async () => {
    if (!id || !viewing) return;
    await activateTranscriptVersion(id, viewing);
    setViewing(null);
    await reload();
  };

  // Highlight query hits inside an utterance.
  const renderText = (text: string) => {
    if (!q) return text;
    const parts: { s: string; hit: boolean }[] = [];
    let i = 0;
    const lower = text.toLowerCase();
    while (i < text.length) {
      const j = lower.indexOf(q, i);
      if (j < 0) {
        parts.push({ s: text.slice(i), hit: false });
        break;
      }
      if (j > i) parts.push({ s: text.slice(i, j), hit: false });
      parts.push({ s: text.slice(j, j + q.length), hit: true });
      i = j + q.length;
    }
    return parts.map((p, k) =>
      p.hit ? (
        <Text key={k} style={{ backgroundColor: th.scheme === 'light' ? '#F3D9A6' : '#3A2E17', color: th.text }}>
          {p.s}
        </Text>
      ) : (
        p.s
      ),
    );
  };

  let rise = 0;
  let lastSpeaker: string | null | undefined;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.nav}>
        <IconButton name="chevronLeft" iconSize={24} accessibilityLabel={t('ui.back')} onPress={() => router.back()} style={{ marginLeft: -10 }} strokeWidth={2} />
        <Text style={[Type.buttonSmall, { color: th.text, maxWidth: 240 }]} numberOfLines={1}>
          {title || t('recap.untitled')}
        </Text>
        <IconButton name="share" accessibilityLabel={t('share.exportTranscript', { defaultValue: t('ui.share') })} onPress={() => void onExport()} style={{ marginRight: -10 }} />
      </View>

      <View style={styles.tools}>
        <Rise index={rise++}>
          <Segmented<Tab>
            value="transcript"
            onChange={onTab}
            options={[
              { value: 'summary', label: t('ui.summary') },
              { value: 'transcript', label: t('ui.transcript') },
              { value: 'chat', label: t('ui.askAi') },
            ]}
          />
        </Rise>
        <Rise index={rise++} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <SearchField value={query} onChangeText={setQuery} placeholder={t('ui.searchTranscript')} height={40} />
          </View>
          <Pressable
            onPress={() => id && router.push({ pathname: '/speakers/[id]', params: { id } })}
            style={[styles.speakersBtn, { backgroundColor: th.surface, borderColor: th.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.speakerDot, { backgroundColor: th.accent }]} />
              <View style={[styles.speakerDot, { backgroundColor: th.speaker2, marginLeft: -4, borderWidth: 2, borderColor: th.surface, width: 12, height: 12, borderRadius: 6 }]} />
            </View>
            <Text style={[Type.metaStrong, { color: th.text }]}>{t('ui.speakers')}</Text>
          </Pressable>
        </Rise>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {versions.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text style={[Type.sectionLabel, { color: th.text2 }]}>{t('ui.transcriptVersions')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable
                onPress={() => {
                  setViewing(null);
                  setCompare(false);
                }}
                style={[styles.version, { backgroundColor: !viewing && !compare ? th.primaryBtn : th.surface, borderColor: th.line }]}>
                <Text style={[Type.captionStrong, { color: !viewing && !compare ? th.onPrimaryBtn : th.text }]}>{t('ui.current')}</Text>
              </Pressable>
              {versions.map((v, i) => {
                const selected = !compare && viewing?.artifact.id === v.artifact.id;
                return (
                  <Pressable
                    key={v.artifact.id}
                    onPress={() => {
                      setCompare(false);
                      setViewing(v);
                    }}
                    style={[styles.version, { backgroundColor: selected ? th.primaryBtn : th.surface, borderColor: th.line }]}>
                    <Text style={[Type.captionStrong, { color: selected ? th.onPrimaryBtn : th.text }]}>{`#${versions.length - i} · ${shortModel(v.artifact.model || '?')}`}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCompare((c) => !c)}
                style={[styles.version, { backgroundColor: compare ? th.accentTint : th.surface, borderColor: compare ? th.accent : th.line }]}>
                <Text style={[Type.captionStrong, { color: th.accentText }]}>{compare ? t('ui.hideCompare') : t('ui.compare')}</Text>
              </Pressable>
            </ScrollView>
            {viewing && !compare ? <Button label={t('ui.useThisVersion')} height={40} onPress={() => void useVersion()} style={{ alignSelf: 'flex-start' }} /> : null}
          </View>
        ) : null}

        {compare
          ? versions.map((v, i) => (
              <View key={v.artifact.id} style={[styles.compareCard, { borderColor: th.line, backgroundColor: th.surface }]}>
                <Text style={[Type.metaStrong, { color: th.accentText }]}>{`#${versions.length - i} · ${shortModel(v.artifact.model || '?')}`}</Text>
                {v.segments.map((seg) => (
                  <View key={seg.id} style={styles.line}>
                    <Text style={[Type.caption, styles.tabular, { color: th.text2, width: 44 }]}>{formatTimestamp(seg.startTime)}</Text>
                    <Text style={[Type.bodyText15, { color: th.text, flex: 1 }]}>{seg.text}</Text>
                  </View>
                ))}
              </View>
            ))
          : null}

        {!compare && rows.length === 0 ? (
          <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center', marginTop: 40 }]}>
            {q ? t('home.noResults', { query: query.trim() }) : t('transcript.empty')}
          </Text>
        ) : null}
        {!compare && rows.map((seg) => {
          const selected = seg.id === selectedId;
          const showSpeaker = seg.speakerLabel !== lastSpeaker || q.length > 0;
          lastSpeaker = seg.speakerLabel;
          const name = nameFor(seg.speakerLabel);
          return (
            <Rise key={seg.id} index={Math.min(rise++, 12)}>
              <Pressable onPress={() => onSeek(seg)} style={styles.line}>
                <View style={styles.timeCol}>
                  <Text style={[selected ? Type.captionStrong : Type.caption, styles.tabular, { color: selected ? th.text : th.text2 }]}>{formatTimestamp(seg.startTime)}</Text>
                  {selected && playing ? <ProcessingBars color={th.accent} height={10} width={2} gap={2} /> : null}
                </View>
                <View style={[styles.utterance, selected && { backgroundColor: th.accentTint }]}>
                  {showSpeaker && name ? <Text style={[Type.captionStrong, { color: speakerColor(seg.speakerLabel) }]}>{name}</Text> : null}
                  <Text style={[Type.bodyText, { color: th.text }]}>{renderText(seg.text)}</Text>
                </View>
              </Pressable>
            </Rise>
          );
        })}
      </ScrollView>

      {chunks.length > 0 && id ? (
        <View pointerEvents="box-none" style={[styles.playerWrap, { paddingBottom: Math.max(insets.bottom, 20) + 14, backgroundColor: th.bg }]}>
          <RecordingPlayer chunks={chunks} seed={id} variant="bar" seekRequest={seek} onTime={onTime} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding, height: 52 },
  tools: { paddingHorizontal: Layout.screenPadding, gap: 12, paddingBottom: 12 },
  speakersBtn: { height: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  speakerDot: { width: 8, height: 8, borderRadius: 4 },
  content: { paddingHorizontal: Layout.screenPadding, gap: 20, paddingTop: 4 },
  line: { flexDirection: 'row', gap: 12 },
  timeCol: { width: 44, gap: 6, paddingTop: 3 },
  tabular: { fontVariant: ['tabular-nums'] },
  utterance: { flex: 1, gap: 4, paddingVertical: 12, paddingHorizontal: 14, marginVertical: -12, marginHorizontal: -14, borderRadius: 14 },
  playerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: Layout.screenPadding, paddingTop: 14 },
  version: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  compareCard: { gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
});
