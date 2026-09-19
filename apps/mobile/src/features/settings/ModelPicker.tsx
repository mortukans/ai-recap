/**
 * Searchable model picker fed by the live OpenRouter model list (MVP task M5-4). Optional
 * `requireModality` narrows the list, e.g. 'audio' for transcription-capable models.
 */
import type { LlmModel } from '../../ai';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

interface Palette {
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
}

interface Props {
  visible: boolean;
  title: string;
  models: LlmModel[];
  selectedId: string;
  requireModality?: string;
  palette: Palette;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ModelPicker({ visible, title, models, selectedId, requireModality, palette: c, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return models
      .filter((m) => !requireModality || (m.inputModalities ?? []).includes(requireModality))
      .filter((m) => q.length === 0 || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [models, filter, requireModality]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.fill, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
        </View>
        <TextInput
          placeholder={t('settings.searchModels')}
          placeholderTextColor={c.textSecondary}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={[styles.search, { backgroundColor: c.backgroundElement, color: c.text }]}
        />
        <Text style={[styles.count, { color: c.textSecondary }]}>
          {items.length} {requireModality ? `${requireModality}-capable ` : ''}models
        </Text>
        <FlatList
          data={items}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                style={[styles.row, { borderBottomColor: c.backgroundElement }]}>
                <View style={styles.fill}>
                  <Text style={[styles.rowName, { color: c.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.rowId, { color: c.textSecondary }]} numberOfLines={1}>
                    {item.id}
                    {item.contextLength ? ` · ${Math.round(item.contextLength / 1000)}k ctx` : ''}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark" size={20} color="#208AEF" /> : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 20, fontWeight: '700' },
  search: { marginHorizontal: Spacing.four, height: 44, borderRadius: 12, paddingHorizontal: Spacing.three },
  count: { marginHorizontal: Spacing.four, marginTop: Spacing.two, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 16, fontWeight: '500' },
  rowId: { fontSize: 12, marginTop: 2 },
});
