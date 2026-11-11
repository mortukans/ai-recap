/**
 * Kopsavilkums body (HANDOFF.md §5.3): Newsreader lead paragraph, then 13-pt section labels —
 * Lēmumi as amber-dot bullets, Uzdevumi as checkbox cards, plus dates / open questions / topics.
 * Sections rise in 80 ms apart; a completed checkbox plays the check-draw animation once.
 */
import { type RecapDocument, formatTimestamp } from '@ai-recap/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Rise, SectionLabel } from '../../design/components';
import { Icon } from '../../design/icons';
import { Lottie } from '../../design/Lottie';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { isoDateLabel } from '../calendar/agendaLabels';
import { getDoneTasks, setDoneTasks } from '../../lib/prefs';

export function SummaryBody({ doc, recapId, onSeek }: { doc: RecapDocument; recapId: string; onSeek?: (seconds: number) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [justDone, setJustDone] = useState<number | null>(null);

  useEffect(() => {
    void getDoneTasks(recapId).then((d) => setDone(new Set(d)));
  }, [recapId]);

  const toggle = (i: number) => {
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else {
      next.add(i);
      setJustDone(i);
    }
    setDone(next);
    void setDoneTasks(recapId, [...next]);
  };

  const refs = (r: number[]) =>
    r.length > 0 && onSeek ? (
      <Pressable onPress={() => onSeek(r[0]!)} hitSlop={6}>
        <Text style={[Type.captionStrong, { color: t.accentText }]}>{formatTimestamp(r[0]!)}</Text>
      </Pressable>
    ) : null;

  let rise = 0;
  return (
    <View style={{ gap: 18 }}>
      {doc.summary ? (
        <Rise index={rise++} step={80}>
          <Text style={[Type.summaryLead, { color: t.text }]}>{doc.summary}</Text>
        </Rise>
      ) : null}

      {doc.decisions.length > 0 ? (
        <Rise index={rise++} step={80} style={{ gap: 10 }}>
          <SectionLabel>{tr('ui.decisions')}</SectionLabel>
          {doc.decisions.map((d, i) => (
            <View key={i} style={styles.bullet}>
              <View style={[styles.dot, { backgroundColor: t.accent }]} />
              <Text style={[Type.bodyText15, { color: t.text, flex: 1 }]}>
                {d.text} {refs(d.timestampRefs)}
              </Text>
            </View>
          ))}
        </Rise>
      ) : null}

      {doc.actionItems.length > 0 ? (
        <Rise index={rise++} step={80} style={{ gap: 8 }}>
          <SectionLabel>{tr('ui.tasks')}</SectionLabel>
          {doc.actionItems.map((a, i) => {
            const isDone = done.has(i);
            // Never show a raw ISO deadline; format it to a readable date (handoff §5/§6.1).
            const sub = [a.owner, a.deadline ? isoDateLabel(a.deadline) : null].filter(Boolean).join(' · ');
            return (
              <Pressable
                key={i}
                onPress={() => toggle(i)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                style={[styles.task, { backgroundColor: t.surface, borderColor: t.line }]}>
                <View style={styles.checkbox}>
                  {isDone ? (
                    justDone === i ? (
                      <Lottie name="check-draw" loop={false} style={{ width: 22, height: 22 }} />
                    ) : (
                      <View style={[styles.checkFill, { backgroundColor: t.accent }]}>
                        <Icon name="check" size={14} color={t.onAccent} />
                      </View>
                    )
                  ) : (
                    <View style={[styles.checkEmpty, { borderColor: t.dot }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      Type.bodyText15,
                      { color: isDone ? t.text2 : t.text, textDecorationLine: isDone ? 'line-through' : 'none', textDecorationColor: t.dot },
                    ]}>
                    {a.task}
                  </Text>
                  {sub || isDone ? (
                    <Text style={[Type.caption, { color: isDone ? t.text3 : t.text2, marginTop: 2 }]}>
                      {isDone ? [a.owner, tr('ui.doneLabel')].filter(Boolean).join(' · ') : sub}
                    </Text>
                  ) : null}
                </View>
                {refs(a.timestampRefs)}
              </Pressable>
            );
          })}
        </Rise>
      ) : null}

      {/* Dates live in the recap screen's "Dates" card (anchored calendar events), not here — the
          RecapDocument's importantDates aren't date-anchored and showed raw/wrong ISO strings (§6.1). */}

      {doc.openQuestions.length > 0 ? (
        <Rise index={rise++} step={80} style={{ gap: 10 }}>
          <SectionLabel>{tr('ui.openQuestions')}</SectionLabel>
          {doc.openQuestions.map((q, i) => (
            <View key={i} style={styles.bullet}>
              <View style={[styles.dot, { backgroundColor: t.dot }]} />
              <Text style={[Type.bodyText15, { color: t.text, flex: 1 }]}>{q}</Text>
            </View>
          ))}
        </Rise>
      ) : null}

      {doc.topics.length > 0 ? (
        <Rise index={rise++} step={80} style={{ gap: 10 }}>
          <SectionLabel>{tr('ui.topics')}</SectionLabel>
          <View style={styles.chips}>
            {doc.topics.map((topic, i) => (
              <View key={i} style={[styles.topic, { backgroundColor: t.surface2 }]}>
                <Text style={[Type.captionStrong, { color: t.text }]}>{topic}</Text>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  checkbox: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  checkFill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkEmpty: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topic: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
});
