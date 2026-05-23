import bcrypt from 'bcryptjs';
import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';

import { extractBearerToken, signToken, verifyToken } from './auth.js';
import { prisma } from './prisma.js';
import { jsonResponse } from './response.js';

function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  return trimmed;
}

function formatDueLabel(dueDate: Date) {
  if (isToday(dueDate)) return 'Due Today';
  if (isTomorrow(dueDate)) return 'Due Tomorrow';

  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());
  if (daysUntilDue > 1 && daysUntilDue <= 7) return `Due in ${daysUntilDue} days`;
  if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;

  return format(dueDate, 'MMM dd, yyyy');
}

function derivePriority(dueDate: Date) {
  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());

  if (daysUntilDue < 0) return { label: 'OVERDUE', tone: 'danger' as const };
  if (daysUntilDue <= 1)
    return { label: 'HIGH PRIORITY', tone: 'danger' as const };
  if (daysUntilDue <= 5)
    return { label: 'IN PROGRESS', tone: 'mint' as const };

  return { label: 'UPCOMING', tone: 'sky' as const };
}

function deriveHomeworkUrgency(dueDate: Date) {
  if (isToday(dueDate)) return 'DUE TODAY';
  if (isTomorrow(dueDate)) return 'DUE TOMORROW';

  const daysUntilDue = differenceInCalendarDays(dueDate, new Date());
  if (daysUntilDue < 0) return 'OVERDUE';
  if (daysUntilDue <= 7) return 'DUE THIS WEEK';

  return 'UPCOMING';
}

