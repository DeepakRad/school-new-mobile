import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Pressable,
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

const tabs = ['Homework', 'Daily Insight', 'Grades'] as const;
const weekdayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

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

const gradeToneStyles = {
  excellent: {
    pill: '#D5F7EE',
    pillText: '#0F6B57',
    iconWrap: '#E8F0FF',
    icon: '#3E67E2',
  },
  improving: {
    pill: '#DEE4FF',
    pillText: '#41579F',
    iconWrap: '#DDF8F2',
    icon: '#0F9C7C',
  },
  steady: {
    pill: '#ECEEF3',
    pillText: '#555B6A',
    iconWrap: '#F3ECFF',
    icon: '#8E3AF0',
  },
  attention: {
    pill: '#FFE7E1',
    pillText: '#B54708',
    iconWrap: '#FFF1EA',
    icon: '#E07A2D',
  },
};

const subjectIcons = [
  'calculator-outline',
  'flask-outline',
  'book-outline',
  'library-outline',
] as const;

export default function AcademicsScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Homework');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['academics'],
    queryFn: () => apiGet<AcademicsResponse>('/api/academics'),
  });

  const timetableSlots = data?.dailyInsight?.slots ?? [];
  const availableDays = useMemo(() => {
    const responseDays = data?.dailyInsight?.days?.filter(Boolean) ?? [];
    if (responseDays.length > 0) {
      return responseDays;
    }

    return Array.from(new Set(timetableSlots.map((item) => item.day))).sort(
      (a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b),
    );
  }, [data?.dailyInsight?.days, timetableSlots]);

  const activeDay =
    selectedDay && availableDays.includes(selectedDay)
      ? selectedDay
      : (availableDays[0] ?? null);

  const activeDaySlots = useMemo(() => {
    const slots = activeDay
      ? timetableSlots.filter((item) => item.day === activeDay)
      : timetableSlots;

    return [...slots].sort((a, b) => a.period - b.period);
  }, [activeDay, timetableSlots]);

  if (isLoading) return <LoadingScreen />;
  if (isError)
    return <ErrorScreen message={(error as Error).message} onRetry={refetch} />;

  const homework = data?.homework ?? [];
  const grades = data?.grades?.subjectPerformance ?? [];

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
            : 'Track class homework, schedule, and grades.'
        }
      />

      <View style={styles.tabsWrap}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;

          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'Homework' ? (
        <>
          <View style={styles.metricsRow}>
            <Card style={styles.metricCard}>
              <Text style={styles.metricLabel}>TOTAL TASKS</Text>
              <Text style={styles.metricValue}>{data?.summary.total ?? 0}</Text>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricLabel}>DUE THIS WEEK</Text>
              <Text style={styles.metricValue}>
                {data?.summary.dueThisWeek ?? 0}
              </Text>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricLabel}>URGENT</Text>
              <Text style={styles.metricValue}>
                {data?.summary.urgentCount ?? 0}
              </Text>
            </Card>
          </View>

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
                        style={[
                          styles.statusPill,
                          { backgroundColor: tone.pill },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: tone.pillText }]}
                        >
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

                    <Text style={styles.subjectText}>
                      {item.subject.toUpperCase()}
                    </Text>
                    <Text style={styles.assignmentTitle}>{item.title}</Text>

                    {item.description ? (
                      <Text
                        style={styles.assignmentDescription}
                        numberOfLines={3}
                      >
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
                      <Text style={styles.footerStrong}>
                        {item.subjectCode}
                      </Text>
                    </View>

                    <View style={styles.teacherRow}>
                      <View style={styles.teacherBadge}>
                        <Text style={styles.teacherBadgeText}>
                          {item.teacherInitials || 'T'}
                        </Text>
                      </View>
                      <View style={styles.teacherCopy}>
                        <Text style={styles.teacherLabel}>Assigned by</Text>
                        <Text style={styles.teacherName}>
                          {item.teacherName}
                        </Text>
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
        </>
      ) : null}

      {activeTab === 'Daily Insight' ? (
        <>
          <SectionTitle
            title="Timetable"
            trailing={
              activeDay ? (
                <Text style={styles.trailingText}>{activeDay}</Text>
              ) : null
            }
          />

          {availableDays.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsRow}
            >
              {availableDays.map((day) => {
                const isActive = day === activeDay;

                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                  >
                    <Text
                      style={[
                        styles.dayChipLabel,
                        isActive && styles.dayChipLabelActive,
                      ]}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipValue,
                        isActive && styles.dayChipValueActive,
                      ]}
                    >
                      {(
                        timetableSlots.filter((item) => item.day === day)
                          .length ?? 0
                      )
                        .toString()
                        .padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {timetableSlots.length === 0 ? (
            <EmptyScreen
              message="No timetable slots are available for this class yet."
              icon="time-outline"
            />
          ) : (
            <View style={styles.scheduleStack}>
              {activeDaySlots.map((item) => (
                <View key={item.id} style={styles.scheduleRow}>
                  <View style={styles.periodRail}>
                    <Text style={styles.periodLabel}>PERIOD</Text>
                    <Text style={styles.periodValue}>{item.period}</Text>
                  </View>

                  <Card style={styles.scheduleCard}>
                    <View style={styles.scheduleTopRow}>
                      <View style={styles.scheduleBadge}>
                        <Text style={styles.scheduleBadgeText}>
                          {item.subjectCode}
                        </Text>
                      </View>
                      <View style={styles.scheduleRoomPill}>
                        <Text style={styles.scheduleRoomText}>
                          {item.room || `P-${item.period}`}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.scheduleTitle}>{item.subject}</Text>
                    <Text style={styles.scheduleTeacher}>
                      {item.teacherName}
                    </Text>

                    <View style={styles.scheduleFooter}>
                      <View style={styles.teacherMiniBadge}>
                        <Text style={styles.teacherMiniBadgeText}>
                          {item.teacherInitials || 'T'}
                        </Text>
                      </View>
                      <Text style={styles.scheduleFooterText}>
                        {item.day} • Period {item.period}
                      </Text>
                    </View>
                  </Card>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}

      {activeTab === 'Grades' ? (
        <>
          <Card style={styles.gradesHeroCard}>
            <View style={styles.gradesHeroCopy}>
              <Text style={styles.gradesHeroLabel}>OVERALL PERFORMANCE</Text>
              <Text style={styles.gradesHeroValue}>
                {Math.round(data?.grades?.overallPercentage ?? 0)}%
              </Text>
              <Text style={styles.gradesHeroSubtext}>
                {data?.grades?.examCycleName
                  ? `${data?.grades?.examCycleName} • ${data?.grades?.completedAssessments ?? 0} assessments`
                  : 'Grades will appear here once exam marks are published.'}
              </Text>
            </View>

            <View style={styles.gradesHeroRing}>
              <Text style={styles.gradesHeroRingText}>
                {Math.round(data?.grades?.overallPercentage ?? 0)}%
              </Text>
            </View>
          </Card>

          <SectionTitle
            title="Subject Performance"
            trailing={
              grades.length > 0 ? (
                <Text style={styles.trailingText}>
                  {grades.length} SUBJECTS
                </Text>
              ) : null
            }
          />

          {grades.length === 0 ? (
            <EmptyScreen
              message="No grade entries are available for this student yet."
              icon="stats-chart-outline"
            />
          ) : (
            <View style={styles.cardStack}>
              {grades.map((item, index) => {
                const tone = gradeToneStyles[item.statusTone];
                const iconName = subjectIcons[index % subjectIcons.length];

                return (
                  <Card key={item.id} style={styles.gradeCard}>
                    <View
                      style={[
                        styles.gradeIconWrap,
                        { backgroundColor: tone.iconWrap },
                      ]}
                    >
                      <Ionicons name={iconName} size={26} color={tone.icon} />
                    </View>

                    <View style={styles.gradeCardCopy}>
                      <Text style={styles.gradeSubject}>{item.subject}</Text>
                      <View style={styles.gradeMetaRow}>
                        <View
                          style={[
                            styles.gradeStatusPill,
                            { backgroundColor: tone.pill },
                          ]}
                        >
                          <Text
                            style={[
                              styles.gradeStatusText,
                              { color: tone.pillText },
                            ]}
                          >
                            {item.statusLabel}
                          </Text>
                        </View>
                        <Text style={styles.gradeAverageText}>
                          {item.averagePercentage}% Average
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gradeValueWrap}>
                      <Text style={styles.gradeValue}>{item.grade}</Text>
                      <Text style={styles.gradeCode}>{item.subjectCode}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      ) : null}
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
  tabsWrap: {
    flexDirection: 'row',
    gap: 12,
    padding: 8,
    borderRadius: 30,
    backgroundColor: '#F1F3F9',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 22,
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
    shadowColor: '#1A2858',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4D5260',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
  dayTabsRow: {
    gap: 14,
    paddingRight: 10,
  },
  dayChip: {
    width: 96,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dayChipActive: {
    backgroundColor: '#2A356B',
    borderColor: '#2A356B',
    shadowColor: '#1A2858',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  dayChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: palette.textSoft,
  },
  dayChipLabelActive: {
    color: '#C6D0F5',
  },
  dayChipValue: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.text,
  },
  dayChipValueActive: {
    color: '#FFFFFF',
  },
  scheduleStack: {
    gap: 18,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'stretch',
  },
  periodRail: {
    width: 76,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textSoft,
    letterSpacing: 1,
  },
  periodValue: {
    fontSize: 34,
    fontWeight: '800',
    color: palette.primary,
  },
  scheduleCard: {
    flex: 1,
    borderRadius: 30,
    padding: 22,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleBadge: {
    backgroundColor: '#E3FAF2',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scheduleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F9C7C',
    letterSpacing: 1,
  },
  scheduleRoomPill: {
    backgroundColor: '#F3F6FB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scheduleRoomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7696',
  },
  scheduleTitle: {
    marginTop: 20,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: palette.text,
    letterSpacing: -0.8,
  },
  scheduleTeacher: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7696',
    fontWeight: '600',
  },
  scheduleFooter: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teacherMiniBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherMiniBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primary,
  },
  scheduleFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textMuted,
  },
  gradesHeroCard: {
    borderRadius: 36,
    backgroundColor: '#1E2759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 28,
  },
  gradesHeroCopy: {
    flex: 1,
    paddingRight: 18,
  },
  gradesHeroLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A8B2DF',
    letterSpacing: 2,
  },
  gradesHeroValue: {
    marginTop: 14,
    fontSize: 60,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  gradesHeroSubtext: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: '#A8B2DF',
    fontWeight: '600',
  },
  gradesHeroRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 14,
    borderColor: '#8AF3E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradesHeroRingText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#8AF3E4',
  },
  gradeCard: {
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  gradeIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeCardCopy: {
    flex: 1,
    gap: 10,
  },
  gradeSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  gradeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  gradeStatusPill: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  gradeStatusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gradeAverageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4D5260',
  },
  gradeValueWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  gradeValue: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.primary,
  },
  gradeCode: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textSoft,
  },
});
