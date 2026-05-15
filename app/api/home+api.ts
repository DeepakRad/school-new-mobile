import { extractBearerToken, verifyToken } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { jsonResponse } from '../../lib/response';

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

    const totalDays = recentAttendance.length;
    const presentDays = recentAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const attendancePct =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    const pendingFees = fees.filter(
      (f) => f.status === 'PENDING' || f.status === 'OVERDUE',
    );
    const totalDue = pendingFees.reduce((sum, f) => sum + f.amount, 0);
    const nextFee = pendingFees
      .slice()
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    const threshold = settings?.dailyThreshold ?? 85;

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
      notifications: notices.map((notice) => ({
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
