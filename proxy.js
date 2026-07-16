import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from './lib/prisma';
import { getBlogCanonicalSlug } from './lib/seo';

const AUTH_RATE_WINDOW_MS = 5 * 60 * 1000;
const AUTH_RATE_LIMIT = 20;
const authAttempts = new Map();
let lastAuthRateSweep = 0;

function routeSlugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function decodeRouteSegment(value) {
  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function rateLimitAuth(request) {
  const now = Date.now();
  if (now - lastAuthRateSweep > 60_000 || authAttempts.size > 10_000) {
    for (const [attemptKey, value] of authAttempts) {
      if (now - value.startedAt > AUTH_RATE_WINDOW_MS) authAttempts.delete(attemptKey);
    }
    while (authAttempts.size > 10_000) {
      authAttempts.delete(authAttempts.keys().next().value);
    }
    lastAuthRateSweep = now;
  }
  const key = `${getClientIp(request)}:${request.nextUrl.pathname}`;
  const current = authAttempts.get(key);

  if (!current || now - current.startedAt > AUTH_RATE_WINDOW_MS) {
    authAttempts.set(key, { count: 1, startedAt: now });
    return null;
  }

  current.count += 1;
  authAttempts.set(key, current);

  if (current.count > AUTH_RATE_LIMIT) {
    return NextResponse.json(
      { error: 'Too many authentication attempts. Please try again later.' },
      { status: 429 }
    );
  }

  return null;
}

function notFoundRewrite(request) {
  const url = request.nextUrl.clone();
  url.pathname = '/_not-found';
  url.search = '';
  return NextResponse.rewrite(url);
}

async function resolvePublicDynamicRoute(request) {
  const { pathname } = request.nextUrl;
  const promptMatch = pathname.match(/^\/prompt\/([^/]+)\/?$/);
  if (promptMatch) {
    const routeId = decodeRouteSegment(promptMatch[1]);
    const normalizedRouteId = routeSlugify(routeId);
    const prompt = await prisma.prompt.findFirst({
      where: {
        published: true,
        OR: [{ slug: routeId }, { id: routeId }, { slug: normalizedRouteId }],
      },
      select: { id: true, slug: true },
    });
    if (!prompt) return notFoundRewrite(request);
    if (prompt.slug && routeId !== prompt.slug) {
      return NextResponse.redirect(new URL(`/prompt/${prompt.slug}`, request.url), 308);
    }
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) {
    const routeId = decodeRouteSegment(blogMatch[1]);
    let post = await prisma.blog.findFirst({
      where: { published: true, visibility: 'Public', OR: [{ slug: routeId }, { id: routeId }] },
      select: { id: true, slug: true, canonicalUrl: true },
    });
    if (!post) {
      const candidates = await prisma.blog.findMany({
        where: { published: true, visibility: 'Public', canonicalUrl: { not: null } },
        select: { id: true, slug: true, canonicalUrl: true },
      });
      post = candidates.find((candidate) => getBlogCanonicalSlug(candidate) === routeId) || null;
    }
    if (!post) return notFoundRewrite(request);
    const canonicalSlug = getBlogCanonicalSlug(post);
    if (routeId !== canonicalSlug) {
      return NextResponse.redirect(new URL(`/blog/${canonicalSlug}`, request.url), 308);
    }
  }

  const collectionMatch = pathname.match(/^\/collections\/([^/]+)\/?$/);
  if (collectionMatch) {
    const slug = decodeRouteSegment(collectionMatch[1]);
    const collection = await prisma.collection.findFirst({ where: { slug, isPublic: true }, select: { id: true } });
    if (!collection) return notFoundRewrite(request);
  }

  const hubMatch = pathname.match(/^\/prompts\/(engine|style)\/([^/]+)\/?$/);
  if (hubMatch) {
    const [, type, routeSlug] = hubMatch;
    const field = type === 'engine' ? 'engine' : 'category';
    const groups = await prisma.prompt.groupBy({ by: [field], where: { published: true } });
    if (!groups.some((group) => routeSlugify(group[field]) === routeSlug)) return notFoundRewrite(request);
  }

  return null;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (request.method === 'GET' || request.method === 'HEAD') {
    const publicRouteResponse = await resolvePublicDynamicRoute(request);
    if (publicRouteResponse) return publicRouteResponse;
  }

  if (pathname.startsWith('/api/auth') && request.method === 'POST') {
    const limited = rateLimitAuth(request);
    if (limited) return limited;
  }

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isProfileRoute = pathname.startsWith('/profile');

  if (isAdminRoute || isProfileRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const currentUser = token.id
      ? await prisma.user.findUnique({ where: { id: token.id }, select: { role: true } })
      : null;
    if (!currentUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdminRoute && currentUser.role !== 'ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname === '/admin/login') {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const currentUser = token?.id
      ? await prisma.user.findUnique({ where: { id: token.id }, select: { role: true } })
      : null;
    if (currentUser?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/library', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile',
    '/api/auth/:path*',
    '/prompt/:path*',
    '/blog/:path*',
    '/collections/:path*',
    '/prompts/:path*',
  ],
};
