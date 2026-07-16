"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import SignOutModal from '@/components/SignOutModal';
import './admin-analytics.css';
import BrandLogo from '@/components/BrandLogo';

export default function AdminAnalytics() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ totalCopies: 0, topPrompts: [] });
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [daysFilter, setDaysFilter] = useState(30);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${daysFilter}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [daysFilter]);

  const handleExportCSV = () => {
    const rows = [
      ['Rank', 'Prompt Title', 'Engine', 'Category', 'Copies'],
      ...(stats.topPrompts || []).map((p, i) => [
        i + 1,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.engine || '',
        p.category || '',
        p.copies || 0
      ])
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topimageprompt-analytics-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  return (
    <>
      <aside className="admin-sidebar">
        <div className="admin-logo"><BrandLogo height={30} /></div>

        <div className="admin-nav-section">
          <div className="admin-nav-label">WORKSPACE</div>
          <ul className="admin-nav-menu">
            <Link href="/admin/library" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                Library
              </li>
            </Link>
            <Link href="/admin/collections" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                Collections
              </li>
            </Link>
            <Link href="/admin/categories" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                Categories
              </li>
            </Link>
            <Link href="/admin/blog" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Blog Posts
              </li>
            </Link>
            <Link href="/admin/users" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Users
              </li>
            </Link>
            <Link href="/admin/messages" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Messages
              </li>
            </Link>
            <Link href="/admin/settings" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Settings
              </li>
            </Link>
            <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item active">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                Analytics
              </li>
            </Link>
          </ul>
        </div>

        <div className="admin-nav-section">
          <div className="admin-nav-label">QUICK ACTIONS</div>
          <ul className="admin-nav-menu">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                View Site
              </li>
            </Link>
            <li className="admin-nav-item" style={{cursor:'pointer'}} onClick={() => setIsSignOutModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </li>
          </ul>
        </div>

        <div className="admin-user-profile">
          <div className="user-info-left">
            <div className="user-avatar">{session?.user?.name?.[0] || 'A'}</div>
            <div className="user-details">
              <span className="user-name">{session?.user?.name || 'Admin'}</span>
              <span className="user-email">{session?.user?.email || ''}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Analytics & Performance</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Track prompt copies, traffic sources, and user engagement.</p>
          </div>
          <div className="header-right">
            <div className="analytics-header-actions">
              <div style={{position: 'relative'}}>
                <button className="btn-dropdown" onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Last {daysFilter} Days
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                {isFilterDropdownOpen && (
                  <div style={{position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10, minWidth: '150px'}}>
                    {[7, 14, 30, 90].map(d => (
                      <button key={d} onClick={() => { setDaysFilter(d); setIsFilterDropdownOpen(false); }} style={{background: 'none', border: 'none', color: 'var(--admin-text)', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between'}}>
                        Last {d} Days
                        {daysFilter === d && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="admin-btn-primary" onClick={() => setIsExportModalOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export CSV
              </button>
            </div>
          </div>
        </header>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-card-title">Total Copies</span>
            <span className="stat-card-value">{(stats.totalCopies > 1000 ? (stats.totalCopies/1000).toFixed(1) + 'K' : stats.totalCopies) || '0'}</span>
            <div className="stat-trend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              All-time from database
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Pinterest Referrals</span>
            <span className="stat-card-value">N/A</span>
            <div className="stat-trend" style={{color: 'var(--admin-text-muted)'}}>
              Requires Pinterest Analytics API
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Top Prompts</span>
            <span className="stat-card-value">{stats.topPrompts?.length || 0}</span>
            <div className="stat-trend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              Tracked from copy events
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">Prompt Copies Over Time (Last {daysFilter} Days)</div>
          <div className="chart-area-mock" style={{height: '250px'}}>
            {stats.timeSeries && stats.timeSeries.length > 0 ? (
              <div style={{display: 'flex', height: '100%', alignItems: 'flex-end', gap: '10px', paddingTop: '20px'}}>
                  {stats.timeSeries.map((ts, idx) => (
                      <div key={idx} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                          <div style={{
                              width: '100%',
                              backgroundColor: 'var(--admin-primary)',
                              height: `${Math.max((ts.copies / Math.max(...stats.timeSeries.map(t=>t.copies), 1)) * 180, 5)}px`,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.3s ease'
                          }}></div>
                          <span style={{fontSize: '11px', marginTop: '8px', color: 'var(--admin-text-muted)'}}>{ts.date}</span>
                      </div>
                  ))}
              </div>
            ) : (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--admin-text-muted)'}}>Not enough data to display chart.</div>
            )}
          </div>
        </div>

        <div className="analytics-split">
          {/* Top Prompts */}
          <div className="analytics-half-card">
            <div className="half-card-header">
              <h3>Top Prompts</h3>
              <a href="#" className="view-all-link">View All</a>
            </div>
            <div className="top-prompts-list">
              {stats.topPrompts?.map(prompt => (
                <div className="top-prompt-item" key={prompt.id}>
                  <div className="tp-info">
                    <Image src={prompt.imageUrl} className="tp-img" alt={`${prompt.title} thumbnail`} width={48} height={48} loading="lazy" quality={75} />
                    <span className="tp-title">{prompt.title}</span>
                  </div>
                  <div className="tp-value">{prompt.copies > 1000 ? (prompt.copies/1000).toFixed(1) + 'K' : prompt.copies}</div>
                </div>
              ))}
              {!stats.topPrompts?.length && <div style={{color: 'var(--admin-text-muted)'}}>No prompts found.</div>}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="analytics-half-card">
            <div className="half-card-header">
              <h3>Recent Traffic Sources</h3>
            </div>
            <div className="traffic-list">
              
              {stats.trafficSources && stats.trafficSources.length > 0 ? stats.trafficSources.map((source, idx) => {
                  const totalVisits = stats.trafficSources.reduce((sum, s) => sum + s.visits, 0);
                  const pct = Math.round((source.visits / totalVisits) * 100);
                  
                  return (
                    <div className="traffic-item" key={idx}>
                      <div className="traffic-icon" style={{background: '#111', color: '#fff'}}>
                        <span style={{fontSize:'10px', fontWeight:'bold'}}>{source.source.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="traffic-details">
                        <div className="traffic-header">
                          <span className="traffic-name">{source.source}</span>
                          <div className="traffic-stats">
                            <span className="traffic-pct">{pct}%</span>
                            <span className="traffic-raw">{source.visits} visits</span>
                          </div>
                        </div>
                        <div className="traffic-bar-bg">
                          <div className="traffic-bar-fill" style={{width: `${pct}%`, background: 'var(--admin-primary)'}}></div>
                        </div>
                      </div>
                    </div>
                  );
              }) : (
                <div style={{color: 'var(--admin-text-muted)'}}>No traffic data available.</div>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* Export Report Modal */}
      <div className={`modal-overlay ${isExportModalOpen ? 'active' : ''}`} onClick={e => e.target === e.currentTarget && setIsExportModalOpen(false)}>
        <div className="modal-content modal-export">
          
          <div className="modal-header">
            <h2>Export Analytics Report</h2>
            <button className="modal-close" onClick={() => setIsExportModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="modal-body" style={{flexDirection: 'column', gap: '24px'}}>
            
            <div className="export-row">
              <span className="export-label">Date Range</span>
              <span className="export-date-pill">{new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {month:'short', day:'numeric'})} – {new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
            </div>

            <div>
              <span className="export-label" style={{display: 'block', marginBottom: '12px'}}>File Format</span>
              <div className="export-format-control">
                <button className="export-format-btn active">CSV (Spreadsheet)</button>
                <button className="export-format-btn">PDF (Visual Report)</button>
              </div>
            </div>

            <div>
              <span className="export-label" style={{display: 'block', marginBottom: '12px'}}>Include in Report</span>
              <div className="checkbox-list">
                <label className="checkbox-item">
                  <input type="checkbox" className="custom-checkbox" defaultChecked />
                  <span>Copy Performance Trends</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" className="custom-checkbox" defaultChecked />
                  <span>Top Performing Prompts</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" className="custom-checkbox" defaultChecked />
                  <span>Traffic Sources & Referrals</span>
                </label>
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
            <button className="btn-publish" onClick={handleExportCSV}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download CSV
            </button>
          </div>

        </div>
        <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
    </div>
    </>
  );
}
