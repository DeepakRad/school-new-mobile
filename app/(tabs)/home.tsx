import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
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
  ErrorScreen,
  LoadingScreen,
  palette,
  ScreenHeader,
  SectionTitle,
} from '../../components/ui';
import { apiGet } from '../../lib/api';
import { defaultScreenQueryOptions } from '../../lib/query';

interface HomeData {
  student: {
    id: string;
    admissionNo: string;
    firstName: string;
    lastName: string;
    className: string;
    section: string;
    rollNo: string;
    feeStatus: string;
  };
  attendanceSnapshot: {
    percentage: number | null;
    presentDays: number;
    totalDays: number;
    isLow: boolean;
    threshold: number;
  };
  feeSnapshot: {
    totalDue: number;
    pendingCount: number;
    status: string;
    nextDueDate?: string | null;
    nextDueName?: string | null;
  };
  homeworkSnapshot: {
    pendingCount: number;
    nextDueDate?: string | null;
    urgencyLabel: string;
  };
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    createdAt: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    description?: string | null;
    startDate: string;
    startTime?: string | null;
    location?: string | null;
  }>;
}

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['home'],
    queryFn: () => apiGet<HomeData>('/api/home'),
    ...defaultScreenQueryOptions,
  });

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;
  if (!data) return null;

  const displayName = `Welcome, ${data.student.lastName ? `Mr. ${data.student.lastName}` : data.student.firstName}`;
  const nextEvent = data.upcomingEvents[0];
  const nextNotice = data.notifications[0];

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
      <ScreenHeader title={displayName} subtitle={greetingLabel()} />

      <Card style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={44} color={palette.primary} />
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroName}>
            {data.student.firstName} {data.student.lastName}
          </Text>
          <Text style={styles.heroMeta}>
            Grade {data.student.className} • Section {data.student.section}
          </Text>
          <View style={styles.rollPill}>
            <Text style={styles.rollPillText}>
              ROLL NO: #{data.student.rollNo}
            </Text>
          </View>
        </View>
      </Card>

      <SectionTitle
        title="Academic Pulse"
        trailing={<Text style={styles.realtimeText}>REAL-TIME</Text>}
      />

      <View style={styles.metricRow}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Ionicons
              name="calendar-clear-outline"
              size={20}
              color={palette.primary}
            />
          </View>
          <Text style={styles.metricValue}>
            {data.attendanceSnapshot.percentage ?? 0}%
          </Text>
          <Text style={styles.metricLabel}>Attendance Rate</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="cash-outline" size={18} color={palette.primary} />
          </View>
          {/* Need to make it to rupees and also with commas */}
          <Text
            style={styles.metricValue}
          >{`₹ ${data.feeSnapshot.totalDue?.toLocaleString()}`}</Text>
          <Text style={styles.metricLabel}>Fees Pending</Text>
        </Card>
      </View>

      <Card style={styles.homeworkCard}>
        <View style={styles.homeworkIconBlock}>
          <Ionicons
            name="clipboard-outline"
            size={24}
            color={palette.primary}
          />
        </View>
        <View style={styles.homeworkTextWrap}>
          <Text style={styles.homeworkOverline}>HOMEWORK DUE</Text>
          <Text style={styles.homeworkTitle}>
            {data.homeworkSnapshot.pendingCount > 0
              ? `${data.homeworkSnapshot.pendingCount} Pending Task${data.homeworkSnapshot.pendingCount === 1 ? '' : 's'}`
              : 'All homework cleared'}
          </Text>
          <Text style={styles.homeworkHelper}>
            {data.homeworkSnapshot.urgencyLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/academics')}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </Card>

      <SectionTitle title="Important Dates" />
      <View style={styles.listStack}>
        {nextEvent ? (
          <Card style={styles.dateCard}>
            <View style={[styles.dateBadge, { backgroundColor: palette.mint }]}>
              <Text style={styles.dateMonth}>
                {format(new Date(nextEvent.startDate), 'MMM').toUpperCase()}
              </Text>
              <Text style={styles.dateDay}>
                {format(new Date(nextEvent.startDate), 'dd')}
              </Text>
            </View>
            <View style={styles.dateCopy}>
              <Text style={styles.dateTitle}>{nextEvent.title}</Text>
              <Text style={styles.dateSubtitle}>
                {nextEvent.startTime ? `${nextEvent.startTime} • ` : ''}
                {nextEvent.location ?? 'School campus'}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={palette.textSoft}
            />
          </Card>
        ) : null}

        {nextNotice ? (
          <Card style={styles.dateCard}>
            <View
              style={[styles.dateBadge, { backgroundColor: palette.lavender }]}
            >
              <Text style={styles.dateMonth}>
                {format(new Date(nextNotice.createdAt), 'MMM').toUpperCase()}
              </Text>
              <Text style={styles.dateDay}>
                {format(new Date(nextNotice.createdAt), 'dd')}
              </Text>
            </View>
            <View style={styles.dateCopy}>
              <Text style={styles.dateTitle}>{nextNotice.title}</Text>
              <Text style={styles.dateSubtitle} numberOfLines={1}>
                {nextNotice.body}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={palette.textSoft}
            />
          </Card>
        ) : null}
      </View>
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
  heroCard: {
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 28,
    borderRadius: 28,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  heroContent: {
    flex: 1,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroMeta: {
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '600',
  },
  rollPill: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  rollPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  realtimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSoft,
    letterSpacing: 1.2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 14,
  },
  metricCard: {
    flex: 1,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  metricIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -1.6,
  },
  metricLabel: {
    fontSize: 16,
    color: palette.textMuted,
    fontWeight: '600',
  },
  homeworkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  homeworkIconBlock: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#DDE2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeworkTextWrap: {
    flex: 1,
  },
  homeworkOverline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555B6B',
    letterSpacing: 0.8,
  },
  homeworkTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
    marginTop: 2,
    letterSpacing: -0.7,
  },
  homeworkHelper: {
    fontSize: 13,
    color: '#C62828',
    marginTop: 6,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  viewAllButton: {
    backgroundColor: palette.primary,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  listStack: {
    gap: 12,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
  },
  dateBadge: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  dateCopy: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: -0.6,
  },
  dateSubtitle: {
    fontSize: 14,
    color: palette.textMuted,
    marginTop: 4,
    lineHeight: 21,
  },
});
