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

    const [student, parent, schoolSettings, academicYear] = await Promise.all([
      prisma.student.findUnique({
        where: { id: payload.studentId },
        include: { classRef: true },
      }),
      prisma.parent.findUnique({
        where: { id: payload.parentId },
        select: { phone: true, username: true },
      }),
      prisma.schoolSettings.findFirst({
        select: {
          schoolName: true,
          schoolLogo: true,
          fullAddress: true,
          officialEmail: true,
        },
      }),
      prisma.academicYear.findFirst({
        where: { isCurrent: true },
        select: { name: true },
      }),
    ]);

    if (!student) return jsonResponse({ error: 'Not found' }, { status: 404 });

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
      institution: {
        name: schoolSettings?.schoolName,
        logo: schoolSettings?.schoolLogo,
        address: schoolSettings?.fullAddress,
        officialEmail: schoolSettings?.officialEmail,
        academicYear: academicYear?.name ?? null,
      },
    });
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
