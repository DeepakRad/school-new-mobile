import { extractBearerToken, verifyToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

export async function POST(request: Request): Promise<Response> {
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
