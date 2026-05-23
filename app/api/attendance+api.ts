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

    const url = new URL(request.url);
    const monthParam = url.searchParams.get('month'); // "2024-01"
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
      const y = parseInt(yearParam);
      dateFilter = {
        gte: new Date(Date.UTC(y, 0, 1)),
        lte: new Date(Date.UTC(y + 1, 0, 1) - 1),
      };
    } else {
      // Current year by default
      const y = new Date().getUTCFullYear();
      dateFilter = {
        gte: new Date(Date.UTC(y, 0, 1)),
        lte: new Date(Date.UTC(y + 1, 0, 1) - 1),
      };
    }

    const [student, records, settings] = await Promise.all([
      prisma.student.findUnique({
        where: { id: payload.studentId },
        select: { attendance: true, firstName: true },
      }),
      prisma.attendance.findMany({
        where: { studentId: payload.studentId, date: dateFilter },
        orderBy: { date: 'desc' },
      }),
      prisma.schoolSettings.findFirst({ select: { dailyThreshold: true } }),
    ]);

    const threshold = settings?.dailyThreshold ?? 85;

    // Monthly breakdown
    const monthly: Record<
      string,
      { present: number; absent: number; late: number; total: number }
    > = {};
    for (const r of records) {
      const key = `${r.date.getUTCFullYear()}-${String(r.date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key])
        monthly[key] = { present: 0, absent: 0, late: 0, total: 0 };
      monthly[key].total++;
      if (r.status === 'PRESENT') monthly[key].present++;
      else if (r.status === 'ABSENT') monthly[key].absent++;
      else if (r.status === 'LATE') monthly[key].late++;
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
