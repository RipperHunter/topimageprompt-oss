import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, getOptionalUser, readJsonObject, requireAdmin, slugify } from '../../../lib/api-security';

export const dynamic = 'force-dynamic';

// GET /api/categories — returns all categories
export async function GET(request) {
  const { user } = await getOptionalUser(request);
  const isAdmin = user?.role === 'ADMIN';
  const categories = await prisma.category.findMany({
    where: isAdmin ? {} : { status: 'Active' },
    orderBy: { createdAt: 'desc' },
  });
  
  const cacheHeader = isAdmin
    ? 'no-store, no-cache, must-revalidate'
    : 'public, s-maxage=300, stale-while-revalidate=600';

  return NextResponse.json({ categories }, {
    headers: {
      'Cache-Control': cacheHeader
    }
  });
}

// POST /api/categories — creates a new category
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const name = cleanString(body.name, 80);
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = slugify(name);
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        groupType: cleanString(body.groupType, 80, 'Style'),
        status: cleanString(body.status, 24, 'Active'),
        imageUrl: cleanOptionalString(body.imageUrl, 2048),
        promptCount: Number.isInteger(body.promptCount) ? body.promptCount : 0,
      },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/');
    revalidatePath('/explore');

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
