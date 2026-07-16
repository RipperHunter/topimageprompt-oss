import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, getOptionalUser, readJsonObject, requireAdmin, safeJsonArray, slugify } from '../../../../lib/api-security';
import { isSafeHttpUrl, isSameSiteHttpUrl } from '../../../../lib/seo';

// GET /api/blog/[id] — returns a single blog post by slug
export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { user } = await getOptionalUser(request);
  const whereVisibility = user?.role === 'ADMIN' ? {} : { published: true, visibility: 'Public' };

  // Try to find by slug first, then by id
  let post = await prisma.blog.findFirst({ where: { slug: id, ...whereVisibility } });
  if (!post) {
    post = await prisma.blog.findFirst({ where: { id, ...whereVisibility } });
  }

  if (!post) {
    return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
  }

  // Parse JSON fields safely
  let parsedContent = post.content;
  try {
    parsedContent = JSON.parse(post.content || '[]');
  } catch (e) {
    // If it fails to parse, it's likely an HTML string from the new editor
    parsedContent = post.content;
  }


  let parsedTags = [];
  try {
    parsedTags = JSON.parse(post.tags || '[]');
  } catch(e) {}

  let parsedFaq = [];
  try {
    parsedFaq = JSON.parse(post.faq || '[]');
  } catch(e) {}

  let parsedCitations = [];
  try {
    parsedCitations = JSON.parse(post.citations || '[]');
  } catch(e) {}

  const result = {
    ...post,
    content: parsedContent,
    quote: post.quote ? JSON.parse(post.quote) : null,
    tags: parsedTags,
    faq: parsedFaq,
    citations: parsedCitations,
  };

  return NextResponse.json(result);
}

export async function PUT(request, { params }) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const resolvedParams = await params;
    const { id } = resolvedParams;
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
      seoTitle: 180,
      metaDescription: 320,
      canonicalUrl: 2048,
      coverImageAlt: 240,
      tldr: 5000,
      authorBioUrl: 2048,
    };
    for (const [field, maxLength] of Object.entries(stringFields)) {
      const value = cleanOptionalString(body[field], maxLength);
      if (value !== undefined) updateData[field] = value;
    }
    if (updateData.canonicalUrl && !isSameSiteHttpUrl(updateData.canonicalUrl)) {
      return NextResponse.json({ error: 'Canonical URL must be a same-site blog URL' }, { status: 400 });
    }
    if (updateData.authorBioUrl && !isSafeHttpUrl(updateData.authorBioUrl)) {
      return NextResponse.json({ error: 'Author URL must use HTTP or HTTPS' }, { status: 400 });
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
    
    const faq = safeJsonArray(body.faq);
    if (faq !== undefined) updateData.faq = faq;
    
    const citations = safeJsonArray(body.citations);
    if (citations !== undefined) updateData.citations = citations;

    if (body.published !== undefined) updateData.published = body.published === true;
    if (body.featuredOnHome !== undefined) updateData.featuredOnHome = body.featuredOnHome === true;
    if (body.isHeroPost !== undefined) updateData.isHeroPost = body.isHeroPost === true;
    if (body.noindex !== undefined) updateData.noindex = body.noindex === true;
    if (body.nofollow !== undefined) updateData.nofollow = body.nofollow === true;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid blog fields supplied' }, { status: 400 });
    }

    const post = await prisma.blog.update({
      where: { id },
      data: updateData,
    });

    if (updateData.isHeroPost === true) {
      await prisma.blog.updateMany({
        where: { id: { not: id } },
        data: { isHeroPost: false },
      });
    }

    revalidatePath('/admin/blog');
    revalidatePath('/blog');
    revalidatePath(`/blog/${post.slug}`);

    return NextResponse.json(post);
  } catch (error) {
    console.error('Update blog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    return NextResponse.json({ message: 'Blog deleted' });
  } catch (error) {
    console.error('Delete blog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
