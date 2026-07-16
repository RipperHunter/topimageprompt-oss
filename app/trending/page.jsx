import React from 'react';
import prisma from '../../lib/prisma';
import TrendingPromptCard from './TrendingPromptCard';
import '../explore.css';

// Statically render page with a 1-hour background revalidation window (ISR)
export const revalidate = 3600;

export const metadata = {
  title: 'Trending AI Prompts | topimageprompt',
  description: 'Browse the most copied and fastest-rising AI image prompts on topimageprompt.',
  alternates: { canonical: '/trending' },
  openGraph: {
    title: 'Trending AI Prompts | topimageprompt',
    description: 'See the prompts creators are copying most right now.',
    url: '/trending',
  },
};

export default async function TrendingPage() {
  let topPrompts = [];
  let totalCopies = 0;

  try {
    // Fetch top 100 prompts ordered by copies descending
    topPrompts = await prisma.prompt.findMany({
      orderBy: { copies: 'desc' },
      take: 100,
    });

    // Calculate total all-time copies for the top 100
    totalCopies = topPrompts.reduce((sum, p) => sum + (p.copies || 0), 0);
  } catch (error) {
    console.error('Trending page DB error:', error);
    // Don't crash the page — render with empty state
  }

  return (
    <>
      <section className="collections-hero" style={{ background: 'linear-gradient(to bottom, var(--bg-light), var(--bg-color))', borderBottom: '1px solid var(--border-light)', padding: '80px 32px', marginBottom: '40px', maxWidth: '100%' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="uppercase-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#10B981', textTransform: 'uppercase', marginBottom: '16px' }}>
            <span className="live-dot" style={{ display: 'inline-block', marginRight: '8px', width: '8px', height: '8px', background: '#10B981', borderRadius: '50%' }}></span>
            LIVE CHARTS
          </span>
          <h1 style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '24px' }}>
            Trending Prompts
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 32px' }}>
            Discover the most viral and highly-copied prompts across the entire platform. Updated in real-time.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalCopies.toLocaleString('en-US')}+</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>All-Time Copies</div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', padding: '12px 24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Top 100</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Global Ranking</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '120px' }}>
        {topPrompts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '80px 0', fontSize: '1.1rem' }}>
            No prompts found yet. Check back soon!
          </p>
        ) : (
          <div className="trending-masonry-grid">
            {topPrompts.map((prompt, index) => (
              <TrendingPromptCard key={prompt.id} prompt={prompt} index={index} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
