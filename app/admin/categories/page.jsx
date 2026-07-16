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

export default function AdminCategoriesPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  // Form state
  const [formName, setFormName] = useState('');
  const [formGroupType, setFormGroupType] = useState('Style');
  const [isActive, setIsActive] = useState(true);
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = React.useRef(null);

  // Fetch categories from DB
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.groupType.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Image upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const uploadedUrl = data.url || data.imageUrl;
      if (uploadedUrl) setUploadedImage(uploadedUrl);
    } catch (e) { console.error(e); }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormName(category.name);
    setFormGroupType(category.groupType);
    setIsActive(category.status === 'Active');
    setUploadedImage(category.imageUrl || null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormGroupType('Style');
    setIsActive(true);
    setUploadedImage(null);
  };

  const handleSaveCategory = async () => {
    if (!formName) {
      showToast('Category name is required', 'error');
      return;
    }
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          groupType: formGroupType,
          status: isActive ? 'Active' : 'Hidden',
          imageUrl: uploadedImage
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchCategories();
        showToast(editingId ? 'Category updated successfully' : 'Category created successfully', 'success');
        router.refresh();
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete this category?',
      description: 'Prompts assigned to this category will not be deleted, but will lose their category tag.',
      variant: 'danger',
      onConfirm: async () => {
        await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        fetchCategories();
        showToast('Category deleted successfully', 'success');
        router.refresh();
      },
    });
  };

  const handleDeleteSelected = () => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selected.length} categor${selected.length > 1 ? 'ies' : 'y'}?`,
      description: 'All selected categories will be permanently removed.',
      variant: 'danger',
      onConfirm: async () => {
        await Promise.all(selected.map(id => fetch(`/api/categories/${id}`, { method: 'DELETE' })));
        setSelected([]);
        fetchCategories();
        showToast(`${selected.length} categor${selected.length > 1 ? 'ies' : 'y'} deleted`, 'success');
        router.refresh();
      },
    });
  };

  const topCategory = [...categories].sort((a, b) => b.promptCount - a.promptCount)[0];
  const derivedSlug = formName ? formName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';

  return (
    <>
      {/* Sidebar */}
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
              <li className="admin-nav-item active">
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
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Categories & Filters</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Manage platform taxonomy, styles, and prompt organizations.</p>
          </div>
          <div className="header-right">
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {selected.length > 0 && (
              <button className="btn-cancel" onClick={handleDeleteSelected} style={{color:'#DC2626', borderColor:'#DC2626'}}>
                Delete {selected.length} Selected
              </button>
            )}
            <button className="admin-btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Category
            </button>
          </div>
        </header>

        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <span className="stat-card-title">Total Categories</span>
            <span className="stat-card-value">{categories.length}</span>
            <span className="stat-card-title" style={{marginTop: '8px', marginBottom: '0'}}>Active across all prompts</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Most Used</span>
            <span className="stat-card-value">{topCategory ? topCategory.name : 'None'}</span>
            <span className="stat-card-title" style={{marginTop: '8px', marginBottom: '0'}}>{topCategory ? topCategory.promptCount : 0} Prompts</span>
          </div>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading categories...</div>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="custom-checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(c => c.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                <th>CATEGORY NAME</th>
                <th>GROUP TYPE</th>
                <th>PROMPT COUNT</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)'}}>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map(category => (
                  <tr key={category.id} className={selected.includes(category.id) ? 'selected' : ''}>
                    <td>
                      <input type="checkbox" className="custom-checkbox" checked={selected.includes(category.id)} onChange={() => toggleSelect(category.id)} />
                    </td>
                    <td className="td-cat-name">
                      <div className="c-title" style={{fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '4px'}}>{category.name}</div>
                      <div className="c-slug" style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>/explore?category={category.slug}</div>
                    </td>
                    <td><span className="badge-gray">{category.groupType}</span></td>
                    <td>{category.promptCount}</td>
                    <td>
                      <span className={`status-indicator ${category.status === 'Active' ? 'published' : 'draft'}`}>
                        {category.status}
                      </span>
                    </td>
                    <td className="td-actions">
                      <button className="action-btn" aria-label="Edit" onClick={() => handleEdit(category)} style={{color:'#6B7280'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="action-btn" aria-label="Delete" onClick={() => handleDelete(category.id)} style={{color:'#DC2626'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}

          <div className="table-pagination">
            <div className="pagination-info">Showing {filtered.length} of {categories.length} categories</div>
          </div>
        </div>
      </main>

      {/* Add/Edit Category Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
        <div className="modal-content" style={{maxWidth: '600px'}}>
          <div className="modal-header">
            <h2>{editingId ? 'Edit Category' : 'Create New Category'}</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="modal-body" style={{flexDirection: 'column', gap: '24px'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div 
                className="upload-dropzone" 
                onClick={() => fileInputRef.current?.click()} 
                style={{ width: '120px', height: '120px', minHeight: '120px', padding: 0, margin: 0, flexShrink: 0 }}
              >
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{display:'none'}} />
                {uploadedImage ? (
                  <Image src={uploadedImage} alt="Category thumbnail preview" width={120} height={120} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>Upload Thumbnail or Icon</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Required for visual styles. 120x120px recommended.</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input type="text" className="form-input" placeholder="e.g., Cyberpunk, Midjourney v6, Portrait..." value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Category Group</label>
              <select className="form-select" value={formGroupType} onChange={e => setFormGroupType(e.target.value)}>
                <option value="Style">Style</option>
                <option value="Photography">Photography</option>
                <option value="Lighting">Lighting</option>
                <option value="Mood">Mood</option>
                <option value="Medium">Medium</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">URL Slug (auto-generates)</label>
              <div className="form-input-container">
                <input type="text" className="form-input" style={{ background: '#F3F4F6', color: '#6B7280' }} value={derivedSlug} disabled />
                <svg style={{ position: 'absolute', right: '16px', color: '#9CA3AF' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>

            <div className="form-toggle" style={{ marginTop: '0' }}>
              <div className="admin-toggle-switch" onClick={() => setIsActive(!isActive)} style={{ background: isActive ? 'var(--admin-text-main)' : '#D1D5DB' }}>
                <div className="admin-toggle-knob" style={{ left: isActive ? '22px' : '2px' }}></div>
              </div>
              <div className="toggle-text">
                <div className="toggle-title" style={{ fontSize: '0.95rem' }}>Active and visible in filters</div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-publish" onClick={handleSaveCategory} disabled={saving}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Category')}
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
