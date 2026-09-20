/**
 * Konteksti (HANDOFF.md §5.5): caption + title + round "+" button; "Mani" as cards with vocabulary
 * chips; "Iebūvētie" as rows with an icon tile and a localized description.
 */
import type { Context } from '@ai-recap/core';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { contextsRepo } from '../../db';
import { Card, IconButton, IconTile, Rise, SectionLabel, TermChip } from '../../design/components';
import { Icon } from '../../design/icons';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { builtinDescription, builtinIcon, builtinOrder } from '../../features/contexts/builtinMeta';

export default function ContextsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();
  const [contexts, setContexts] = useState<Context[]>([]);

  useFocusEffect(
    useCallback(() => {
      contextsRepo
        .listContexts()
        .then(setContexts)
        .catch(() => setContexts([]));
    }, []),
  );

  const mine = contexts.filter((c) => !c.isBuiltIn);
  const builtIn = contexts.filter((c) => c.isBuiltIn).sort((a, b) => builtinOrder(a.id) - builtinOrder(b.id));
  const open = (id: string) => router.push({ pathname: '/context/[id]', params: { id } });
  let rise = 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Rise index={rise++} style={styles.header}>
          <View style={{ gap: 2 }}>
            <Text style={[Type.meta, { color: th.text2 }]}>{t('ui.contextsCaption')}</Text>
            <Text style={[Type.screenTitle, { color: th.text }]}>{t('tabs.contexts')}</Text>
          </View>
          <IconButton
            name="plus"
            accessibilityLabel={t('ui.newContext')}
            onPress={() => open('new')}
            background={th.primaryBtn}
            color={th.onPrimaryBtn}
            strokeWidth={2.2}
            style={{ marginBottom: 2 }}
          />
        </Rise>

        <View style={{ gap: 8 }}>
          <Rise index={rise++}>
            <SectionLabel>{t('ui.mine')}</SectionLabel>
          </Rise>
          {mine.length === 0 ? (
            <Rise index={rise++}>
              <Text style={[Type.meta, { color: th.text2, paddingHorizontal: 2 }]}>{t('contexts.empty')}</Text>
            </Rise>
          ) : null}
          {mine.map((c) => (
            <Rise key={c.id} index={rise++}>
              <Pressable onPress={() => open(c.id)}>
                <Card style={{ gap: 10 }}>
                  <View style={styles.between}>
                    <Text style={[Type.body, { fontSize: 18, fontFamily: 'HankenGrotesk_600SemiBold', color: th.text }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Icon name="chevronRight" size={18} color={th.text3} />
                  </View>
                  {c.summary ? (
                    <Text style={[Type.meta, { fontSize: 14, lineHeight: 20, color: th.text2 }]} numberOfLines={2}>
                      {c.summary}
                    </Text>
                  ) : null}
                  {c.vocabulary.length > 0 || c.instructions ? (
                    <View style={styles.chips}>
                      {c.vocabulary.slice(0, 6).map((v) => (
                        <TermChip key={v} label={v.split('=')[0]?.trim() || v} />
                      ))}
                      {c.instructions ? <Text style={[Type.caption, { color: th.text2, paddingVertical: 5, paddingHorizontal: 4 }]}>{t('ui.plusInstructions')}</Text> : null}
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            </Rise>
          ))}
        </View>

        <View>
          <Rise index={rise++}>
            <SectionLabel style={{ paddingBottom: 8 }}>{t('ui.builtIn')}</SectionLabel>
          </Rise>
          {builtIn.map((c, i) => (
            <Rise key={c.id} index={rise++}>
              <Pressable
                onPress={() => open(c.id)}
                style={({ pressed }) => [styles.row, { borderBottomColor: th.line, borderBottomWidth: i === builtIn.length - 1 ? 0 : 1, opacity: pressed ? 0.6 : 1 }]}>
                <IconTile name={builtinIcon(c.id)} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[Type.body, { color: th.text }]}>{c.name}</Text>
                  <Text style={[Type.meta, { color: th.text2 }]} numberOfLines={1}>
                    {builtinDescription(c.id, t) || c.summary}
                  </Text>
                </View>
                <Icon name="chevronRight" size={18} color={th.text3} />
              </Pressable>
            </Rise>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 12, paddingBottom: Layout.tabBarClearance, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
});
