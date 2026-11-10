/**
 * Event detail sheet (beta calendar): full date/time + source recap, a reminder picker (persisted on
 * the event, travels into the .ics as a VALARM), and actions — add to the device calendar, open the
 * recap, or remove the event. No notification/calendar native module: "Add to Calendar" shares an .ics.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type CalendarEvent, calendarRepo } from '../../db';
import { Button } from '../../design/components';
import { clock, longDate } from '../../design/format';
import { Icon } from '../../design/icons';
import { Sheet } from '../../design/Sheet';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { addEventToDeviceCalendar } from './addToDeviceCalendar';

const REMINDER_OPTS: { minutes: number | null; key: string }[] = [
  { minutes: null, key: 'none' },
  { minutes: 0, key: 'atTime' },
  { minutes: 10, key: 'min10' },
  { minutes: 60, key: 'hour1' },
  { minutes: 1440, key: 'day1' },
  { minutes: 10080, key: 'week1' },
];

export function EventSheet({
  event,
  recapTitle,
  onClose,
  onChanged,
  onOpenRecap,
  onRemove,
}: {
  event: CalendarEvent | null;
  recapTitle?: string;
  onClose: () => void;
  /** Called after the reminder changes so the list can refresh its bell indicators. */
  onChanged: () => void;
  onOpenRecap: (recapId: string) => void;
  onRemove: (event: CalendarEvent) => void;
}) {
  const { t } = useTranslation();
  const th = useTheme();
  // Initialised from the event; the parent remounts this sheet per event (key={event.id}) so there is
  // no prop→state sync effect to keep this in step.
  const [reminder, setReminder] = useState<number | null>(event?.reminderMinutes ?? null);

  if (!event) return null;
  const ev = event;
  const typeColor = ev.type === 'deadline' ? th.destructive : ev.type === 'mention' ? th.text2 : th.accentText;

  const pickReminder = async (minutes: number | null) => {
    setReminder(minutes);
    await calendarRepo.setReminder(ev.id, minutes).catch(() => undefined);
    onChanged();
  };

  return (
    <Sheet visible={!!event} onClose={onClose} title={ev.title}>
      <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: ev.type === 'event' ? th.accentTint : th.surface2 }]}>
            <Text style={[Type.captionStrong, { color: typeColor }]}>{t(`calendar.type.${ev.type}`)}</Text>
          </View>
          <Text style={[Type.meta, { color: th.text2 }]}>
            {longDate(ev.startAt)}
            {ev.allDay ? ` · ${t('calendar.allDay')}` : ` · ${clock(ev.startAt)}`}
          </Text>
        </View>

        {ev.note ? <Text style={[Type.bodyText15, { color: th.text }]}>{ev.note}</Text> : null}
        {recapTitle ? (
          <Pressable onPress={() => onOpenRecap(ev.recapId)} style={[styles.recapRow, { borderColor: th.line, backgroundColor: th.surface }]}>
            <Icon name="book" size={18} color={th.accentText} />
            <Text style={[Type.meta, { color: th.text, flex: 1 }]} numberOfLines={1}>
              {recapTitle}
            </Text>
            <Icon name="chevronRight" size={16} color={th.text3} />
          </Pressable>
        ) : null}

        <View style={{ gap: 10 }}>
          <View style={styles.metaRow}>
            <Icon name="bell" size={16} color={th.text2} />
            <Text style={[Type.sectionLabel, { color: th.text2 }]}>{t('calendar.reminder')}</Text>
          </View>
          <View style={styles.chipWrap}>
            {REMINDER_OPTS.map((opt) => {
              const selected = reminder === opt.minutes;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => void pickReminder(opt.minutes)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, { backgroundColor: selected ? th.primaryBtn : th.surface, borderColor: selected ? th.primaryBtn : th.line }]}>
                  <Text style={[Type.captionStrong, { color: selected ? th.onPrimaryBtn : th.text }]}>{t(`calendar.reminderOpts.${opt.key}`)}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[Type.caption, { color: th.text3 }]}>{t('calendar.reminderHint')}</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Button
            label={t('calendar.addToDeviceCalendar')}
            height={48}
            icon="calendarPlus"
            iconColor={th.onPrimaryBtn}
            onPress={() =>
              void addEventToDeviceCalendar({ ...ev, reminderMinutes: reminder }, recapTitle).then((r) => {
                if (r === 'added') onClose();
              })
            }
          />
          <Button label={t('calendar.openRecap')} variant="secondary" height={44} icon="book" iconColor={th.accentText} onPress={() => onOpenRecap(ev.recapId)} />
          <Button label={t('calendar.remove')} variant="destructive" height={44} icon="trash" iconColor={th.destructive} onPress={() => onRemove(ev)} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
