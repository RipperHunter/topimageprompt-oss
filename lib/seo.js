import { BRAND_DOMAIN, BRAND_URL } from './brand';

export function absoluteUrl(value, fallback = BRAND_URL) {
  if (!value) return fallback;
  try {
    const url = new URL(value, BRAND_URL);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function safeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function getBlogCanonicalSlug(post) {
  const fallback = post?.slug || '';
  if (!post?.canonicalUrl) return fallback;

  try {
    const canonical = new URL(post.canonicalUrl, BRAND_URL);
    if (canonical.hostname.toLowerCase() !== BRAND_DOMAIN) return fallback;

    const match = canonical.pathname.match(/^\/blog\/([a-z0-9][a-z0-9-]{0,190})\/?$/i);
    return match ? match[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

export function getBlogCanonicalPath(post) {
  return `/blog/${getBlogCanonicalSlug(post)}`;
}

export function getPromptPath(prompt) {
  return `/prompt/${prompt.slug || prompt.id}`;
}

export function getHubPath(type, value, slugify) {
  return `/prompts/${type}/${slugify(value)}`;
}

export function isSameSiteHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value, BRAND_URL);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.toLowerCase() === BRAND_DOMAIN;
  } catch {
    return false;
  }
}

export function isSafeHttpUrl(value) {
  if (!value) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
