import { extractBearerToken, verifyToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

function resolveNotificationUserId(payload: {
  parentId?: string;
  studentId: string;
}) {
  return payload.parentId ?? payload.studentId;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = extractBearerToken(request.headers.get('Authorization'));
    if (!token) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload)
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });

    const notificationUserId = resolveNotificationUserId(payload);

    try {
      await prisma.noticeNotificationState.upsert({
        where: {
          userId_userType: { userId: notificationUserId, userType: 'PARENT' },
        },
        create: {
          userId: notificationUserId,
          userType: 'PARENT',
          lastSeenAt: new Date(),
        },
        update: { lastSeenAt: new Date() },
      });

      return jsonResponse({ success: true });
    } catch (error) {
      console.warn(
        '[notifications] Failed to update notification state',
        error,
      );
      return jsonResponse({ success: false });
    }
  } catch (error) {
    console.error('[POST /api/notifications/mark-read]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
