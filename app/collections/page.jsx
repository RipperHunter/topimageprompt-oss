import React from 'react';
import prisma from '../../lib/prisma';
import CollectionsPageClient from './page-client';

// Statically render page with a 60-second background revalidation window (ISR)
export const revalidate = 60;

export const metadata = {
  title: 'Curated AI Prompt Collections | topimageprompt',
  description: 'Explore curated topimageprompt collections for cyberpunk, fantasy, product, portrait, and cinematic AI image prompts.',
  alternates: { canonical: '/collections' },
  openGraph: {
    title: 'Curated AI Prompt Collections | topimageprompt',
    description: 'Hand-picked AI prompt collections for faster creative direction.',
    url: '/collections',
  },
};

export default async function CollectionsPage() {
  let serializedCollections = [];

  try {
    // Fetch public collections on the server
    const collections = await prisma.collection.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' }
    });

    // Serialize collections dates
    serializedCollections = collections.map(c => ({
      ...c,
      createdAt: c.createdAt ? c.createdAt.toISOString() : null,
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : null
    }));
  } catch (err) {
    console.error('[collections] Failed to fetch collections:', err.message);
  }

  return <CollectionsPageClient initialCollections={serializedCollections} />;
}
