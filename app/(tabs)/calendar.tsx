import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { useState } from 'react';
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
  ScreenHeader,
} from '../../components/ui';
import { apiGet } from '../../lib/api';

interface CalendarData {
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

const colorMap: Record<string, { bg: string; dot: string }> = {
  holiday: { bg: '#FFF1D8', dot: '#F0A33B' },
  exam: { bg: '#FFE6E4', dot: '#DF5A4E' },
  academic: { bg: '#E8EDFF', dot: '#4F63DD' },
  activity: { bg: '#E5FBF4', dot: '#23B684' },
  vacation: { bg: '#EAF2FF', dot: '#5090E4' },
  staff: { bg: '#F0EAFF', dot: '#8466DD' },
};

export default function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const monthKey = format(currentMonth, 'yyyy-MM');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['calendar', monthKey],
    queryFn: () => apiGet<CalendarData>(`/api/calendar?month=${monthKey}`),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;

  const events = data?.events ?? [];

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
      <ScreenHeader
        title="Calendar"
        subtitle="Track important academic events and upcoming school activities."
      />

      <Card style={styles.monthCard}>
        <TouchableOpacity
          onPress={() => setCurrentMonth((value) => subMonths(value, 1))}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity
          onPress={() => setCurrentMonth((value) => addMonths(value, 1))}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={18} color={palette.text} />
        </TouchableOpacity>
      </Card>

      {events.length === 0 ? (
        <EmptyScreen
          message="No events scheduled for this month."
          icon="calendar-clear-outline"
        />
      ) : (
        <View style={styles.eventList}>
          {events.map((event) => {
            const colors = colorMap[event.type] ?? {
              bg: palette.surfaceMuted,
              dot: palette.textSoft,
            };
            return (
              <Card key={event.id} style={styles.eventCard}>
                <View style={[styles.typePill, { backgroundColor: colors.bg }]}>
                  <View
                    style={[styles.typeDot, { backgroundColor: colors.dot }]}
                  />
                  <Text style={styles.typeText}>{event.type}</Text>
                </View>

                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {format(new Date(event.startDate), 'EEE, dd MMM yyyy')}
                  {event.startTime ? ` • ${event.startTime}` : ''}
                  {event.endTime ? ` - ${event.endTime}` : ''}
                </Text>
                <Text style={styles.eventLocation}>
                  {event.location ?? 'School campus'}
                </Text>
                {event.description ? (
                  <Text style={styles.eventDescription}>
                    {event.description}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 128,
    gap: 18,
  },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 28,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.4,
  },
  eventList: {
    gap: 14,
  },
  eventCard: {
    borderRadius: 28,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.5,
  },
  eventMeta: {
    marginTop: 8,
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
  eventLocation: {
    marginTop: 6,
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: '600',
  },
  eventDescription: {
    marginTop: 12,
    fontSize: 15,
    color: palette.textMuted,
    lineHeight: 22,
  },
});
