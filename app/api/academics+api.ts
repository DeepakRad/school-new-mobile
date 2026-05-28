import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
} from 'date-fns';

import { extractBearerToken, verifyToken } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { jsonResponse } from '../../lib/response';

function formatDueLabel(dueDate: Date) {
  if (isToday(dueDate)) return 'Due Today';
  if (isTomorrow(dueDate)) return 'Due Tomorrow';

  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());
  if (daysUntilDue > 1 && daysUntilDue <= 7)
    return `Due in ${daysUntilDue} days`;
  if (daysUntilDue < 0) {
    return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
  }

  return format(dueDate, 'MMM dd, yyyy');
}

function derivePriority(dueDate: Date) {
  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());

  if (daysUntilDue < 0) return { label: 'OVERDUE', tone: 'danger' as const };
  if (daysUntilDue <= 1) {
    return { label: 'HIGH PRIORITY', tone: 'danger' as const };
  }
  if (daysUntilDue <= 5) {
    return { label: 'IN PROGRESS', tone: 'mint' as const };
  }

  return { label: 'UPCOMING', tone: 'sky' as const };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function deriveLetterGrade(percentage: number) {
  if (percentage >= 90) return 'A';
  if (percentage >= 85) return 'A-';
  if (percentage >= 80) return 'B+';
  if (percentage >= 75) return 'B';
  if (percentage >= 70) return 'B-';
  if (percentage >= 65) return 'C+';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';

  return 'F';
}

function deriveGradeTone(percentage: number) {
  if (percentage >= 90) {
    return { label: 'EXCELLENT', tone: 'excellent' as const };
  }
  if (percentage >= 80) {
    return { label: 'IMPROVING', tone: 'improving' as const };
  }
  if (percentage >= 65) {
    return { label: 'STEADY', tone: 'steady' as const };
  }

  return { label: 'NEEDS FOCUS', tone: 'attention' as const };
}

const dailyInsightTimeline = [
  { period: 1, startTime: '08:00', endTime: '09:00', type: 'class' as const },
  { period: 2, startTime: '09:00', endTime: '10:00', type: 'class' as const },
  { startTime: '10:00', endTime: '10:15', type: 'break' as const },
  { period: 3, startTime: '10:15', endTime: '11:15', type: 'class' as const },
  { period: 4, startTime: '11:15', endTime: '12:15', type: 'class' as const },
  { startTime: '12:15', endTime: '13:00', type: 'lunch' as const },
  { period: 5, startTime: '13:00', endTime: '14:00', type: 'class' as const },
  { period: 6, startTime: '14:00', endTime: '15:00', type: 'class' as const },
];

