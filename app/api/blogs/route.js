import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import {
  ADMIN_CACHE_HEADER,
  cleanOptionalString,
  cleanString,
  readJsonObject,
  requireAdmin,
  safeJsonArray,
  slugify,
} from '../../../lib/api-security';

// GET /api/blogs — Admin-only: returns ALL blog posts including drafts
export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const posts = await prisma.blog.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ posts }, {
      status: 200,
      headers: {
        'Cache-Control': ADMIN_CACHE_HEADER
      }
    });
  } catch (error) {
    console.error('GET /api/blogs error:', error);
    return NextResponse.json({ error: 'Failed to fetch blogs' }, { status: 500 });
  }
}

// POST /api/blogs — Admin-only: create a blog post
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { body, error: bodyError } = await readJsonObject(request);
    if (bodyError) return bodyError;

    const title = cleanString(body.title, 180);
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const slug = slugify(body.slug || title);
    const content = body.content
      ? (typeof body.content === 'string' ? body.content.slice(0, 100000) : JSON.stringify(body.content))
      : '[]';
    const quote = body.quote === undefined
      ? null
      : (typeof body.quote === 'string' ? body.quote.slice(0, 10000) : JSON.stringify(body.quote));

    const post = await prisma.blog.create({
      data: {
        title,
        slug,
        intro: cleanOptionalString(body.intro, 1000),
        content,
        category: cleanString(body.category, 80, 'General'),
        heroImage: cleanOptionalString(body.heroImage, 2048),
        heroCaption: cleanOptionalString(body.heroCaption, 240),
        author: cleanString(body.author, 120, 'topimageprompt Team'),
        readTime: cleanString(body.readTime, 40, '5 min read'),
        visibility: cleanString(body.visibility, 40, 'Public'),
        published: body.published === true,
        featuredOnHome: body.featuredOnHome === true,
        isHeroPost: body.isHeroPost === true,
        tags: safeJsonArray(body.tags) || '[]',
        quote,
      },
    });

    return NextResponse.json({ success: true, post }, {
      status: 201,
      headers: { 'Cache-Control': ADMIN_CACHE_HEADER },
    });
  } catch (error) {
    console.error('POST /api/blogs error:', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}
