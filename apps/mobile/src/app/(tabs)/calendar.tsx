/**
 * Calendar tab (v3) — the dates AI Recap finds in your recaps, as a first-class tab. Two views share a
 * header + view switcher: a month grid (default) with per-day dots and a selected-day list, and a list
 * view split into Upcoming / Past with type-filter chips. Tap any event for its detail sheet. Populated
 * by the launch-time backfill (scanAllRecaps) and the per-recap scan; re-scans on open when empty.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type CalendarEvent, type CalendarEventType, calendarRepo, recapsRepo } from '../../db';
import { Card, Dot, ProcessingBars, Rise, SectionLabel } from '../../design/components';
import { Icon } from '../../design/icons';
import { clock } from '../../design/format';
import { Layout } from '../../design/tokens';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';
import { startOfDay } from '../../features/calendar/agendaDates';
import { cap, fmt, fullWeekday, monthShort, relativeDay, weekdayShort } from '../../features/calendar/agendaLabels';
import { EventSheet } from '../../features/calendar/EventSheet';
import { scanAllRecapsForDates } from '../../features/calendar/scanAllRecaps';

type TypeFilter = 'all' | CalendarEventType;

function startOfMonth(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function addMonths(ms: number, delta: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
}
/** Monday-based weekday index (0 = Mon … 6 = Sun). */
const mondayIndex = (ms: number) => (new Date(ms).getDay() + 6) % 7;

interface Cell {
  key: number;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  dots: string[];
}

