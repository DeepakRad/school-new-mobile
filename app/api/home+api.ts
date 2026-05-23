import { differenceInCalendarDays, isToday, isTomorrow } from 'date-fns';

import { extractBearerToken, verifyToken } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { jsonResponse } from '../../lib/response';

function deriveHomeworkUrgency(dueDate: Date) {
  if (isToday(dueDate)) return 'DUE TODAY';
  if (isTomorrow(dueDate)) return 'DUE TOMORROW';

  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());
  if (daysUntilDue < 0) return 'OVERDUE';
  if (daysUntilDue <= 7) return 'DUE THIS WEEK';

  return 'UPCOMING';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const [student, settings, recentAttendance, fees, upcomingEvents, notices] =
      await Promise.all([
        prisma.student.findUnique({
          where: { id: payload.studentId },
          include: { classRef: true },
        }),
        prisma.schoolSettings.findFirst({
          select: { dailyThreshold: true },
        }),
        prisma.attendance.findMany({
          where: { studentId: payload.studentId },
          orderBy: { date: 'desc' },
          take: 30,
        }),
        prisma.studentFee.findMany({
          where: { studentId: payload.studentId },
          include: { feeType: true },
          orderBy: { dueDate: 'desc' },
          take: 10,
        }),
        prisma.calendarEvent.findMany({
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
          take: 2,
        }),
        prisma.notice.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            type: true,
            createdAt: true,
            description: true,
          },
        }),
      ]);

    if (!student)
      return jsonResponse({ error: 'Student not found' }, { status: 404 });

    const homework = student.classId
      ? await prisma.homework.findMany({
          where: {
            classId: student.classId,
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          take: 20,
        })
      : [];

    const totalDays = recentAttendance.length;
    const presentDays = recentAttendance.filter(
      (record: (typeof recentAttendance)[number]) =>
        record.status === 'PRESENT' || record.status === 'LATE',
    ).length;
    const attendancePct =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    const pendingFees = fees.filter(
      (fee: (typeof fees)[number]) =>
        fee.status === 'PENDING' || fee.status === 'OVERDUE',
    );
    const totalDue = pendingFees.reduce(
      (sum: number, fee: (typeof pendingFees)[number]) => sum + fee.amount,
      0,
    );
    const nextFee = pendingFees
      .slice()
      .sort(
        (
          left: (typeof pendingFees)[number],
          right: (typeof pendingFees)[number],
        ) => left.dueDate.getTime() - right.dueDate.getTime(),
      )[0];

    const threshold = settings?.dailyThreshold ?? 85;
    const now = new Date();
    const pendingHomework = homework.filter(
      (item: (typeof homework)[number]) => item.dueDate >= now,
    );
    const nextHomework = pendingHomework[0] ?? homework[0] ?? null;

    return jsonResponse({
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
        rollNo: student.rollNo,
        feeStatus: student.feeStatus,
      },
      attendanceSnapshot: {
        percentage: student.attendance ?? attendancePct,
        presentDays,
        totalDays,
        isLow: (student.attendance ?? attendancePct ?? 100) < threshold,
        threshold,
      },
      feeSnapshot: {
        totalDue,
        pendingCount: pendingFees.length,
        status: student.feeStatus,
        nextDueDate: nextFee?.dueDate ?? null,
        nextDueName: nextFee?.feeType.name ?? null,
      },
      homeworkSnapshot: {
        pendingCount: pendingHomework.length,
        nextDueDate: nextHomework?.dueDate ?? null,
        urgencyLabel: nextHomework
          ? deriveHomeworkUrgency(nextHomework.dueDate)
          : 'ALL CAUGHT UP',
      },
      notifications: notices.map((notice: (typeof notices)[number]) => ({
        id: notice.id,
        title: notice.title,
        body: notice.description,
        type: notice.type,
        createdAt: notice.createdAt,
      })),
      upcomingEvents,
    });
  } catch (error) {
    console.error('[GET /api/home]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