function formatTimeLabel(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`;
}

function buildDisplayLocation(
  room: string | null,
  className: string,
  section: string,
) {
  if (room) return room;

  const classLabel = [className, section].filter(Boolean).join(' ');
  return classLabel || 'Classroom';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) {
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });
    }

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      select: {
        classId: true,
        className: true,
        section: true,
        classRef: {
          select: {
            name: true,
            section: true,
          },
        },
      },
    });

    if (!student) {
      return jsonResponse({ error: 'Student not found' }, { status: 404 });
    }

    const resolvedClassName = student.classRef?.name ?? student.className ?? '';
    const resolvedSection = student.classRef?.section ?? student.section ?? '';

    if (!student.classId) {
      return jsonResponse({
        student: {
          className: resolvedClassName,
          section: resolvedSection,
        },
        summary: {
          total: 0,
          urgentCount: 0,
          dueThisWeek: 0,
        },
        dailyInsight: {
          days: [],
          slots: [],
        },
        grades: {
          overallPercentage: 0,
          examCycleName: null,
          totalSubjects: 0,
          completedAssessments: 0,
          subjectPerformance: [],
        },
        homework: [],
      });
    }

    const [homework, timetableSlots, examEntries] = await Promise.all([
      prisma.homework.findMany({
        where: { classId: student.classId },
        include: {
          Subject: {
            select: { name: true, code: true },
          },
          Staff: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      prisma.timetableSlot.findMany({
        where: { classId: student.classId },
        include: {
          Class: {
            select: { room: true },
          },
          Subject: {
            select: { name: true, code: true },
          },
          Staff: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ day: 'asc' }, { period: 'asc' }],
      }),
      prisma.examResultEntry.findMany({
        where: { studentId: payload.studentId },
        include: {
          Exam: {
            include: {
              ExamCycle: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    const subjectIds = Array.from(
      new Set(
        examEntries.map(
          (entry: (typeof examEntries)[number]) => entry.Exam.subjectId,
        ),
      ),
    );
    const subjects = subjectIds.length
      ? await prisma.subject.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const subjectsById = new Map<
      string,
      { id: string; name: string; code: string }
    >(
      subjects.map((subject: (typeof subjects)[number]) => [
        subject.id,
        subject,
      ]),
    );

    const enrichedHomework = homework.map((item: (typeof homework)[number]) => {
      const priority = derivePriority(item.dueDate);
      const teacherName =
        `${item.Staff.firstName} ${item.Staff.lastName}`.trim();

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        dueLabel: formatDueLabel(item.dueDate),
        subject: item.Subject.name,
        subjectCode: item.Subject.code,
        teacherName,
        teacherInitials: getInitials(teacherName),
        statusLabel: priority.label,
        statusTone: priority.tone,
      };
    });

    const dayOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const timetableByDay = new Map(
      dayOrder.map((day) => [day, new Map<number, (typeof timetableSlots)[number]>()]),
    );

    for (const slot of timetableSlots) {
      timetableByDay.get(slot.day)?.set(slot.period, slot);
    }

    const dailyInsightSlots = dayOrder.flatMap((day) => {
      const slotsForDay = timetableByDay.get(day);
      if (!slotsForDay || slotsForDay.size === 0) return [];

      return dailyInsightTimeline.flatMap((timelineItem, index) => {
        if (timelineItem.type === 'break') {
          return {
            id: `${day}-break-${index}`,
            day,
            type: 'break' as const,
            title: 'Recess Break',
            subtitle: formatTimeLabel(timelineItem.startTime, timelineItem.endTime),
            badge: 'BREAK',
            location: 'RECHARGE',
            startTime: timelineItem.startTime,
            endTime: timelineItem.endTime,
            timeLabel: formatTimeLabel(timelineItem.startTime, timelineItem.endTime),
          };
        }

        if (timelineItem.type === 'lunch') {
          return {
            id: `${day}-lunch-${index}`,
            day,
            type: 'lunch' as const,
            title: 'Lunch Break',
            subtitle: formatTimeLabel(timelineItem.startTime, timelineItem.endTime),
            badge: 'BREAK',
            location: 'CAFETERIA',
            startTime: timelineItem.startTime,
            endTime: timelineItem.endTime,
            timeLabel: formatTimeLabel(timelineItem.startTime, timelineItem.endTime),
          };
        }

        const slot = slotsForDay.get(timelineItem.period);
        if (!slot) return [];

        const teacherName = `${slot.Staff.firstName} ${slot.Staff.lastName}`.trim();

        return {
          id: slot.id,
          day,
          type: 'class' as const,
          period: slot.period,
          title: slot.Subject.name,
          subtitle: teacherName,
          badge: slot.Subject.code,
          location: buildDisplayLocation(
            slot.Class.room,
            resolvedClassName,
            resolvedSection,
          ),
          startTime: timelineItem.startTime,
          endTime: timelineItem.endTime,
          timeLabel: formatTimeLabel(timelineItem.startTime, timelineItem.endTime),
          subject: slot.Subject.name,
          subjectCode: slot.Subject.code,
          teacherName,
          teacherInitials: getInitials(teacherName),
          room: slot.Class.room,
        };
      });
    });

    const dailyInsightDays = Array.from(
      new Set<string>(dailyInsightSlots.map((item) => item.day)),
    ).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    const subjectGrades = new Map<
      string,
      {
        id: string;
        subject: string;
        subjectCode: string;
        totalMarks: number;
        totalMaxMarks: number;
        assessments: number;
      }
    >();

    let overallMarks = 0;
    let overallMaxMarks = 0;
    let latestExamCycleName: string | null = null;

    for (const entry of examEntries) {
      if (entry.isAbsent || entry.marksObtained == null) continue;

      const exam = entry.Exam;
      const subject = subjectsById.get(exam.subjectId);
      if (!subject) continue;

      if (!latestExamCycleName) {
        latestExamCycleName = exam.ExamCycle.name;
      }

      const existing = subjectGrades.get(subject.id) ?? {
        id: subject.id,
        subject: subject.name,
        subjectCode: subject.code,
        totalMarks: 0,
        totalMaxMarks: 0,
        assessments: 0,
      };

      existing.totalMarks += entry.marksObtained;
      existing.totalMaxMarks += exam.maxMarks;
      existing.assessments += 1;
      subjectGrades.set(subject.id, existing);

      overallMarks += entry.marksObtained;
      overallMaxMarks += exam.maxMarks;
    }

    const subjectPerformance = Array.from(subjectGrades.values())
      .map((item) => {
        const averagePercentage = item.totalMaxMarks
          ? roundToOneDecimal((item.totalMarks / item.totalMaxMarks) * 100)
          : 0;
        const averageMarks = item.assessments
          ? roundToOneDecimal(item.totalMarks / item.assessments)
          : 0;
        const tone = deriveGradeTone(averagePercentage);

        return {
          id: item.id,
          subject: item.subject,
          subjectCode: item.subjectCode,
          averagePercentage,
          averageMarks,
          totalMaxMarks: item.totalMaxMarks,
          grade: deriveLetterGrade(averagePercentage),
          statusLabel: tone.label,
          statusTone: tone.tone,
        };
      })
      .sort((a, b) => b.averagePercentage - a.averagePercentage);

    const urgentCount = enrichedHomework.filter(
      (item: (typeof enrichedHomework)[number]) => item.statusTone === 'danger',
    ).length;
    const dueThisWeek = enrichedHomework.filter(
      (item: (typeof enrichedHomework)[number]) => {
        const daysUntilDue = differenceInCalendarDays(
          new Date(item.dueDate),
          new Date(),
        );

        return daysUntilDue >= 0 && daysUntilDue <= 7;
      },
    ).length;

    return jsonResponse({
      student: {
        className: resolvedClassName,
        section: resolvedSection,
      },
      summary: {
        total: enrichedHomework.length,
        urgentCount,
        dueThisWeek,
      },
      dailyInsight: {
        days: dailyInsightDays,
        slots: dailyInsightSlots,
      },
      grades: {
        overallPercentage: overallMaxMarks
          ? roundToOneDecimal((overallMarks / overallMaxMarks) * 100)
          : 0,
        examCycleName: latestExamCycleName,
        totalSubjects: subjectPerformance.length,
        completedAssessments: examEntries.filter(
          (entry: (typeof examEntries)[number]) =>
            !entry.isAbsent && entry.marksObtained != null,
        ).length,
        subjectPerformance,
      },
      homework: enrichedHomework,
    });
  } catch (error) {
    console.error('[GET /api/academics]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