export default function CalendarTab() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const th = useTheme();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<'month' | 'list'>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(Date.now()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(Date.now()));

  const load = useCallback(async () => {
    try {
      const [all, recaps] = await Promise.all([calendarRepo.listEvents(), recapsRepo.pageRecaps({ limit: 500 })]);
      setEvents(all);
      setTitles(Object.fromEntries(recaps.map((r) => [r.id, r.title])));
      return all;
    } catch {
      setEvents([]);
      return [] as CalendarEvent[];
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

  // On open: refresh the clock, load, select the best day, and scan once if empty but recaps exist.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const t0 = Date.now();
      setNow(t0);
      void (async () => {
        const all = await load();
        if (!active) return;
        // Select today if it has events, else the nearest upcoming day with one.
        const today = startOfDay(t0);
        const todayHas = all.some((e) => startOfDay(e.startAt) === today);
        const nextUp = all.filter((e) => e.startAt >= today).sort((a, b) => a.startAt - b.startAt)[0];
        const sel = todayHas || !nextUp ? today : startOfDay(nextUp.startAt);
        setSelectedDay(sel);
        setMonthAnchor(startOfMonth(sel));
        if (all.length === 0) {
          const pending = await calendarRepo.listUnscannedReadyRecapIds(1).catch(() => []);
          if (active && pending.length > 0) void runScan();
        }
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const typeColor = useCallback(
    (type: CalendarEventType) => (type === 'deadline' ? th.destructive : type === 'mention' ? th.speaker2 : th.accent),
    [th],
  );

  const onRemove = useCallback(
    (ev: CalendarEvent) => {
      Alert.alert(t('calendar.removeTitle'), ev.title, [
        { text: t('ui.cancel'), style: 'cancel' },
        {
          text: t('calendar.remove'),
          style: 'destructive',
          onPress: () =>
            void calendarRepo.deleteEvent(ev.id).then(() => {
              setSelected(null);
              return load();
            }),
        },
      ]);
    },
    [t, load],
  );

  const openRecap = useCallback(
    (recapId: string) => {
      setSelected(null);
      router.push({ pathname: '/recap/[id]', params: { id: recapId } });
    },
    [router],
  );

  const typed = useMemo(() => (typeFilter === 'all' ? events : events.filter((e) => e.type === typeFilter)), [events, typeFilter]);

  // Month grid data.
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const ev of typed) {
      const key = startOfDay(ev.startAt);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [typed]);

  const cells = useMemo<Cell[]>(() => {
    const first = monthAnchor;
    const gridStart = first - mondayIndex(first) * 86_400_000;
    const todayStart = startOfDay(now);
    const anchorMonth = new Date(first).getMonth();
    return Array.from({ length: 42 }, (_, i) => {
      const d = startOfDay(gridStart + i * 86_400_000);
      const date = new Date(d);
      return {
        key: d,
        day: date.getDate(),
        inMonth: date.getMonth() === anchorMonth,
        isToday: d === todayStart,
        isSelected: d === selectedDay,
        isPast: d < todayStart,
        dots: (eventsByDay.get(d) ?? []).slice(0, 3).map((e) => typeColor(e.type)),
      };
    });
  }, [monthAnchor, now, selectedDay, eventsByDay, typeColor]);

  const weekdayNarrow = useMemo(() => {
    const base = new Date(2024, 0, 1).getTime(); // a Monday
    return Array.from({ length: 7 }, (_, i) => fmt(base + i * 86_400_000, { weekday: 'narrow' }).toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const selectedDayEvents = useMemo(
    () => (eventsByDay.get(selectedDay) ?? []).slice().sort((a, b) => a.startAt - b.startAt),
    [eventsByDay, selectedDay],
  );

  // List view data.
  const { upcomingGroups, pastGroups, nextEvent, visibleCount } = useMemo(() => {
    const todayStart = startOfDay(now);
    const up = typed.filter((e) => e.startAt >= todayStart).sort((a, b) => a.startAt - b.startAt);
    const pa = typed.filter((e) => e.startAt < todayStart).sort((a, b) => b.startAt - a.startAt);
    const group = (list: CalendarEvent[]) => {
      const out: { key: number; events: CalendarEvent[] }[] = [];
      for (const ev of list) {
        const key = startOfDay(ev.startAt);
        const last = out[out.length - 1];
        if (last && last.key === key) last.events.push(ev);
        else out.push({ key, events: [ev] });
      }
      return out;
    };
    return { upcomingGroups: group(up), pastGroups: group(pa), nextEvent: up[0] ?? null, visibleCount: up.length + pa.length };
  }, [typed, now]);

  const typeChips: { value: TypeFilter; label: string; color?: string }[] = [
    { value: 'all', label: t('calendar.filter.all') },
    { value: 'event', label: t('calendar.filter.events'), color: th.accent },
    { value: 'deadline', label: t('calendar.filter.deadlines'), color: th.destructive },
    { value: 'mention', label: t('calendar.filter.dates'), color: th.speaker2 },
  ];

  const EventCard = ({ ev, dim }: { ev: CalendarEvent; dim?: boolean }) => (
    <Pressable
      onPress={() => setSelected(ev)}
      onLongPress={() => onRemove(ev)}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${ev.title}, ${relativeDay(ev.startAt, now)}${ev.allDay ? '' : `, ${clock(ev.startAt)}`}`}
      style={({ pressed }) => [styles.event, { backgroundColor: th.surface, borderColor: th.line, opacity: pressed ? 0.6 : dim ? 0.72 : 1 }]}>
      <View style={[styles.accentBar, { backgroundColor: typeColor(ev.type) }]} />
      <View style={styles.eventBody}>
        <View style={styles.titleRow}>
          <Text style={[Type.body, { color: th.text, flexShrink: 1, fontFamily: Type.metaStrong.fontFamily, fontSize: 16 }]} numberOfLines={2}>
            {ev.title}
          </Text>
          {ev.reminderMinutes !== null ? <Icon name="bell" size={13} color={th.accentText} /> : null}
        </View>
        {ev.type === 'deadline' ? <Text style={[Type.meta, { color: th.destructive }]}>{t('calendar.type.deadline')}</Text> : null}
        <View style={styles.metaRow}>
          {!ev.allDay ? <Text style={[Type.meta, { color: th.text2 }]}>{clock(ev.startAt)}</Text> : null}
          {ev.note ? (
            <Text style={[Type.meta, { color: th.text2, flexShrink: 1 }]} numberOfLines={1}>
              {ev.note}
            </Text>
          ) : null}
        </View>
        {titles[ev.recapId] ? (
          <View style={styles.sourceRow}>
            <Icon name="mic" size={12} color={th.text3} />
            <Text style={[Type.meta, { color: th.text2, flexShrink: 1 }]} numberOfLines={1}>
              {titles[ev.recapId]}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  const DayRow = ({ group, dim }: { group: { key: number; events: CalendarEvent[] }; dim?: boolean }) => (
    <View style={styles.dayRow}>
      <View style={styles.stamp}>
        <Text style={[Type.caption, { color: th.text2, letterSpacing: 0.4, fontFamily: Type.captionStrong.fontFamily }]}>{weekdayShort(group.key)}</Text>
        <Text style={[Type.tileNumber, { color: dim ? th.text2 : th.text, lineHeight: 28 }]}>{new Date(group.key).getDate()}</Text>
        <Text style={[Type.caption, { color: th.text2, letterSpacing: 0.4, fontFamily: Type.captionStrong.fontFamily }]}>{monthShort(group.key)}</Text>
      </View>
      <View style={styles.dayEvents}>
        {group.events.map((ev) => (
          <EventCard key={ev.id} ev={ev} dim={dim} />
        ))}
      </View>
    </View>
  );

  let rise = 0;
  const isEmpty = loaded && events.length === 0;
  const monthTitle = cap(fmt(monthAnchor, { month: 'long' }, ''));
  const monthYear = new Date(monthAnchor).getFullYear();

  const Header = (
    <Rise index={rise++} style={styles.headerRow}>
      <View style={{ gap: 2, flexShrink: 1 }}>
        <Text style={[Type.meta, { color: th.text2 }]} numberOfLines={1}>
          {events.length > 0 ? t('calendar.summary', { count: events.length }) : t('calendar.entrySub')}
        </Text>
        <Text style={[Type.screenTitle, { color: th.text }]}>{t('calendar.title')}</Text>
      </View>
      <View style={[styles.switcher, { backgroundColor: th.surface, borderColor: th.line }]}>
        {(['month', 'list'] as const).map((v) => {
          const on = view === v;
          return (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`calendar.${v}`)}
              style={[styles.switchBtn, on && { backgroundColor: th.surface2 }]}>
              <Icon name={v === 'month' ? 'monthView' : 'listView'} size={18} color={on ? th.text : th.text2} />
            </Pressable>
          );
        })}
      </View>
    </Rise>
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: th.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {Header}

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
                <Icon name="calendar" size={24} color={th.accentText} />
              </View>
              <Text style={[Type.summaryLead, { color: th.text, textAlign: 'center' }]}>{t('calendar.empty')}</Text>
            </View>
          </Rise>
        ) : view === 'month' ? (
          <>
            <Rise index={rise++}>
              <View style={[styles.monthCard, { backgroundColor: th.surface, borderColor: th.line }]}>
                <View style={styles.monthHead}>
                  <Text style={[Type.heroNumber, { color: th.text }]}>
                    {monthTitle} <Text style={{ color: th.text2 }}>{monthYear}</Text>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={() => setMonthAnchor((m) => addMonths(m, -1))} accessibilityLabel={t('calendar.prevMonth')} style={[styles.navBtn, { backgroundColor: th.surface2 }]}>
                      <Icon name="chevronLeft" size={16} color={th.text} strokeWidth={2.2} />
                    </Pressable>
                    <Pressable onPress={() => setMonthAnchor((m) => addMonths(m, 1))} accessibilityLabel={t('calendar.nextMonth')} style={[styles.navBtn, { backgroundColor: th.surface2 }]}>
                      <Icon name="chevronRight" size={16} color={th.text} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.weekRow}>
                  {weekdayNarrow.map((w, i) => (
                    <Text key={i} style={[Type.caption, styles.weekCell, { color: th.text3, fontFamily: Type.captionStrong.fontFamily }]}>
                      {w}
                    </Text>
                  ))}
                </View>
                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <View key={row} style={styles.gridRow}>
                    {cells.slice(row * 7, row * 7 + 7).map((c) => (
                      <Pressable key={c.key} onPress={() => setSelectedDay(c.key)} style={styles.gridCell} accessibilityLabel={fmt(c.key, { day: 'numeric', month: 'long' })}>
                        <View
                          style={[
                            styles.dayCircle,
                            c.isSelected && { backgroundColor: th.accent },
                            c.isToday && !c.isSelected && { borderWidth: 1.5, borderColor: th.accent },
                          ]}>
                          <Text
                            style={[
                              Type.meta,
                              {
                                fontSize: 14,
                                fontFamily: c.isToday || c.isSelected ? Type.captionStrong.fontFamily : Type.meta.fontFamily,
                                color: c.isSelected ? th.onAccent : !c.inMonth ? th.text3 : c.isPast ? th.text2 : th.text,
                              },
                            ]}>
                            {c.day}
                          </Text>
                        </View>
                        <View style={styles.dotRow}>
                          {!c.isSelected ? c.dots.map((color, i) => <View key={i} style={[styles.gridDot, { backgroundColor: color }]} />) : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ))}
                <View style={[styles.legend, { borderTopColor: th.line }]}>
                  <Legend color={th.accent} label={t('calendar.filter.events')} th={th} />
                  <Legend color={th.destructive} label={t('calendar.filter.deadlines')} th={th} />
                  <Legend color={th.speaker2} label={t('calendar.filter.dates')} th={th} />
                  <Pressable
                    onPress={() => {
                      const today = startOfDay(now);
                      setSelectedDay(today);
                      setMonthAnchor(startOfMonth(today));
                    }}
                    style={{ marginLeft: 'auto', paddingVertical: 6 }}>
                    <Text style={[Type.captionStrong, { color: th.accentText }]}>{t('calendar.today')}</Text>
                  </Pressable>
                </View>
              </View>
            </Rise>

            <Rise index={rise++} style={{ gap: 8 }}>
              <View style={styles.dayListHead}>
                <Text style={[Type.metaStrong, { color: th.text2, flexShrink: 1 }]} numberOfLines={1}>
                  {fullWeekday(selectedDay)}
                </Text>
                <Text style={[Type.captionStrong, { color: th.accentText }]}>{relativeDay(selectedDay, now)}</Text>
              </View>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((ev) => <EventCard key={ev.id} ev={ev} dim={selectedDay < startOfDay(now)} />)
              ) : (
                <Text style={[Type.bodyText15, { color: th.text2, paddingVertical: 10, paddingHorizontal: 2 }]}>{t('calendar.emptyDay')}</Text>
              )}
            </Rise>
          </>
        ) : (
          <>
            <Rise index={rise++}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {typeChips.map((c) => {
                  const on = typeFilter === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setTypeFilter(c.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.filterChip, { backgroundColor: on ? th.primaryBtn : th.surface, borderColor: on ? th.primaryBtn : th.line }]}>
                      {c.color ? <View style={[styles.chipDot, { backgroundColor: c.color }]} /> : null}
                      <Text style={[Type.captionStrong, { color: on ? th.onPrimaryBtn : th.text2 }]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Rise>

            {nextEvent ? (
              <Rise index={rise++}>
                <Pressable onPress={() => setSelected(nextEvent)} onLongPress={() => onRemove(nextEvent)} delayLongPress={400} accessibilityRole="button">
                  <Card style={{ gap: 10, borderColor: th.accent, backgroundColor: th.accentTint }}>
                    <View style={styles.metaRow}>
                      <Text style={[Type.captionStrong, { color: th.accentText }]}>{t('calendar.nextUp')}</Text>
                      <Text style={[Type.captionStrong, { color: th.accentText, marginLeft: 'auto' }]}>{relativeDay(nextEvent.startAt, now)}</Text>
                    </View>
                    <Text style={[Type.detailTitle, { color: th.text, fontSize: 28, lineHeight: 32 }]} numberOfLines={2}>
                      {nextEvent.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[Type.meta, { color: th.text2 }]}>
                        {fullWeekday(nextEvent.startAt)}
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

            {loaded && events.length > 0 && visibleCount === 0 ? (
              <Rise index={rise++}>
                <Text style={[Type.bodyText15, { color: th.text2, textAlign: 'center', marginTop: 24 }]}>{t('calendar.emptyFiltered')}</Text>
              </Rise>
            ) : null}

            {upcomingGroups.length > 0 ? (
              <View style={{ gap: 12 }}>
                <Rise index={rise++}>
                  <SectionLabel>{t('calendar.upcoming')}</SectionLabel>
                </Rise>
                <Rise index={rise++} style={{ gap: 12 }}>
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
                <Rise index={rise++} style={{ gap: 12 }}>
                  {pastGroups.map((g) => (
                    <DayRow key={`p${g.key}`} group={g} dim />
                  ))}
                </Rise>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <EventSheet
        key={selected?.id}
        event={selected}
        recapTitle={selected ? titles[selected.recapId] : undefined}
        onClose={() => setSelected(null)}
        onChanged={() => void load()}
        onOpenRecap={openRecap}
        onRemove={onRemove}
      />
    </SafeAreaView>
  );
}

function Legend({ color, label, th }: { color: string; label: string; th: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[Type.caption, { color: th.text2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: Layout.screenPadding, paddingTop: 8, paddingBottom: Layout.tabBarClearance, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  switcher: { flexDirection: 'row', height: 36, padding: 3, borderRadius: 12, borderWidth: 1, marginBottom: 2 },
  switchBtn: { width: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  emptyWrap: { alignItems: 'center', gap: 16, marginTop: 56, paddingHorizontal: 28 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  // Month card
  monthCard: { gap: 8, padding: 14, paddingBottom: 10, borderRadius: 20, borderWidth: 1 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 },
  navBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, textAlign: 'center' },
  gridRow: { flexDirection: 'row', marginBottom: 2 },
  gridCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotRow: { height: 4, flexDirection: 'row', gap: 3 },
  gridDot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6, paddingHorizontal: 4, borderTopWidth: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  dayListHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, paddingHorizontal: 2 },
  // Events
  event: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accentBar: { width: 4, alignSelf: 'stretch' },
  eventBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayRow: { flexDirection: 'row', gap: 12 },
  stamp: { width: 44, alignItems: 'center', paddingTop: 10, gap: 1 },
  dayEvents: { flex: 1, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
});
