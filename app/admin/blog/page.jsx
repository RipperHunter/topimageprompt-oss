"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import SignOutModal from '@/components/SignOutModal';
import './admin-blog.css';
import BrandLogo from '@/components/BrandLogo';
import BlogJsonImportModal from '@/components/admin/BlogJsonImportModal';

export default function AdminBlogPage() {
  const { data: session } = useSession();
  const [blogs, setBlogs] = useState([]);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);

  const loadBlogs = useCallback(async () => {
    // Use /api/blogs (admin route) to see ALL posts including drafts
    try {
      const response = await fetch('/api/blogs', { cache: 'no-store' });
      const data = await response.json();
      setBlogs(data.posts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBlogs(); }, [loadBlogs]);

  const filtered = blogs.filter(b =>
    !search ||
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(search.toLowerCase())
  );
  
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
              <li className="admin-nav-item active">
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
              <li className="admin-nav-item">
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
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Blog & Resources</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Manage your tutorials, masterclasses, and site updates.</p>
          </div>
          <div className="header-right">
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button type="button" className="admin-btn-secondary blog-json-open" onClick={() => setIsJsonImportOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 13-2 2 2 2"/><path d="m15 13 2 2-2 2"/></svg>
              Import JSON
            </button>
            <Link href="/admin/blog/editor" className="admin-btn-primary" style={{ textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              Create New Post
            </Link>
          </div>
        </header>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-card-title">Total Articles</span>
            <span className="stat-card-value">{blogs.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Pending Drafts</span>
            <span className="stat-card-value">{blogs.filter(b => !b.published).length}</span>
            <span className="stat-card-title text-orange" style={{ marginTop: '8px', marginBottom: 0 }}>Needs review</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Total Blog Views</span>
            <span className="stat-card-value">{blogs.reduce((sum, b) => sum + (b.views || 0), 0)}</span>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" className="custom-checkbox" /></th>
                <th style={{ width: '140px' }}>THUMBNAIL</th>
                <th>ARTICLE TITLE</th>
                <th>CATEGORY</th>
                <th>VIEWS</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No blog posts found.</td></tr>
              ) : filtered.map((b, i) => (
                <tr key={b.id} style={i === 0 ? { background: '#F9FAFB' } : {}}>
                  <td><input type="checkbox" className="custom-checkbox" /></td>
                  <td className="td-blog-thumbnail">
                    {b.heroImage ? <Image src={b.heroImage} alt={`${b.title} thumbnail`} width={80} height={56} loading="lazy" style={{ objectFit: 'cover' }} /> : <div style={{width:'80px', height:'56px', background:'#eee', borderRadius:'6px'}}></div>}
                  </td>
                  <td className="td-article-title">
                    <div className="a-title">{b.title}</div>
                    <div className="a-desc">{b.slug}</div>
                  </td>
                  <td><span className="badge-gray">{b.category}</span></td>
                  <td style={{color: 'var(--admin-text-muted)', fontSize: '0.85rem'}}>{b.views || 0}</td>
                  <td><span className={`status-indicator ${b.published ? 'published' : 'draft'}`}>{b.published ? 'Published' : 'Draft'}</span></td>
                  <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="td-actions" style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link href={`/admin/blog/editor?id=${b.id}`} className="action-btn" aria-label="Edit" style={{ opacity: 1, pointerEvents: 'auto' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </Link>
                    <button className="action-btn" aria-label="Delete" style={{ opacity: 1, pointerEvents: 'auto', color: '#ef4444' }} onClick={async () => {
                      if (confirm('Are you sure you want to delete this blog post?')) {
                        const res = await fetch(`/api/blog/${b.id}`, { method: 'DELETE' });
                        if (res.ok) {
                          setBlogs(blogs.filter(blog => blog.id !== b.id));
                        } else {
                          alert('Failed to delete blog post.');
                        }
                      }
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-pagination">
            <div className="pagination-info">Showing {filtered.length} of {blogs.length} articles</div>
          </div>
          <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
    </div>
      </main>
      <BlogJsonImportModal isOpen={isJsonImportOpen} onClose={() => setIsJsonImportOpen(false)} onImported={loadBlogs} />
    </>
  );
}
