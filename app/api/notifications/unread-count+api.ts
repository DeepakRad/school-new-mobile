import { extractBearerToken, verifyToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

export async function GET(request: Request): Promise<Response> {
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
