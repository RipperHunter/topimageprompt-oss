"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { isSafeHttpUrl } from '../../../lib/seo';

function getSourceLabel(value, index) {
  if (!isSafeHttpUrl(value)) return `Source ${index + 1}`;
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return `Source ${index + 1}`;
  }
}

function ShareButtons({ post, onCopyLink }) {
  const shareOnX = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Read "${post.title}" on topimageprompt`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareOnPinterest = () => {
    const url = encodeURIComponent(window.location.href);
    const media = encodeURIComponent(post.heroImage || '');
    const description = encodeURIComponent(post.title);
    window.open(`https://www.pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="blog-share-buttons">
      <button className="share-icon-btn" type="button" aria-label="Share on X" title="Share on X" onClick={shareOnX}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </button>
      <button className="share-icon-btn" type="button" aria-label="Share on Pinterest" title="Share on Pinterest" onClick={shareOnPinterest}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg>
      </button>
      <button className="share-icon-btn" type="button" aria-label="Copy article link" title="Copy article link" onClick={onCopyLink}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
    </div>
  );
}

function TableOfContents({ items, activeHeading }) {
  if (items.length === 0) return null;
  return (
    <nav className="blog-toc-links" aria-label="Article sections">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`${item.level === 3 ? 'is-subsection' : ''} ${activeHeading === item.id ? 'is-active' : ''}`.trim()}
          aria-current={activeHeading === item.id ? 'location' : undefined}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

export default function BlogDetailClient({ post }) {
  const { showToast } = useToast();
  const articleContentRef = useRef(null);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState('idle');
  const toc = useMemo(() => post.toc || [], [post.toc]);
  const [activeHeading, setActiveHeading] = useState(toc[0]?.id || '');
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const headings = toc.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (headings.length === 0) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible?.target?.id) setActiveHeading(visible.target.id);
    }, { rootMargin: '-18% 0px -72% 0px', threshold: 0 });

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [post.id, toc]);

  useEffect(() => {
    const updateProgress = () => {
      const article = articleContentRef.current;
      if (!article) return;
      const top = article.getBoundingClientRect().top + window.scrollY;
      const available = Math.max(article.offsetHeight - window.innerHeight + 160, 1);
      const progress = Math.min(1, Math.max(0, (window.scrollY - top + 120) / available));
      setReadingProgress(progress * 100);
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [post.id]);

  const handleCopySnippet = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSnippet(key);
      window.setTimeout(() => setCopiedSnippet(null), 1800);
    } catch {
      showToast('Could not copy this snippet.', 'error');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Article link copied.', 'success');
    } catch {
      showToast('Could not copy the article link.', 'error');
    }
  };

  const handleRichContentClick = async (event) => {
    const button = event.target.closest('[data-copy-code]');
    if (!button) return;
    const code = button.closest('.blog-code-shell')?.querySelector('code');
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = 'Copy code'; }, 1600);
    } catch {
      button.textContent = 'Copy failed';
      window.setTimeout(() => { button.textContent = 'Copy code'; }, 1600);
    }
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setSubStatus('error');
      return;
    }
    setSubStatus('submitting');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Subscription failed');
      setSubStatus('success');
      setEmail('');
      window.setTimeout(() => setSubStatus('idle'), 3000);
    } catch {
      setSubStatus('error');
    }
  };

  const authorName = post.author || 'topimageprompt Team';

  return (
    <>
      <div className="blog-reading-progress" aria-hidden="true"><span style={{ width: `${readingProgress}%` }} /></div>
      <article className="blog-detail-main">
        <nav className="blog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span className="sep">/</span>
          <Link href="/blog">Blog</Link><span className="sep">/</span>
          <span className="blog-crumb-cat">{post.category}</span><span className="sep">/</span>
          <span className="blog-crumb-current" aria-current="page">{post.title}</span>
        </nav>

        <header className="blog-detail-header">
          <div className="blog-header-eyebrow">
            <span className="blog-category-label">{post.category}</span>
            <span>Updated {post.date}</span>
          </div>
          <h1>{post.title}</h1>
          {post.metaDescription && <p className="blog-header-deck">{post.metaDescription}</p>}
          <div className="blog-author-row">
            <div className="blog-author-avatar" aria-hidden="true">{authorName.charAt(0).toUpperCase()}</div>
            <div className="blog-author-copy">
              {post.authorBioUrl ? (
                <a href={post.authorBioUrl} target="_blank" rel="noopener noreferrer" className="blog-author-name">{authorName}</a>
              ) : <span className="blog-author-name">{authorName}</span>}
              <span>{post.readTime} · Last reviewed {post.date}</span>
            </div>
          </div>
          {post.tags?.length > 0 && (
            <div className="blog-header-tags" aria-label="Article topics">
              {post.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
        </header>

        <div className="blog-reading-layout">
          <aside className="blog-toc" aria-label="Table of contents">
            <span className="blog-rail-label">On this page</span>
            <TableOfContents items={toc} activeHeading={activeHeading} />
          </aside>

          <details className="blog-mobile-toc">
            <summary>On this page <span>{toc.length} sections</span></summary>
            <TableOfContents items={toc} activeHeading={activeHeading} />
          </details>

          <div className="blog-article-column" ref={articleContentRef}>
            {post.heroImage && (
              <figure className="blog-hero-figure">
                <div className="blog-hero-img">
                  <Image src={post.heroImage} alt={post.coverImageAlt || post.title} fill priority sizes="(max-width: 900px) 100vw, 780px" />
                </div>
                {post.heroCaption && <figcaption className="blog-hero-caption">{post.heroCaption}</figcaption>}
              </figure>
            )}

            <div className="blog-body">
              {post.tldr && (
                <section className="blog-tldr" aria-labelledby="article-tldr">
                  <div className="blog-tldr-icon" aria-hidden="true">✓</div>
                  <div><h2 id="article-tldr">Key takeaways</h2><p>{post.tldr}</p></div>
                </section>
              )}

              {post.intro && <p className="blog-intro">{post.intro}</p>}

              {typeof post.sections === 'string' ? (
                <div onClick={handleRichContentClick} dangerouslySetInnerHTML={{ __html: post.renderedHtml || '' }} className="blog-rich-content" />
              ) : Array.isArray(post.sections) ? post.sections.map((section, index) => (
                <section key={`${section.heading || 'section'}-${index}`}>
                  {section.heading && <h2 id={section.id} className="blog-scroll-target">{section.heading}</h2>}
                  {section.content && <p>{section.content}</p>}
                  {section.codeSnippet && (
                    <div className="blog-code-block">
                      <div className="blog-code-header">
                        <span>CODE</span>
                        <button type="button" className="blog-copy-snippet" onClick={() => handleCopySnippet(section.codeSnippet, index)}>
                          {copiedSnippet === index ? 'Copied' : 'Copy snippet'}
                        </button>
                      </div>
                      <pre><code>{section.codeSnippet}</code></pre>
                    </div>
                  )}
                </section>
              )) : null}

              {post.quote && (
                <blockquote className="blog-pullquote"><p>“{post.quote.text}”</p><cite>— {post.quote.author}</cite></blockquote>
              )}

              {post.faq?.length > 0 && (
                <section className="blog-faq-section" aria-labelledby="blog-faq-heading">
                  <div className="blog-section-kicker">Quick answers</div>
                  <h2 id="blog-faq-heading">Frequently asked questions</h2>
                  <div className="faq-list">
                    {post.faq.map((item, index) => (
                      <details key={`${item.q}-${index}`}>
                        <summary>{item.q}<span aria-hidden="true">+</span></summary>
                        <div>{item.a}</div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {post.citations?.length > 0 && (
                <section className="blog-citations-section" aria-labelledby="blog-sources-heading">
                  <div className="blog-section-kicker">Research</div>
                  <h2 id="blog-sources-heading">Sources and further reading</h2>
                  <ol>
                    {post.citations.map((citation, index) => (
                      <li key={`${citation}-${index}`}>
                        {isSafeHttpUrl(citation) ? (
                          <a href={citation} target="_blank" rel="noopener noreferrer">
                            <span>{getSourceLabel(citation, index)}</span><small>{citation}</small>
                          </a>
                        ) : <span>{citation}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </div>

          <aside className="blog-share-rail" aria-label="Share article">
            <span className="blog-rail-label">Share</span>
            <ShareButtons post={post} onCopyLink={handleCopyLink} />
          </aside>
        </div>

        {post.relatedPrompts?.length > 0 && (
          <section className="blog-related" aria-labelledby="related-prompts-heading">
            <div className="blog-section-heading"><div><span>Continue creating</span><h2 id="related-prompts-heading">Try these related prompts</h2></div><Link href="/explore">Explore all prompts →</Link></div>
            <div className="blog-related-grid">
              {post.relatedPrompts.map((prompt) => (
                <Link href={`/prompt/${prompt.slug || prompt.id}`} key={prompt.id} className="blog-related-card">
                  <div className="blog-related-img"><Image src={prompt.imageUrl || '/images/placeholder.png'} alt={`${prompt.title} example`} fill loading="lazy" sizes="(max-width: 768px) 100vw, 360px" /></div>
                  <div className="blog-related-info"><div className="blog-related-meta"><span className="blog-related-cat">{prompt.engine}</span></div><h3>{prompt.title}</h3><p>{prompt.category} AI image prompt</p><span className="blog-read-more">View prompt →</span></div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="blog-newsletter" aria-label="Newsletter signup">
          <div className="blog-newsletter-left">
            <div className="blog-newsletter-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
            <div><strong>Get the next practical AI guide</strong><span>One useful workflow each week. No noise.</span></div>
          </div>
          <div className="blog-newsletter-right">
            <label className="sr-only" htmlFor="blog-newsletter-email">Email address</label>
            <input id="blog-newsletter-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={subStatus === 'submitting'} />
            <button className="blog-subscribe-btn" type="button" onClick={handleSubscribe} disabled={subStatus === 'submitting' || subStatus === 'success'}>{subStatus === 'submitting' ? 'Joining…' : subStatus === 'success' ? 'Subscribed' : 'Join free'}</button>
          </div>
          {subStatus === 'error' && <p className="blog-newsletter-error">Please enter a valid email and try again.</p>}
        </section>

        {post.relatedPosts?.length > 0 && (
          <section className="blog-related" aria-labelledby="keep-learning-heading">
            <div className="blog-section-heading"><div><span>More from the blog</span><h2 id="keep-learning-heading">Keep learning</h2></div><Link href="/blog">View all articles →</Link></div>
            <div className="blog-related-grid blog-post-grid">
              {post.relatedPosts.map((relatedPost) => (
                <Link href={`/blog/${relatedPost.slug}`} key={relatedPost.slug} className="blog-related-card">
                  <div className="blog-related-img"><Image src={relatedPost.image || '/images/placeholder.png'} alt={relatedPost.title || ''} fill quality={75} loading="lazy" sizes="(max-width: 768px) 100vw, 360px" /></div>
                  <div className="blog-related-info"><div className="blog-related-meta"><span className="blog-related-cat">{relatedPost.category}</span><span>·</span><span>{relatedPost.date}</span></div><h3>{relatedPost.title}</h3><p>{relatedPost.excerpt}</p><span className="blog-read-more">Read article →</span></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
