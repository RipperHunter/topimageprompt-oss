import React from 'react';
import prisma from '../../lib/prisma';
import ExplorePageClient from './page-client';

// Statically render page with a 60-second background revalidation window (ISR)
export const revalidate = 60;

export const metadata = {
  title: 'Explore AI Prompts | topimageprompt',
  description: 'Filter, search, and sort topimageprompt AI prompts by category, engine, style, aspect ratio, and popularity.',
  alternates: { canonical: '/explore' },
  openGraph: {
    title: 'Explore AI Prompts | topimageprompt',
    description: 'Find copy-ready AI image prompts with powerful filters and search.',
    url: '/explore',
  },
};

export default async function ExplorePage({ searchParams }) {
  let serializedPrompts = [];
  let serializedSettings = {};
  const rawSearchParams = await searchParams;
  const initialSearchParams = Object.fromEntries(
    Object.entries(rawSearchParams || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );

  try {
    // Render a useful first page for people and crawlers. The client loads the
    // larger browse set after hydration so it is not embedded in initial HTML.
    const prompts = await prisma.prompt.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 48,
      select: {
        id: true, title: true, slug: true, promptText: true, engine: true,
        category: true, aspectRatio: true, imageUrl: true, originalImageUrl: true,
        copies: true, tags: true, createdAt: true, updatedAt: true,
      },
    });

    serializedPrompts = prompts.map(p => ({
      ...p,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null
    }));
  } catch (err) {
    console.error('[explore] Failed to fetch prompts:', err.message);
  }

  try {
    // Fetch settings on the server
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = { id: 'global' };
    }

    serializedSettings = {
      ...settings,
      createdAt: settings.createdAt ? settings.createdAt.toISOString() : null,
      updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : null
    };
  } catch (err) {
    console.error('[explore] Failed to fetch settings:', err.message);
  }

  return (
    <ExplorePageClient 
      initialPrompts={serializedPrompts} 
      initialSettings={serializedSettings} 
      initialSearchParams={initialSearchParams}
    />
  );
}
