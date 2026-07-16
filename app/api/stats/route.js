import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getOptionalUser } from '../../../lib/api-security';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user } = await getOptionalUser(request);
    // Use explicit UTC midnight for timezone-independent daily count
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const isAdmin = user?.role === 'ADMIN';
    const publicFilter = isAdmin ? {} : { published: true };

    const [totalPrompts, promptCopies, recentPrompts] = await Promise.all([
      prisma.prompt.count({ where: publicFilter }),
      prisma.prompt.aggregate({ where: publicFilter, _sum: { copies: true } }),
      prisma.prompt.count({
        where: {
          ...publicFilter,
          createdAt: {
            gte: utcMidnight
          }
        }
      })
    ]);

    const cacheHeader = isAdmin
      ? 'no-store, no-cache, must-revalidate'
      : 'public, s-maxage=300, stale-while-revalidate=600';

    return NextResponse.json({
      totalPrompts,
      totalCopies: promptCopies._sum.copies || 0,
      dailyAdded: recentPrompts
    }, {
      headers: {
        'Cache-Control': cacheHeader
      }
    });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
