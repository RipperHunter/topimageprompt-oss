import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '../../../lib/prisma';
import '../../blog-detail.css';
import BlogDetailClient from './BlogDetailClient';
import { findPublishedBlog } from '../../../lib/public-data';
import { renderSafeMarkdownArticle } from '../../../lib/content';
import { absoluteUrl, getBlogCanonicalPath, getBlogCanonicalSlug, isSafeHttpUrl, safeJsonLd } from '../../../lib/seo';
import { BRAND_FAVICON, BRAND_NAME, BRAND_URL } from '../../../lib/brand';

export const revalidate = 300;

function parseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseQuote(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function getDescription(post) {
  return (post.metaDescription || post.intro || `Read ${post.title} on ${BRAND_NAME}.`).trim().slice(0, 320);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = await findPublishedBlog(id);
  if (!post) notFound();

  const title = (post.seoTitle || `${post.title} | ${BRAND_NAME} Blog`).slice(0, 180);
  const description = getDescription(post);
  const canonicalPath = getBlogCanonicalPath(post);
  const canonicalUrl = `${BRAND_URL}${canonicalPath}`;
  const imageUrl = absoluteUrl(post.heroImage, `${BRAND_URL}/demo/abstract.svg`);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: {
      index: !post.noindex,
      follow: !post.nofollow,
      googleBot: { index: !post.noindex, follow: !post.nofollow },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [{ url: imageUrl, alt: post.coverImageAlt || post.title }],
      type: 'article',
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function BlogDetailPage({ params }) {
  const { id } = await params;
  const postData = await findPublishedBlog(id);
  if (!postData) notFound();

  const canonicalSlug = getBlogCanonicalSlug(postData);
  if (id !== canonicalSlug) permanentRedirect(`/blog/${canonicalSlug}`);

  const tags = parseArray(postData.tags);
  const [relatedPostsRaw, matchedPrompts] = await Promise.all([
    prisma.blog.findMany({
      where: {
        published: true,
        visibility: 'Public',
        noindex: false,
        id: { not: postData.id },
        category: postData.category,
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true, slug: true, canonicalUrl: true, title: true, category: true,
        heroImage: true, intro: true, metaDescription: true, updatedAt: true,
      },
    }),
    prisma.prompt.findMany({
      where: {
        published: true,
        OR: [
          { category: postData.category },
          ...tags.slice(0, 5).map((tag) => ({ tags: { contains: String(tag).toLowerCase() } })),
        ],
      },
      orderBy: [{ copies: 'desc' }, { updatedAt: 'desc' }],
      take: 6,
      select: { id: true, slug: true, title: true, imageUrl: true, engine: true, category: true },
    }),
  ]);

  let relatedPrompts = matchedPrompts;
  if (relatedPrompts.length < 6) {
    const fallback = await prisma.prompt.findMany({
      where: { published: true, id: { notIn: relatedPrompts.map((prompt) => prompt.id) } },
      orderBy: [{ copies: 'desc' }, { updatedAt: 'desc' }],
      take: 6 - relatedPrompts.length,
      select: { id: true, slug: true, title: true, imageUrl: true, engine: true, category: true },
    });
    relatedPrompts = [...relatedPrompts, ...fallback];
  }

  let sections = postData.content;
  try { sections = JSON.parse(postData.content || '[]'); } catch {}
  let renderedHtml = null;
  let toc = [];
  if (typeof sections === 'string') {
    const rendered = renderSafeMarkdownArticle(sections);
    renderedHtml = rendered.html;
    toc = rendered.toc;
  } else if (Array.isArray(sections)) {
    const usedIds = new Set();
    sections = sections.map((section, index) => {
      if (!section?.heading) return section;
      const base = String(section.heading).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 72) || `section-${index + 1}`;
      let sectionId = base;
      let suffix = 2;
      while (usedIds.has(sectionId)) { sectionId = `${base}-${suffix}`; suffix += 1; }
      usedIds.add(sectionId);
      toc.push({ id: sectionId, text: section.heading, level: 2 });
      return { ...section, id: sectionId };
    });
  }

  const post = {
    ...postData,
    authorBioUrl: isSafeHttpUrl(postData.authorBioUrl) ? postData.authorBioUrl : null,
    createdAt: postData.createdAt.toISOString(),
    updatedAt: postData.updatedAt.toISOString(),
    date: postData.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    sections,
    renderedHtml,
    toc: [
      ...toc,
      ...(parseArray(postData.faq).some((item) => item?.q && item?.a) ? [{ id: 'blog-faq-heading', text: 'Frequently asked questions', level: 2 }] : []),
      ...(parseArray(postData.citations).length > 0 ? [{ id: 'blog-sources-heading', text: 'Sources and further reading', level: 2 }] : []),
    ],
    quote: parseQuote(postData.quote),
    tags,
    faq: parseArray(postData.faq).filter((item) => item?.q && item?.a).slice(0, 20),
    citations: parseArray(postData.citations)
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim().slice(0, 2048))
      .filter(Boolean)
      .slice(0, 50),
    relatedPosts: relatedPostsRaw.map((item) => ({
      slug: getBlogCanonicalSlug(item),
      title: item.title,
      category: item.category,
      image: item.heroImage,
      date: item.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      excerpt: item.metaDescription || item.intro || '',
    })),
    relatedPrompts,
  };

  const canonicalUrl = `${BRAND_URL}/blog/${canonicalSlug}`;
  const description = getDescription(postData);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonicalUrl}#article`,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    headline: postData.seoTitle || postData.title,
    description,
    image: absoluteUrl(postData.heroImage, `${BRAND_URL}/demo/abstract.svg`),
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    keywords: tags.join(', '),
    author: {
      '@type': 'Person',
      name: postData.author || `${BRAND_NAME} Team`,
      ...(postData.authorBioUrl ? { url: postData.authorBioUrl } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: BRAND_URL,
      logo: { '@type': 'ImageObject', url: `${BRAND_URL}${BRAND_FAVICON}` },
    },
  };

  const faqSchema = post.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />}
      <BlogDetailClient post={post} />
    </>
  );
}
