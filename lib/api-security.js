import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from './prisma';
import { BRAND_DOMAIN } from './brand';

export const ADMIN_CACHE_HEADER = 'no-store, no-cache, must-revalidate';

export function jsonError(error, status = 400, headers = {}) {
  return NextResponse.json({ error }, { status, headers });
}

const TRUSTED_PRODUCTION_HOSTS = new Set([
  BRAND_DOMAIN,
  `www.${BRAND_DOMAIN}`,
]);

function getFirstForwardedValue(value) {
  return value?.split(',')[0]?.trim() || '';
}

export function validateMutationOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return jsonError('Cross-site request rejected', 403);
  }

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const forwardedHost = getFirstForwardedValue(request.headers.get('x-forwarded-host'));
      const requestHosts = new Set([
        request.nextUrl.host,
        request.headers.get('host'),
        forwardedHost,
      ].filter(Boolean).map((host) => host.toLowerCase()));
      const originMatchesRequest = requestHosts.has(originUrl.host.toLowerCase());
      const originIsTrustedProductionSite = originUrl.protocol === 'https:'
        && TRUSTED_PRODUCTION_HOSTS.has(originUrl.hostname.toLowerCase());

      // Reverse proxies can expose an internal host through nextUrl even though
      // the browser is posting from the canonical public site. Trust the exact
      // production domains, while keeping same-host support for local previews.
      if (!originMatchesRequest && !originIsTrustedProductionSite) {
        return jsonError('Cross-site request rejected', 403);
      }
    } catch {
      return jsonError('Invalid request origin', 403);
    }
  }
  return null;
}

export async function getOptionalUser(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id) return { token: null, user: null };
  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, email: true, role: true },
  });
  return { token, user };
}

export async function requireUser(request) {
  const originError = validateMutationOrigin(request);
  if (originError) return { error: originError };

  const { token, user } = await getOptionalUser(request);
  if (!token?.id) {
    return { error: jsonError('Unauthorized', 401) };
  }
  if (!user) {
    return { error: jsonError('Unauthorized', 401) };
  }
  return { token, user };
}

export async function requireAdmin(request) {
  const { token, user, error } = await requireUser(request);
  if (error) return { error };
  if (user?.role !== 'ADMIN') {
    return { error: jsonError('Forbidden', 403) };
  }
  return { token, user };
}

export async function readJsonObject(request) {
  const maxBytes = 1024 * 1024;
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { error: jsonError('Request body is too large', 413) };
  }

  if (!request.body) return { error: jsonError('Invalid JSON body', 400) };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let jsonText = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { error: jsonError('Request body is too large', 413) };
      }
      jsonText += decoder.decode(value, { stream: true });
    }
    jsonText += decoder.decode();
  } catch {
    return { error: jsonError('Invalid request body', 400) };
  }

  let body = null;
  try {
    body = JSON.parse(jsonText);
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: jsonError('Invalid JSON body', 400) };
  }
  return { body };
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function cleanString(value, maxLength, fallback = undefined) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

export function cleanOptionalString(value, maxLength) {
  if (value === undefined) return undefined;
  return cleanString(value, maxLength, null);
}

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const rateLimitBuckets = new Map();
let lastRateLimitSweep = 0;

export function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export function rateLimit(request, { namespace, limit, windowMs, key = '' }) {
  const now = Date.now();
  if (now - lastRateLimitSweep > 60_000 || rateLimitBuckets.size > 10_000) {
    for (const [bucketKey, value] of rateLimitBuckets) {
      if (value.resetAt <= now) rateLimitBuckets.delete(bucketKey);
    }
    while (rateLimitBuckets.size > 10_000) {
      rateLimitBuckets.delete(rateLimitBuckets.keys().next().value);
    }
    lastRateLimitSweep = now;
  }
  const bucketKey = `${namespace}:${getClientIp(request)}:${key}`;
  const bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } }
    );
  }
  bucket.count += 1;
  return null;
}

export function safeJsonArray(value, fallback = '[]') {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? JSON.stringify(parsed) : fallback;
    } catch {
      return fallback;
    }
  }
  return Array.isArray(value) ? JSON.stringify(value) : fallback;
}
