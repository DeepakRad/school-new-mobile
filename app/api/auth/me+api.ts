import { extractBearerToken, verifyToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

export async function GET(request: Request): Promise<Response> {
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
