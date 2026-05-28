import bcrypt from 'bcryptjs';

import { signToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse(
        { error: 'Username and password are required' },
        { status: 400 },
      );
    }

    const normalizedInput = normalizePhoneNumber(username);

    const parent = await prisma.parent.findFirst({
      where: {
        isActive: true,
        OR: [{ phone: normalizedInput }, { username: username.trim() }],
      },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          include: { classRef: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!parent) {
      return jsonResponse(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const passwordMatch = await bcrypt.compare(password, parent.password);
    if (!passwordMatch) {
      return jsonResponse(
        { error: 'Invalid username or password' },
        { status: 401 },
      );
    }

    const student = parent.students[0];
    if (!student) {
      return jsonResponse(
        { error: 'No active student linked to this account' },
        { status: 403 },
      );
    }

    // Update last login
    await prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({
      parentId: parent.id,
      studentId: student.id,
      username: parent.username || parent.phone,
    });

    return jsonResponse({
      token,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.classRef?.name ?? student.className ?? '',
        section: student.classRef?.section ?? student.section ?? '',
      },
    });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}

function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  return trimmed;
}
