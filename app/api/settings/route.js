import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, readJsonObject, requireAdmin, safeJsonArray } from '../../../lib/api-security';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  id: 'global',
  heroImageLeftOut: null,
  heroImageLeft: null,
  heroImageCenter: null,
  heroImageRight: null,
  heroImageRightOut: null,
  exploreHero: null,
  pinterestImage1: null,
  pinterestImage2: null,
  pinterestImage3: null,
  pinterestImage4: null,
  pinterestImage5: null,
  loginImages: '[]',
  heroPrompts: '[]',
  heroCustomTexts: '[]',
  pinterestFollowers: '10K+',
  allowedEngines: '[]',
  allowedStyles: '[]',
  allowedRatios: '[]',
  engineMetadata: '[]',
  styleMetadata: '[]',
  updatedAt: null,
};

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
  return NextResponse.json(
    { settings: settings || DEFAULT_SETTINGS },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}

export async function PUT(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const updateData = {};
    const imageFields = [
      'heroImageLeftOut',
      'heroImageLeft',
      'heroImageCenter',
      'heroImageRight',
      'heroImageRightOut',
      'exploreHero',
      'pinterestImage1',
      'pinterestImage2',
      'pinterestImage3',
      'pinterestImage4',
      'pinterestImage5',
    ];
    for (const field of imageFields) {
      const value = cleanOptionalString(body[field], 2048);
      if (value !== undefined) updateData[field] = value;
    }
    for (const field of ['loginImages', 'heroPrompts', 'heroCustomTexts', 'allowedEngines', 'allowedStyles', 'allowedRatios', 'engineMetadata', 'styleMetadata']) {
      const value = safeJsonArray(body[field]);
      if (value !== undefined) updateData[field] = value;
    }
    const pinterestFollowers = cleanOptionalString(body.pinterestFollowers, 40);
    if (pinterestFollowers !== undefined) updateData.pinterestFollowers = pinterestFollowers;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid settings fields supplied' }, { status: 400 });
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'global' },
      update: updateData,
      create: {
        id: 'global',
        ...updateData
      }
    });

    revalidatePath('/admin/settings');
    revalidatePath('/');
    revalidatePath('/explore');

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
