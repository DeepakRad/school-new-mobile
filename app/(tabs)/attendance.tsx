import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
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
  ScreenHeader,
  SectionTitle,
} from '../../components/ui';
import { apiGet } from '../../lib/api';

interface AttendanceData {
  overall: {
    percentage: number | null;
    presentDays: number;
    totalDays: number;
    threshold: number;
    isLow: boolean;
  };
  monthly: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    percentage: number;
  }>;
  recent: Array<{
    id: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
    notes?: string | null;
  }>;
}

const dayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const statusColors = {
  PRESENT: palette.success,
  ABSENT: palette.danger,
  LATE: palette.warning,
  HALF_DAY: '#6C7BFF',
  LEAVE: '#8A6ADF',
};

export default function AttendanceScreen() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const monthKey = format(currentMonth, 'yyyy-MM');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['attendance', monthKey],
    queryFn: () => apiGet<AttendanceData>(`/api/attendance?month=${monthKey}`),
  });

  const dayMap = useMemo(() => {
    const map = new Map<string, AttendanceData['recent'][number]>();
    data?.recent.forEach((record) => {
      map.set(format(new Date(record.date), 'yyyy-MM-dd'), record);
    });
    return map;
  }, [data]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth],
  );
  const leadingEmpty = (getDay(startOfMonth(currentMonth)) + 6) % 7;

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;
  if (!data) return null;

  const absentDays = data.overall.totalDays - data.overall.presentDays;

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
        title="Attendance"
        subtitle="Academic Year 2023-24 • Grade 4-B"
      />

      <Card style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>ATTENDANCE RATE</Text>
          <Text style={styles.summaryValue}>
            {data.overall.percentage ?? 0}%
          </Text>
        </View>
        <View style={styles.totalDaysBox}>
          <Text style={styles.totalDaysValue}>{data.overall.totalDays}</Text>
          <Text style={styles.totalDaysLabel}>TOTAL DAYS</Text>
        </View>
      </Card>

      <View style={styles.miniStatsRow}>
        <Card style={styles.miniStatCard}>
          <Ionicons name="checkmark-circle" size={18} color={palette.success} />
          <Text style={styles.miniStatLabel}>PRESENT</Text>
          <Text style={styles.miniStatValue}>{data.overall.presentDays}</Text>
        </Card>
        <Card style={styles.miniStatCard}>
          <Ionicons name="close-circle" size={18} color={palette.danger} />
          <Text style={styles.miniStatLabel}>ABSENT</Text>
          <Text style={styles.miniStatValue}>{absentDays}</Text>
        </Card>
      </View>

      <Card style={styles.calendarCard}>
        <View style={styles.monthNav}>
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
        </View>

        <View style={styles.calendarGrid}>
          {dayLabels.map((label) => (
            <Text key={label} style={styles.dayLabel}>
              {label}
            </Text>
          ))}

          {Array.from({ length: leadingEmpty }).map((_, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <View key={`empty-${index}`} style={styles.dayCell} />
          ))}

          {days.map((day) => {
            const record = dayMap.get(format(day, 'yyyy-MM-dd'));
            const isToday = isSameDay(day, new Date());
            const statusColor = record
              ? statusColors[record.status]
              : palette.textSoft;

            return (
              <View key={day.toISOString()} style={styles.dayCell}>
                <View
                  style={[styles.dayBubble, isToday && styles.dayBubbleActive]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberActive,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: statusColor, opacity: record ? 1 : 0.2 },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <Legend color={palette.success} label="Present" />
          <Legend color={palette.danger} label="Absent" />
          <Legend color={palette.textSoft} label="Holiday" />
        </View>
      </Card>

      <SectionTitle title="Recent Absences" />
      {data.recent.filter((item) => item.status === 'ABSENT').length === 0 ? (
        <EmptyScreen
          message="No absences recorded for this month."
          icon="checkmark-done-outline"
        />
      ) : (
        <View style={styles.absenceList}>
          {data.recent
            .filter((item) => item.status === 'ABSENT')
            .slice(0, 3)
            .map((item) => (
              <Card key={item.id} style={styles.absenceCard}>
                <View style={styles.absenceDateBadge}>
                  <Text style={styles.absenceMonth}>
                    {format(new Date(item.date), 'MMM').toUpperCase()}
                  </Text>
                  <Text style={styles.absenceDay}>
                    {format(new Date(item.date), 'dd')}
                  </Text>
                </View>
                <View style={styles.absenceCopy}>
                  <Text style={styles.absenceTitle}>
                    {item.notes || 'Recorded absence'}
                  </Text>
                  <Text style={styles.absenceSubtitle}>
                    {format(new Date(item.date), 'EEEE')}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={palette.textSoft}
                />
              </Card>
            ))}
        </View>
      )}
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
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
  summaryCard: {
    backgroundColor: palette.primary,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 46,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1.4,
  },
  totalDaysBox: {
    width: 102,
    height: 102,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalDaysValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
  },
  totalDaysLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 4,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  miniStatCard: {
    flex: 1,
    borderRadius: 24,
    minHeight: 126,
    justifyContent: 'space-between',
  },
  miniStatLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 0.8,
    marginTop: 14,
  },
  miniStatValue: {
    fontSize: 34,
    fontWeight: '800',
    color: palette.text,
    marginTop: 4,
  },
  calendarCard: {
    borderRadius: 30,
    paddingTop: 20,
    paddingBottom: 18,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  dayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: palette.textSoft,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleActive: {
    backgroundColor: palette.primary,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  dayNumberActive: {
    color: '#fff',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  legendRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: '600',
  },
  absenceList: {
    gap: 12,
  },
  absenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  absenceDateBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#FFE4DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  absenceMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.danger,
  },
  absenceDay: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.danger,
    lineHeight: 24,
  },
  absenceCopy: {
    flex: 1,
  },
  absenceTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.4,
  },
  absenceSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: palette.textMuted,
  },
});
