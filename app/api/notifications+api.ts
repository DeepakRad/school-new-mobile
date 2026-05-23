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
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = 20;
    const skip = (page - 1) * limit;

    // Get student's class for filtering broadcasts
    const student = await prisma.student.findUnique({
      where: { id: payload.studentId },
      select: { classId: true },
    });

    // Get last seen state
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
        skip: 0,
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
        skip: 0,
      }),
    ]);

    // Merge and sort
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
