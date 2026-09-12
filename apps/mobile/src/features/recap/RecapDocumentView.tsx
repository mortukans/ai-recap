import { type RecapDocument, formatTimestamp } from '@ai-recap/core';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

interface Palette {
  text: string;
  textSecondary: string;
  backgroundElement: string;
}

function Citations({ refs, palette }: { refs: number[]; palette: Palette }) {
  if (refs.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {refs.map((r, i) => (
        <Text key={`${r}-${i}`} style={[styles.chip, { color: palette.textSecondary, backgroundColor: palette.backgroundElement }]}>
          {formatTimestamp(r)}
        </Text>
      ))}
    </View>
  );
}

function Section({ title, palette, children }: { title: string; palette: Palette; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

export function RecapDocumentView({ doc, palette }: { doc: RecapDocument; palette: Palette }) {
  return (
    <View style={styles.container}>
      {doc.summary ? (
        <Section title="Summary" palette={palette}>
          <Text style={[styles.body, { color: palette.text }]}>{doc.summary}</Text>
        </Section>
      ) : null}

      {doc.decisions.length > 0 ? (
        <Section title="Decisions" palette={palette}>
          {doc.decisions.map((d, i) => (
            <View key={i} style={styles.item}>
              <Text style={[styles.body, { color: palette.text }]}>• {d.text}</Text>
              <Citations refs={d.timestampRefs} palette={palette} />
            </View>
          ))}
        </Section>
      ) : null}

      {doc.actionItems.length > 0 ? (
        <Section title="Action Items" palette={palette}>
          {doc.actionItems.map((a, i) => (
            <View key={i} style={styles.item}>
              <Text style={[styles.body, { color: palette.text }]}>
                ☐ {a.task}
                {a.owner ? `  — ${a.owner}` : ''}
                {a.deadline ? `  (${a.deadline})` : ''}
              </Text>
              <Citations refs={a.timestampRefs} palette={palette} />
            </View>
          ))}
        </Section>
      ) : null}

      {doc.importantDates.length > 0 ? (
        <Section title="Important Dates" palette={palette}>
          {doc.importantDates.map((d, i) => (
            <View key={i} style={styles.item}>
              <Text style={[styles.body, { color: palette.text }]}>
                • {d.text}
                {d.date ? `  (${d.date})` : ''}
              </Text>
              <Citations refs={d.timestampRefs} palette={palette} />
            </View>
          ))}
        </Section>
      ) : null}

      {doc.openQuestions.length > 0 ? (
        <Section title="Open Questions" palette={palette}>
          {doc.openQuestions.map((q, i) => (
            <Text key={i} style={[styles.body, { color: palette.text }]}>
              • {q}
            </Text>
          ))}
        </Section>
      ) : null}

      {doc.topics.length > 0 ? (
        <Section title="Topics" palette={palette}>
          <View style={styles.chipRow}>
            {doc.topics.map((t, i) => (
              <Text key={i} style={[styles.topic, { color: palette.text, backgroundColor: palette.backgroundElement }]}>
                {t}
              </Text>
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.four },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { fontSize: 15, lineHeight: 22 },
  item: { gap: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { fontSize: 12, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  topic: { fontSize: 13, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
});
