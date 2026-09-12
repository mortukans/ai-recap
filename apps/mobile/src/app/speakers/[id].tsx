import { type RecapSpeaker, type SpeakerProfile, resolveSpeakerName } from '@ai-recap/core';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useSpeakers } from '../../features/speakers/useSpeakers';

interface Palette {
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
}

function SpeakerCard({
  speaker,
  profiles,
  samples,
  palette,
  onRename,
  onSaveAsPerson,
  onAssign,
}: {
  speaker: RecapSpeaker;
  profiles: SpeakerProfile[];
  samples: string[];
  palette: Palette;
  onRename: (name: string) => void;
  onSaveAsPerson: (name: string) => void;
  onAssign: (profile: SpeakerProfile) => void;
}) {
  const { t } = useTranslation();
  const linked = profiles.find((p) => p.id === speaker.speakerProfileId) ?? null;
  const [name, setName] = useState(resolveSpeakerName(speaker, linked?.displayName));

  return (
    <View style={[styles.card, { backgroundColor: palette.backgroundElement }]}>
      <Text style={[styles.label, { color: palette.textSecondary }]}>{speaker.diarizedLabel}</Text>

      {samples.map((s, i) => (
        <Text key={i} style={[styles.sample, { color: palette.textSecondary }]} numberOfLines={2}>
          “{s}”
        </Text>
      ))}

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t('speakers.namePlaceholder')}
        placeholderTextColor={palette.textSecondary}
        style={[styles.input, { backgroundColor: palette.background, color: palette.text }]}
      />

      <View style={styles.buttonRow}>
        <Pressable onPress={() => onRename(name)} style={[styles.btn, { backgroundColor: '#208AEF' }]}>
          <Text style={styles.btnText}>{t('speakers.save')}</Text>
        </Pressable>
        <Pressable onPress={() => onSaveAsPerson(name)} style={[styles.btn, { backgroundColor: palette.backgroundSelected }]}>
          <Text style={[styles.btnText, { color: palette.text }]}>{t('speakers.saveAsPerson')}</Text>
        </Pressable>
      </View>

      {profiles.length > 0 ? (
        <>
          <Text style={[styles.savedLabel, { color: palette.textSecondary }]}>{t('speakers.savedPeople')}</Text>
          <View style={styles.chipRow}>
            {profiles.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setName(p.displayName);
                  onAssign(p);
                }}
                style={[styles.chip, { backgroundColor: palette.backgroundSelected }]}>
                <Text style={[styles.chipText, { color: palette.text }]}>{p.displayName}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function SpeakersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { speakers, profiles, samples, rename, assignProfile, saveAsProfile } = useSpeakers(id ?? '');

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('speakers.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {speakers.length === 0 ? (
          <Text style={[styles.empty, { color: c.textSecondary }]}>{t('speakers.empty')}</Text>
        ) : (
          speakers.map((sp) => (
            <SpeakerCard
              key={sp.id}
              speaker={sp}
              profiles={profiles}
              samples={samples[sp.diarizedLabel] ?? []}
              palette={c}
              onRename={(name) => rename(sp.id, name)}
              onSaveAsPerson={(name) => saveAsProfile(sp, name)}
              onAssign={(p) => assignProfile(sp.id, p)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 15 },
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  label: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  sample: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  input: { height: 44, borderRadius: 12, paddingHorizontal: Spacing.three, marginTop: Spacing.one },
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  btn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  savedLabel: { fontSize: 12, marginTop: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  chipText: { fontSize: 14 },
});
