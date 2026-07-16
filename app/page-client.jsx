"use client";
import React, { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import MotionCard from "@/components/motion/MotionCard";
import MotionButton from "@/components/motion/MotionButton";

export default function HomePageClient({ initialPrompts, initialCategories, initialStats, initialSettings }) {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shortcutText, setShortcutText] = useState('⌘ K');
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    if (!isModalOpen) {
      setCategorySearch('');
    }
  }, [isModalOpen]);
  const searchInputRef = React.useRef(null);
  const [engineFilter, setEngineFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const engineDropdownRef = React.useRef(null);
  const sortDropdownRef = React.useRef(null);
  const ITEMS_PER_PAGE = 16;

  const [allPrompts] = useState(initialPrompts || []);
  const [dbCategories] = useState(initialCategories || []);
  const [totalStats] = useState(initialStats || { totalPrompts: 0, totalCopies: 0, dailyAdded: 0 });
  const [siteSettings] = useState(initialSettings || {});

  useEffect(() => {
    // Detect OS for shortcut text
    if (typeof window !== 'undefined' && navigator.userAgent.indexOf('Win') !== -1) {
      setShortcutText('Ctrl K');
    }

    // Keyboard event listener for search focus
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close custom dropdowns on clicking outside or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(event.target)) {
        setIsEngineDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsEngineDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleCopy = async (promptText, promptId) => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
    } catch (err) {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement("textarea");
      textArea.value = promptText;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(textArea);
    }
    
    // Track the event
    if (promptId) {
        setCopiedId(promptId);
        setTimeout(() => setCopiedId(null), 2500);
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: 'copy_prompt', promptId, source: 'Home' })
        }).catch(() => {});
    }

    showToast('Prompt copied to clipboard!', 'success');
  };

  const handleDownloadImage = async (downloadUrl, title) => {
    try {
      showToast('Downloading original image...', 'info');
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const ext = downloadUrl.split('.').pop()?.split('?')[0] || 'jpg';
      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_wallpaper.${ext}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download complete!', 'success');
    } catch (e) {
      console.error('Download failed', e);
      window.open(downloadUrl, '_blank');
      showToast('Could not auto-download. Opened in new tab.', 'warning');
    }
  };

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategory, engineFilter, sortBy]);

  const filteredPrompts = allPrompts.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesEngine = engineFilter === 'All' || (p.engine || '').includes(engineFilter);
    const matchesSearch = !searchQuery || 
                          (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.promptText || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.engine || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && matchesEngine;
  }).sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.copies || 0) - (a.copies || 0);
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });

  // Pagination Logic
  const paginatedPrompts = filteredPrompts.slice(0, page * ITEMS_PER_PAGE);

  return (
    <>
      {/* Hero Section */}
      <section className="hero container">
        {/* Hero Cards Layout */}
        <div className="hero-cards-wrapper">
          {[
            { cls: 'card-left-out', w: 180, h: 160, customImg: siteSettings.heroImageLeftOut, key: 'heroImageLeftOut' },
            { cls: 'card-left', w: 200, h: 160, customImg: siteSettings.heroImageLeft, key: 'heroImageLeft' },
            { cls: 'card-center', w: 240, h: 190, customImg: siteSettings.heroImageCenter, key: 'heroImageCenter' },
            { cls: 'card-right', w: 200, h: 160, customImg: siteSettings.heroImageRight, key: 'heroImageRight' },
            { cls: 'card-right-out', w: 180, h: 160, customImg: siteSettings.heroImageRightOut, key: 'heroImageRightOut' }
          ].map((config, idx) => {
            let promptIds = [];
            if (siteSettings.heroPrompts) {
              try { promptIds = typeof siteSettings.heroPrompts === 'string' ? JSON.parse(siteSettings.heroPrompts) : siteSettings.heroPrompts; } catch(e) {}
            }
            if (!Array.isArray(promptIds)) promptIds = [];
            
            let customTexts = [];
            if (siteSettings.heroCustomTexts) {
              try { customTexts = typeof siteSettings.heroCustomTexts === 'string' ? JSON.parse(siteSettings.heroCustomTexts) : siteSettings.heroCustomTexts; } catch(e) {}
            }
            if (!Array.isArray(customTexts)) customTexts = [];

            const promptId = promptIds[idx];
            const customText = customTexts[idx];
            
            let prompt = allPrompts.find(p => p.id === promptId);
            if (!prompt) {
               prompt = allPrompts[idx] || { id: idx, title: 'Sample', promptText: 'Sample prompt' };
            }
            
            const displayText = customText && customText.trim() !== '' ? customText : prompt.promptText;

            return (
              <div key={`hero-${config.key}`} className={`hero-card ${config.cls}`}>
                <Image 
                  src={config.customImg || prompt.imageUrl || '/images/placeholder.png'} 
                  alt={prompt.title || ''} 
                  width={config.w} 
                  height={config.h} 
                  style={{objectFit: 'cover'}} 
                  priority={true} 
                  loading="eager"
                />
                <p><Link href={`/prompt/${prompt.slug || prompt.id}`} style={{color: 'inherit', textDecoration: 'none'}}>{displayText.length > 80 ? displayText.substring(0, 80) + '...' : displayText}</Link></p>
                <button className="card-btn" onClick={() => handleCopy(displayText, prompt.id)}>Copy Prompt</button>
              </div>
            );
          })}
        </div>

        <h1 className="hero-title">
          <span className="highlight">Steal</span> Prompts.
        </h1>

        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input 
            ref={searchInputRef} 
            type="text" 
            className="search-input" 
            placeholder="Search by style, mood, subject, or AI engine..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-right">
            <span className="shortcut">{shortcutText}</span>
            <button className="btn-black" style={{padding: '10px 24px'}}>Search <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '4px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>
          </div>
        </div>

        {/* Category Slider — always show max 10, then permanent All Categories button */}
        <div className="category-slider">
          {dbCategories.slice(0, 10).map(cat => (
            <div
              key={cat.id}
              className={`category-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.name)}
              style={{cursor: 'pointer'}}
            >
              <div className="category-img-wrapper">
                <Image src={cat.imageUrl || '/demo/abstract.svg'} alt={cat.name} width={80} height={80} style={{objectFit: 'cover'}} />
              </div>
              <span>{cat.name}</span>
            </div>
          ))}

          {/* Always-visible All Categories button — opens modal with every category */}
          <div className="category-item" onClick={() => setIsModalOpen(true)} style={{cursor: 'pointer'}}>
            <div className="category-more-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>More</span>
            </div>
            <span>All Categories</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container">
        {/* Dynamic Search & Filter Results Section */}
        <section className="prompts-section" id="dynamicResultsSection">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="section-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                {searchQuery ? `Search results for "${searchQuery}"` : activeCategory === 'All' ? 'Explore All Prompts' : `${activeCategory} Prompts`}
              </h2>
              <span className="badge-pill">{filteredPrompts.length} prompts</span>
            </div>

            <div className="filters-toolbar" style={{ display: 'flex', gap: '16px', zIndex: 10 }}>
              {/* Custom AI Engine Dropdown */}
              <div className="custom-dropdown-container" ref={engineDropdownRef}>
                <div 
                  className="sort-dropdown-trigger"
                  onClick={() => {
                    setIsEngineDropdownOpen(!isEngineDropdownOpen);
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <span className="sort-dropdown-label">Engine:</span>
                  <span className="sort-dropdown-value">{engineFilter === 'All' ? 'All AI Engines' : engineFilter}</span>
                  <span className={`sort-dropdown-chevron ${isEngineDropdownOpen ? 'open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </div>

                {isEngineDropdownOpen && (
                  <div className="sort-dropdown-menu" style={{ right: 'auto', left: 0, minWidth: '200px' }}>
                    <div 
                      className={`sort-dropdown-item ${engineFilter === 'All' ? 'selected' : ''}`}
                      onClick={() => {
                        setEngineFilter('All');
                        setIsEngineDropdownOpen(false);
                      }}
                    >
                      <span>All AI Engines</span>
                      {engineFilter === 'All' && (
                        <span className="sort-dropdown-check">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                    {(() => {
                      let arr = [];
                      if (siteSettings.allowedEngines) {
                        try {
                          arr = typeof siteSettings.allowedEngines === 'string' ? JSON.parse(siteSettings.allowedEngines) : siteSettings.allowedEngines;
                        } catch(e) {}
                      }
                      if (!Array.isArray(arr) || arr.length === 0) {
                        arr = ["Midjourney", "DALL-E 3", "Stable Diffusion XL", "Playground v2.5", "Leonardo AI"];
                      }
                      return arr.map(eng => (
                        <div 
                          key={eng}
                          className={`sort-dropdown-item ${engineFilter === eng ? 'selected' : ''}`}
                          onClick={() => {
                            setEngineFilter(eng);
                            setIsEngineDropdownOpen(false);
                          }}
                        >
                          <span>{eng}</span>
                          {engineFilter === eng && (
                            <span className="sort-dropdown-check">
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Custom Sort By Dropdown */}
              <div className="custom-dropdown-container" ref={sortDropdownRef}>
                <div 
                  className="sort-dropdown-trigger"
                  onClick={() => {
                    setIsSortDropdownOpen(!isSortDropdownOpen);
                    setIsEngineDropdownOpen(false);
                  }}
                >
                  <span className="sort-dropdown-label">Sort by:</span>
                  <span className="sort-dropdown-value">{sortBy === 'popular' ? 'Most Popular' : 'Newest First'}</span>
                  <span className={`sort-dropdown-chevron ${isSortDropdownOpen ? 'open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </div>

                {isSortDropdownOpen && (
                  <div className="sort-dropdown-menu" style={{ right: 0, minWidth: '180px' }}>
                    <div 
                      className={`sort-dropdown-item ${sortBy === 'popular' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('popular');
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      <span>Most Popular</span>
                      {sortBy === 'popular' && (
                        <span className="sort-dropdown-check">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                    <div 
                      className={`sort-dropdown-item ${sortBy === 'newest' ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy('newest');
                        setIsSortDropdownOpen(false);
                      }}
                    >
                      <span>Newest First</span>
                      {sortBy === 'newest' && (
                        <span className="sort-dropdown-check">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {filteredPrompts.length === 0 && (
            <div style={{ padding: "80px 20px", color: "var(--text-muted)", textAlign: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              <p style={{ fontSize: "1rem", fontWeight: "500", margin: 0 }}>No prompts found for this category.</p>
            </div>
          )}

          <div className="masonry-grid">
            {paginatedPrompts.map((prompt, index) => (
              <MotionCard key={prompt.id} index={index}>
              <Link 
                href={`/prompt/${prompt.slug || prompt.id}`} 
                className="explore-masonry-card"
              >
                <Image 
                  src={prompt.imageUrl || '/images/placeholder.png'} 
                  alt={prompt.title || ''} 
                  width={400}
                  height={600}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                
                {/* Mobile Direct Copy Button */}
                <MotionButton
                  className="mobile-card-copy-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopy(prompt.promptText, prompt.id);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>{copiedId === prompt.id ? "Copied" : "Copy"}</span>
                </MotionButton>
                
                {/* Card Hover Action Overlay */}
                <div className="card-hover-overlay">
                  {/* Top-Left Download Action */}
                  <MotionButton
                    className="card-action-icon" 
                    title="Download Wallpaper"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownloadImage(prompt.originalImageUrl || prompt.imageUrl, prompt.title);
                    }}
                    style={{ left: '16px', right: 'auto' }}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </MotionButton>

                  {/* Top-Right Arrow Action */}
                  <div className="card-action-icon" title="View details">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  </div>

                  {/* Centered Copy Button */}
                  <div className="card-hover-center">
                    <MotionButton
                      className="copy-prompt-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopy(prompt.promptText, prompt.id);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>{copiedId === prompt.id ? "Copied!" : "Copy Prompt"}</span>
                    </MotionButton>
                  </div>

                  {/* Bottom Details (Title and Tags) */}
                  <div className="card-hover-details">
                    <h4 className="card-hover-title">{prompt.title}</h4>
                    <div className="card-hover-tags">
                      {prompt.engine && <span className="card-hover-tag">{prompt.engine}</span>}
                      {prompt.category && <span className="card-hover-tag">#{prompt.category}</span>}
                      {prompt.aspectRatio && <span className="card-hover-tag">{prompt.aspectRatio}</span>}
                    </div>
                  </div>
                </div>
              </Link>
              </MotionCard>
            ))}
          </div>
        </section>
        
        {/* Load More & Explore Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', margin: '60px 0 20px 0', flexWrap: 'wrap' }}>
          {page * ITEMS_PER_PAGE < filteredPrompts.length && (
            <button className="btn-outline" style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: '600' }} onClick={() => setPage(p => p + 1)}>
              Load More
            </button>
          )}
          <Link href="/explore" className="btn-black" style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: '600', textDecoration: 'none' }}>
            Explore All Prompts <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '4px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>

        {/* No local toast anymore — handled by global useToast */}
      </main>

      {/* Categories Modal */}
      {isModalOpen && (
        <div className="modal-overlay active" id="categoriesModal" style={{ display: 'flex' }}>
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <div className="header-left">
                <h2>All Categories</h2>
                <span className="badge-count">{dbCategories.length} Styles</span>
              </div>
              <div className="header-center">
                <div className="modal-search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search categories..." 
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>
              </div>
              <button className="close-modal-btn" id="closeCategoriesModal" onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {/* Sidebar */}
              <aside className="modal-sidebar">
                <div className="sidebar-title">BROWSE CATEGORIES</div>
                <ul className="sidebar-nav">
                  {dbCategories.slice(0, 8).map((cat) => (
                    <li 
                      key={`nav-${cat.id}`} 
                      className={activeCategory === cat.name ? "active" : ""}
                      onClick={() => { setActiveCategory(cat.name); setIsModalOpen(false); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Image src={cat.imageUrl || '/images/placeholder.png'} alt={cat.name} width={32} height={32} style={{objectFit: 'cover'}} />
                      <span>{cat.name}</span>
                    </li>
                  ))}
                </ul>
                <button className="sidebar-all-btn" onClick={() => setCategorySearch('')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  All {dbCategories.length} Categories
                </button>
              </aside>

              {/* Main Grid */}
              <main className="modal-main">
                <div className="main-header">
                  <h3>All Styles</h3>
                  <span className="sub-count">
                    {dbCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).length} styles found
                  </span>
                </div>
                
                <div className="category-grid">
                  {dbCategories
                    .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map(cat => (
                      <div className="grid-item" key={`grid-${cat.id}`} onClick={() => { setActiveCategory(cat.name); setIsModalOpen(false); }} style={{cursor: 'pointer'}}>
                        <div className="img-container">
                          <Image src={cat.imageUrl || '/images/placeholder.png'} alt={cat.name} width={160} height={213} style={{objectFit: 'cover'}} />
                        </div>
                        <h4>{cat.name}</h4>
                        <p>Explore</p>
                      </div>
                    ))
                  }
                </div>
              </main>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="footer-left">
                <span className="browsing-text">Browsing: <strong>All Styles</strong></span>
              </div>
              <div className="footer-center">
                <span className="breadcrumbs">Categories &gt; All Styles</span>
              </div>
              <div className="footer-right">
                <button className="btn-clear" onClick={() => setActiveCategory('All')}>Clear</button>
                <button className="btn-black" onClick={() => setIsModalOpen(false)}>Apply Filter</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
