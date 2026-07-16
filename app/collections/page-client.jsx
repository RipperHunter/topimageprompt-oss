"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "../collections.css";
import MotionCard from "@/components/motion/MotionCard";
import MotionButton from "@/components/motion/MotionButton";

export default function CollectionsPageClient({ initialCollections }) {
  const [allCollections] = useState(initialCollections || []);
  const [activeFilter, setActiveFilter] = useState("All Collections");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const featured = allCollections.find((c) => c.featured) || allCollections[0];
  const others = featured ? allCollections.filter((c) => c.id !== featured.id) : allCollections;

  const parseHeroImages = (str) => {
    try {
      return JSON.parse(str || "[]");
    } catch {
      return [];
    }
  };

  const featuredImages = featured ? parseHeroImages(featured.heroImages) : [];

  // Derive dynamic filters based on common keywords in titles or descriptions
  const possibleFilters = ["Character", "Environment", "Photography", "UI", "Web", "Fantasy", "Cyberpunk", "Art"];
  const dynamicFilters = ["All Collections"];
  
  others.forEach(c => {
    const text = (c.title + " " + (c.description || "")).toLowerCase();
    possibleFilters.forEach(f => {
      if (text.includes(f.toLowerCase()) && !dynamicFilters.includes(f)) {
        dynamicFilters.push(f);
      }
    });
  });

  if (dynamicFilters.length === 1) {
    dynamicFilters.push("Character Design", "Environment", "Photography", "UI & Web");
  }

  let filteredCollections = others;
  
  if (activeFilter !== "All Collections") {
    filteredCollections = filteredCollections.filter(c => {
      const text = (c.title + " " + (c.description || "")).toLowerCase();
      if (activeFilter === "Character Design") return text.includes("character");
      if (activeFilter === "UI & Web") return text.includes("ui") || text.includes("web");
      return text.includes(activeFilter.toLowerCase());
    });
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredCollections = filteredCollections.filter(c => 
      c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)
    );
  }

  const paginatedCollections = filteredCollections.slice(0, page * ITEMS_PER_PAGE);

  return (
    <>
      <section className="collections-hero container" style={{ marginTop: "40px", marginBottom: "40px" }}>
        <span className="uppercase-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#888', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
          HAND-PICKED BUNDLES
        </span>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '24px', textAlign: 'center' }}>
          Curated Collections<span style={{ color: "#10B981" }}>.</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          Thematic bundles of our highest-quality prompts, organized by our editors to help you build cohesive visual worlds.
        </p>
      </section>

      <main className="collections-main container" style={{ paddingBottom: "100px" }}>
        {featured && (
          <div className="featured-collection" style={{ display: 'flex', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: '24px', overflow: 'hidden', marginBottom: '60px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', flexDirection: 'row', flexWrap: 'wrap' }}>
            <Link href={`/collections/${featured.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flex: '1 1 50%', minWidth: '300px' }}>
              <div className="featured-images" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'var(--card-bg)', padding: '12px', width: '100%' }}>
                <div className="featured-main-img" style={{ gridRow: '1 / span 3', borderRadius: '12px 0 0 12px', overflow: 'hidden', position: 'relative' }}>
                  <Image
                    alt={featured.title}
                    src={featuredImages[0] || "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=600&auto=format&fit=crop"}
                    width={600}
                    height={450}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    priority={true}
                    loading="eager"
                  />
                </div>
                {featuredImages.slice(1, 4).map((img, idx) => (
                  <div className="featured-sub-img" key={idx} style={{ height: '150px', overflow: 'hidden', borderRadius: idx === 0 ? '0 12px 0 0' : idx === 2 ? '0 0 12px 0' : '0', position: 'relative' }}>
                    <Image 
                      alt={`${featured.title} ${idx}`} 
                      src={img} 
                      width={200}
                      height={150}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      quality={75}
                      loading="lazy"
                    />
                  </div>
                ))}
                {featuredImages.length < 2 && <div className="featured-sub-img" style={{ height: '150px', borderRadius: '0 12px 0 0', overflow: 'hidden' }}><div style={{width:'100%', height:'100%', background:'var(--bg-light)'}}/></div>}
                {featuredImages.length < 3 && <div className="featured-sub-img" style={{ height: '150px', overflow: 'hidden' }}><div style={{width:'100%', height:'100%', background:'var(--bg-light)'}}/></div>}
                {featuredImages.length < 4 && <div className="featured-sub-img" style={{ height: '150px', borderRadius: '0 0 12px 0', overflow: 'hidden' }}><div style={{width:'100%', height:'100%', background:'var(--bg-light)'}}/></div>}
              </div>
            </Link>
            <div className="featured-content" style={{ flex: '1 1 50%', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '300px' }}>
              <div className="featured-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>FEATURED THIS WEEK</div>
              <h2 className="featured-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>{featured.title}</h2>
              <p className="featured-desc" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '32px', lineHeight: 1.6 }}>
                {featured.description || "Explore this curated collection."}
              </p>
              <div className="collection-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <span className="prompt-count-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-light)', padding: '6px 12px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="9" y1="21" x2="9" y2="9"></line>
                  </svg>
                  {featured.promptCount} Prompts
                </span>
                <span className="curator-info" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Curated by <strong>{featured.curator || "topimageprompt"}</strong>
                </span>
              </div>
              <Link href={`/collections/${featured.slug}`} className="btn-black" style={{ alignSelf: 'flex-start', padding: '14px 32px', fontSize: '1rem' }}>
                Explore Collection <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div className="collection-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dynamicFilters.map(f => (
              <MotionButton
                key={f} 
                className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => { setActiveFilter(f); setPage(1); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '100px',
                  border: activeFilter === f ? '1px solid var(--accent-color)' : '1px solid var(--border-light)',
                  background: activeFilter === f ? 'var(--accent-color)' : 'var(--bg-color)',
                  color: activeFilter === f ? 'var(--accent-text)' : 'var(--text-main)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f}
              </MotionButton>
            ))}
          </div>
          <div className="collection-search" style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              placeholder="Search collections..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '0.95rem' }}
            />
          </div>
        </div>

        <div className="collections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
          {paginatedCollections.map((collection, index) => {
            const imgs = parseHeroImages(collection.heroImages);
            return (
              <MotionCard key={collection.id} index={index}>
              <Link href={`/collections/${collection.slug}`} className="collection-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="cc-images" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', height: '250px', borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="cc-main-img" style={{ height: '100%', position: 'relative' }}>
                    <Image
                      alt={collection.title}
                      src={imgs[0] || "https://images.unsplash.com/photo-1542451313056-b7c8e626645f?q=80&w=400&auto=format&fit=crop"}
                      width={400}
                      height={250}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      quality={75}
                      loading="lazy"
                    />
                  </div>
                  <div className="cc-side-imgs" style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '8px', height: '100%' }}>
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <Image 
                        src={imgs[1] || "https://images.unsplash.com/photo-1618588507085-c79565432917?q=80&w=200&auto=format&fit=crop"} 
                        alt={`${collection.title} preview image 2`} 
                        width={200}
                        height={120}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        quality={75}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <Image 
                        src={imgs[2] || "https://images.unsplash.com/photo-1596781423403-125dd1f9dfab?q=80&w=200&auto=format&fit=crop"} 
                        alt={`${collection.title} preview image 3`} 
                        width={200}
                        height={120}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        quality={75}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
                <div className="cc-content">
                  <div className="cc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{collection.title}</h3>
                    <span className="cc-badge" style={{ background: 'var(--bg-light)', color: 'var(--text-main)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{collection.promptCount} Prompts</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {collection.description || "A thematic collection."}
                  </p>
                </div>
              </Link>
              </MotionCard>
            );
          })}
          {filteredCollections.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px", color: "var(--text-muted)", background: 'var(--bg-light)', borderRadius: '16px' }}>
              No collections found matching your criteria.
            </div>
          )}
        </div>

        {page * ITEMS_PER_PAGE < filteredCollections.length && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '48px' }}>
            <MotionButton
              className="btn-outline" 
              style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', borderRadius: '12px', border: '2px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-main)' }} 
              onClick={() => setPage(p => p + 1)}
            >
              Load {Math.min(ITEMS_PER_PAGE, filteredCollections.length - page * ITEMS_PER_PAGE)} More Collections
            </MotionButton>
          </div>
        )}
      </main>
    </>
  );
}
