import { extractBearerToken, verifyToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

function resolveNotificationUserId(payload: {
  parentId?: string;
  studentId: string;
}) {
  return payload.parentId ?? payload.studentId;
}

async function getLastSeenAt(userId: string) {
  try {
    const state = await prisma.noticeNotificationState.findUnique({
      where: {
        userId_userType: { userId, userType: 'PARENT' },
      },
    });

    return state?.lastSeenAt ?? new Date(0);
  } catch (error) {
    console.warn('[notifications] Failed to load notification state', error);
    return new Date(0);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const notificationUserId = resolveNotificationUserId(payload);
    const lastSeenAt = await getLastSeenAt(notificationUserId);

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
