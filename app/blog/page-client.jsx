"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import MotionCard from '@/components/motion/MotionCard';
import MotionButton from '@/components/motion/MotionButton';

export default function BlogClient({ initialPosts }) {
  const [posts] = useState(initialPosts || []);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (post.intro && post.intro.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isFiltering = activeCategory !== 'All' || searchQuery.trim() !== '';
  const heroPost = isFiltering ? null : (posts.find(p => p.isHeroPost) || posts[0]);
  const otherPosts = heroPost ? filteredPosts.filter(p => p.id !== heroPost.id) : filteredPosts;

  const paginatedPosts = otherPosts.slice(0, page * ITEMS_PER_PAGE);

  return (
    <>
      <main className="blog-main">
        
        {/* Header */}
        <header className="blog-header">
          <span className="uppercase-label">RESOURCES & GUIDES</span>
          <h1>The Vault Blog<span style={{color: '#FBBF24'}}>.</span></h1>
          <p>Master prompt engineering, stay updated on AI engines, and learn how to build better worlds.</p>
        </header>

        {/* Featured Article */}
        {heroPost && (
          <MotionCard className="motion-featured-story">
          <Link href={`/blog/${heroPost.slug}`} className="featured-article">
            <div className="featured-img-col" style={{ position: 'relative' }}>
              {heroPost.heroImage ? (
                  <Image 
                    src={heroPost.heroImage} 
                    alt="Featured Article" 
                    width={1400}
                    height={800}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    priority={true}
                    loading="eager"
                  />
              ) : (
                  <div style={{width:'100%', height:'100%', background:'#111'}}></div>
              )}
            </div>
            <div className="featured-content-col">
              <div className="featured-meta">
                <span className="badge">FEATURED STORY</span>
              </div>
              <h2>{heroPost.title}</h2>
              <p>{heroPost.intro || 'Read this featured article to learn more.'}</p>
              <div className="featured-btn">
                Read Full Article 
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </Link>
          </MotionCard>
        )}

        {/* Filter Bar */}
        <div className="blog-filter-bar">
          <div className="filter-tags">
            {['All', 'Tutorial', 'Masterclass', 'Guide'].map(cat => (
              <MotionButton
                key={cat} 
                className={`filter-tag ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
              >
                {cat === 'All' ? 'All Articles' : cat}
              </MotionButton>
            ))}
          </div>
          <div className="blog-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Articles Grid */}
        <div className="articles-grid">
          {paginatedPosts.length === 0 && (
            <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#666'}}>
              No articles found matching this filter.
            </div>
          )}
          
          {paginatedPosts.map((post, index) => (
            <MotionCard key={post.id} index={index}>
            <Link key={post.id} href={`/blog/${post.slug}`} className="article-card">
              <div className="article-img-wrapper" style={{ position: 'relative' }}>
                {post.heroImage ? (
                    <Image 
                      src={post.heroImage} 
                      alt={post.title} 
                      width={400}
                      height={250}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      quality={75}
                      loading="lazy"
                    />
                ) : (
                    <div style={{width:'100%', height:'100%', background:'#222'}}></div>
                )}
              </div>
              <div className="article-meta">
                <span className="category">{post.category}</span>
                <span className="dot">·</span>
                <span>{new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.intro ? (post.intro.length > 100 ? post.intro.substring(0, 100) + '...' : post.intro) : 'Read full article...'}</p>
              <span className="read-link">Read article <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></span>
            </Link>
            </MotionCard>
          ))}
        </div>

        {/* Load More */}
        {page * ITEMS_PER_PAGE < otherPosts.length && (
          <div className="blog-load-more">
            <MotionButton className="blog-load-btn" onClick={() => setPage(p => p + 1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
              Load More Articles
            </MotionButton>
            <span className="blog-load-text">Showing {paginatedPosts.length + (heroPost ? 1 : 0)} of {filteredPosts.length} articles</span>
          </div>
        )}

      </main>
    </>
  );
}
