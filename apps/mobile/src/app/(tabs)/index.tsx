/**
 * Ieraksti — the library (HANDOFF.md §5.1). Header with today's date and minutes recorded this month,
 * search, recordings grouped by day. Processing recordings render as cards with a progress bar;
 * finished ones as plain rows. Recording starts from the floating tab bar.
 */
import type { Recap } from '@ai-recap/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type RecapSearchHit, contextsRepo, recapsRepo, searchRepo, usageRepo } from '../../db';
import { Button, Card, Dot, ProcessingBars, ProgressBar, Rise, SearchField, SectionLabel } from '../../design/components';
import { clock, dayLabel, longDate, shortDuration, startOfMonth } from '../../design/format';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { deleteRecapCompletely } from '../../features/recap/deleteRecap';
import { isOnboarded } from '../../lib/prefs';
import { processingCoordinator } from '../../processing/coordinator';

interface Row {
  recap: Recap;
  matchedIn?: RecapSearchHit['matchedIn'];
  snippet?: string;
}

const PROCESSING = new Set<Recap['status']>(['recorded', 'transcribing', 'transcribed', 'summarizing', 'waitingForNetwork']);

export default function RecapsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [monthSeconds, setMonthSeconds] = useState(0);
  const [contextNames, setContextNames] = useState<Record<string, string>>({});
  const [currentId, setCurrentId] = useState<string | null>(processingCoordinator.currentId());
  const [paused, setPaused] = useState(processingCoordinator.isPaused());

  const load = useCallback(async (q: string) => {
    try {
      if (q.trim().length > 0) {
        setRows(await searchRepo.searchRecaps(q));
      } else {
        setRows((await recapsRepo.pageRecaps()).map((recap) => ({ recap })));
      }
      const ctx = await contextsRepo.listContexts();
      setContextNames(Object.fromEntries(ctx.map((c) => [c.id, c.name])));
      setMonthSeconds((await usageRepo.summarizeUsageSince(startOfMonth())).recordingSeconds);
    } catch {
      setRows([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(query);
    }, [load, query]),
  );

  useEffect(() => {
    void isOnboarded().then((done) => {
      if (!done) router.push('/onboarding');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      processingCoordinator.onChange(() => {
        setCurrentId(processingCoordinator.currentId());
        setPaused(processingCoordinator.isPaused());
        void load(query);
      }),
    [load, query],
  );
  const currentTitle = rows.find((r) => r.recap.id === currentId)?.recap.title;

  const onDelete = useCallback(
    (recap: Recap) => {
      Alert.alert(t('home.deleteTitle'), t('home.deleteMessage'), [
        { text: t('home.cancel'), style: 'cancel' },
        { text: t('home.delete'), style: 'destructive', onPress: () => void deleteRecapCompletely(recap.id).then(() => load(query)) },
      ]);
    },
    [t, load, query],
  );

  // Group by calendar day (rows arrive newest first).
  const sections = useMemo(() => {
    const out: { label: string; rows: Row[] }[] = [];
    for (const r of rows) {
      const label = dayLabel(r.recap.startedAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(r);
      else out.push({ label, rows: [r] });
    }
    return out;
  }, [rows]);

  const searching = query.trim().length > 0;
  let riseIndex = 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Rise index={riseIndex++} style={styles.header}>
          <View style={{ gap: 2 }}>
            <Text style={[Type.meta, { color: th.text2 }]}>{longDate(Date.now())}</Text>
            <Text style={[Type.screenTitle, { color: th.text }]}>{t('tabs.recaps')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2, paddingBottom: 4 }}>
            <Text style={[Type.heroNumber, { color: th.accentText }]}>{shortDuration(monthSeconds)}</Text>
            <Text style={[Type.caption, { color: th.text2 }]}>{t('ui.recordedThisMonth')}</Text>
          </View>
        </Rise>

        <Rise index={riseIndex++}>
          <SearchField value={query} onChangeText={setQuery} placeholder={t('home.searchPlaceholder')} />
        </Rise>

        {currentId ? (
          <Rise index={riseIndex++}>
            <View style={[styles.queueBar, { backgroundColor: th.surface, borderColor: th.line }]}>
              <ProcessingBars color={th.accent} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[Type.captionStrong, { color: th.accentText }]}>{t('ui.processingNow')}</Text>
                <Text style={[Type.meta, { color: th.text }]} numberOfLines={1}>
                  {currentTitle || t('recap.untitled')}
                </Text>
              </View>
              <Pressable
                onPress={() => void processingCoordinator.forceStop()}
                accessibilityRole="button"
                style={[styles.stopBtn, { backgroundColor: th.surface2 }]}>
                <View style={[styles.stopSquare, { backgroundColor: th.record }]} />
                <Text style={[Type.buttonMini, { color: th.text }]}>{t('ui.stop')}</Text>
              </Pressable>
            </View>
          </Rise>
        ) : paused ? (
          <Rise index={riseIndex++}>
            <View style={[styles.queueBar, { backgroundColor: th.surface, borderColor: th.line }]}>
              <Text style={[Type.meta, { color: th.text2, flex: 1 }]}>{t('ui.processingStopped')}</Text>
              <Pressable onPress={() => void processingCoordinator.resumeAll()} accessibilityRole="button" style={[styles.stopBtn, { backgroundColor: th.primaryBtn }]}>
                <Text style={[Type.buttonMini, { color: th.onPrimaryBtn }]}>{t('ui.resumeAll')}</Text>
              </Pressable>
            </View>
          </Rise>
        ) : null}

        {rows.length === 0 ? (
          <Rise index={riseIndex++}>
            <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center', marginTop: 32 }]}>
              {searching ? t('home.noResults', { query: query.trim() }) : t('home.empty')}
            </Text>
          </Rise>
        ) : null}

        {sections.map((section) => (
          <View key={section.label} style={{ gap: 8 }}>
            <Rise index={riseIndex++}>
              <SectionLabel>{section.label}</SectionLabel>
            </Rise>
            {section.rows.map((row, i) => {
              const r = row.recap;
              const ctxName = r.contextId ? contextNames[r.contextId] : undefined;
              const pipeline = PROCESSING.has(r.status) || r.status === 'recording';
              // Resting mid-pipeline (stopped, or waiting for network/key) is not the same as being worked on.
              const active = pipeline && (currentId === r.id || r.status === 'transcribing' || r.status === 'summarizing' || r.status === 'recording');
              const resting = pipeline && !active;
              const processing = pipeline;
              const failed = r.status === 'transcriptionFailed' || r.status === 'summaryFailed' || r.status === 'uploadFailed';
              const open = () => router.push({ pathname: '/recap/[id]', params: { id: r.id } });
              const title = r.title || t('recap.untitled');
              if (processing || failed) {
                return (
                  <Rise key={r.id} index={riseIndex++}>
                    <Pressable onPress={open} onLongPress={() => onDelete(r)} delayLongPress={400}>
                      <Card style={{ gap: 10 }}>
                        <View style={styles.between}>
                          <View style={styles.statusRow}>
                            {active ? <ProcessingBars color={th.accent} /> : null}
                            <Text style={[Type.captionStrong, { color: failed ? th.destructive : resting ? th.text2 : th.accentText }]}>
                              {resting ? (r.status === 'waitingForNetwork' ? t('status.waitingForNetwork') : t('ui.stoppedResting')) : t(`status.${r.status}`)}
                            </Text>
                          </View>
                          <Text style={[Type.meta, { color: th.text2 }]}>{clock(r.startedAt)}</Text>
                        </View>
                        <Text style={[Type.body, { color: th.text }]} numberOfLines={2}>
                          {title}
                        </Text>
                        {active ? <ProgressBar progress={progressFor(r.status)} indeterminate={r.status === 'transcribing' || r.status === 'summarizing'} /> : null}
                        <View style={styles.metaRow}>
                          <Text style={[Type.metaStrong, { color: th.text }]}>{shortDuration(r.durationSeconds)}</Text>
                          {ctxName ? <Text style={[Type.meta, { color: th.text2 }]}>{ctxName}</Text> : null}
                          {resting ? (
                            <Button label={t('ui.run')} icon="play" variant="secondary" height={32} onPress={() => void processingCoordinator.enqueue(r.id)} style={{ marginLeft: 'auto', paddingHorizontal: 12 }} />
                          ) : null}
                        </View>
                      </Card>
                    </Pressable>
                  </Rise>
                );
              }
              const isLast = i === section.rows.length - 1;
              return (
                <Rise key={r.id} index={riseIndex++}>
                  <Pressable
                    onPress={open}
                    onLongPress={() => onDelete(r)}
                    delayLongPress={400}
                    style={({ pressed }) => [styles.row, { borderBottomColor: th.line, borderBottomWidth: isLast ? 0 : 1, opacity: pressed ? 0.6 : 1 }]}>
                    <Text style={[Type.body, { color: th.text }]} numberOfLines={2}>
                      {title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[Type.metaStrong, { color: th.text }]}>{shortDuration(r.durationSeconds)}</Text>
                      {ctxName ? <Text style={[Type.meta, { color: th.text2 }]}>{ctxName}</Text> : null}
                      <Text style={[Type.meta, { color: th.text2, marginLeft: 'auto' }]}>{clock(r.startedAt)}</Text>
                    </View>
                    {row.snippet && row.matchedIn && row.matchedIn !== 'title' ? (
                      <Text style={[Type.meta, { color: th.text2 }]} numberOfLines={2}>
                        <Text style={[Type.metaStrong, { color: th.accentText }]}>
                          {t(row.matchedIn === 'transcript' ? 'home.matchTranscript' : 'home.matchRecap')}
                        </Text>
                        {'  '}
                        <Dot />
                        {'  '}
                        {row.snippet}
                      </Text>
                    ) : null}
                  </Pressable>
                </Rise>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Coarse pipeline progress for the card's bar (real percentages arrive with chunk-level events later). */
function progressFor(status: Recap['status']): number {
  switch (status) {
    case 'recording':
      return 0.05;
    case 'recorded':
    case 'waitingForNetwork':
      return 0.15;
    case 'transcribing':
      return 0.4;
    case 'transcribed':
      return 0.7;
    case 'summarizing':
      return 0.85;
    default:
      return 1;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: Layout.tabBarClearance, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { gap: 6, paddingVertical: 14, paddingHorizontal: 4 },
  queueBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingLeft: 14, borderRadius: 14, borderWidth: 1 },
  stopBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stopSquare: { width: 10, height: 10, borderRadius: 2 },
});
