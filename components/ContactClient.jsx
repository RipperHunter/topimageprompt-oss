"use client";
import React, { useState } from 'react';
import Image from 'next/image';

export default function ContactClient() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <>
      <main className="container legal-page">
        <div className="legal-header">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you. Drop us a line.</p>
        </div>
        
        <div className="legal-content">
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px', margin: '0 auto'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{fontWeight: '600'}}>Your Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                style={{padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '1rem'}} 
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{fontWeight: '600'}}>Email Address</label>
              <input 
                type="email" 
                placeholder="john@example.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                style={{padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '1rem'}} 
              />
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
              <label style={{fontWeight: '600'}}>Message</label>
              <textarea 
                rows="5" 
                placeholder="How can we help?" 
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                style={{padding: '12px', border: '1px solid var(--border-light)', borderRadius: '8px', fontFamily: 'inherit', fontSize: '1rem', resize: 'vertical'}}
              ></textarea>
            </div>
            <button type="submit" disabled={status === 'submitting'} className="btn-black" style={{padding: '14px', borderRadius: '8px', fontSize: '1.05rem', marginTop: '10px'}}>
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
            {status === 'success' && <div style={{color: '#10B981', textAlign: 'center'}}>Message sent successfully!</div>}
            {status === 'error' && <div style={{color: '#EF4444', textAlign: 'center'}}>Failed to send message. Please try again.</div>}
          </form>
        </div>
      </main>

      {/* Toast Notification */}
      <div className="toast-notification">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Prompt copied - paste it into your generator</span>
        <svg className="toast-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
        </svg>
      </div>

      {/* Categories Modal */}
      <div className="modal-overlay" id="categoriesModal">
        <div className="modal-content">
          
          {/* Modal Header */}
          <div className="modal-header">
            <div className="header-left">
              <h2>All Categories</h2>
              <span className="badge-count">38 Styles</span>
            </div>
            <div className="header-center">
              <div className="modal-search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input type="text" placeholder="Search categories..." />
              </div>
            </div>
            <button className="close-modal-btn" id="closeCategoriesModal">
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
              <div className="sidebar-title">BROWSE BY TYPE</div>
              <ul className="sidebar-nav">
                <li className="active">
                  <Image src="/demo/portrait.svg" alt="Photography" width={24} height={24} />
                  <span>Photography</span>
                  <span className="count">8</span>
                </li>
                <li>
                  <Image src="/demo/portrait.svg" alt="3D" width={24} height={24} />
                  <span>3D & Render</span>
                  <span className="count">6</span>
                </li>
                <li>
                  <Image src="/demo/illustration.svg" alt="Illustration" width={24} height={24} />
                  <span>Illustration</span>
                  <span className="count">7</span>
                </li>
                <li>
                  <Image src="/demo/illustration.svg" alt="Digital Art" width={24} height={24} />
                  <span>Digital Art</span>
                  <span className="count">5</span>
                </li>
                <li>
                  <Image src="/demo/landscape.svg" alt="Architecture" width={24} height={24} />
                  <span>Architecture</span>
                  <span className="count">4</span>
                </li>
                <li>
                  <Image src="/demo/abstract.svg" alt="Abstract" width={24} height={24} />
                  <span>Abstract</span>
                  <span className="count">5</span>
                </li>
                <li>
                  <Image src="/demo/abstract.svg" alt="UI" width={24} height={24} />
                  <span>UI & Design</span>
                  <span className="count">3</span>
                </li>
              </ul>
              <button className="sidebar-all-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                All 38 Categories
              </button>
            </aside>

            {/* Main Grid */}
            <main className="modal-main">
              <div className="main-header">
                <h3>Photography</h3>
                <span className="sub-count">8 categories</span>
              </div>
              
              <div className="category-grid">
                {/* Grid Items */}
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/portrait.svg" alt="Photorealism" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Photorealism</h4>
                  <p>412 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/portrait.svg" alt="Portrait" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Portrait</h4>
                  <p>284 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/landscape.svg" alt="Aerial" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Aerial & Drone</h4>
                  <p>156 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/abstract.svg" alt="Macro" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Macro</h4>
                  <p>203 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/cyber.svg" alt="Street" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Street Photo</h4>
                  <p>178 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/monochrome.svg" alt="Product" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Product Shot</h4>
                  <p>321 prompts</p>
                </div>
                <div className="grid-item hovered">
                  <div className="img-container">
                    <Image src="/demo/landscape.svg" alt="Landscape" width={180} height={120} style={{objectFit: 'cover'}} />
                    <button className="browse-btn" type="button">Browse <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>
                  </div>
                  <h4>Landscape</h4>
                  <p>267 prompts</p>
                </div>
                <div className="grid-item">
                  <div className="img-container">
                    <Image src="/demo/fantasy.svg" alt="Underwater" width={180} height={120} style={{objectFit: 'cover'}} />
                  </div>
                  <h4>Underwater</h4>
                  <p>89 prompts</p>
                </div>
              </div>
            </main>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <div className="footer-left">
              <span className="browsing-text">Browsing: <strong>Photography</strong></span>
            </div>
            <div className="footer-center">
              <span className="breadcrumbs">All Categories &gt; Photography</span>
            </div>
            <div className="footer-right">
              <button className="btn-clear" type="button">Clear</button>
              <button className="btn-black" type="button">Apply Filter</button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
