import { type Recap, formatDuration } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { recapsRepo } from '../../db';

export default function RecapsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [recaps, setRecaps] = useState<Recap[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async (q: string) => {
    try {
      setRecaps(await recapsRepo.pageRecaps({ query: q || undefined }));
    } catch {
      setRecaps([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(query);
    }, [load, query]),
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.h1, { color: c.text }]}>{t('app.name')}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recording')}
        style={[styles.startButton, { backgroundColor: '#208AEF' }]}>
        <Ionicons name="mic" color="#fff" size={22} />
        <Text style={styles.startButtonText}>{t('home.startRecap')}</Text>
      </Pressable>

      <TextInput
        placeholder={t('home.searchPlaceholder')}
        placeholderTextColor={c.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={[styles.search, { backgroundColor: c.backgroundElement, color: c.text }]}
      />

      <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t('home.recent')}</Text>

      <FlatList
        data={recaps}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>{t('home.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/recap/[id]', params: { id: item.id } })}
            style={[styles.row, { borderBottomColor: c.backgroundElement }]}>
            <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
              {item.title || t('app.name')}
            </Text>
            <Text style={[styles.rowMeta, { color: c.textSecondary }]}>
              {formatDuration(item.durationSeconds)} · {new Date(item.startedAt).toLocaleDateString()} ·{' '}
              {t(`status.${item.status}`)}
            </Text>
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
});
