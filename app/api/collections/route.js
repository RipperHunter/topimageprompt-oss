import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, getOptionalUser, readJsonObject, requireAdmin, safeJsonArray, slugify } from '../../../lib/api-security';

export async function GET(request) {
  try {
    const { user } = await getOptionalUser(request);
    const isAdmin = user?.role === 'ADMIN';
    const collections = isAdmin
      ? await prisma.collection.findMany({
          orderBy: { createdAt: 'desc' },
          include: { saves: { include: { prompt: true } } },
        })
      : await prisma.collection.findMany({
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            curator: true,
            heroImages: true,
            promptCount: true,
            featured: true,
            createdAt: true,
            updatedAt: true,
          },
        });
    
    const cacheHeader = isAdmin
      ? 'no-store, no-cache, must-revalidate'
      : 'public, s-maxage=600, stale-while-revalidate=1200';

    return NextResponse.json({ collections }, {
      headers: {
        'Cache-Control': cacheHeader
      }
    });
  } catch (error) {
    console.error('Collections GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { token, error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const title = cleanString(body.title, 160);
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = slugify(title);
    const featured = body.featured === true;
    const promptIds = Array.isArray(body.promptIds)
      ? [...new Set(body.promptIds.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()))]
      : [];

    if (featured) {
      await prisma.collection.updateMany({
        where: { featured: true },
        data: { featured: false },
      });
    }

    // Calculate collage images based on the selected promptIds
    let collageImages = [];
    if (promptIds.length > 0) {
      const prompts = await prisma.prompt.findMany({
        where: { id: { in: promptIds } },
        select: { id: true, imageUrl: true }
      });
      const imageMap = new Map(prompts.map(p => [p.id, p.imageUrl]));
      const images = promptIds.map(id => imageMap.get(id)).filter(Boolean);
      if (images.length > 0) {
        for (let i = 0; i < 4; i++) {
          collageImages.push(images[i % images.length]);
        }
      }
    }

    if (collageImages.length === 0) {
      // Fallback to recent/trending prompt images
      const fallbackPrompts = await prisma.prompt.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { imageUrl: true }
      });
      const fallbackImages = fallbackPrompts.map(p => p.imageUrl);
      if (fallbackImages.length > 0) {
        for (let i = 0; i < 4; i++) {
          collageImages.push(fallbackImages[i % fallbackImages.length]);
        }
      }
    }

    const collection = await prisma.collection.create({
      data: {
        title,
        slug,
        description: cleanOptionalString(body.description, 500),
        curator: cleanString(body.curator, 120, 'topimageprompt Team'),
        heroImages: JSON.stringify(collageImages),
        promptCount: promptIds.length || (Number.isInteger(body.promptCount) ? body.promptCount : 0),
        isPublic: body.isPublic !== false,
        featured,
        userId: token.id,
      },
    });

    if (promptIds.length > 0) {
      await prisma.save.createMany({
        data: promptIds.map(promptId => ({
          userId: token.id,
          promptId,
          collectionId: collection.id,
        })),
      });
    }

    revalidatePath('/admin/collections');
    revalidatePath('/collections');

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error('Collections POST error:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
