import 'server-only';

import { cleanOptionalString, cleanString, slugify } from './api-security';
import { isSafeHttpUrl, isSameSiteHttpUrl } from './seo';

export const MAX_BLOG_IMPORT_ITEMS = 25;

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStringArray(value, { maxItems, maxLength }) {
  return [...new Set(
    parseArray(value)
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
  )].slice(0, maxItems);
}

function normalizeFaq(value) {
  return parseArray(value)
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      q: cleanString(item.q, 240),
      a: cleanString(item.a, 1600),
    }))
    .filter((item) => item.q && item.a)
    .slice(0, 20);
}

function normalizeQuote(value) {
  if (!value) return null;
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return null; }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const text = cleanString(parsed.text, 1200);
  const author = cleanString(parsed.author, 160, 'Unknown');
  return text ? { text, author } : null;
}

function normalizeContent(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && !Array.isArray(value)) return null;
  const content = typeof value === 'string' ? value : JSON.stringify(value);
  return content.length <= 100000 ? content : null;
}

function estimateReadTime(content) {
  const plainText = String(content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function isSafeImageReference(value) {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  return isSafeHttpUrl(value);
}

export function normalizeBlogImportRecord(record, { forceDraft = false } = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { error: 'Each blog entry must be a JSON object.' };
  }

  const title = cleanString(record.title, 180);
  if (!title) return { error: 'title is required.' };

  const slug = slugify(cleanString(record.slug, 220) || title).slice(0, 190).replace(/-+$/g, '');
  if (!slug) return { error: 'A valid slug could not be generated.' };

  const content = normalizeContent(record.content);
  if (content === null) return { error: 'content must be a Markdown/HTML string or legacy section array with at most 100,000 characters.' };

  const published = forceDraft ? false : record.published === true;
  const hasContent = Array.isArray(record.content)
    ? record.content.length > 0
    : content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 0;
  if (published && !hasContent) {
    return { error: 'Published posts must include content.' };
  }

  const visibility = cleanString(record.visibility, 40, 'Public');
  if (!['Public', 'Private'].includes(visibility)) {
    return { error: 'visibility must be "Public" or "Private".' };
  }

  const canonicalUrl = cleanOptionalString(record.canonicalUrl, 2048);
  if (canonicalUrl && !isSameSiteHttpUrl(canonicalUrl)) {
    return { error: 'canonicalUrl must be a same-site blog URL.' };
  }

  const authorBioUrl = cleanOptionalString(record.authorBioUrl, 2048);
  if (authorBioUrl && !isSafeHttpUrl(authorBioUrl)) {
    return { error: 'authorBioUrl must use HTTP or HTTPS.' };
  }

  const heroImage = cleanOptionalString(record.heroImage, 2048);
  if (heroImage && !isSafeImageReference(heroImage)) {
    return { error: 'heroImage must be a site-relative path or an HTTP(S) URL.' };
  }

  const tags = normalizeStringArray(record.tags, { maxItems: 30, maxLength: 80 });
  const faq = normalizeFaq(record.faq);
  const citations = normalizeStringArray(record.citations, { maxItems: 50, maxLength: 2048 });
  const quote = normalizeQuote(record.quote);

  return {
    data: {
      title,
      slug,
      category: cleanString(record.category, 80, 'Guide'),
      author: cleanString(record.author, 120, 'topimageprompt Team'),
      heroImage,
      heroCaption: cleanOptionalString(record.heroCaption, 240),
      intro: cleanOptionalString(record.intro, 1000),
      content,
      quote: quote ? JSON.stringify(quote) : null,
      readTime: cleanString(record.readTime, 40, estimateReadTime(content)),
      published,
      visibility,
      featuredOnHome: forceDraft ? false : record.featuredOnHome === true,
      isHeroPost: forceDraft ? false : record.isHeroPost === true,
      tags: JSON.stringify(tags),
      seoTitle: cleanOptionalString(record.seoTitle, 180),
      metaDescription: cleanOptionalString(record.metaDescription, 320),
      canonicalUrl,
      coverImageAlt: cleanOptionalString(record.coverImageAlt, 240),
      noindex: record.noindex === true,
      nofollow: record.nofollow === true,
      faq: JSON.stringify(faq),
      tldr: cleanOptionalString(record.tldr, 5000),
      citations: JSON.stringify(citations),
      authorBioUrl,
    },
  };
}
