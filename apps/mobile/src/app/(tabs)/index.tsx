import { type Recap, dailyQuotaState, formatDuration, startOfDay } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { type RecapSearchHit, recapsRepo, searchRepo } from '../../db';
import { deleteRecapCompletely } from '../../features/recap/deleteRecap';
import { processingCoordinator } from '../../processing/coordinator';
import { useCapabilities } from '../../purchases/useCapabilities';

/** Library row: a recap plus, when searching, where it matched and a snippet around the hit. */
interface Row {
  recap: Recap;
  matchedIn?: RecapSearchHit['matchedIn'];
  snippet?: string;
}

export default function RecapsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [startedToday, setStartedToday] = useState(0);
  const caps = useCapabilities();
  const quota = dailyQuotaState(startedToday, caps.maxRecapsPerDay);

  // Empty query → recent library; otherwise search titles + transcripts + recap content (M4-4).
  const load = useCallback(async (q: string) => {
    try {
      if (q.trim().length > 0) {
        setRows(await searchRepo.searchRecaps(q));
      } else {
        setRows((await recapsRepo.pageRecaps()).map((recap) => ({ recap })));
      }
    } catch {
      setRows([]);
    }
  }, []);

  const onDelete = useCallback(
    (recap: Recap) => {
      Alert.alert(t('home.deleteTitle'), t('home.deleteMessage'), [
        { text: t('home.cancel'), style: 'cancel' },
        {
          text: t('home.delete'),
          style: 'destructive',
          onPress: () => {
            void deleteRecapCompletely(recap.id).then(() => load(query));
          },
        },
      ]);
    },
    [t, load, query],
  );

  const refreshQuota = useCallback(async () => {
    try {
      setStartedToday(await recapsRepo.countStartedSince(startOfDay(Date.now())));
    } catch {
      setStartedToday(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(query);
      void refreshQuota();
    }, [load, query, refreshQuota]),
  );

  // Live-refresh the library as the processing coordinator advances recap statuses.
  useEffect(() => processingCoordinator.onChange(() => void load(query)), [load, query]);

  const onStart = () => {
    if (!quota.canStart) {
      Alert.alert(t('free.limitTitle'), t('free.limitMsg', { max: caps.maxRecapsPerDay ?? 0 }));
      return;
    }
    router.push('/recording');
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.h1, { color: c.text }]}>{t('app.name')}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onStart}
        style={[styles.startButton, { backgroundColor: '#208AEF' }]}>
        <Ionicons name="mic" color="#fff" size={22} />
        <Text style={styles.startButtonText}>{t('home.startRecap')}</Text>
      </Pressable>

      {quota.max !== null ? (
        <Text style={[styles.quota, { color: c.textSecondary }]}>
          {t('free.recapsToday', { used: quota.started, max: quota.max })}
        </Text>
      ) : null}

      <TextInput
        placeholder={t('home.searchPlaceholder')}
        placeholderTextColor={c.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={[styles.search, { backgroundColor: c.backgroundElement, color: c.text }]}
      />

      {query.trim().length === 0 ? (
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t('home.recent')}</Text>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.recap.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textSecondary }]}>
            {query.trim().length > 0 ? t('home.noResults', { query: query.trim() }) : t('home.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/recap/[id]', params: { id: item.recap.id } })}
            onLongPress={() => onDelete(item.recap)}
            delayLongPress={400}
            style={[styles.row, { borderBottomColor: c.backgroundElement }]}>
            <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
              {item.recap.title || t('app.name')}
            </Text>
            <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
              {formatDuration(item.recap.durationSeconds)} · {new Date(item.recap.startedAt).toLocaleDateString()} ·{' '}
              {t(`status.${item.recap.status}`)}
            </Text>
            {item.snippet && item.matchedIn && item.matchedIn !== 'title' ? (
              <Text style={[styles.rowSnippet, { color: c.textSecondary }]} numberOfLines={2}>
                <Text style={[styles.rowSnippetLabel, { color: '#208AEF' }]}>
                  {t(item.matchedIn === 'transcript' ? 'home.matchTranscript' : 'home.matchRecap')} ·{' '}
                </Text>
                {item.snippet}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  h1: { fontSize: 28, fontWeight: '700' },
  startButton: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  quota: { textAlign: 'center', marginTop: Spacing.two, fontSize: 13 },
  search: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  sectionLabel: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.four,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  empty: { marginTop: Spacing.four, fontSize: 15, lineHeight: 22 },
  row: { paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  rowSnippet: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  rowSnippetLabel: { fontWeight: '600' },
});
