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
      .filter(
        (fee: (typeof fees)[number]) =>
          fee.status === 'PENDING' || fee.status === 'OVERDUE',
      )
      .reduce((sum: number, fee: (typeof fees)[number]) => sum + fee.amount, 0);
    const totalPaid = payments.reduce(
      (sum: number, payment: (typeof payments)[number]) => sum + payment.amount,
      0,
    );

    return jsonResponse({
      summary: { totalDue, totalPaid },
      fees: fees.map((fee: (typeof fees)[number]) => ({
        id: fee.id,
        name: fee.feeType.name,
        amount: fee.amount,
        dueDate: fee.dueDate,
        status: fee.status,
        frequency: fee.feeType.frequency,
      })),
      payments: payments.map((payment: (typeof payments)[number]) => ({
        id: payment.id,
        receiptNo: payment.receiptNo,
        name: payment.feeType.name,
        amount: payment.amount,
        method: payment.paymentMethod,
        paidAt: payment.paidAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/fees]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
