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

    const fees = await prisma.studentFee.findMany({
      where: { studentId: payload.studentId },
      include: { feeType: true },
      orderBy: { dueDate: 'desc' },
    });

    const payments = await prisma.feePayment.findMany({
      where: { studentId: payload.studentId },
      include: { feeType: true },
      orderBy: { paidAt: 'desc' },
      take: 20,
    });

    const totalDue = fees
      .filter((f) => f.status === 'PENDING' || f.status === 'OVERDUE')
      .reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return jsonResponse({
      summary: { totalDue, totalPaid },
      fees: fees.map((f) => ({
        id: f.id,
        name: f.feeType.name,
        amount: f.amount,
        dueDate: f.dueDate,
        status: f.status,
        frequency: f.feeType.frequency,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        name: p.feeType.name,
        amount: p.amount,
        method: p.paymentMethod,
        paidAt: p.paidAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/fees]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
