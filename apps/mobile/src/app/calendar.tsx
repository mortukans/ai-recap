/**
 * Calendar (beta) — an agenda of dates extracted from recaps. Upcoming appointments/deadlines first
 * (nearest first), then past ones (most recent first), grouped by day with a date badge. Tap an event
 * to open its recap. Populated by the launch-time backfill (scanAllRecaps) and the per-recap "Add to
 * calendar" button; if the list is empty but there are unscanned recaps, we scan on open.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { type CalendarEvent, calendarRepo, recapsRepo } from '../db';
import { Dot, IconButton, Rise, SectionLabel } from '../design/components';
import { Icon } from '../design/icons';
import { clock, longDate } from '../design/format';
import { Layout } from '../design/tokens';
import { Type } from '../design/typography';
import { useTheme } from '../design/useTheme';
import { scanAllRecapsForDates } from '../features/calendar/scanAllRecaps';
import i18n from '../i18n';

function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Agenda day heading: Today / Tomorrow, else "Sunday, 20 September". */
function dayHeading(ms: number): string {
  const now = Date.now();
  if (sameDay(ms, now)) return i18n.t('calendar.today');
  if (sameDay(ms, now + 86_400_000)) return i18n.t('calendar.tomorrow');
  return longDate(ms);
}

function monthShort(ms: number): string {
  const lang = i18n.language?.startsWith('lv') ? 'lv-LV' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(lang, { month: 'short' }).format(new Date(ms)).replace('.', '').toUpperCase();
  } catch {
    return '';
  }
}

interface DayGroup {
  key: number;
  heading: string;
  events: CalendarEvent[];
}

