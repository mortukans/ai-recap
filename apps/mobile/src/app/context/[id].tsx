/**
 * Jauns konteksts / context editor (HANDOFF.md §5.6). Nav: "‹ Atcelt" + "Saglabāt" pill; fields with
 * 13/600 labels; vocabulary as a structured "Term · explanation" list with an input row; instructions;
 * amber callout. Storage format is unchanged ("Term = explanation" per line).
 */
import type { Context } from '@ai-recap/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { contextsRepo } from '../../db';
import { Button, Callout, Input, Rise, SectionLabel } from '../../design/components';
import { Icon } from '../../design/icons';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { newId } from '../../lib/ids';

export default function ContextEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();

  const isNew = !id || id === 'new';
  const [existing, setExisting] = useState<Context | null>(null);
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [terms, setTerms] = useState<string[]>([]);
  const [termDraft, setTermDraft] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (isNew || !id) return;
    contextsRepo.getContext(id).then((ctx) => {
      if (!ctx) return;
      setExisting(ctx);
      setName(ctx.name);
      setSummary(ctx.summary);
      setTerms(ctx.vocabulary);
      setInstructions(ctx.instructions);
    });
  }, [id, isNew]);

  const commitTermDraft = (): string[] => {
    const extra = termDraft
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (extra.length === 0) return terms;
    const next = [...terms, ...extra];
    setTerms(next);
    setTermDraft('');
    return next;
  };

  const onSave = async () => {
    if (!name.trim()) return;
    const vocabulary = commitTermDraft();
    const now = Date.now();
    const ctx: Context = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      summary: summary.trim(),
      vocabulary,
      instructions: instructions.trim(),
      isBuiltIn: existing?.isBuiltIn ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await contextsRepo.upsertContext(ctx);
    router.back();
  };

  const onDuplicate = async () => {
    if (!existing) return;
    const now = Date.now();
    const copy: Context = { ...existing, id: newId(), name: t('contexts.copyName', { name: existing.name }), isBuiltIn: false, createdAt: now, updatedAt: now };
    await contextsRepo.upsertContext(copy);
    router.replace({ pathname: '/context/[id]', params: { id: copy.id } });
  };

  const onDelete = () => {
    if (!existing || existing.isBuiltIn) return;
    Alert.alert(t('contexts.delete'), existing.name, [
      { text: t('ui.cancel'), style: 'cancel' },
      {
        text: t('contexts.delete'),
        style: 'destructive',
        onPress: () => void contextsRepo.deleteContext(existing.id).then(() => router.back()),
      },
    ]);
  };

  const splitTerm = (line: string): [string, string] => {
    const i = line.indexOf('=');
    if (i < 0) return [line.trim(), ''];
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  };

  let rise = 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top', 'bottom']}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.cancel} hitSlop={8} accessibilityRole="button">
          <Icon name="chevronLeft" size={22} color={th.text2} />
          <Text style={[Type.input15, { color: th.text2 }]}>{t('ui.cancel')}</Text>
        </Pressable>
        <Button label={t('ui.save')} height={40} onPress={() => void onSave()} disabled={!name.trim()} style={{ paddingHorizontal: 18 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <Rise index={rise++} style={{ gap: 6 }}>
          <Text style={[Type.formTitle, { color: th.text }]}>{isNew ? t('ui.newContext') : existing?.isBuiltIn ? existing.name : t('ui.editContext')}</Text>
          <Text style={[Type.meta, { fontSize: 14, lineHeight: 20, color: th.text2 }]}>{t('ui.contextHelper')}</Text>
        </Rise>

        <View style={{ gap: 14 }}>
          <Rise index={rise++} style={{ gap: 8 }}>
            <SectionLabel>{t('ui.nameLabel')}</SectionLabel>
            <Input value={name} onChangeText={setName} placeholder={t('contexts.namePlaceholder')} autoFocus={isNew} returnKeyType="done" />
          </Rise>

          <Rise index={rise++} style={{ gap: 8 }}>
            <SectionLabel>{t('ui.forWhat')}</SectionLabel>
            <Input value={summary} onChangeText={setSummary} placeholder={t('ui.forWhatPlaceholder')} returnKeyType="done" />
          </Rise>

          <Rise index={rise++} style={{ gap: 8 }}>
            <SectionLabel right={<Text style={[Type.caption, { color: th.text2 }]}>{t('ui.oneTermPerLine')}</Text>}>{t('ui.vocabulary')}</SectionLabel>
            <View style={[styles.vocab, { backgroundColor: th.surface, borderColor: th.line }]}>
              {terms.map((line, i) => {
                const [term, expl] = splitTerm(line);
                return (
                  <View key={`${line}-${i}`} style={[styles.termRow, { borderBottomColor: th.line }]}>
                    <Text style={[Type.buttonSmall, { color: th.accentText, minWidth: 56 }]}>{term}</Text>
                    <Text style={[Type.input15, { color: th.text2, flex: 1 }]} numberOfLines={2}>
                      {expl}
                    </Text>
                    <Pressable onPress={() => setTerms(terms.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={t('ui.delete')}>
                      <Icon name="close" size={16} color={th.text3} />
                    </Pressable>
                  </View>
                );
              })}
              <TextInput
                value={termDraft}
                onChangeText={setTermDraft}
                onBlur={commitTermDraft}
                onSubmitEditing={commitTermDraft}
                blurOnSubmit={false}
                returnKeyType="done"
                placeholder={t('ui.termPlaceholder')}
                placeholderTextColor={th.text3}
                autoCapitalize="none"
                style={[Type.input15, { color: th.text, paddingHorizontal: 16, paddingVertical: 12 }]}
              />
            </View>
          </Rise>

          <Rise index={rise++} style={{ gap: 8 }}>
            <SectionLabel>{t('ui.howToWrite')}</SectionLabel>
            <Input
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t('ui.howToWritePlaceholder')}
              multiline
              height={112}
              style={[Type.bodyText, { color: th.text }]}
            />
          </Rise>
        </View>

        <Rise index={rise++}>
          <Callout>{t('ui.vocabHint')}</Callout>
        </Rise>

        {existing ? (
          <Rise index={rise++} style={{ gap: 4, marginTop: 8 }}>
            <Button label={t('contexts.duplicate')} variant="ghost" height={44} onPress={() => void onDuplicate()} textStyle={{ color: th.accentText }} />
            {!existing.isBuiltIn ? <Button label={t('contexts.delete')} variant="destructive" height={44} onPress={onDelete} /> : null}
          </Rise>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 6, height: 56 },
  cancel: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 44, paddingRight: 8 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 8, paddingBottom: 40, gap: 22 },
  vocab: { borderWidth: 1, borderRadius: Layout.inputRadius, overflow: 'hidden' },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
});
