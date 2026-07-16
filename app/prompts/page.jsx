import Link from 'next/link';
import prisma from '../../lib/prisma';
import { slugify } from '../../lib/api-security';
import { BRAND_NAME, BRAND_URL } from '../../lib/brand';
import { safeJsonLd } from '../../lib/seo';

export const revalidate = 3600;

export const metadata = {
  title: 'AI Image Prompts by Model and Style',
  description: `Browse ${BRAND_NAME} prompt collections by AI image model and visual style. Each hub links to tested, copy-ready prompts and example images.`,
  alternates: { canonical: '/prompts' },
  openGraph: { url: `${BRAND_URL}/prompts`, type: 'website' },
};

export default async function PromptHubsPage() {
  const [styles, engines] = await Promise.all([
    prisma.prompt.groupBy({
      by: ['category'], where: { published: true }, _count: { _all: true },
      orderBy: { _count: { category: 'desc' } },
    }),
    prisma.prompt.groupBy({
      by: ['engine'], where: { published: true }, _count: { _all: true },
      orderBy: { _count: { engine: 'desc' } },
    }),
  ]);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI image prompt topics',
    itemListElement: [
      ...engines.map((group) => ({ name: `${group.engine} prompts`, href: `/prompts/engine/${slugify(group.engine)}` })),
      ...styles.map((group) => ({ name: `${group.category} prompts`, href: `/prompts/style/${slugify(group.category)}` })),
    ].map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, url: `${BRAND_URL}${item.href}` })),
  };

  const sectionStyle = { marginTop: '48px' };
  const gridStyle = { listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' };
  const cardStyle = { display: 'block', padding: '18px', border: '1px solid var(--border-light)', borderRadius: '12px', color: 'var(--text-main)', textDecoration: 'none', background: 'var(--bg-card)' };

  return (
    <main className="container" style={{ maxWidth: '1100px', paddingTop: '72px', paddingBottom: '100px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <h1>AI Image Prompts by Model and Style</h1>
      <p style={{ maxWidth: '760px', color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.7 }}>
        Choose a generator or visual style to find relevant, copy-ready prompt examples. These crawlable topic pages make the library easier for people, search engines, and answer engines to understand.
      </p>

      <section style={sectionStyle}>
        <h2>Browse by AI image model</h2>
        <ul style={gridStyle}>
          {engines.map((group) => (
            <li key={group.engine}><Link style={cardStyle} href={`/prompts/engine/${slugify(group.engine)}`}><strong>{group.engine}</strong><br /><span style={{ color: 'var(--text-muted)' }}>{group._count._all} prompts</span></Link></li>
          ))}
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2>Browse by visual style</h2>
        <ul style={gridStyle}>
          {styles.map((group) => (
            <li key={group.category}><Link style={cardStyle} href={`/prompts/style/${slugify(group.category)}`}><strong>{group.category}</strong><br /><span style={{ color: 'var(--text-muted)' }}>{group._count._all} prompts</span></Link></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
