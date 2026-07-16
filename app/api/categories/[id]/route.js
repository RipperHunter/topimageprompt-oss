import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, readJsonObject, requireAdmin, slugify } from '../../../../lib/api-security';

// PUT /api/categories/[id] — updates a category
export async function PUT(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const updateData = {};
    const name = cleanOptionalString(body.name, 80);
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = slugify(name);
    }
    const groupType = cleanOptionalString(body.groupType, 80);
    const status = cleanOptionalString(body.status, 24);
    const imageUrl = cleanOptionalString(body.imageUrl, 2048);
    if (groupType !== undefined) updateData.groupType = groupType;
    if (status !== undefined) updateData.status = status;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (body.promptCount !== undefined && Number.isInteger(body.promptCount)) updateData.promptCount = body.promptCount;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid category fields supplied' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/categories');
    revalidatePath('/');
    revalidatePath('/explore');

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — deletes a category
export async function DELETE(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    await prisma.category.delete({ where: { id } });

    revalidatePath('/admin/categories');
    revalidatePath('/');
    revalidatePath('/explore');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
