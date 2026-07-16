import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import prisma from '../../../lib/prisma';
import '../../../app/prompt.css';
import PromptDetailClient from './PromptDetailClient';
import { findPublishedPrompt } from '../../../lib/public-data';
import { absoluteUrl, getPromptPath, safeJsonLd } from '../../../lib/seo';
import { BRAND_NAME, BRAND_URL } from '../../../lib/brand';

export const revalidate = 60;

function promptDescription(prompt) {
  let tags = [];
  try { tags = JSON.parse(prompt.tags || '[]'); } catch {}
  const tagText = tags.length > 0 ? ` Keywords: ${tags.slice(0, 5).join(', ')}.` : '';
  return `Copy this ${prompt.engine} image prompt free. Style: ${prompt.category}. Aspect ratio: ${prompt.aspectRatio}.${tagText}`.slice(0, 320);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const prompt = await findPublishedPrompt(id);
  if (!prompt) notFound();

  const canonicalPath = getPromptPath(prompt);
  const description = promptDescription(prompt);
  const imageUrl = absoluteUrl(prompt.imageUrl, `${BRAND_URL}/images/placeholder.png`);

  return {
    title: `${prompt.title} | Free AI Image Prompt`,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: prompt.title,
      description,
      images: [{ url: imageUrl, alt: `${prompt.title} AI-generated example` }],
      url: `${BRAND_URL}${canonicalPath}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: prompt.title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SinglePromptPage({ params }) {
  const { id } = await params;
  const prompt = await findPublishedPrompt(id);
  if (!prompt) notFound();

  if (prompt.slug && id !== prompt.slug) {
    permanentRedirect(`/prompt/${prompt.slug}`);
  }

  let related = await prisma.prompt.findMany({
    where: { published: true, category: prompt.category, NOT: { id: prompt.id } },
    take: 4,
    orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }],
  });

  if (related.length < 4) {
    const additional = await prisma.prompt.findMany({
      where: {
        published: true,
        engine: prompt.engine,
        NOT: { id: { in: [prompt.id, ...related.map((item) => item.id)] } },
      },
      take: 4 - related.length,
      orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }],
    });
    related = [...related, ...additional];
  }

  if (related.length < 4) {
    const additional = await prisma.prompt.findMany({
      where: {
        published: true,
        NOT: { id: { in: [prompt.id, ...related.map((item) => item.id)] } },
      },
      take: 4 - related.length,
      orderBy: [{ copies: 'desc' }, { createdAt: 'desc' }],
    });
    related = [...related, ...additional];
  }

  const canonicalPath = getPromptPath(prompt);
  const canonicalUrl = `${BRAND_URL}${canonicalPath}`;
  const imageUrl = absoluteUrl(prompt.imageUrl, `${BRAND_URL}/images/placeholder.png`);
  let tags = [];
  try { tags = JSON.parse(prompt.tags || '[]'); } catch {}

  const creativeWorkSchema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${canonicalUrl}#prompt`,
    name: prompt.title,
    description: prompt.promptText,
    image: {
      '@type': 'ImageObject',
      contentUrl: imageUrl,
      representativeOfPage: true,
      license: `${BRAND_URL}/terms#prompt-license`,
      acquireLicensePage: `${BRAND_URL}/terms#prompt-license`,
      creditText: BRAND_NAME,
      creator: { '@type': 'Organization', name: BRAND_NAME },
    },
    url: canonicalUrl,
    isAccessibleForFree: true,
    license: `${BRAND_URL}/terms#prompt-license`,
    creator: { '@type': 'Organization', name: BRAND_NAME, url: BRAND_URL },
    keywords: [prompt.engine, prompt.category, 'AI image prompt', ...tags].join(', '),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BRAND_URL },
      { '@type': 'ListItem', position: 2, name: 'Explore', item: `${BRAND_URL}/explore` },
      { '@type': 'ListItem', position: 3, name: prompt.title, item: canonicalUrl },
    ],
  };

  const serializedPrompt = {
    ...prompt,
    createdAt: prompt.createdAt?.toISOString() || null,
    updatedAt: prompt.updatedAt?.toISOString() || null,
  };
  const serializedRelated = related.map((item) => ({
    ...item,
    createdAt: item.createdAt?.toISOString() || null,
    updatedAt: item.updatedAt?.toISOString() || null,
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(creativeWorkSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <PromptDetailClient prompt={serializedPrompt} related={serializedRelated} />
    </>
  );
}
