import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, getOptionalUser, readJsonObject, requireAdmin } from '../../../lib/api-security';
import { generateUniquePromptSlug } from '../../../lib/slug';

// GET /api/prompts — returns all prompts with filtering
export async function GET(request) {
  try {
    const { user } = await getOptionalUser(request);
    const isAdmin = user?.role === 'ADMIN';
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const engine = searchParams.get('engine');
    const search = searchParams.get('q');
    const view = searchParams.get('view');
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const parsedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const where = isAdmin ? {} : { published: true };
    if (category) where.category = { contains: category };
    if (engine) where.engine = { contains: engine };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { promptText: { contains: search } },
      ];
    }

    const [total, prompts] = await Promise.all([
      prisma.prompt.count({ where }),
      prisma.prompt.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        ...(view === 'explore' ? {
          select: {
            id: true,
            title: true,
            slug: true,
            promptText: true,
            engine: true,
            category: true,
            aspectRatio: true,
            imageUrl: true,
            originalImageUrl: true,
            copies: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
          },
        } : {}),
      }),
    ]);

    const cacheHeader = (isAdmin || limit >= 500)
      ? 'no-store, no-cache, must-revalidate'
      : 'public, s-maxage=60, stale-while-revalidate=300';

    return NextResponse.json({ total, offset, limit, prompts }, {
      headers: { 'Cache-Control': cacheHeader }
    });
  } catch (error) {
    console.error('Prompts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/prompts — create a new prompt (admin only)
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const title = cleanString(body.title, 160);
    const promptText = cleanString(body.promptText, 8000);
    const engine = cleanString(body.engine, 80);
    const category = cleanString(body.category, 80, 'General');
    const aspectRatio = cleanString(body.aspectRatio, 24, '16:9');
    const imageUrl = cleanString(body.imageUrl, 2048, '/images/placeholder.png');
    const originalImageUrl = cleanOptionalString(body.originalImageUrl, 2048);
    const published = body.published === undefined ? true : body.published === true;
    const tagsRaw = Array.isArray(body.tags) ? body.tags : [];
    const tags = JSON.stringify(
      [...new Set(tagsRaw.map(t => String(t).replace(/^#+/, '').trim().toLowerCase()).filter(t => t.length > 0 && t.length <= 80))].slice(0, 30)
    );

    if (!title || !promptText || !engine) {
      return NextResponse.json({ error: 'Title, promptText, and engine are required' }, { status: 400 });
    }

    const slug = await generateUniquePromptSlug(title);

    const prompt = await prisma.prompt.create({
      data: {
        title,
        slug,
        promptText,
        engine,
        category,
        aspectRatio,
        imageUrl,
        originalImageUrl: originalImageUrl || null,
        published,
        tags,
      },
    });

    revalidatePath('/admin/library');
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath('/trending');
    revalidatePath('/sitemap.xml');

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error('Create prompt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
