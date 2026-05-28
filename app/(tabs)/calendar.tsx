import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Card,
  EmptyScreen,
  ErrorScreen,
  LoadingScreen,
  palette,
} from '../../components/ui';
import { apiGet } from '../../lib/api';

interface CalendarData {
  month?: string | null;
  currentTerm?: string | null;
  events: Array<{
    id: string;
    title: string;
    description?: string | null;
    startDate: string;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    type: string;
    location?: string | null;
  }>;
}

type CalendarEventItem = CalendarData['events'][number];

const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const typeStyles: Record<
  string,
  { pillBg: string; pillText: string; dot: string }
> = {
  meeting: { pillBg: '#1F2B63', pillText: '#C9D2FF', dot: '#83E6D8' },
  activity: { pillBg: '#84ECE0', pillText: '#134B49', dot: '#6FE4D4' },
  exam: { pillBg: '#FFE6E4', pillText: '#B64848', dot: '#D1473C' },
  holiday: { pillBg: '#FFF1D8', pillText: '#8D5D06', dot: '#F0A33B' },
  academic: { pillBg: '#E9EEFF', pillText: '#334AA9', dot: '#5872E5' },
};

function normalizeType(type: string) {
  return type.toLowerCase();
}

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const monthKey = format(currentMonth, 'yyyy-MM');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['calendar', monthKey],
    queryFn: () => apiGet<CalendarData>(`/api/calendar?month=${monthKey}`),
  });

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const monthEvents = useMemo(() => data?.events ?? [], [data?.events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of monthEvents) {
      const key = format(parseISO(event.startDate), 'yyyy-MM-dd');
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [monthEvents]);

  const normalizedSelectedDate = isSameMonth(selectedDate, currentMonth)
    ? selectedDate
    : startOfMonth(currentMonth);

  if (isLoading) return <LoadingScreen />;
  if (isError) {
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={palette.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>School Calendar</Text>
        <Text style={styles.headerSubtitle}>
          {format(currentMonth, 'MMMM yyyy')}
          {data?.currentTerm ? ` • ${data.currentTerm}` : ''}
        </Text>
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={() => {
                const nextMonth = subMonths(currentMonth, 1);
                setCurrentMonth(nextMonth);
                setSelectedDate(startOfMonth(nextMonth));
              }}
              style={styles.monthNavButton}
            >
              <Ionicons name="chevron-back" size={24} color={palette.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const nextMonth = addMonths(currentMonth, 1);
                setCurrentMonth(nextMonth);
                setSelectedDate(startOfMonth(nextMonth));
              }}
              style={styles.monthNavButton}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={palette.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {weekdayLabels.map((label) => (
            <Text key={label} style={styles.weekdayLabel}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {calendarDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const isActive = isSameDay(day, normalizedSelectedDate);
            const isMuted = !isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <TouchableOpacity
                key={dayKey}
                style={[styles.dayCell, isActive && styles.dayCellActive]}
                activeOpacity={0.88}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isMuted && styles.dayTextMuted,
                    isActive && styles.dayTextActive,
                    isCurrentDay && !isActive && styles.dayTextToday,
                  ]}
                >
                  {format(day, 'd')}
                </Text>
                {dayEvents.length > 0 ? (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 2).map((event, index) => {
                      const typeStyle =
                        typeStyles[normalizeType(event.type)] ??
                        typeStyles.academic;
                      return (
                        <View
                          key={`${event.id}-${index}`}
                          style={[
                            styles.dot,
                            { backgroundColor: typeStyle.dot },
                          ]}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>Month&apos;s Schedule</Text>
        <View style={styles.eventsPill}>
          <Text style={styles.eventsPillText}>{monthEvents.length} Events</Text>
        </View>
      </View>

      {monthEvents.length === 0 ? (
        <EmptyScreen
          message={`No events scheduled for ${format(currentMonth, 'MMMM yyyy')}.`}
          icon="calendar-clear-outline"
        />
      ) : (
        <View style={styles.eventList}>
          {monthEvents.map((event, index) => {
            const typeStyle =
              typeStyles[normalizeType(event.type)] ?? typeStyles.academic;
            const eventDate = parseISO(event.startDate);

            return (
              <Card key={event.id} style={styles.eventCard}>
                <View style={styles.eventDateCard}>
                  <Text style={styles.eventMonth}>
                    {format(eventDate, 'MMM').toUpperCase()}
                  </Text>
                  <Text style={styles.eventDay}>{format(eventDate, 'dd')}</Text>
                </View>

                <View style={styles.eventContent}>
                  <View style={styles.eventTopRow}>
                    <View
                      style={[
                        styles.eventTypePill,
                        { backgroundColor: typeStyle.pillBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.eventTypeText,
                          { color: typeStyle.pillText },
                        ]}
                      >
                        {event.type}
                      </Text>
                    </View>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={20} color="#5C6278" />
                      <Text style={styles.eventTime}>
                        {event.startTime ||
                          (index === 0 ? '09:30 AM' : '03:00 PM')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>
                    {(event.location || 'School Campus') +
                      ' • ' +
                      readableAudience(event.type)}
                  </Text>
                  {event.description ? (
                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>
                  ) : (
                    <Text style={styles.eventDescription}>
                      {`Scheduled on ${format(eventDate, 'EEEE, dd MMMM yyyy')}.`}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function readableAudience(type: string) {
  const normalized = normalizeType(type);
  if (normalized === 'meeting') return 'Parent session';
  if (normalized === 'activity') return 'Student activity';
  if (normalized === 'exam') return 'Academic assessment';
  if (normalized === 'holiday') return 'School holiday';
  return 'School event';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    color: palette.primary,
    letterSpacing: -1.2,
  },
  headerSubtitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#4F5362',
  },
  calendarCard: {
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: palette.primary,
    letterSpacing: -0.8,
  },
  monthNavRow: {
    flexDirection: 'row',
    gap: 12,
  },
  monthNavButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: '#F0F2F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: '#7A7F90',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  dayCellActive: {
    backgroundColor: palette.primary,
    shadowColor: '#1F2B63',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  dayText: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.primary,
  },
  dayTextMuted: {
    color: '#C5C8D1',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: '#6E78A8',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  scheduleHeader: {
    marginTop: 26,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: palette.primary,
    letterSpacing: -1,
  },
  eventsPill: {
    backgroundColor: '#D8F6F1',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  eventsPillText: {
    color: '#2CAEA0',
    fontSize: 14,
    fontWeight: '800',
  },
  eventList: {
    gap: 16,
  },
  eventCard: {
    borderRadius: 34,
    backgroundColor: '#F0F2F7',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  eventDateCard: {
    width: 108,
    minHeight: 160,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },
  eventMonth: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6A6E7F',
  },
  eventDay: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: palette.primary,
  },
  eventContent: {
    flex: 1,
    paddingTop: 2,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  eventTypePill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F5362',
  },
  eventTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    color: palette.primary,
    letterSpacing: -0.8,
  },
  eventMeta: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: '#4F5362',
    fontWeight: '600',
  },
  eventDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#4F5362',
  },
});
