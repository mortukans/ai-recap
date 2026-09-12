import { type TranscriptSegment, formatTranscriptText } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { PLAINTEXT, exportTextFile, safeFilename } from '../../features/share/shareService';
import { TranscriptView } from '../../features/transcript/TranscriptView';
import { useTranscript } from '../../features/transcript/useTranscript';

export default function TranscriptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { groups, segments, nameFor, detectedLanguages } = useTranscript(id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tapping a line will seek audio once on-device recording exists (M1-9); for now it highlights.
  const onSeek = (segment: TranscriptSegment) => setSelectedId(segment.id);

  const onExport = () =>
    exportTextFile(`${safeFilename('transcript')}.txt`, formatTranscriptText(segments, nameFor), PLAINTEXT.mime, PLAINTEXT.uti);

  const isEmpty = groups.length === 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('transcript.title'),
          headerRight: () =>
            segments.length > 0 ? (
              <Pressable onPress={onExport} hitSlop={8}>
                <Ionicons name="share-outline" size={22} color={c.text} />
              </Pressable>
            ) : null,
        }}
      />

      <View style={[styles.playbackBar, { backgroundColor: c.backgroundElement }]}>
        <Ionicons name="play-circle-outline" size={22} color={c.textSecondary} />
        <Text style={[styles.playbackText, { color: c.textSecondary }]}>{t('transcript.noAudio')}</Text>
        {detectedLanguages.length > 0 ? (
          <Text style={[styles.langs, { color: c.textSecondary }]}>{detectedLanguages.join(' · ').toUpperCase()}</Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isEmpty ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('transcript.empty')}</Text>
        ) : (
          <TranscriptView groups={groups} nameFor={nameFor} palette={c} selectedId={selectedId} onSeek={onSeek} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  playbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  playbackText: { flex: 1, fontSize: 13 },
  langs: { fontSize: 12, letterSpacing: 0.5 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 15 },
});
