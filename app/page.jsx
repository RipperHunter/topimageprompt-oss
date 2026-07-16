import React from 'react';
import prisma from '../lib/prisma';
import HomePageClient from './page-client';

// Statically render page with a 60-second background revalidation window (ISR)
export const revalidate = 60;

export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  let prompts = [];
  let categories = [];
  let stats = { totalPrompts: 0, totalCopies: 0, dailyAdded: 0 };
  let settings = null;

  try {
    // Send a crawlable first page, not the entire library, into client hydration.
    prompts = await prisma.prompt.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 72,
      select: {
        id: true, title: true, slug: true, promptText: true, engine: true,
        category: true, aspectRatio: true, imageUrl: true, originalImageUrl: true,
        copies: true, tags: true, createdAt: true, updatedAt: true,
      },
    });

    // Fetch categories
    categories = await prisma.category.findMany({
      where: { status: 'Active' },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total stats
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [totalPrompts, promptCopies, recentPrompts] = await Promise.all([
      prisma.prompt.count({ where: { published: true } }),
      prisma.prompt.aggregate({ where: { published: true }, _sum: { copies: true } }),
      prisma.prompt.count({
        where: {
          published: true,
          createdAt: {
            gte: utcMidnight
          }
        }
      })
    ]);

    stats = {
      totalPrompts,
      totalCopies: promptCopies._sum.copies || 0,
      dailyAdded: recentPrompts
    };

    // Fetch site settings
    settings = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = { id: 'global' };
    }
  } catch (error) {
    console.error("[HomePage] Database error:", error.message);
  }

  return (
    <HomePageClient 
      initialPrompts={prompts}
      initialCategories={categories}
      initialStats={stats}
      initialSettings={settings}
    />
  );
}
