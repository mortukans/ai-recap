import type { Context } from '@ai-recap/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { contextsRepo } from '../../db';

export default function ContextsScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [contexts, setContexts] = useState<Context[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          setContexts(await contextsRepo.listContexts());
        } catch {
          setContexts([]);
        }
      })();
    }, []),
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top']}>
      <Text style={[styles.h1, { color: c.text }]}>{t('contexts.title')}</Text>
      <FlatList
        data={contexts}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textSecondary }]}>{t('contexts.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: c.backgroundElement }]}>
            <View style={styles.rowHead}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{item.name}</Text>
              {item.isBuiltIn && (
                <Text style={[styles.badge, { color: c.textSecondary, borderColor: c.backgroundSelected }]}>
                  {t('contexts.builtIn')}
                </Text>
              )}
            </View>
            {item.summary ? (
              <Text style={[styles.rowMeta, { color: c.textSecondary }]} numberOfLines={2}>
                {item.summary}
              </Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  h1: { fontSize: 28, fontWeight: '700', paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  listContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  empty: { fontSize: 15, lineHeight: 22 },
  row: { paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowTitle: { fontSize: 17, fontWeight: '600' },
  badge: {
    fontSize: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  rowMeta: { fontSize: 13, marginTop: 2 },
});
