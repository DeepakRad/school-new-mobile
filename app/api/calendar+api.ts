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
