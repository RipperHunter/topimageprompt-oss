"use client";
import React, { useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import SignOutModal from "./SignOutModal";
import BrandLogo from "./BrandLogo";

function formatBlogDate(blog) {
  const value = blog.updatedAt || blog.createdAt;
  if (!value) return 'Recently updated';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function Navbar({ navigationData = null }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [stats, setStats] = useState(navigationData?.stats || { totalPrompts: null, totalCategories: null });
  const [trending, setTrending] = useState(navigationData?.trending || []);
  const [theme, setTheme] = useState("dark");
  const [collections, setCollections] = useState(navigationData?.collections || []);
  const [latestBlogs, setLatestBlogs] = useState(navigationData?.latestBlogs || []);

  React.useEffect(() => {
    // Theme initialization and listener
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const handleThemeChange = (e) => {
      setTheme(e.detail);
    };
    window.addEventListener('theme-change', handleThemeChange);

    if (!navigationData) {
      Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/prompts?limit=5').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/collections').then(r => r.json()),
        fetch('/api/blog?limit=3&visibility=Public').then(r => r.json()),
      ]).then(([s, p, c, col, blogs]) => {
        setStats({ totalPrompts: s.totalPrompts || null, totalCategories: c.categories?.length || null });
        const sorted = (p.prompts || []).sort((a,b) => (b.copies || 0) - (a.copies || 0));
        setTrending(sorted.slice(0, 5));
        setCollections(col.collections || []);
        setLatestBlogs(blogs.posts || []);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, [navigationData]);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  return (
    <>
      {/* Desktop Floating Pill Navbar */}
      <nav className="navbar desktop-navbar container">
        <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <BrandLogo priority />
        </Link>
        
        <div className="nav-links">
          <div className="nav-item">
            <Link href="/explore">Explore</Link>
            <div className="mega-menu menu-explore">
              <div className="menu-section">
                <h4 className="menu-label">BROWSE BY</h4>
                <ul className="menu-list">
                  <li>
                    <Link href="/explore?engine=Midjourney" style={{display: "flex", width: "100%", textDecoration: "none", color: "inherit", alignItems: "center", gap: "12px"}}>
                    <div className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div>
                    <div className="menu-text">
                      <span className="title">By AI Engine</span>
                      <span className="desc">Midjourney, DALL-E, Stable Diffusion</span>
                    </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/explore?style=Cinematic" style={{display: "flex", width: "100%", textDecoration: "none", color: "inherit", alignItems: "center", gap: "12px"}}>
                    <div className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg></div>
                    <div className="menu-text">
                      <span className="title">By Mood</span>
                      <span className="desc">Dark, Dreamy, Epic, Minimal, Warm</span>
                    </div>
                    </Link>
                  </li>
                  <li>
                    <Link href="/explore?ratio=16:9" style={{display: "flex", width: "100%", textDecoration: "none", color: "inherit", alignItems: "center", gap: "12px"}}>
                    <div className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
                    <div className="menu-text">
                      <span className="title">By Aspect Ratio</span>
                      <span className="desc">Square 1:1 · Portrait 9:16 · Wide 16:9</span>
                    </div>
                    </Link>
                  </li>
                </ul>
                <Link href="/explore?random=true"><button className="menu-random-btn" style={{width: "100%", cursor: "pointer"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Random Prompt <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button></Link>
              </div>
              <div className="menu-divider"></div>
              <div className="menu-section">
                <h4 className="menu-label">LIBRARY SIZE</h4>
                <ul className="menu-stats">
                  <li>
                    <span className="stat-num">{stats.totalPrompts == null ? 'Browse prompts' : `${stats.totalPrompts.toLocaleString('en-US')} Prompts`}</span>
                    <span className="stat-desc">Total in library</span>
                  </li>
                  <li>
                    <span className="stat-num">{stats.totalCategories == null ? 'Browse categories' : `${stats.totalCategories} Categories`}</span>
                    <span className="stat-desc">Across all styles</span>
                  </li>
                  <li>
                    <span className="stat-num"><span className="live-dot" style={{display: 'inline-block', marginRight: '6px'}}></span>Updated Daily</span>
                    <span className="stat-desc">New prompts every day</span>
                  </li>
                </ul>
                <button className="menu-pinterest-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg> Follow on Pinterest
                </button>
              </div>
            </div>
          </div>

          <div className="nav-item">
            <Link href="/collections">Collections</Link>
            <div className="mega-menu menu-collections">
              <div className="menu-header-flex">
                <h4>Curated Collections</h4>
                <Link href="/collections" className="view-all-link">View all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link>
              </div>

              {collections.length > 0 ? (
                <>
                  <div className="collections-cards">
                    {collections.slice(0, 3).map((col) => {
                      const collageImages = [];
                      try {
                        const parsed = JSON.parse(col.heroImages || '[]');
                        if (Array.isArray(parsed)) {
                          collageImages.push(...parsed);
                        }
                      } catch (e) {}
                      while (collageImages.length < 4) {
                        collageImages.push('/images/placeholder.png');
                      }

                      return (
                        <Link href={`/collections/${col.slug}`} key={`nav-col-${col.id}`} style={{textDecoration: "none", color: "inherit"}}>
                          <div className="collection-card">
                            <div className="collage">
                              {collageImages.slice(0, 4).map((img, idx) => (
                                <Image 
                                  src={img || '/images/placeholder.png'} 
                                  alt={col.title} 
                                  key={`nav-col-${col.id}-img-${idx}`}
                                  width={60} 
                                  height={60} 
                                  style={{objectFit: 'cover', width: '100%', height: '100%'}} 
                                />
                              ))}
                            </div>
                            <div className="c-title">{col.title}</div>
                            <div className="c-desc">{col.promptCount || 0} Prompts</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  {collections.length > 3 && (
                    <>
                      <div className="menu-divider"></div>
                      <div className="collections-links">
                        {collections.slice(3, 9).map((col) => (
                          <Link href={`/collections/${col.slug}`} key={`nav-col-link-${col.id}`}>
                            {col.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.6, color: 'var(--text-muted)' }}><path d="m12 2-10 5 10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
                  <p style={{ fontSize: '0.85rem', margin: 0 }}><Link href="/collections">Browse all collections</Link></p>
                </div>
              )}
            </div>
          </div>

          <div className="nav-item">
            <Link href="/trending">Trending</Link>
            <div className="mega-menu menu-trending">
              <div className="menu-header-flex">
                <h4 style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span className="live-dot"></span> Trending Now</h4>
                <span className="sub-text">Updated hourly</span>
              </div>
              <div className="trending-list">
                {trending.map((prompt, idx) => (
                  <Link href={`/prompt/${prompt.slug || prompt.id}`} key={`nav-trend-${prompt.id}`} style={{textDecoration:'none', color:'inherit'}}>
                    <div className="t-item">
                      <Image src={prompt.imageUrl || '/images/placeholder.png'} alt={prompt.title} width={50} height={50} style={{objectFit: 'cover'}} />
                      <div className="t-info">
                        <div className="t-title">{prompt.title}</div>
                        <div className="t-meta">{prompt.engine} · {prompt.copies || 0} copies</div>
                      </div>
                      <div className="t-rank">#{idx + 1}</div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="menu-footer-bar">
                <span>This week's most copied prompt <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
                <Link href="/trending"><button className="btn-black-small" style={{cursor: "pointer"}}>View Top</button></Link>
              </div>
            </div>
          </div>
          
          <div className="nav-item">
            <Link href="/blog">Blog</Link>
            <div className="mega-menu menu-trending">
              <div className="menu-header-flex">
                <h4>Latest Articles</h4>
                <Link href="/blog" className="view-all-link">View all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link>
              </div>
              <div className="trending-list">
                {latestBlogs.length > 0 ? latestBlogs.map((blog) => (
                  <Link href={`/blog/${blog.slug || blog.id}`} key={`nav-blog-${blog.id}`} style={{textDecoration:'none', color:'inherit'}}>
                    <div className="t-item">
                      {blog.heroImage ? (
                        <Image src={blog.heroImage} alt={blog.title || ''} width={50} height={50} style={{objectFit: 'cover', borderRadius: '8px', flexShrink: 0}} />
                      ) : (
                        <div style={{width: 50, height: 50, borderRadius: '8px', background: 'var(--bg-light)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        </div>
                      )}
                      <div className="t-info">
                        <div className="t-title">{blog.title}</div>
                        <div className="t-meta">{blog.category} · {formatBlogDate(blog)}</div>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}><Link href="/blog">Browse the blog</Link></div>
                )}
              </div>
              <div className="menu-footer-bar">
                <span>Get weekly prompt tips</span>
                <Link href="/blog" className="btn-black-small" style={{textDecoration:'none'}}>Read the Blog <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="nav-actions">
          <button 
            onClick={handleToggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              background: 'var(--bg-light)',
              transition: 'var(--transition)',
              marginRight: '8px'
            }}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          {session ? (
            <div className="nav-item user-dropdown-container">
              <div className="avatar-btn" style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <div style={{
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: session.user?.avatar && !session.user.avatar.startsWith('linear-gradient') ? `url(${session.user.avatar}) center/cover no-repeat` : session.user?.avatar || 'var(--text-main)', 
                  color: session.user?.avatar ? '#fff' : 'var(--bg-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 'bold', 
                  fontSize: '1rem',
                  border: session.user?.avatar && !session.user.avatar.startsWith('linear-gradient') ? '1px solid var(--border-light)' : 'none'
                }}>
                  {(!session.user?.avatar || session.user.avatar.startsWith('linear-gradient')) && (session.user?.name ? session.user.name[0].toUpperCase() : session.user?.email?.[0].toUpperCase() || 'U')}
                </div>
              </div>
              <div className="mega-menu menu-user" style={{width: '200px', right: '0', left: 'auto', transform: 'none', top: '100%', marginTop: '5px'}}>
                <div className="menu-section">
                  <div style={{padding: '0 8px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px'}}>
                    <div style={{fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{session.user?.name || 'User'}</div>
                    <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{session.user?.email}</div>
                  </div>
                  <ul className="menu-list" style={{gap: '4px'}}>
                    <li>
                      <Link href="/profile" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', width: '100%', color: 'var(--text-main)', textDecoration: 'none'}}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Profile Settings
                      </Link>
                    </li>
                    {session.user?.role === 'ADMIN' && (
                      <li>
                        <Link href="/admin/library" style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', width: '100%', color: 'var(--text-main)', textDecoration: 'none'}}>
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                          Admin Dashboard
                        </Link>
                      </li>
                    )}
                    <li>
                      <button onClick={() => setIsSignOutModalOpen(true)} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', width: '100%', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 'inherit', fontFamily: 'inherit'}}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="sign-in">Sign in</Link>
              <Link href="/signup"><button className="btn-black">Get Started</button></Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Top Header (Non-sticky) */}
      <div className="mobile-top-header">
        <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
          <BrandLogo height={36} priority />
        </Link>
        
        <div className="mobile-top-actions">
          <button 
            onClick={handleToggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle Theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              background: 'var(--bg-light)',
              transition: 'var(--transition)',
              marginRight: '8px'
            }}
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          
          {session ? (
            <Link href="/profile" style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
              <div style={{
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: session.user?.avatar && !session.user.avatar.startsWith('linear-gradient') ? `url(${session.user.avatar}) center/cover no-repeat` : session.user?.avatar || 'var(--text-main)', 
                color: session.user?.avatar ? '#fff' : 'var(--bg-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '1rem',
                border: session.user?.avatar && !session.user.avatar.startsWith('linear-gradient') ? '1px solid var(--border-light)' : 'none'
              }}>
                {(!session.user?.avatar || session.user.avatar.startsWith('linear-gradient')) && (session.user?.name ? session.user.name[0].toUpperCase() : session.user?.email?.[0].toUpperCase() || 'U')}
              </div>
            </Link>
          ) : (
            <Link href="/login" className="sign-in" style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>Sign in</Link>
          )}

          <button className="mobile-menu-btn" aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Floating Navigation Pill */}
      <div className="mobile-bottom-pill">
        <Link href="/explore" className={`mobile-bottom-pill-btn ${pathname.startsWith('/explore') ? 'active' : ''}`} aria-label="Explore">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
          <span className="nav-label">Explore</span>
        </Link>
        <Link href="/collections" className={`mobile-bottom-pill-btn ${pathname.startsWith('/collections') ? 'active' : ''}`} aria-label="Collections">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="m12 2-10 5 10 5 10-5-10-5Z"/>
            <path d="m2 17 10 5 10-5"/>
            <path d="m2 12 10 5 10-5"/>
          </svg>
          <span className="nav-label">Collections</span>
        </Link>
        <Link href="/trending" className={`mobile-bottom-pill-btn ${pathname.startsWith('/trending') ? 'active' : ''}`} aria-label="Trending">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          <span className="nav-label">Trending</span>
        </Link>
        <Link href="/blog" className={`mobile-bottom-pill-btn ${pathname.startsWith('/blog') ? 'active' : ''}`} aria-label="Blog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="nav-icon">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="nav-label">Blog</span>
        </Link>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-header">
          <div className="logo">
            <BrandLogo height={36} />
          </div>
          <button className="close-mobile-btn" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="mobile-nav-links">
          <Link href="/explore" onClick={() => setIsMobileMenuOpen(false)}>Explore</Link>
          <Link href="/collections" onClick={() => setIsMobileMenuOpen(false)}>Collections</Link>
          <Link href="/trending" onClick={() => setIsMobileMenuOpen(false)}>Trending</Link>
          <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)}>Blog</Link>
        </div>
        <div className="mobile-nav-actions">
          <button 
            onClick={handleToggleTheme} 
            className="mobile-theme-toggle-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-light)',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'var(--transition)'
            }}
          >
            {theme === 'dark' ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span>Dark Mode</span>
              </>
            )}
          </button>
          {session ? (
            <>
              <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="sign-in" style={{textAlign: 'left'}}>Profile Settings</Link>
              {session.user?.role === 'ADMIN' && (
                <Link href="/admin/library" onClick={() => setIsMobileMenuOpen(false)} className="sign-in" style={{textAlign: 'left'}}>Admin Dashboard</Link>
              )}
              <button onClick={() => { setIsMobileMenuOpen(false); setIsSignOutModalOpen(true); }} className="sign-in" style={{textAlign: 'left', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit'}}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="sign-in">Sign in</Link>
              <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}><button className="btn-black" style={{ width: '100%' }}>Get Started</button></Link>
            </>
          )}
        </div>
      </div>

      <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} />

    </>
  );
}
