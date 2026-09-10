import { type AudioChunk, type Recap, formatDuration } from '@ai-recap/core';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { chunksRepo, recapsRepo } from '../../db';

export default function RecapDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [recap, setRecap] = useState<Recap | null>(null);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setRecap(await recapsRepo.getRecap(id));
        setChunks(await chunksRepo.listChunks(id));
      } catch {
        /* db not ready */
      }
    })();
  }, [id]);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.h1, { color: c.text }]}>{recap?.title || t('app.name')}</Text>
        {recap && (
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {formatDuration(recap.durationSeconds)} · {t(`status.${recap.status}`)} · {chunks.length} chunks
          </Text>
        )}

        <View style={[styles.card, { backgroundColor: c.backgroundElement }]}>
          <Text style={[styles.cardText, { color: c.textSecondary }]}>
            Transcript, structured recap, and Ask-AI arrive with MVP milestones M2–M4. Audio is recorded
            and stored locally in chunks now.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  h1: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 14 },
  card: { borderRadius: 16, padding: Spacing.four, marginTop: Spacing.three },
  cardText: { fontSize: 15, lineHeight: 22 },
});
