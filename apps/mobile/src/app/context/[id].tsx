import type { Context } from '@ai-recap/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { contextsRepo } from '../../db';
import { newId } from '../../lib/ids';

export default function ContextEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const isNew = !id || id === 'new';
  const [existing, setExisting] = useState<Context | null>(null);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [vocab, setVocab] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const ctx = await contextsRepo.getContext(id);
      if (ctx) {
        setExisting(ctx);
        setName(ctx.name);
        setSummary(ctx.summary);
        setVocab(ctx.vocabulary.join('\n'));
        setInstructions(ctx.instructions);
      }
    })();
  }, [id, isNew]);

  const canDelete = existing !== null && !existing.isBuiltIn;

  const onSave = async () => {
    if (!name.trim()) return;
    const now = Date.now();
    const ctx: Context = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      summary: summary.trim(),
      vocabulary: vocab
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
      instructions: instructions.trim(),
      isBuiltIn: existing?.isBuiltIn ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await contextsRepo.upsertContext(ctx);
    router.back();
  };

  const onDelete = async () => {
    if (existing && !existing.isBuiltIn) {
      await contextsRepo.deleteContext(existing.id);
      router.back();
    }
  };

  const field = (label: string, value: string, setter: (v: string) => void, placeholder: string, multiline = false) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { backgroundColor: c.backgroundElement, color: c.text },
        ]}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: isNew ? t('contexts.newContext') : t('contexts.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {field(t('contexts.name'), name, setName, t('contexts.namePlaceholder'))}
        {field(t('contexts.description'), summary, setSummary, t('contexts.descriptionPlaceholder'))}
        {field(t('contexts.vocabulary'), vocab, setVocab, t('contexts.vocabularyPlaceholder'), true)}
        {field(t('contexts.instructions'), instructions, setInstructions, t('contexts.instructionsPlaceholder'), true)}

        <Pressable onPress={onSave} style={[styles.save, { backgroundColor: '#208AEF', opacity: name.trim() ? 1 : 0.5 }]}>
          <Text style={styles.saveText}>{t('contexts.save')}</Text>
        </Pressable>
        {canDelete ? (
          <Pressable onPress={onDelete} style={styles.delete}>
            <Text style={[styles.deleteText, { color: '#E5484D' }]}>{t('contexts.delete')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  field: { gap: Spacing.one },
  label: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { minHeight: 44, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: 12 },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  save: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.two },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  delete: { alignItems: 'center', paddingVertical: Spacing.three },
  deleteText: { fontSize: 16 },
});
