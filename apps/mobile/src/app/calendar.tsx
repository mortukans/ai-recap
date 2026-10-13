/**
 * Calendar (beta) — a polished agenda of dates extracted from recaps. A display-type header with a live
 * summary, a "Next up" hero for the nearest upcoming event, then a date-stamp timeline of upcoming days
 * (today highlighted) and a de-emphasised past section. Tap an event to open its recap; long-press to
 * remove. Populated by the launch-time backfill (scanAllRecaps) and the per-recap "Add to calendar"
 * button; if the list is empty but there are unscanned recaps, we scan on open.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { type CalendarEvent, calendarRepo, recapsRepo } from '../db';
import { Card, Dot, IconButton, ProcessingBars, Rise, SectionLabel } from '../design/components';
import { Icon } from '../design/icons';
import { clock, longDate } from '../design/format';
import { Layout } from '../design/tokens';
import { Type } from '../design/typography';
import { useTheme } from '../design/useTheme';
import { dayDiff, startOfDay } from '../features/calendar/agendaDates';
import { scanAllRecapsForDates } from '../features/calendar/scanAllRecaps';
import i18n from '../i18n';

function locale(): string {
  return i18n.language?.startsWith('lv') ? 'lv-LV' : 'en-GB';
}

function fmt(ms: number, opts: Intl.DateTimeFormatOptions, fallback = ''): string {
  try {
    return new Intl.DateTimeFormat(locale(), opts).format(new Date(ms));
  } catch {
    return fallback;
  }
}

const weekdayShort = (ms: number) => fmt(ms, { weekday: 'short' }).replace('.', '').toUpperCase();
const monthShort = (ms: number) => fmt(ms, { month: 'short' }).replace('.', '').toUpperCase();

/** Natural-language distance for the hero and group headers: Today / Tomorrow / in N days / a date. */
function relativeDay(ms: number, now: number): string {
  const d = dayDiff(ms, now);
  if (d === 0) return i18n.t('calendar.today');
  if (d === 1) return i18n.t('calendar.tomorrow');
  if (d === -1) return i18n.t('calendar.yesterday');
  if (d > 1 && d <= 14) return i18n.t('calendar.inDays', { count: d });
  if (d < -1 && d >= -14) return i18n.t('calendar.daysAgo', { count: -d });
  return longDate(ms);
}

interface DayGroup {
  key: number;
  events: CalendarEvent[];
}

