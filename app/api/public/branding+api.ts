import { prisma } from '../../../lib/prisma';
import { jsonResponse } from '../../../lib/response';

export async function GET(): Promise<Response> {
  try {
    const schoolSettings = await prisma.schoolSettings.findFirst({
      select: {
        schoolName: true,
        schoolLogo: true,
        fullAddress: true,
        officialEmail: true,
      },
    });

    return jsonResponse({
      schoolName: schoolSettings?.schoolName ?? 'School ERP',
      schoolLogo: schoolSettings?.schoolLogo ?? null,
      fullAddress: schoolSettings?.fullAddress ?? null,
      officialEmail: schoolSettings?.officialEmail ?? null,
    });
  } catch (error) {
    console.error('[GET /api/public/branding]', error);
    return jsonResponse({ error: 'Internal server error' }, { status: 500 });
  }
}
