"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SignOutModal from '@/components/SignOutModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import BrandLogo from '@/components/BrandLogo';

export default function AdminCollectionsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [collections, setCollections] = useState([]);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [allPrompts, setAllPrompts] = useState([]);
  const [promptSearch, setPromptSearch] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState([]);

  // Fetch collections and prompts
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      setCollections(data.collections || []);
      
      const promptsRes = await fetch('/api/prompts?limit=500');
      const promptsData = await promptsRes.json();
      setAllPrompts(promptsData.prompts || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchCollections(); }, []);

  const filtered = collections.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleEdit = (collection) => {
    setEditingId(collection.id);
    setFormTitle(collection.title);
    setFormDescription(collection.description || '');
    setIsPublic(collection.isPublic);
    setIsFeatured(collection.featured);
    setSelectedPrompts((collection.saves || []).map(save => save.prompt).filter(Boolean));
    setPromptSearch('');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDescription('');
    setIsPublic(true);
    setIsFeatured(false);
    setSelectedPrompts([]);
    setPromptSearch('');
  };

  const handleSaveCollection = async () => {
    if (!formTitle) {
      showToast('Title is required', 'error');
      return;
    }
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/collections/${editingId}` : '/api/collections';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          curator: 'topimageprompt Team',
          isPublic,
          featured: isFeatured,
          promptIds: selectedPrompts.map(prompt => prompt.id),
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchCollections();
        showToast(editingId ? 'Collection updated successfully' : 'Collection created successfully', 'success');
        router.refresh();
      } else {
        showToast('Failed to save collection', 'error');
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const derivedSlug = formTitle ? formTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';

  const searchedPrompts = allPrompts.filter(p => p.title.toLowerCase().includes(promptSearch.toLowerCase()) && !selectedPrompts.find(sp => sp.id === p.id)).slice(0, 10);
  
  const addPromptToCollection = (prompt) => {
    setSelectedPrompts(prev => [...prev, prompt]);
    setPromptSearch('');
  };

  const removePromptFromCollection = (id) => {
    setSelectedPrompts(prev => prev.filter(p => p.id !== id));
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete this collection?',
      description: 'All prompt assignments will be removed. The prompts themselves won\'t be deleted.',
      variant: 'danger',
      onConfirm: async () => {
        await fetch(`/api/collections/${id}`, { method: 'DELETE' });
        fetchCollections();
        showToast('Collection deleted successfully', 'success');
        router.refresh();
      },
    });
  };

  const handleDeleteSelected = () => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selected.length} collection${selected.length > 1 ? 's' : ''}?`,
      description: 'All prompt assignments will be removed from these collections.',
      variant: 'danger',
      onConfirm: async () => {
        await Promise.all(selected.map(id => fetch(`/api/collections/${id}`, { method: 'DELETE' })));
        setSelected([]);
        fetchCollections();
        showToast(`${selected.length} collection${selected.length > 1 ? 's' : ''} deleted`, 'success');
        router.refresh();
      },
    });
  };

  const toggleFeatured = async (id, currentFeatured) => {
    await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: !currentFeatured }),
    });
    fetchCollections();
    router.refresh();
  };

  const featuredCount = collections.filter(c => c.featured).length;
  const totalPrompts = collections.reduce((sum, c) => sum + (c.promptCount || 0), 0);

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
              <li className="admin-nav-item active">
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

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Collections</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Curate and manage thematic prompt bundles.</p>
          </div>
          <div className="header-right">
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search collections..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>⌘K</div>
            </div>
            {selected.length > 0 && (
              <button className="btn-cancel" onClick={handleDeleteSelected} style={{color:'#DC2626', borderColor:'#DC2626'}}>
                Delete {selected.length} Selected
              </button>
            )}
            <button className="admin-btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Collection
            </button>
          </div>
        </header>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-card-title">Total Collections</span>
            <span className="stat-card-value">{collections.length}</span>
            <span className="stat-card-title" style={{marginTop: '8px', marginBottom: '0', color: '#10B981'}}>+2 this month</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Featured on Home</span>
            <span className="stat-card-value">{featuredCount}</span>
            <span className="stat-card-title" style={{marginTop: '8px', marginBottom: '0'}}>Maximum limit 6</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Total Prompts Curated</span>
            <span className="stat-card-value">{totalPrompts}</span>
            <span className="stat-card-title" style={{marginTop: '8px', marginBottom: '0'}}>Across all collections</span>
          </div>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading collections...</div>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="custom-checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(c => c.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                <th style={{ width: '120px' }}>COVER</th>
                <th>COLLECTION NAME</th>
                <th>PROMPTS</th>
                <th>FEATURED</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)'}}>
                    No collections found. Click "New Collection" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map(collection => {
                  let images = [];
                  try {
                    images = JSON.parse(collection.heroImages);
                  } catch(e) {}
                  
                  return (
                  <tr key={collection.id} className={selected.includes(collection.id) ? 'selected' : ''}>
                    <td>
                      <input type="checkbox" className="custom-checkbox" checked={selected.includes(collection.id)} onChange={() => toggleSelect(collection.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', height: '40px', position: 'relative', width: '80px' }}>
                        {images.length > 0 ? (
                          images.slice(0, 3).map((img, idx) => (
                            <Image key={idx} src={img} alt={`${collection.title} preview ${idx + 1}`} width={40} height={40} loading="lazy" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #fff', position: 'absolute', left: `${idx * 16}px`, zIndex: 3 - idx, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                          ))
                        ) : (
                          <div style={{ width: '40px', height: '40px', background: '#E5E7EB', borderRadius: '6px', border: '2px solid #fff' }}></div>
                        )}
                      </div>
                    </td>
                    <td className="td-cat-name">
                      <div className="c-title" style={{fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '4px'}}>{collection.title}</div>
                      <div className="c-slug" style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>{collection.description?.substring(0, 40) || collection.slug}</div>
                    </td>
                    <td>{collection.promptCount}</td>
                    <td>
                      <button onClick={() => toggleFeatured(collection.id, collection.featured)} style={{ color: collection.featured ? '#FBBF24' : '#D1D5DB', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill={collection.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      </button>
                    </td>
                    <td>
                      <span className={`status-indicator ${collection.isPublic ? 'published' : 'draft'}`}>
                        {collection.isPublic ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>{new Date(collection.createdAt).toLocaleDateString()}</td>
                    <td className="td-actions">
                      <button className="action-btn" aria-label="Edit" onClick={() => handleEdit(collection)} style={{color:'#6B7280'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="action-btn" aria-label="Delete" onClick={() => handleDelete(collection.id)} style={{color:'#DC2626'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
          )}

          <div className="table-pagination">
            <div className="pagination-info">Showing {filtered.length} of {collections.length} collections</div>
            <div className="pagination-controls">
              <button className="page-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <button className="page-btn">...</button>
              <button className="page-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Collection Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
        <div className="modal-content" style={{maxWidth: '850px', width: '90%'}}>
          <div className="modal-header">
            <h2>{editingId ? 'Edit Collection' : 'Create New Collection'}</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="modal-body" style={{flexDirection: 'row', gap: '40px', padding: '32px'}}>
            
            {/* Left Column: Image & Prompts */}
            <div style={{flex: '1', display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <div className="form-group">
                <label className="form-label">Select Prompts</label>
                <div className="admin-search" style={{width: '100%'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:'16px', height:'16px', left:'12px'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" placeholder="Search by title or tag..." value={promptSearch} onChange={e => setPromptSearch(e.target.value)} style={{paddingLeft: '36px'}} />
                </div>
                
                {/* Search Results Dropdown (Simulated) */}
                {promptSearch && searchedPrompts.length > 0 && (
                  <div style={{border: '1px solid var(--admin-border)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto', background: '#fff', position: 'absolute', zIndex: 10, width: 'calc(100% - 64px)', marginTop: '64px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
                    {searchedPrompts.map(p => (
                      <div key={p.id} onClick={() => addPromptToCollection(p)} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6'}}>
                        <Image src={p.imageUrl} alt={`${p.title} thumbnail`} width={32} height={32} loading="lazy" style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
                        <span style={{fontSize: '0.85rem', fontWeight: 500, color: 'var(--admin-text-main)'}}>{p.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px'}}>
                  {selectedPrompts.map(p => (
                    <div key={p.id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', border: '1px solid var(--admin-border)', borderRadius: '8px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <Image src={p.imageUrl} alt={`${p.title} thumbnail`} width={40} height={40} loading="lazy" style={{width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover'}} />
                        <span style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--admin-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px'}}>{p.title}</span>
                      </div>
                      <button onClick={() => removePromptFromCollection(p.id)} style={{color: '#9ca3af', display: 'flex', padding: '4px'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '4px'}}>
                  {selectedPrompts.length} prompts selected
                </div>
              </div>
            </div>

            {/* Right Column: Form Fields */}
            <div style={{flex: '1.2', display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="form-input" placeholder="e.g., Neon Nights..." value={formTitle} onChange={e => setFormTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">URL Slug <span style={{fontWeight: 400, color: '#9CA3AF'}}>(auto-generates based on title)</span></label>
                <div className="form-input-container" style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                  <input type="text" className="form-input" style={{ background: '#F9FAFB', color: '#6B7280', paddingRight: '40px' }} value={derivedSlug} disabled />
                  <svg style={{ position: 'absolute', right: '12px', color: '#9CA3AF' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the theme and aesthetic of this bundle..." value={formDescription} onChange={e => setFormDescription(e.target.value)} style={{minHeight: '120px'}} />
              </div>

              <div style={{border: '1px solid #F3F4F6', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FBBF24" stroke="none" style={{marginTop: '2px'}}><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z"/></svg>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: '0.95rem', fontWeight: 600, color: 'var(--admin-text-main)'}}>Feature on Homepage</span>
                    <span style={{fontSize: '0.85rem', color: 'var(--admin-text-muted)'}}>Display this bundle in the top 6 collections grid.</span>
                  </div>
                </div>
                <div className="admin-toggle-switch" onClick={() => setIsFeatured(!isFeatured)} style={{ background: isFeatured ? 'var(--admin-text-main)' : '#D1D5DB' }}>
                  <div className="admin-toggle-knob" style={{ left: isFeatured ? '22px' : '2px' }}></div>
                </div>
              </div>

              <div className="form-toggle" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                <div className="admin-toggle-switch" onClick={() => setIsPublic(!isPublic)} style={{ background: isPublic ? 'var(--admin-text-main)' : '#D1D5DB' }}>
                  <div className="admin-toggle-knob" style={{ left: isPublic ? '22px' : '2px' }}></div>
                </div>
                <div className="toggle-text">
                  <div className="toggle-title" style={{ fontSize: '0.95rem', fontWeight: 500 }}>Publish immediately</div>
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer" style={{background: '#FAFAFA', borderTop: '1px solid var(--admin-border)', padding: '20px 32px'}}>
            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-publish" onClick={handleSaveCollection} disabled={saving}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Collection')}
            </button>
          </div>
        </div>
        <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm || (() => {})}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel="Delete"
          variant="danger"
        />
    </div>
    </>
  );
}
