import { type SpeakerGroup, type TranscriptSegment, formatTimestamp } from '@ai-recap/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

interface Palette {
  text: string;
  textSecondary: string;
  backgroundElement: string;
  backgroundSelected: string;
}

export function TranscriptView({
  groups,
  nameFor,
  palette,
  selectedId,
  onSeek,
}: {
  groups: SpeakerGroup[];
  nameFor: (label: string | null) => string;
  palette: Palette;
  selectedId: string | null;
  onSeek: (segment: TranscriptSegment) => void;
}) {
  return (
    <View style={styles.container}>
      {groups.map((group, gi) => {
        const name = nameFor(group.speakerLabel);
        return (
          <View key={gi} style={styles.group}>
            {name ? <Text style={[styles.speaker, { color: palette.text }]}>{name}</Text> : null}
            {group.segments.map((seg) => {
              const selected = seg.id === selectedId;
              return (
                <Pressable
                  key={seg.id}
                  onPress={() => onSeek(seg)}
                  style={[styles.row, selected && { backgroundColor: palette.backgroundSelected }]}>
                  <View style={styles.metaCol}>
                    <Text style={[styles.time, { color: palette.textSecondary }]}>{formatTimestamp(seg.startTime)}</Text>
                    {seg.language ? (
                      <Text style={[styles.lang, { color: palette.textSecondary, backgroundColor: palette.backgroundElement }]}>
                        {seg.language.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.text, { color: palette.text }]}>{seg.text}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  group: { gap: Spacing.one },
  speaker: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one, paddingHorizontal: Spacing.one, borderRadius: 8 },
  metaCol: { width: 52, alignItems: 'flex-start', gap: 2 },
  time: { fontSize: 12, fontVariant: ['tabular-nums'] },
  lang: { fontSize: 10, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden' },
  text: { flex: 1, fontSize: 15, lineHeight: 21 },
});
