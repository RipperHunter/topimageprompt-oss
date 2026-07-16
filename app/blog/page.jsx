import React from 'react';
import prisma from '../../lib/prisma';
import BlogClient from './page-client';
import '../blog.css';
import { getBlogCanonicalSlug } from '../../lib/seo';

// Statically render page with a 60-second background revalidation window (ISR)
export const revalidate = 60;

export const metadata = {
  title: 'AI Prompt Engineering Blog | topimageprompt',
  description: 'Read topimageprompt tutorials, masterclasses, and field notes for better AI image prompting.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'AI Prompt Engineering Blog | topimageprompt',
    description: 'Prompting tutorials and creative workflows from topimageprompt.',
    url: '/blog',
  },
};

export default async function BlogPage() {
  let serializedPosts = [];

  try {
    // Fetch published blog posts on the server
    const posts = await prisma.blog.findMany({
      where: { published: true, visibility: 'Public' },
      orderBy: { createdAt: 'desc' }
    });

    // Serialize posts dates
    serializedPosts = posts.map(p => ({
      ...p,
      slug: getBlogCanonicalSlug(p),
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null
    }));
  } catch (err) {
    console.error('[blog] Failed to fetch blog posts:', err.message);
  }

  return <BlogClient initialPosts={serializedPosts} />;
}