export async function handleAuthLogin(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }

    const normalizedInput = normalizePhoneNumber(username);

    const parent = await prisma.parent.findFirst({
      where: {
        phone: normalizedInput,
        isActive: true,
      },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          include: { classRef: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!parent) {
      return jsonResponse(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const passwordMatch = await bcrypt.compare(password, parent.password);
    if (!passwordMatch) {
      return jsonResponse(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const student = parent.students[0];
    if (!student) {
      return jsonResponse(
        { error: 'No active student linked to this account' },
        { status: 403 },
      );
    }

    await prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({
      parentId: parent.id,
      studentId: student.id,
      username: parent.username || parent.phone,
    });

    return jsonResponse({
      token,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
      },
    });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleAuthMe(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return jsonResponse(
        { error: 'Invalid or expired token' },
        { status: 401 },
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      include: { classRef: true },
    });

    if (!student || student.status !== 'ACTIVE') {
      return jsonResponse({ error: 'Student not found' }, { status: 404 });
    }

    return jsonResponse({
      parentId: payload.parentId,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
        rollNo: student.rollNo,
        gender: student.gender,
        dob: student.dob,
        bloodGroup: student.bloodGroup,
        feeStatus: student.feeStatus,
        attendance: student.attendance,
      },
    });
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleHome(request: Request): Promise<Response> {
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
          where: { classId: student.classId },
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

export async function handleAttendance(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');

    let dateFilter: { gte?: Date; lte?: Date } = {};
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      if (y && m) {
        dateFilter = {
          gte: new Date(Date.UTC(y, m - 1, 1)),
          lte: new Date(Date.UTC(y, m, 1) - 1),
        };
      }
    } else if (yearParam) {
      const y = parseInt(yearParam, 10);
      dateFilter = {
        gte: new Date(Date.UTC(y, 0, 1)),
        lte: new Date(Date.UTC(y + 1, 0, 1) - 1),
      };
    } else {
      const y = new Date().getUTCFullYear();
      dateFilter = {
        gte: new Date(Date.UTC(y, 0, 1)),
        lte: new Date(Date.UTC(y + 1, 0, 1) - 1),
      };
    }

    const [student, records, settings] = await Promise.all([
      prisma.student.findUnique({
        where: { id: payload.studentId },
        select: { attendance: true },
      }),
      prisma.attendance.findMany({
        where: { studentId: payload.studentId, date: dateFilter },
        orderBy: { date: 'desc' },
      }),
      prisma.schoolSettings.findFirst({ select: { dailyThreshold: true } }),
    ]);

    const threshold = settings?.dailyThreshold ?? 85;
    const monthly: Record<
      string,
      { present: number; absent: number; late: number; total: number }
    > = {};

    for (const record of records) {
      const key = `${record.date.getUTCFullYear()}-${String(record.date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) {
        monthly[key] = { present: 0, absent: 0, late: 0, total: 0 };
      }

      monthly[key].total += 1;
      if (record.status === 'PRESENT') monthly[key].present += 1;
      else if (record.status === 'ABSENT') monthly[key].absent += 1;
      else if (record.status === 'LATE') monthly[key].late += 1;
    }

    const totalDays = records.length;
    const presentDays = records.filter(
      (record: (typeof records)[number]) =>
        record.status === 'PRESENT' || record.status === 'LATE',
    ).length;
    const overallPct =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

    return jsonResponse({
      overall: {
        percentage: student?.attendance ?? overallPct,
        presentDays,
        totalDays,
        threshold,
        isLow: (student?.attendance ?? overallPct ?? 100) < threshold,
      },
      monthly: Object.entries(monthly)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, data]) => ({
          month,
          ...data,
          percentage:
            data.total > 0
              ? Math.round(((data.present + data.late) / data.total) * 100)
              : 0,
        })),
      recent: records.slice(0, 30).map((record: (typeof records)[number]) => ({
        id: record.id,
        date: record.date,
        status: record.status,
        notes: record.notes,
      })),
    });
  } catch (error) {
    console.error('[GET /api/attendance]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleCalendar(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month');

    let dateFilter: { gte: Date; lte: Date };
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      dateFilter = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      };
    } else {
      const now = new Date();
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear() + 1, now.getMonth(), 0),
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where: { startDate: dateFilter },
      orderBy: { startDate: 'asc' },
    });

    return jsonResponse({ events });
  } catch (error) {
    console.error('[GET /api/calendar]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleAcademics(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

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

    if (!student.classId) {
      return jsonResponse({
        student: {
          className: student.classRef?.name ?? student.className ?? '',
          section: student.classRef?.section ?? student.section ?? '',
        },
        summary: {
          total: 0,
          urgentCount: 0,
          dueThisWeek: 0,
        },
        homework: [],
      });
    }

    const homework = await prisma.homework.findMany({
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
    });

    const enrichedHomework = homework.map((item: (typeof homework)[number]) => {
      const priority = derivePriority(item.dueDate);
      const teacherName = `${item.Staff.firstName} ${item.Staff.lastName}`.trim();

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        dueDate: item.dueDate,
        dueLabel: formatDueLabel(item.dueDate),
        subject: item.Subject.name,
        subjectCode: item.Subject.code,
        teacherName,
        teacherInitials: teacherName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? '')
          .join(''),
        statusLabel: priority.label,
        statusTone: priority.tone,
      };
    });

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
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
      },
      summary: {
        total: enrichedHomework.length,
        urgentCount,
        dueThisWeek,
      },
      homework: enrichedHomework,
    });
  } catch (error) {
    console.error('[GET /api/academics]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleNotifications(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      select: { classId: true },
    });

    const noticeState = await prisma.noticeNotificationState.findUnique({
      where: {
        userId_userType: { userId: payload.parentId, userType: 'PARENT' },
      },
    });

    const lastSeenAt = noticeState?.lastSeenAt ?? new Date(0);

    const [notices, broadcasts] = await Promise.all([
      prisma.notice.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
        take: limit + skip,
      }),
      prisma.broadcast.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { recipientType: 'ALL_PARENTS' },
            { recipientType: 'ALL_STUDENTS' },
            ...(student?.classId
              ? [
                  {
                    recipientType: 'CLASS' as const,
                    targetClassId: student.classId,
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit + skip,
      }),
    ]);

    const combined = [
      ...notices.map((notice: (typeof notices)[number]) => ({
        id: notice.id,
        source: 'notice' as const,
        title: notice.title,
        body: notice.description,
        type: notice.type,
        createdAt: notice.createdAt,
        isRead: notice.createdAt <= lastSeenAt,
      })),
      ...broadcasts.map((broadcast: (typeof broadcasts)[number]) => ({
        id: broadcast.id,
        source: 'broadcast' as const,
        title: broadcast.subject,
        body: broadcast.content,
        type: 'BROADCAST' as const,
        createdAt: broadcast.createdAt,
        isRead: broadcast.createdAt <= lastSeenAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(skip, skip + limit);

    return jsonResponse({
      notifications: combined,
      page,
      hasMore: combined.length === limit,
    });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleNotificationsMarkRead(
  request: Request,
): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    await prisma.noticeNotificationState.upsert({
      where: {
        userId_userType: { userId: payload.parentId, userType: 'PARENT' },
      },
      create: {
        userId: payload.parentId,
        userType: 'PARENT',
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[POST /api/notifications/mark-read]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleNotificationsUnreadCount(
  request: Request,
): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const state = await prisma.noticeNotificationState.findUnique({
      where: {
        userId_userType: { userId: payload.parentId, userType: 'PARENT' },
      },
    });

    const lastSeenAt = state?.lastSeenAt ?? new Date(0);

    const [noticeCount, broadcastCount] = await Promise.all([
      prisma.notice.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gt: lastSeenAt },
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
      }),
      prisma.broadcast.count({
        where: {
          status: 'PUBLISHED',
          createdAt: { gt: lastSeenAt },
          OR: [
            { recipientType: 'ALL_PARENTS' },
            { recipientType: 'ALL_STUDENTS' },
          ],
        },
      }),
    ]);

    return jsonResponse({ unreadCount: noticeCount + broadcastCount });
  } catch (error) {
    console.error('[GET /api/notifications/unread-count]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleProfile(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      include: { classRef: true },
    });

    if (!student) return jsonResponse({ error: 'Not found' }, { status: 404 });

    const parent = await prisma.parent.findUnique({
      where: { id: payload.parentId },
      select: { phone: true, username: true },
    });

    return jsonResponse({
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        gender: student.gender,
        dob: student.dob,
        bloodGroup: student.bloodGroup,
        category: student.category,
        religion: student.religion,
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
        email: student.email,
        mobileNumber: student.mobileNumber,
        admissionDate: student.admissionDate,
        house: student.house,
        currentAddress: student.currentAddress,
        fatherName: student.fatherName,
        fatherPhone: student.fatherPhone,
        motherName: student.motherName,
        motherPhone: student.motherPhone,
        guardianName: student.guardianName,
        guardianRelation: student.guardianRelation,
        guardianPhone: student.guardianPhone,
        feeStatus: student.feeStatus,
        attendance: student.attendance,
        status: student.status,
      },
      parent: {
        phone: parent?.phone,
        username: parent?.username,
      },
    });
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function handleFees(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const fees = await prisma.studentFee.findMany({
      where: { studentId: payload.studentId },
      include: { feeType: true },
      orderBy: { dueDate: 'desc' },
    });

    const payments = await prisma.feePayment.findMany({
      where: { studentId: payload.studentId },
      include: { feeType: true },
      orderBy: { paidAt: 'desc' },
      take: 20,
    });

    const totalDue = fees
      .filter(
        (fee: (typeof fees)[number]) =>
          fee.status === 'PENDING' || fee.status === 'OVERDUE',
      )
      .reduce((sum: number, fee: (typeof fees)[number]) => sum + fee.amount, 0);
    const totalPaid = payments.reduce(
      (sum: number, payment: (typeof payments)[number]) =>
        sum + payment.amount,
      0,
    );

    return jsonResponse({
      summary: { totalDue, totalPaid },
      fees: fees.map((fee: (typeof fees)[number]) => ({
        id: fee.id,
        name: fee.feeType.name,
        amount: fee.amount,
        dueDate: fee.dueDate,
        status: fee.status,
        frequency: fee.feeType.frequency,
      })),
      payments: payments.map((payment: (typeof payments)[number]) => ({
        id: payment.id,
        receiptNo: payment.receiptNo,
        name: payment.feeType.name,
        amount: payment.amount,
        method: payment.paymentMethod,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/fees]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
