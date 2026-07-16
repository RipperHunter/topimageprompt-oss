import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { ADMIN_CACHE_HEADER, requireAdmin } from '../../../lib/api-security';

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: { saves: true }
        }
      }
    });

    return NextResponse.json({ users }, {
      headers: {
        'Cache-Control': ADMIN_CACHE_HEADER
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