/** Bucket events into day groups, each sorted by time; group order follows the input order. */
function groupByDay(events: CalendarEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const ev of events) {
    const dayKey = startOfToday(ev.startAt);
    const last = groups[groups.length - 1];
    if (last && last.key === dayKey) last.events.push(ev);
    else groups.push({ key: dayKey, heading: dayHeading(ev.startAt), events: [ev] });
  }
  return groups;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useTheme();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [all, recaps] = await Promise.all([calendarRepo.listEvents(), recapsRepo.pageRecaps({ limit: 500 })]);
      setEvents(all);
      setTitles(Object.fromEntries(recaps.map((r) => [r.id, r.title])));
      return all.length;
    } catch {
      setEvents([]);
      return 0;
    } finally {
      setLoaded(true);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await scanAllRecapsForDates(50);
      await load();
    } finally {
      setScanning(false);
    }
  }, [scanning, load]);

  // On open: load; if nothing yet but recaps exist to scan, scan once so the calendar fills on first view.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const n = await load();
        if (!active || n > 0) return;
        const pending = await calendarRepo.listUnscannedReadyRecapIds(1).catch(() => []);
        if (active && pending.length > 0) void runScan();
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRemove = useCallback(
    (ev: CalendarEvent) => {
      Alert.alert(t('calendar.removeTitle'), ev.title, [
        { text: t('ui.cancel'), style: 'cancel' },
        { text: t('calendar.remove'), style: 'destructive', onPress: () => void calendarRepo.deleteEvent(ev.id).then(() => load()) },
      ]);
    },
    [t, load],
  );

  const todayStart = startOfToday();
  const upcoming = events.filter((e) => e.startAt >= todayStart); // already ascending from the repo
  const past = events.filter((e) => e.startAt < todayStart).reverse(); // most recent first
  const upcomingGroups = groupByDay(upcoming);
  const pastGroups = groupByDay(past);

  const typeColor = (type: CalendarEvent['type']) => (type === 'deadline' ? th.destructive : type === 'mention' ? th.text2 : th.accentText);

  const renderEvent = (ev: CalendarEvent) => (
    <Pressable
      key={ev.id}
      onPress={() => router.push({ pathname: '/recap/[id]', params: { id: ev.recapId } })}
      onLongPress={() => onRemove(ev)}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${ev.title}, ${dayHeading(ev.startAt)}${ev.allDay ? '' : `, ${clock(ev.startAt)}`}`}
      style={({ pressed }) => [styles.event, { backgroundColor: th.surface, borderColor: th.line, opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.badge, { backgroundColor: th.surface2 }]}>
        <Text style={[Type.captionStrong, { color: typeColor(ev.type), lineHeight: 20, fontSize: 17 }]}>{new Date(ev.startAt).getDate()}</Text>
        <Text style={[Type.caption, { color: th.text2, letterSpacing: 0.5 }]}>{monthShort(ev.startAt)}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[Type.body, { color: th.text }]} numberOfLines={2}>
          {ev.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[Type.caption, { color: typeColor(ev.type) }]}>{t(`calendar.type.${ev.type}`)}</Text>
          {!ev.allDay ? (
            <>
              <Dot />
              <Text style={[Type.caption, { color: th.text2 }]}>{clock(ev.startAt)}</Text>
            </>
          ) : null}
          {titles[ev.recapId] ? (
            <>
              <Dot />
              <Text style={[Type.caption, { color: th.text2, flexShrink: 1 }]} numberOfLines={1}>
                {titles[ev.recapId]}
              </Text>
            </>
          ) : null}
        </View>
        {ev.note ? (
          <Text style={[Type.caption, { color: th.text2 }]} numberOfLines={2}>
            {ev.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  let rise = 0;
  const isEmpty = loaded && events.length === 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.nav}>
        <IconButton name="chevronLeft" iconSize={24} accessibilityLabel={t('ui.back')} onPress={() => router.back()} style={{ marginLeft: -10 }} strokeWidth={2} />
        <Text style={[Type.body, { color: th.text }]}>
          {t('calendar.title')} <Text style={{ color: th.accentText }}>· {t('calendar.beta')}</Text>
        </Text>
        <IconButton name="refresh" accessibilityLabel={t('calendar.rescan')} onPress={() => void runScan()} style={{ marginRight: -10 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}>
        {scanning ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <Icon name="refresh" size={16} color={th.accentText} />
              <Text style={[Type.meta, { color: th.text2, flex: 1 }]}>{t('calendar.scanning')}</Text>
            </View>
          </Rise>
        ) : null}

        {isEmpty && !scanning ? (
          <Rise index={rise++}>
            <View style={{ alignItems: 'center', gap: 10, marginTop: 48, paddingHorizontal: 24 }}>
              <Icon name="info" size={22} color={th.text3} />
              <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center' }]}>{t('calendar.empty')}</Text>
            </View>
          </Rise>
        ) : null}

        {upcomingGroups.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Rise index={rise++}>
              <SectionLabel>{t('calendar.upcoming')}</SectionLabel>
            </Rise>
            {upcomingGroups.map((g) => (
              <View key={`u${g.key}`} style={{ gap: 8 }}>
                <Rise index={rise++}>
                  <Text style={[Type.metaStrong, { color: th.text }]}>{g.heading}</Text>
                </Rise>
                <Rise index={rise++} style={{ gap: 8 }}>
                  {g.events.map(renderEvent)}
                </Rise>
              </View>
            ))}
          </View>
        ) : null}

        {pastGroups.length > 0 ? (
          <View style={{ gap: 10, marginTop: upcomingGroups.length > 0 ? 8 : 0 }}>
            <Rise index={rise++}>
              <SectionLabel>{t('calendar.past')}</SectionLabel>
            </Rise>
            {pastGroups.map((g) => (
              <View key={`p${g.key}`} style={{ gap: 8 }}>
                <Rise index={rise++}>
                  <Text style={[Type.metaStrong, { color: th.text2 }]}>{g.heading}</Text>
                </Rise>
                <Rise index={rise++} style={{ gap: 8 }}>
                  {g.events.map(renderEvent)}
                </Rise>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding, height: 52 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 6, gap: 18 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  badge: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