/** Bucket events into day groups; group order follows the input order. */
function groupByDay(events: CalendarEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const ev of events) {
    const key = startOfDay(ev.startAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(ev);
    else groups.push({ key, events: [ev] });
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
  // Single "now" for the whole agenda (refreshed on focus, so "today" stays correct across midnight).
  // Reading the clock in state keeps it out of render, which the React Compiler requires.
  const [now, setNow] = useState(() => Date.now());

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
      setNow(Date.now());
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

  const { upcomingGroups, pastGroups, nextEvent } = useMemo(() => {
    const todayStart = startOfDay(now);
    const up = events.filter((e) => e.startAt >= todayStart); // ascending from the repo
    const pa = events.filter((e) => e.startAt < todayStart).reverse(); // most recent first
    return { upcomingGroups: groupByDay(up), pastGroups: groupByDay(pa), nextEvent: up[0] ?? null };
  }, [events, now]);

  const typeColor = useCallback(
    (type: CalendarEvent['type']) => (type === 'deadline' ? th.destructive : type === 'mention' ? th.text3 : th.accent),
    [th],
  );
  const typeTextColor = useCallback(
    (type: CalendarEvent['type']) => (type === 'deadline' ? th.destructive : type === 'mention' ? th.text2 : th.accentText),
    [th],
  );

  const EventCard = ({ ev, dim }: { ev: CalendarEvent; dim?: boolean }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/recap/[id]', params: { id: ev.recapId } })}
      onLongPress={() => onRemove(ev)}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${ev.title}, ${relativeDay(ev.startAt, now)}${ev.allDay ? '' : `, ${clock(ev.startAt)}`}`}
      style={({ pressed }) => [styles.event, { backgroundColor: th.surface, borderColor: th.line, opacity: pressed ? 0.6 : dim ? 0.78 : 1 }, th.shadows.card]}>
      <View style={[styles.accentBar, { backgroundColor: typeColor(ev.type) }]} />
      <View style={styles.eventBody}>
        <Text style={[Type.body, { color: th.text }]} numberOfLines={2}>
          {ev.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: ev.type === 'event' ? th.accentTint : th.surface2 }]}>
            <Text style={[Type.captionStrong, { color: typeTextColor(ev.type) }]}>{t(`calendar.type.${ev.type}`)}</Text>
          </View>
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
          <Icon name="chevronRight" size={14} color={th.text3} />
        </View>
        {ev.note ? (
          <Text style={[Type.caption, { color: th.text2 }]} numberOfLines={2}>
            {ev.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const DayRow = ({ group, dim }: { group: DayGroup; dim?: boolean }) => {
    const isToday = dayDiff(group.key, now) === 0;
    const stampColor = isToday ? th.accentText : dim ? th.text3 : th.text2;
    return (
      <View style={styles.dayRow}>
        <View style={styles.stamp}>
          <Text style={[Type.caption, { color: stampColor, letterSpacing: 0.6 }]}>{weekdayShort(group.key)}</Text>
          <Text style={[Type.heroNumber, { color: isToday ? th.accentText : dim ? th.text2 : th.text, lineHeight: 28 }]}>{new Date(group.key).getDate()}</Text>
          <Text style={[Type.caption, { color: stampColor, letterSpacing: 0.6 }]}>{monthShort(group.key)}</Text>
        </View>
        <View style={styles.dayEvents}>
          {group.events.map((ev) => (
            <EventCard key={ev.id} ev={ev} dim={dim} />
          ))}
        </View>
      </View>
    );
  };

  let rise = 0;
  const isEmpty = loaded && events.length === 0;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <View style={styles.nav}>
        <IconButton name="chevronLeft" iconSize={24} accessibilityLabel={t('ui.back')} onPress={() => router.back()} style={{ marginLeft: -10 }} strokeWidth={2} />
        <IconButton name="refresh" accessibilityLabel={t('calendar.rescan')} onPress={() => void runScan()} style={{ marginRight: -10 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <Rise index={rise++} style={{ gap: 4 }}>
          <View style={styles.titleRow}>
            <Text style={[Type.detailTitle, { color: th.text }]}>{t('calendar.title')}</Text>
            <View style={[styles.betaPill, { backgroundColor: th.accentTint }]}>
              <Text style={[Type.captionStrong, { color: th.accentText, letterSpacing: 0.6 }]}>{t('calendar.beta')}</Text>
            </View>
          </View>
          <Text style={[Type.meta, { color: th.text2 }]}>
            {events.length > 0 ? t('calendar.summary', { count: events.length }) : t('calendar.entrySub')}
          </Text>
        </Rise>

        {scanning ? (
          <Rise index={rise++}>
            <View style={[styles.banner, { backgroundColor: th.surface, borderColor: th.line }]}>
              <ProcessingBars color={th.accent} />
              <Text style={[Type.meta, { color: th.text2, flex: 1 }]}>{t('calendar.scanning')}</Text>
            </View>
          </Rise>
        ) : null}

        {isEmpty && !scanning ? (
          <Rise index={rise++}>
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: th.accentTint }]}>
                <Icon name="book" size={24} color={th.accentText} />
              </View>
              <Text style={[Type.summaryLead, { color: th.text, textAlign: 'center' }]}>{t('calendar.empty')}</Text>
            </View>
          </Rise>
        ) : null}

        {nextEvent ? (
          <Rise index={rise++}>
            <Pressable
              onPress={() => router.push({ pathname: '/recap/[id]', params: { id: nextEvent.recapId } })}
              onLongPress={() => onRemove(nextEvent)}
              delayLongPress={400}
              accessibilityRole="button">
              <Card style={{ gap: 10, borderColor: th.accent, backgroundColor: th.accentTint }}>
                <View style={styles.metaRow}>
                  <View style={[styles.statusDot, { backgroundColor: typeColor(nextEvent.type) }]} />
                  <Text style={[Type.sectionLabel, { color: th.accentText, letterSpacing: 0.4 }]}>{t('calendar.nextUp').toUpperCase()}</Text>
                  <Text style={[Type.metaStrong, { color: th.accentText, marginLeft: 'auto' }]}>{relativeDay(nextEvent.startAt, now)}</Text>
                </View>
                <Text style={[Type.summaryLead, { color: th.text }]} numberOfLines={3}>
                  {nextEvent.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={[Type.meta, { color: th.text2 }]}>
                    {longDate(nextEvent.startAt)}
                    {!nextEvent.allDay ? ` · ${clock(nextEvent.startAt)}` : ''}
                  </Text>
                  {titles[nextEvent.recapId] ? (
                    <>
                      <Dot />
                      <Text style={[Type.meta, { color: th.text2, flexShrink: 1 }]} numberOfLines={1}>
                        {titles[nextEvent.recapId]}
                      </Text>
                    </>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          </Rise>
        ) : null}

        {upcomingGroups.length > 0 ? (
          <View style={{ gap: 12 }}>
            <Rise index={rise++}>
              <SectionLabel>{t('calendar.upcoming')}</SectionLabel>
            </Rise>
            <Rise index={rise++} style={{ gap: 18 }}>
              {upcomingGroups.map((g) => (
                <DayRow key={`u${g.key}`} group={g} />
              ))}
            </Rise>
          </View>
        ) : null}

        {pastGroups.length > 0 ? (
          <View style={{ gap: 12, marginTop: upcomingGroups.length > 0 ? 4 : 0 }}>
            <Rise index={rise++}>
              <SectionLabel>{t('calendar.past')}</SectionLabel>
            </Rise>
            <Rise index={rise++} style={{ gap: 18 }}>
              {pastGroups.map((g) => (
                <DayRow key={`p${g.key}`} group={g} dim />
              ))}
            </Rise>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Layout.screenPadding, height: 52 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 2, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  betaPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  emptyWrap: { alignItems: 'center', gap: 16, marginTop: 56, paddingHorizontal: 28 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  dayRow: { flexDirection: 'row', gap: 14 },
  stamp: { width: 46, alignItems: 'center', paddingTop: 2, gap: 1 },
  dayEvents: { flex: 1, gap: 10 },
  event: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accentBar: { width: 4, alignSelf: 'stretch' },
  eventBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
