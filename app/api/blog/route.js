import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cleanOptionalString, cleanString, readJsonObject, requireAdmin, safeJsonArray, slugify } from '../../../lib/api-security';
import { isSafeHttpUrl, isSameSiteHttpUrl } from '../../../lib/seo';

// GET /api/blog — returns published blog posts only
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 100;

    const whereClause = { published: true, visibility: 'Public' };

    const posts = await prisma.blog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        author: true,
        heroImage: true,
        readTime: true,
        published: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ total: posts.length, posts }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
      }
    });
  } catch (error) {
    console.error('Blog GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/blog — create a new blog post (admin only)
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const title = cleanString(body.title, 180);
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const content = body.content
      ? (typeof body.content === 'string' ? body.content.slice(0, 100000) : JSON.stringify(body.content))
      : '[]';
    const tags = safeJsonArray(body.tags) || '[]';
    const slug = slugify(body.slug || title);
    const quote = body.quote === undefined
      ? null
      : (typeof body.quote === 'string' ? body.quote.slice(0, 10000) : JSON.stringify(body.quote));
    const canonicalUrl = cleanOptionalString(body.canonicalUrl, 2048);
    const authorBioUrl = cleanOptionalString(body.authorBioUrl, 2048);
    if (canonicalUrl && !isSameSiteHttpUrl(canonicalUrl)) {
      return NextResponse.json({ error: 'Canonical URL must be a same-site blog URL' }, { status: 400 });
    }
    if (authorBioUrl && !isSafeHttpUrl(authorBioUrl)) {
      return NextResponse.json({ error: 'Author URL must use HTTP or HTTPS' }, { status: 400 });
    }

    const post = await prisma.blog.create({
      data: {
        title,
        slug,
        category: cleanString(body.category, 80, 'Tutorial'),
        author: cleanString(body.author, 120, 'topimageprompt Team'),
        heroImage: cleanOptionalString(body.heroImage, 2048),
        heroCaption: cleanOptionalString(body.heroCaption, 240),
        intro: cleanOptionalString(body.intro, 1000),
        content,
        quote,
        readTime: cleanString(body.readTime, 40, '5 min read'),
        published: body.published === true,
        visibility: cleanString(body.visibility, 40, 'Public'),
        featuredOnHome: body.featuredOnHome === true,
        isHeroPost: body.isHeroPost === true,
        tags,
        // New SEO, AEO, GEO fields
        seoTitle: cleanOptionalString(body.seoTitle, 180),
        metaDescription: cleanOptionalString(body.metaDescription, 320),
        canonicalUrl,
        coverImageAlt: cleanOptionalString(body.coverImageAlt, 240),
        noindex: body.noindex === true,
        nofollow: body.nofollow === true,
        faq: safeJsonArray(body.faq) || '[]',
        tldr: cleanOptionalString(body.tldr, 5000),
        citations: safeJsonArray(body.citations) || '[]',
        authorBioUrl,
      },
    });

    if (body.isHeroPost === true) {
      await prisma.blog.updateMany({
        where: { id: { not: post.id } },
        data: { isHeroPost: false },
      });
    }

    revalidatePath('/admin/blog');
    revalidatePath('/blog');

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Create blog error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
