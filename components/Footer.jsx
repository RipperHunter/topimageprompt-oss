"use client";
import Link from "next/link";
import { useState } from "react";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState(''); // '' | 'loading' | 'success' | 'error'

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubStatus('success');
        setEmail('');
      } else {
        setSubStatus('error');
      }
    } catch {
      setSubStatus('error');
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
          <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          {/* Column 1: Brand & Social */}
          <div className="footer-brand">
            <Link href="/" className="logo" style={{marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', textDecoration: 'none'}}>
              <BrandLogo height={52} />
            </Link>
            <p className="footer-desc">
              The world's cleanest AI prompt library. Browse, discover, and copy prompts for your favorite image generator.
            </p>
            <div className="social-links">
              {/* Pinterest */}
              <a href="https://pinterest.com/topimageprompt" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Follow on Pinterest">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#E60023"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.168 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.592 0 12.017 0z"/></svg>
              </a>
              {/* X/Twitter */}
              <a href="https://x.com/topimageprompt" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Follow on X (Twitter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* Instagram */}
              <a href="https://instagram.com/topimageprompt" target="_blank" rel="noopener noreferrer" className="social-btn" aria-label="Follow on Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className="footer-col">
            <h4>Explore</h4>
            <ul className="footer-nav">
              <li><Link href="/explore">All Prompts</Link></li>
              <li><Link href="/prompts">Models &amp; Styles</Link></li>
              <li><Link href="/trending">Trending</Link></li>
              <li><Link href="/explore?sort=newest">New Arrivals</Link></li>
              <li><Link href="/collections">Collections</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/sitemap-html">Site Map</Link></li>
            </ul>
          </div>

          {/* Column 3: Categories */}
          <div className="footer-col">
            <h4>Categories</h4>
            <ul className="footer-nav">
              <li><Link href="/explore?style=Photorealistic">Photorealism</Link></li>
              <li><Link href="/explore?style=Cyberpunk">Cyberpunk</Link></li>
              <li><Link href="/explore?style=3D Render">3D Render</Link></li>
              <li><Link href="/explore?style=Anime">Anime</Link></li>
              <li><Link href="/explore?style=Dark Fantasy">Dark Fantasy</Link></li>
              <li style={{marginTop: '12px'}}><Link href="/explore" className="highlight-link">All Categories <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link></li>
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div className="footer-col">
            <h4>Stay Updated</h4>
            <p className="newsletter-desc">Get weekly prompt drops and style guides in your inbox.</p>
            {subStatus === 'success' ? (
              <p style={{ color: '#10B981', fontWeight: 600, fontSize: '0.9rem', marginTop: '8px' }}>
                ✓ You're subscribed! Check your inbox soon.
              </p>
            ) : (
              <form className="newsletter-form" onSubmit={handleNewsletter}>
                <input
                  type="email"
                  placeholder="Your email"
                  className="newsletter-input"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={subStatus === 'loading'}
                />
                <button type="submit" className="newsletter-btn" disabled={subStatus === 'loading'}>
                  {subStatus === 'loading' ? '...' : 'Notify me'}
                </button>
              </form>
            )}
            {subStatus === 'error' && (
              <p style={{ color: '#EF4444', fontSize: '0.85rem', marginTop: '6px' }}>
                Something went wrong. Please try again.
              </p>
            )}
            <p className="newsletter-spam">No spam. Just new prompt alerts.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="copyright">
            &copy; {currentYear} topimageprompt. All rights reserved.
          </div>
          <div className="footer-legal">
            <Link href="/about">About</Link>
            <div className="legal-divider"></div>
            <Link href="/privacy">Privacy Policy</Link>
            <div className="legal-divider"></div>
            <Link href="/terms">Terms of Use</Link>
            <div className="legal-divider"></div>
            <Link href="/contact">Contact</Link>
            <div className="legal-divider"></div>
            <Link href="/sitemap-html">Site Map</Link>
          </div>

        </div>
      </div>
    </footer>

    </>
  );
}
