import { differenceInCalendarDays, format, isToday, isTomorrow } from 'date-fns';

import { extractBearerToken, verifyToken } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { jsonResponse } from '../../lib/response';

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

  if (daysUntilDue < 0) {
    return { label: 'OVERDUE', tone: 'danger' as const };
  }

  if (daysUntilDue <= 1) {
    return { label: 'HIGH PRIORITY', tone: 'danger' as const };
  }

  if (daysUntilDue <= 5) {
    return { label: 'IN PROGRESS', tone: 'mint' as const };
  }

  return { label: 'UPCOMING', tone: 'sky' as const };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      select: {
        id: true,
        classId: true,
        className: true,
        section: true,
        classRef: {
          select: {
            id: true,
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
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        Staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
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
