import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '../../../../lib/prisma';
import {
  ADMIN_CACHE_HEADER,
  cleanOptionalString,
  readJsonObject,
  requireAdmin,
  safeJsonArray,
  slugify,
} from '../../../../lib/api-security';

export async function GET(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const post = await prisma.blog.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({ post }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER },
    });
  } catch (error) {
    console.error('GET /api/blogs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const updateData = {};
    const stringFields = {
      title: 180,
      category: 80,
      author: 120,
      heroImage: 2048,
      heroCaption: 240,
      intro: 1000,
      readTime: 40,
      visibility: 40,
    };
    for (const [field, maxLength] of Object.entries(stringFields)) {
      const value = cleanOptionalString(body[field], maxLength);
      if (value !== undefined) updateData[field] = value;
    }
    if (body.slug !== undefined) updateData.slug = slugify(body.slug || body.title);
    if (body.content !== undefined) {
      updateData.content = typeof body.content === 'string'
        ? body.content.slice(0, 100000)
        : JSON.stringify(body.content);
    }
    if (body.quote !== undefined) {
      updateData.quote = typeof body.quote === 'string'
        ? body.quote.slice(0, 10000)
        : JSON.stringify(body.quote);
    }
    const tags = safeJsonArray(body.tags);
    if (tags !== undefined) updateData.tags = tags;
    if (body.published !== undefined) updateData.published = body.published === true;
    if (body.featuredOnHome !== undefined) updateData.featuredOnHome = body.featuredOnHome === true;
    if (body.isHeroPost !== undefined) updateData.isHeroPost = body.isHeroPost === true;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid blog fields supplied' }, { status: 400 });
    }

    const post = await prisma.blog.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);

    return NextResponse.json({ success: true, post }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER },
    });
  } catch (error) {
    console.error('PUT /api/blogs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    await prisma.blog.delete({ where: { id } });

    revalidatePath('/admin/blog');
    revalidatePath('/blog');

    return NextResponse.json({ success: true, message: 'Blog deleted' }, {
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER },
    });
  } catch (error) {
    console.error('DELETE /api/blogs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}
