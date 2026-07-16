import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, readJsonObject, requireAdmin, safeJsonArray, slugify } from '../../../../lib/api-security';

export async function PUT(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const updateData = {};
    const title = cleanOptionalString(body.title, 160);
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = slugify(title);
    }
    const description = cleanOptionalString(body.description, 500);
    const curator = cleanOptionalString(body.curator, 120);
    if (description !== undefined) updateData.description = description;
    if (curator !== undefined) updateData.curator = curator;
    if (body.promptCount !== undefined && Number.isInteger(body.promptCount)) updateData.promptCount = body.promptCount;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic === true;
    if (body.featured !== undefined) {
      updateData.featured = body.featured === true;
      // Enforce only one featured collection at a time
      if (body.featured === true) {
        await prisma.collection.updateMany({
          where: { id: { not: id }, featured: true },
          data: { featured: false },
        });
      }
    }
    const promptIds = Array.isArray(body.promptIds)
      ? [...new Set(body.promptIds.filter(promptId => typeof promptId === 'string' && promptId.trim()).map(promptId => promptId.trim()))]
      : undefined;
    if (promptIds !== undefined) {
      updateData.promptCount = promptIds.length;

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

      updateData.heroImages = JSON.stringify(collageImages);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid collection fields supplied' }, { status: 400 });
    }

    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: updateData,
    });

    if (promptIds !== undefined) {
      await prisma.save.deleteMany({ where: { collectionId: id } });
      if (promptIds.length > 0) {
        await prisma.save.createMany({
          data: promptIds.map(promptId => ({
            userId: collection.userId,
            promptId,
            collectionId: id,
          })),
        });
      }
    }

    revalidatePath('/admin/collections');
    revalidatePath('/collections');
    revalidatePath(`/collections/${collection.slug}`);
    revalidatePath(`/collections/${updatedCollection.slug}`);

    return NextResponse.json(updatedCollection);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    await prisma.collection.delete({ where: { id } });

    revalidatePath('/admin/collections');
    revalidatePath('/collections');
    revalidatePath(`/collections/${collection.slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  }
}
