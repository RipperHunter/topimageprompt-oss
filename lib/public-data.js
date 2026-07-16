import 'server-only';

import { cache } from 'react';
import prisma from './prisma';
import { getBlogCanonicalSlug } from './seo';

const publicPromptSelect = {
  id: true,
  title: true,
  slug: true,
  promptText: true,
  engine: true,
  category: true,
  aspectRatio: true,
  imageUrl: true,
  originalImageUrl: true,
  copies: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
};

export const getPublicNavigationData = cache(async () => {
  try {
    const [totalPrompts, categories, trending, collections, latestBlogs] = await Promise.all([
      prisma.prompt.count({ where: { published: true } }),
      prisma.prompt.groupBy({
        by: ['category'],
        where: { published: true },
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
        take: 12,
      }),
      prisma.prompt.findMany({
        where: { published: true },
        orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: { id: true, slug: true, title: true, imageUrl: true, engine: true, copies: true },
      }),
      prisma.collection.findMany({
        where: { isPublic: true },
        orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        take: 9,
        select: { id: true, slug: true, title: true, heroImages: true, promptCount: true },
      }),
      prisma.blog.findMany({
        where: { published: true, visibility: 'Public', noindex: false },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          slug: true,
          canonicalUrl: true,
          title: true,
          category: true,
          heroImage: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      stats: { totalPrompts, totalCategories: categories.length },
      categories: categories.map((item) => ({ name: item.category, count: item._count._all })),
      trending,
      collections,
      latestBlogs: latestBlogs.map((post) => ({
        ...post,
        slug: getBlogCanonicalSlug(post),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('[navigation] Failed to load public navigation data:', error.message);
    return null;
  }
});

export const findPublishedPrompt = cache(async (routeId) => {
  if (!routeId || routeId.length > 191) return null;
  return prisma.prompt.findFirst({
    where: {
      published: true,
      OR: [{ slug: routeId }, { id: routeId }],
    },
    select: publicPromptSelect,
  });
});

export const findPublishedBlog = cache(async (routeId) => {
  if (!routeId || routeId.length > 191) return null;

  const direct = await prisma.blog.findFirst({
    where: {
      published: true,
      visibility: 'Public',
      OR: [{ slug: routeId }, { id: routeId }],
    },
  });
  if (direct) return direct;

  const canonicalCandidates = await prisma.blog.findMany({
    where: {
      published: true,
      visibility: 'Public',
      canonicalUrl: { not: null },
    },
  });
  return canonicalCandidates.find((post) => getBlogCanonicalSlug(post) === routeId) || null;
});

export { publicPromptSelect };
