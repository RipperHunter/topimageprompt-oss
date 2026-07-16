"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';

export default function PromptDetailClient({ prompt, related }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // Parse tags from JSON string
  let tags = [];
  try {
    tags = typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : (prompt.tags || []);
    if (!Array.isArray(tags)) tags = [];
  } catch { tags = []; }

  useEffect(() => {
    // Fetch initial saved state client-side
    fetch(`/api/saves/${prompt.id}`)
      .then(r => r.json())
      .then(data => setSaved(data.saved))
      .catch(() => {});
  }, [prompt.id]);

  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.promptText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    // Track analytics copy event
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'copy_prompt', promptId: prompt.id, source: 'PromptDetail' })
    }).catch(() => {});
  };

  const handleCopyPrompt = (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(p.promptText).catch(() => {});
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2500);
    
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'copy_prompt', promptId: p.id, source: 'Related' })
    }).catch(() => {});
  };

  const handlePinterestShare = () => {
    const url = encodeURIComponent(window.location.href);
    const media = encodeURIComponent(prompt.imageUrl);
    const description = encodeURIComponent(`Check out the prompt "${prompt.title}" on topimageprompt!`);
    window.open(`https://www.pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`, '_blank');
  };

  const handleTwitterShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out the prompt "${prompt.title}" on topimageprompt!`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleSave = async () => {
    const previousState = saved;
    setSaved(!saved); // optimistic update

    try {
      const response = await fetch('/api/prompts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id })
      });
      const data = await response.json();
      if (response.ok) {
        setSaved(data.saved);
      } else {
        setSaved(previousState);
        if (response.status === 401) {
          showToast('Please sign in to save prompts.', 'info');
        }
      }
    } catch (e) {
      setSaved(previousState);
    }
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

  const handleDownload = () => {
    handleDownloadImage(prompt.originalImageUrl || prompt.imageUrl, prompt.title);
  };

  return (
    <>
      {/* Prompt Header / Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </Link>
        <span className="separator">/</span>
        <Link href="/explore">Explore</Link>
        <span className="separator">/</span>
        <Link href={`/explore?category=${prompt.category}`}>{prompt.category}</Link>
        <span className="separator">/</span>
        <span className="current">{prompt.title}</span>
      </nav>
      <header className="prompt-header" style={{ borderTop: 'none', paddingTop: 0 }}>
        <div></div>
        <Link href="/explore" className="back-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Explore
        </Link>
      </header>

      {/* Main Prompt Layout */}
      <main className="prompt-main">
        <div className="prompt-layout">

          {/* LEFT: Image */}
          <div>
            <div className="main-image-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
              <Image 
                src={prompt.imageUrl} 
                alt={prompt.title} 
                width={800} 
                height={800} 
                style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                priority={true}
                loading="eager"
              />
              <button className="expand-btn" title="Expand image" onClick={() => setIsLightboxOpen(true)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
              <button className="pinterest-save-btn" onClick={handlePinterestShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                Save to Pinterest
              </button>
            </div>
            <div className="image-meta">
              <span>{prompt.aspectRatio} aspect ratio</span>
              <span className="dot">·</span>
              <span>{prompt.engine}</span>
              <span className="dot">·</span>
              <span>{prompt.copies} copies</span>
            </div>
          </div>

          {/* RIGHT: Info & Copy */}
          <div>
            <span className="uppercase-label">{prompt.category} Prompt</span>
            <h1 className="prompt-title">{prompt.title}</h1>

            <div className="prompt-tags-row">
              <span className="tag">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                {prompt.engine}
              </span>
              <span className="tag">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                {prompt.aspectRatio}
              </span>
              <span className="tag">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {prompt.category}
              </span>
            </div>

            <div className="prompt-text-box">
              <span className="editable-badge">Editable</span>
              <p>{prompt.promptText}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <button
                className="copy-prompt-btn"
                onClick={handleCopy}
                style={copied ? { background: '#10B981', marginBottom: 0, flex: 1 } : { marginBottom: 0, flex: 1 }}
              >
                {copied ? (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Prompt Copied!
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Full Prompt
                  </>
                )}
              </button>

              <button
                className="download-prompt-btn"
                onClick={handleDownload}
                style={{ 
                  background: 'var(--bg-light)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-light)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '12px', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  fontSize: '1.1rem', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  transition: 'var(--transition)', 
                  flex: 1 
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download Wallpaper
              </button>
            </div>

            <p className="copied-count">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {prompt.copies} people have copied this prompt
            </p>

            <div className="share-actions">
              <span className="share-label">Share:</span>
              <button className="share-btn pinterest" title="Share on Pinterest" onClick={handlePinterestShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
              </button>
              <button className="share-btn" title="Share on Twitter" onClick={handleTwitterShare}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button className="share-btn" title="Copy link" onClick={handleCopyLink}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
            </div>

            <button
              className="save-collection-btn"
              onClick={handleSave}
              style={saved ? { background: '#f0fdf4', borderColor: '#10B981', color: '#10B981' } : {}}
            >
              {saved ? (
                <>
                  <svg width="20" height="20" fill="#10B981" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Saved to Collection!
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Save to Collection
                </>
              )}
            </button>

            {/* SEO Tags — hidden until toggled */}
            {tags.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => setShowTags(v => !v)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'none', border: '1px solid var(--border-light)',
                    borderRadius: '20px', padding: '6px 14px', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)',
                    transition: 'var(--transition)'
                  }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  {showTags ? 'Hide Tags' : `Show Tags (${tags.length})`}
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: showTags ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                {showTags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {tags.map((tag, i) => (
                      <Link
                        key={i}
                        href={`/explore?q=${encodeURIComponent(tag)}`}
                        style={{
                          display: 'inline-block',
                          background: 'var(--bg-light)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '20px',
                          padding: '4px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          textDecoration: 'none',
                          transition: 'var(--transition)'
                        }}
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Stats Strip */}
      <section className="prompt-strip">
        <div className="strip-grid">
          <div className="strip-item">
            <span className="strip-label">AI Engine</span>
            <span className="strip-value">{prompt.engine}</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <span className="strip-label">Category</span>
            <span className="strip-value">
              {prompt.category}
            </span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <span className="strip-label">Aspect Ratio</span>
            <span className="strip-value">{prompt.aspectRatio}</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <span className="strip-label">Total Copies</span>
            <span className="strip-value">{prompt.copies}</span>
          </div>
          <div className="strip-divider" />
          <div className="strip-item">
            <span className="strip-label">Added by</span>
            <span className="strip-value">
              <div className="author-avatar">A</div>
              Admin
            </span>
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="how-to-use">
        <div className="how-to-header">
          <h2>How to use this prompt</h2>
          <p>Three simple steps to generate your AI image.</p>
        </div>
        <div className="steps-container">
          <div className="step-card active">
            <div className="step-number">1</div>
            <div className="step-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </div>
            <h3>Copy the Prompt</h3>
            <p>Click the "Copy Full Prompt" button above to copy the entire prompt text to your clipboard instantly.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>Paste into your generator</h3>
            <p>Open your preferred image generator and paste the prompt into the text input. You&apos;re ready to create.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <h3>Generate &amp; Customize</h3>
            <p>Hit generate and watch the magic happen. Tweak the prompt parameters to make it your own.</p>
          </div>
        </div>
      </section>

      {/* More Like This */}
      {related.length > 0 && (
        <section className="more-like-this">
          <div className="more-header">
            <div className="more-title-group">
              <h2>More like this</h2>
              <span className="category-badge">{prompt.category}</span>
            </div>
            <Link href={`/explore?category=${prompt.category}`} className="view-all">
              View all {prompt.category} prompts →
            </Link>
          </div>
          <div className="more-grid">
            {related.map(p => (
              <Link 
                href={`/prompt/${p.slug || p.id}`}
                key={p.id} 
                className="explore-masonry-card" 
                style={{ textDecoration: 'none' }}
              >
                <Image 
                  src={p.imageUrl || '/images/placeholder.png'} 
                  alt={p.title || ''} 
                  width={400}
                  height={300}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                
                {/* Mobile Direct Copy Button */}
                <button 
                  className="mobile-card-copy-btn"
                  onClick={(e) => handleCopyPrompt(e, p)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>{copiedId === p.id ? "Copied" : "Copy"}</span>
                </button>
                
                {/* Card Hover Action Overlay */}
                <div className="card-hover-overlay">
                  {/* Top-Left Download Action */}
                  <button 
                    className="card-action-icon" 
                    title="Download Wallpaper"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDownloadImage(p.originalImageUrl || p.imageUrl, p.title);
                    }}
                    style={{ left: '16px', right: 'auto' }}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </button>

                  {/* Top-Right Arrow Action */}
                  <div className="card-action-icon" title="View details">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                  </div>

                  {/* Centered Copy Button */}
                  <div className="card-hover-center">
                    <button 
                      className="copy-prompt-btn"
                      onClick={(e) => handleCopyPrompt(e, p)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>{copiedId === p.id ? "Copied!" : "Copy Prompt"}</span>
                    </button>
                  </div>

                  {/* Bottom Details (Title and Tags) */}
                  <div className="card-hover-details">
                    <h4 className="card-hover-title">{p.title}</h4>
                    <div className="card-hover-tags">
                      {p.engine && <span className="card-hover-tag">{p.engine}</span>}
                      {p.category && <span className="card-hover-tag">#{p.category}</span>}
                      {p.aspectRatio && <span className="card-hover-tag">{p.aspectRatio}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Copy Toast */}
      {copied && (
        <div className="toast-notification active">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Prompt copied - paste it into your generator</span>
        </div>
      )}

      {/* Link Copied Toast */}
      {linkCopied && (
        <div className="toast-notification active">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Link copied to clipboard!</span>
        </div>
      )}

      {/* Lightbox Overlay */}
      {isLightboxOpen && (
        <div 
          className="lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(8px)',
            cursor: 'zoom-out'
          }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              transition: 'var(--transition)',
              zIndex: 10000
            }}
          >
            &times;
          </button>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src={prompt.imageUrl} 
              alt={prompt.title} 
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
