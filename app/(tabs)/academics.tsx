import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import type { AcademicsResponse } from '../../types/api';

const toneStyles = {
  danger: {
    pill: '#FFD9D1',
    pillText: '#B42318',
    iconWrap: '#F1F3F9',
    icon: '#22305E',
  },
  mint: {
    pill: '#B9F6EB',
    pillText: '#0F6B57',
    iconWrap: '#DDF8F2',
    icon: '#2CA28A',
  },
  sky: {
    pill: '#E8F0FF',
    pillText: '#3354B8',
    iconWrap: '#EDF2FF',
    icon: '#4A64CF',
  },
};

export default function AcademicsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['academics'],
    queryFn: () => apiGet<AcademicsResponse>('/api/academics'),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;

  const homework = data?.homework ?? [];

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
        title="Academics"
        subtitle={
          data
            ? `Grade ${data.student.className}${data.student.section ? ` • Section ${data.student.section}` : ''}`
            : 'Track class homework and due dates.'
        }
      />

      {data ? (
        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL TASKS</Text>
            <Text style={styles.metricValue}>{data.summary.total}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>DUE THIS WEEK</Text>
            <Text style={styles.metricValue}>{data.summary.dueThisWeek}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>URGENT</Text>
            <Text style={styles.metricValue}>{data.summary.urgentCount}</Text>
          </Card>
        </View>
      ) : null}

      <SectionTitle
        title="Assignments"
        trailing={
          homework.length > 0 ? (
            <Text style={styles.trailingText}>{homework.length} LIVE</Text>
          ) : null
        }
      />

      {homework.length === 0 ? (
        <EmptyScreen
          message="No homework has been assigned for this class yet."
          icon="school-outline"
        />
      ) : (
        <View style={styles.cardStack}>
          {homework.map((item) => {
            const tone = toneStyles[item.statusTone];

            return (
              <Card key={item.id} style={styles.assignmentCard}>
                <View style={styles.cardTopRow}>
                  <View
                    style={[styles.statusPill, { backgroundColor: tone.pill }]}
                  >
                    <Text style={[styles.statusText, { color: tone.pillText }]}>
                      {item.statusLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: tone.iconWrap },
                    ]}
                  >
                    <Ionicons
                      name="book-outline"
                      size={22}
                      color={tone.icon}
                    />
                  </View>
                </View>

                <Text style={styles.subjectText}>{item.subject.toUpperCase()}</Text>
                <Text style={styles.assignmentTitle}>{item.title}</Text>

                {item.description ? (
                  <Text style={styles.assignmentDescription} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.metaDivider} />

                <View style={styles.footerRow}>
                  <View style={styles.footerMeta}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={palette.textMuted}
                    />
                    <Text style={styles.footerText}>{item.dueLabel}</Text>
                  </View>
                  <Text style={styles.footerStrong}>{item.subjectCode}</Text>
                </View>

                <View style={styles.teacherRow}>
                  <View style={styles.teacherBadge}>
                    <Text style={styles.teacherBadgeText}>
                      {item.teacherInitials || 'T'}
                    </Text>
                  </View>
                  <View style={styles.teacherCopy}>
                    <Text style={styles.teacherLabel}>Assigned by</Text>
                    <Text style={styles.teacherName}>{item.teacherName}</Text>
                  </View>
                  <Text style={styles.dateStamp}>
                    {format(new Date(item.dueDate), 'dd MMM')}
                  </Text>
                </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 22,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textSoft,
    letterSpacing: 0.9,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.9,
  },
  trailingText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSoft,
    letterSpacing: 1,
  },
  cardStack: {
    gap: 16,
  },
  assignmentCard: {
    borderRadius: 32,
    padding: 22,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#474A57',
    letterSpacing: 2.2,
  },
  assignmentTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.9,
  },
  assignmentDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#EEF1F6',
    marginTop: 28,
    marginBottom: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4D5260',
  },
  footerStrong: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.text,
  },
  teacherRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.primary,
  },
  teacherCopy: {
    flex: 1,
    marginLeft: 12,
  },
  teacherLabel: {
    fontSize: 12,
    color: palette.textSoft,
    fontWeight: '600',
  },
  teacherName: {
    fontSize: 15,
    color: palette.text,
    fontWeight: '700',
    marginTop: 2,
  },
  dateStamp: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textMuted,
  },
});
