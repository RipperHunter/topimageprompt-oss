import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, getOptionalUser, readJsonObject, requireAdmin } from '../../../../lib/api-security';
import { generateUniquePromptSlug } from '../../../../lib/slug';

// GET /api/prompts/[id] — returns a single prompt
export async function GET(request, { params }) {
  const { id } = await params;
  const { user } = await getOptionalUser(request);
  const prompt = await prisma.prompt.findFirst({
    where: {
      id,
      ...(user?.role === 'ADMIN' ? {} : { published: true }),
    },
  });

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }

  return NextResponse.json(prompt);
}

// PUT /api/prompts/[id] — update a prompt
export async function PUT(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    
    // Fetch the existing prompt first to check its slug status and title
    const existingPrompt = await prisma.prompt.findUnique({ where: { id } });
    if (!existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const updateData = {};
    const title = cleanOptionalString(body.title, 160);
    const promptText = cleanOptionalString(body.promptText, 8000);
    const engine = cleanOptionalString(body.engine, 80);
    const category = cleanOptionalString(body.category, 80);
    const aspectRatio = cleanOptionalString(body.aspectRatio, 24);
    const imageUrl = cleanOptionalString(body.imageUrl, 2048);
    const originalImageUrl = cleanOptionalString(body.originalImageUrl, 2048);

    if (title !== undefined) {
      updateData.title = title;
      if (title !== existingPrompt.title || !existingPrompt.slug) {
        updateData.slug = await generateUniquePromptSlug(title, id);
      }
    } else if (!existingPrompt.slug) {
      // If the prompt doesn't have a slug, generate one using the existing title
      updateData.slug = await generateUniquePromptSlug(existingPrompt.title, id);
    }

    if (promptText !== undefined) updateData.promptText = promptText;
    if (engine !== undefined) updateData.engine = engine;
    if (category !== undefined) updateData.category = category;
    if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (originalImageUrl !== undefined) updateData.originalImageUrl = originalImageUrl;
    if (body.published !== undefined) updateData.published = body.published === true;
    if (Array.isArray(body.tags)) {
      const cleaned = [...new Set(
        body.tags
          .map(t => String(t).replace(/^#+/, '').trim().toLowerCase())
          .filter(t => t.length > 0 && t.length <= 80)
      )].slice(0, 30);
      updateData.tags = JSON.stringify(cleaned);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid prompt fields supplied' }, { status: 400 });
    }

    const prompt = await prisma.prompt.update({ where: { id }, data: updateData });

    revalidatePath('/admin/library');
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath('/trending');
    revalidatePath(`/prompt/${id}`);
    if (prompt.slug) {
      revalidatePath(`/prompt/${prompt.slug}`);
    }
    revalidatePath('/sitemap.xml');

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Update prompt error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/prompts/[id] — delete a prompt
export async function DELETE(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    await prisma.prompt.delete({ where: { id } });

    revalidatePath('/admin/library');
    revalidatePath('/');
    revalidatePath('/explore');
    revalidatePath('/trending');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prompt error:', error);
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
}
