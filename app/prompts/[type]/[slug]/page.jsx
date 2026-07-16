import { cache } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '../../../../lib/prisma';
import { slugify } from '../../../../lib/api-security';
import { BRAND_NAME, BRAND_URL } from '../../../../lib/brand';
import { absoluteUrl, safeJsonLd } from '../../../../lib/seo';

export const revalidate = 3600;

const findHub = cache(async (type, slug) => {
  if (!['engine', 'style'].includes(type) || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const field = type === 'engine' ? 'engine' : 'category';
  const groups = await prisma.prompt.groupBy({ by: [field], where: { published: true }, _count: { _all: true } });
  const group = groups.find((item) => slugify(item[field]) === slug);
  return group ? { type, field, value: group[field], count: group._count._all } : null;
});

export async function generateMetadata({ params }) {
  const { type, slug } = await params;
  const hub = await findHub(type, slug);
  if (!hub) notFound();
  const label = type === 'engine' ? `${hub.value} AI image prompts` : `${hub.value} AI image prompts`;
  const description = `Browse ${hub.count} copy-ready ${hub.value} AI image prompts with example images, generator details, aspect ratios, and full prompt text.`;
  return {
    title: label,
    description,
    alternates: { canonical: `/prompts/${type}/${slug}` },
    openGraph: { title: label, description, url: `${BRAND_URL}/prompts/${type}/${slug}`, type: 'website' },
  };
}

export default async function PromptHubPage({ params }) {
  const { type, slug } = await params;
  const hub = await findHub(type, slug);
  if (!hub) notFound();

  const prompts = await prisma.prompt.findMany({
    where: { published: true, [hub.field]: hub.value },
    orderBy: [{ copies: 'desc' }, { updatedAt: 'desc' }],
    take: 60,
    select: { id: true, slug: true, title: true, imageUrl: true, engine: true, category: true, aspectRatio: true, promptText: true },
  });
  const canonicalUrl = `${BRAND_URL}/prompts/${type}/${slug}`;
  const itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${hub.value} prompts`, numberOfItems: prompts.length,
    itemListElement: prompts.map((prompt, index) => ({
      '@type': 'ListItem', position: index + 1, name: prompt.title,
      url: `${BRAND_URL}/prompt/${prompt.slug || prompt.id}`,
      image: absoluteUrl(prompt.imageUrl, `${BRAND_URL}/images/placeholder.png`),
    })),
  };
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BRAND_URL },
      { '@type': 'ListItem', position: 2, name: 'Prompt topics', item: `${BRAND_URL}/prompts` },
      { '@type': 'ListItem', position: 3, name: hub.value, item: canonicalUrl },
    ],
  };

  return (
    <main className="container" style={{ maxWidth: '1200px', paddingTop: '72px', paddingBottom: '100px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
      <nav aria-label="Breadcrumb" style={{ marginBottom: '24px' }}><Link href="/prompts">Prompt topics</Link> / {type === 'engine' ? 'Models' : 'Styles'} / {hub.value}</nav>
      <h1>{hub.value} AI Image Prompts</h1>
      <p style={{ maxWidth: '780px', color: 'var(--text-muted)', fontSize: '1.08rem', lineHeight: 1.7 }}>
        Explore {hub.count} {hub.value} prompt examples from {BRAND_NAME}. Open any example to view the complete prompt, AI model, visual category, and recommended aspect ratio.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
        {prompts.map((prompt) => (
          <li key={prompt.id} style={{ border: '1px solid var(--border-light)', borderRadius: '14px', overflow: 'hidden', background: 'var(--bg-card)' }}>
            <Link href={`/prompt/${prompt.slug || prompt.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div style={{ position: 'relative', aspectRatio: '4 / 3' }}>
                <Image src={prompt.imageUrl || '/images/placeholder.png'} alt={`${prompt.title} example image`} fill style={{ objectFit: 'cover' }} sizes="(max-width: 640px) 100vw, 300px" loading="lazy" />
              </div>
              <div style={{ padding: '16px' }}>
                <h2 style={{ fontSize: '1.05rem', margin: '0 0 8px' }}>{prompt.title}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '.9rem' }}>{prompt.engine} · {prompt.aspectRatio}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
