/** Sheet listing all contexts (mine first, then built-ins) for a quick switch. */
import type { Context } from '@ai-recap/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contextsRepo } from '../../db';
import { Icon } from '../../design/icons';
import { Sheet } from '../../design/Sheet';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { builtinDescription } from './builtinMeta';

export function ContextPicker({
  visible,
  onClose,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [contexts, setContexts] = useState<Context[]>([]);

  useEffect(() => {
    if (!visible) return;
    contextsRepo
      .listContexts()
      .then((all) => setContexts([...all.filter((c) => !c.isBuiltIn), ...all.filter((c) => c.isBuiltIn)]))
      .catch(() => setContexts([]));
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title={tr('contexts.selectLabel')}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 2 }}>
        {contexts.map((c) => {
          const selected = c.id === selectedId;
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                onSelect(c.id);
                onClose();
              }}
              style={({ pressed }) => [styles.row, { borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.body, { color: t.text }]}>{c.name}</Text>
                <Text style={[Type.meta, { color: t.text2 }]} numberOfLines={1}>
                  {c.isBuiltIn ? builtinDescription(c.id, tr) : c.summary}
                </Text>
              </View>
              {selected ? <Icon name="check" size={18} color={t.accentText} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
});
