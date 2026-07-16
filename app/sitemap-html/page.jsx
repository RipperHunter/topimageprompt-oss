import React from 'react';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { getBlogCanonicalSlug } from '../../lib/seo';
import { slugify } from '../../lib/api-security';

export const revalidate = 300; // Refresh every 5 minutes

export const metadata = {
  title: 'Site Map | topimageprompt',
  description: 'A complete list of all pages on topimageprompt — browse all AI image prompts, blog posts, and collections.',
  alternates: { canonical: '/sitemap-html' },
  robots: { index: true, follow: true },
};

const staticPages = [
  { href: '/', label: 'Homepage — Browse & Copy AI Prompts' },
  { href: '/explore', label: 'Explore All Prompts' },
  { href: '/prompts', label: 'Prompt Topics by Model and Style' },
  { href: '/trending', label: 'Trending Prompts' },
  { href: '/blog', label: 'Blog — AI Prompt Engineering Guides' },
  { href: '/collections', label: 'Curated Collections' },
  { href: '/about', label: 'About topimageprompt' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Use' },
];

export default async function HtmlSitemapPage() {
  let prompts = [];
  let blogs = [];
  let collections = [];
  let engines = [];

  try {
    prompts = await prisma.prompt.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, category: true },
      orderBy: { copies: 'desc' },
    });
  } catch (e) {}

  try {
    blogs = await prisma.blog.findMany({
      where: { published: true },
      select: { slug: true, canonicalUrl: true, title: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (e) {}

  try {
    collections = await prisma.collection.findMany({
      where: { isPublic: true },
      select: { slug: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (e) {}

  try {
    engines = await prisma.prompt.groupBy({
      by: ['engine'],
      where: { published: true },
      _count: { _all: true },
      orderBy: { _count: { engine: 'desc' } },
    });
  } catch (e) {}

  // Group prompts by category
  const promptsByCategory = prompts.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px 120px' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
        Site Map
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '60px', fontSize: '1.1rem' }}>
        A complete directory of all pages on topimageprompt — {prompts.length} prompts, {blogs.length} articles, {collections.length} collections.
      </p>

      {/* Static Pages */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
          Main Pages
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {staticPages.map((page) => (
            <li key={page.href}>
              <Link href={page.href} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1rem' }}>
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Blog Posts */}
      {blogs.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
            Blog Posts ({blogs.length})
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {blogs.map((blog) => (
              <li key={blog.slug}>
                <Link href={`/blog/${getBlogCanonicalSlug(blog)}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1rem' }}>
                  {blog.title}
                </Link>
                {blog.category && (
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--border-light)', padding: '2px 8px', borderRadius: '4px' }}>
                    {blog.category}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {engines.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
            Prompt Models ({engines.length})
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {engines.map((engine) => (
              <li key={engine.engine}>
                <Link href={`/prompts/engine/${slugify(engine.engine)}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  {engine.engine} ({engine._count._all})
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
            Collections ({collections.length})
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {collections.map((col) => (
              <li key={col.slug}>
                <Link href={`/collections/${col.slug}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '1rem' }}>
                  {col.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Prompts grouped by Category */}
      {Object.entries(promptsByCategory).map(([category, categoryPrompts]) => (
        <section key={category} style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', borderBottom: '2px solid var(--border-light)', paddingBottom: '8px' }}>
            <Link href={`/prompts/style/${slugify(category)}`} style={{ color: 'inherit', textDecoration: 'none' }}>{category} Prompts ({categoryPrompts.length})</Link>
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {categoryPrompts.map((prompt) => (
              <li key={prompt.id}>
                <Link href={`/prompt/${prompt.slug || prompt.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.95rem' }}>
                  {prompt.title || 'Untitled Prompt'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
