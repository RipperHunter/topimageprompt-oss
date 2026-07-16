import prisma from '../lib/prisma';
import { BRAND_URL } from '../lib/brand';
import { absoluteUrl, getBlogCanonicalSlug } from '../lib/seo';
import { slugify } from '../lib/api-security';

// Generate against the runtime database. A locally built standalone artifact
// must never ship a sitemap cached from a development or previous database.
export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const [prompts, blogs, collections, categoryGroups, engineGroups] = await Promise.all([
    prisma.prompt.findMany({
      where: { published: true },
      select: { id: true, slug: true, imageUrl: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.blog.findMany({
      where: { published: true, visibility: 'Public', noindex: false },
      select: { slug: true, canonicalUrl: true, heroImage: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.collection.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.prompt.groupBy({
      by: ['category'],
      where: { published: true },
      _max: { updatedAt: true },
    }),
    prisma.prompt.groupBy({
      by: ['engine'],
      where: { published: true },
      _max: { updatedAt: true },
    }),
  ]);

  const latestContentDate = [
    prompts[0]?.updatedAt,
    blogs[0]?.updatedAt,
    collections[0]?.updatedAt,
  ].filter(Boolean).sort((a, b) => b - a)[0];

  const staticPages = [
    { path: '', changeFrequency: 'daily', priority: 1, lastModified: latestContentDate },
    { path: '/explore', changeFrequency: 'daily', priority: 0.9, lastModified: prompts[0]?.updatedAt },
    { path: '/prompts', changeFrequency: 'weekly', priority: 0.9, lastModified: prompts[0]?.updatedAt },
    { path: '/trending', changeFrequency: 'daily', priority: 0.8, lastModified: prompts[0]?.updatedAt },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8, lastModified: blogs[0]?.updatedAt },
    { path: '/collections', changeFrequency: 'weekly', priority: 0.7, lastModified: collections[0]?.updatedAt },
    { path: '/sitemap-html', changeFrequency: 'weekly', priority: 0.4, lastModified: latestContentDate },
    { path: '/about', changeFrequency: 'yearly', priority: 0.4 },
    { path: '/contact', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
  ].map(({ path, ...entry }) => ({ url: `${BRAND_URL}${path}`, ...entry }));

  const promptEntries = prompts.map((prompt) => ({
    url: `${BRAND_URL}/prompt/${prompt.slug || prompt.id}`,
    lastModified: prompt.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
    images: prompt.imageUrl ? [absoluteUrl(prompt.imageUrl)] : [],
  }));

  const blogEntries = blogs.map((post) => ({
    url: `${BRAND_URL}/blog/${getBlogCanonicalSlug(post)}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
    images: post.heroImage ? [absoluteUrl(post.heroImage)] : [],
  }));

  const collectionEntries = collections.map((collection) => ({
    url: `${BRAND_URL}/collections/${collection.slug}`,
    lastModified: collection.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const hubEntries = [
    ...categoryGroups.map((group) => ({
      url: `${BRAND_URL}/prompts/style/${slugify(group.category)}`,
      lastModified: group._max.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
    ...engineGroups.map((group) => ({
      url: `${BRAND_URL}/prompts/engine/${slugify(group.engine)}`,
      lastModified: group._max.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  ];

  return [...staticPages, ...hubEntries, ...promptEntries, ...blogEntries, ...collectionEntries];
}
