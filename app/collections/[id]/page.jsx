import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import prisma from '../../../lib/prisma';
import '../../single-collection.css';
import CopyPromptButton from './CopyPromptButton';
import { safeJsonLd } from '../../../lib/seo';
import { BRAND_NAME, BRAND_URL } from '../../../lib/brand';

// Statically render page with a 60-second background revalidation window (ISR)
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const collection = await prisma.collection.findFirst({
    where: { slug: id, isPublic: true },
    include: {
      saves: {
        include: { prompt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!collection) return {};

  let heroImages = [];
  try {
    heroImages = JSON.parse(collection.heroImages || '[]');
  } catch(e) {}

  return {
    title: `${collection.title} | ${BRAND_NAME} Collection`,
    description: collection.description || `Browse the curated AI prompt collection "${collection.title}" by ${collection.curator} on ${BRAND_NAME}.`,
    alternates: {
      canonical: `/collections/${collection.slug}`,
    },
    openGraph: {
      title: `${collection.title} - ${BRAND_NAME}`,
      description: collection.description,
      url: `${BRAND_URL}/collections/${collection.slug}`,
      images: heroImages.map(url => ({ url })),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${collection.title} - ${BRAND_NAME}`,
      description: collection.description,
      images: heroImages,
    }
  };
}

export default async function SingleCollectionPage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Fetch collection with its curated prompts
  const collection = await prisma.collection.findFirst({
    where: { slug: id, isPublic: true },
    include: {
      saves: {
        include: { prompt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  // Only show prompts that were explicitly added to this collection
  const prompts = (collection.saves || [])
    .map(save => save.prompt)
    .filter(prompt => prompt?.published);

  let heroImages = [];
  try {
    heroImages = JSON.parse(collection.heroImages || '[]');
  } catch(e) {}

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": collection.title,
    "description": collection.description,
    "numberOfItems": prompts.length,
    "itemListElement": prompts.map((prompt, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `${BRAND_URL}/prompt/${prompt.slug || prompt.id}`,
      "name": prompt.title
    }))
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BRAND_URL },
      { "@type": "ListItem", "position": 2, "name": "Collections", "item": `${BRAND_URL}/collections` },
      { "@type": "ListItem", "position": 3, "name": collection.title, "item": `${BRAND_URL}/collections/${collection.slug}` }
    ]
  };

  // Serialize collections/prompts
  const serializedCollection = {
    ...collection,
    saves: undefined,
    createdAt: collection.createdAt ? collection.createdAt.toISOString() : null,
    updatedAt: collection.updatedAt ? collection.updatedAt.toISOString() : null
  };

  const serializedPrompts = prompts.map(p => ({
    ...p,
    createdAt: p.createdAt ? p.createdAt.toISOString() : null,
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <main className="single-collection-main">
        {/* Breadcrumb */}
        <nav className="breadcrumb-nav">
          <Link href="/collections">Collections</Link>
          <span className="separator">/</span>
          <span className="current">{serializedCollection.title}</span>
        </nav>

        {/* Hero Section */}
        <section className="sc-hero">
          <div className="sc-hero-content">
            <h1>{serializedCollection.title}<span style={{ color: '#FBBF24' }}>.</span></h1>

            <div className="sc-meta">
              <span className="sc-prompts-pill">{serializedPrompts.length} Prompts</span>
              <div className="sc-curator">
                <div className="sc-avatar">{serializedCollection.curator ? serializedCollection.curator[0] : 'A'}</div>
                <span>Curated by {serializedCollection.curator}</span>
              </div>
              <div className="sc-meta-divider" />
              <span>Updated {serializedCollection.updatedAt ? new Date(serializedCollection.updatedAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : ''}</span>
            </div>

            <p>{serializedCollection.description}</p>

            <div className="sc-actions">
              <a href="#prompts-grid" className="sc-explore-btn" style={{textDecoration: 'none'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                Explore Prompts
              </a>
              <button className="sc-share-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              </button>
            </div>
          </div>

          <div className="sc-hero-images">
            {heroImages.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: '100%', height: '300px' }}>
                <Image 
                  src={img} 
                  alt={`${serializedCollection.title} preview ${i + 1}`} 
                  width={300}
                  height={300}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
            {heroImages.length === 0 && <div style={{width:'100%', height:'400px', background:'var(--bg-light)', borderRadius:'12px'}}></div>}
          </div>
        </section>

        {/* Masonry Grid */}
        <div id="prompts-grid" className="sc-masonry-grid">
          {serializedPrompts.map((prompt, idx) => (
            <CopyPromptButton key={prompt.id} prompt={prompt} idx={idx} />
          ))}
        </div>

        {/* Pagination */}
        <div className="sc-pagination">
          <div className="sc-showing-text">
            Showing <strong>{serializedPrompts.length}</strong> of <strong>{serializedPrompts.length}</strong> prompts in {serializedCollection.title}
          </div>
        </div>

        {/* Share Footer */}
        <div className="sc-share-footer">
          <span className="sc-share-label">Share collection:</span>
          <div className="sc-social-buttons">
            <button className="sc-social-btn pinterest">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg>
            </button>
            <button className="sc-social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
            </button>
            <button className="sc-social-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
