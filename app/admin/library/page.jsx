"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SignOutModal from '@/components/SignOutModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import BrandLogo from '@/components/BrandLogo';
import BulkImportModal from '@/components/admin/BulkImportModal';
import { fetchAllPromptPages } from '@/lib/client-prompts';

export default function AdminLibraryPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [prompts, setPrompts] = useState([]);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublish, setIsPublish] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [aspect, setAspect] = useState('16:9');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedOriginalImage, setUploadedOriginalImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [engines, setEngines] = useState(['Midjourney v6', 'DALL-E 3', 'Stable Diffusion XL', 'NovelAI']);
  const [showCustomEngine, setShowCustomEngine] = useState(false);
  const [customEngine, setCustomEngine] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const fileInputRef = useRef(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', description: '', onConfirm: null, variant: 'danger' });
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Sorting & Filtering state
  const [sortOption, setSortOption] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [engineFilter, setEngineFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formEngine, setFormEngine] = useState('Midjourney v6');
  const [formCategory, setFormCategory] = useState('Cyberpunk');
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [formTags, setFormTags] = useState([]);   // array of clean tag strings
  const [tagInput, setTagInput] = useState('');    // raw text input

  // Fetch categories from DB
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
  };

  // Fetch prompts from DB
  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const { prompts: loadedPrompts, total } = await fetchAllPromptPages();
      setPrompts(loadedPrompts);
      setTotalPrompts(total);

      // Extract unique engines from DB and merge with defaults
      const dbEngines = loadedPrompts.map(p => p.engine).filter(Boolean);
      const defaultEngines = ['Midjourney v6', 'DALL-E 3', 'Stable Diffusion XL', 'NovelAI'];
      const uniqueEngines = [...new Set([...defaultEngines, ...dbEngines])];
      setEngines(uniqueEngines);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrompts();
    fetchCategories();
  }, []);

  const filtered = prompts
    .filter(p => {
      const matchesSearch =
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.engine || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.promptText || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesEngine = engineFilter === 'All' || p.engine === engineFilter;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Published' && p.published === true) ||
        (statusFilter === 'Draft' && p.published === false);

      return matchesSearch && matchesCategory && matchesEngine && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortOption === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortOption === 'popular') {
        return (b.copies || 0) - (a.copies || 0);
      }
      if (sortOption === 'alphabetical') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Image upload with instant preview
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show instant local preview
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.imageUrl) {
        setUploadedImage(data.imageUrl);
        setUploadedOriginalImage(data.originalUrl || data.imageUrl);
        setImagePreview(data.imageUrl);
        showToast('Image uploaded successfully', 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
        setImagePreview(null);
      }
    } catch (e) {
      console.error(e);
      showToast('Upload failed', 'error');
      setImagePreview(null);
    }
    setIsUploading(false);
    URL.revokeObjectURL(localPreview);
  };

  const handleEdit = (prompt) => {
    setEditingPromptId(prompt.id);
    setFormTitle(prompt.title);
    setFormPrompt(prompt.promptText);
    
    // Check if the prompt's engine is in our dynamic engines list
    if (engines.includes(prompt.engine)) {
      setFormEngine(prompt.engine);
      setShowCustomEngine(false);
      setCustomEngine('');
    } else {
      setFormEngine('Custom...');
      setShowCustomEngine(true);
      setCustomEngine(prompt.engine || '');
    }

    // Check if prompt's category is in categories list
    const categoryExists = categories.some(cat => cat.name === prompt.category);
    const defaultCategories = ['Cyberpunk', 'Dark Fantasy', 'Architecture', 'Anime', 'Abstract', 'General'];
    if (categoryExists || defaultCategories.includes(prompt.category)) {
      setFormCategory(prompt.category);
      setShowCustomCategory(false);
      setCustomCategory('');
    } else {
      setFormCategory('Custom...');
      setShowCustomCategory(true);
      setCustomCategory(prompt.category || '');
    }

    setAspect(prompt.aspectRatio);
    setUploadedImage(prompt.imageUrl);
    setUploadedOriginalImage(prompt.originalImageUrl || prompt.imageUrl);
    setImagePreview(prompt.imageUrl);
    // Load existing tags
    try {
      const existingTags = typeof prompt.tags === 'string' ? JSON.parse(prompt.tags) : (prompt.tags || []);
      setFormTags(Array.isArray(existingTags) ? existingTags : []);
    } catch { setFormTags([]); }
    setTagInput('');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingPromptId(null);
    setFormTitle('');
    setFormPrompt('');
    setFormEngine('Midjourney v6');
    setFormCategory('Cyberpunk');
    setAspect('16:9');
    setUploadedImage(null);
    setUploadedOriginalImage(null);
    setImagePreview(null);
    setShowCustomEngine(false);
    setCustomEngine('');
    setShowCustomCategory(false);
    setCustomCategory('');
    setFormTags([]);
    setTagInput('');
  };

  // Create or Update prompt
  const handleSavePrompt = async () => {
    if (!formTitle || !formPrompt) {
      showToast('Title and Prompt text are required', 'error');
      return;
    }
    
    let engineToSave = formEngine;
    if (formEngine === 'Custom...') {
      if (!customEngine.trim()) {
        showToast('Please enter a custom engine name', 'error');
        return;
      }
      engineToSave = customEngine.trim();
    }

    let categoryToSave = formCategory;
    setSaving(true);
    
    try {
      if (formCategory === 'Custom...') {
        if (!customCategory.trim()) {
          setSaving(false);
          showToast('Please enter a custom category name', 'error');
          return;
        }
        
        // Check if category already exists
        const existing = categories.find(c => c.name.toLowerCase() === customCategory.trim().toLowerCase());
        if (existing) {
          categoryToSave = existing.name;
        } else {
          // Create category via API
          const catRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: customCategory.trim() })
          });
          if (!catRes.ok) {
            throw new Error('Failed to create custom category');
          }
          const newCat = await catRes.json();
          categoryToSave = newCat.name;
        }
      }

      const method = editingPromptId ? 'PUT' : 'POST';
      const url = editingPromptId ? `/api/prompts/${editingPromptId}` : '/api/prompts';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          promptText: formPrompt,
          engine: engineToSave,
          category: categoryToSave,
          aspectRatio: aspect,
          imageUrl: uploadedImage || '/images/placeholder.png',
          originalImageUrl: uploadedOriginalImage || uploadedImage || '/images/placeholder.png',
          tags: formTags,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchPrompts();
        fetchCategories();
        showToast(editingPromptId ? 'Prompt updated successfully' : 'Prompt published successfully', 'success');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save prompt', 'error');
      }
    } catch (e) { 
      console.error(e);
      showToast(e.message || 'An error occurred while saving the prompt', 'error');
    }
    setSaving(false);
  };

  // Delete prompt
  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete this prompt?',
      description: 'This action cannot be undone. The prompt will be permanently removed.',
      variant: 'danger',
      onConfirm: async () => {
        await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
        fetchPrompts();
        showToast('Prompt deleted successfully', 'success');
        router.refresh();
      },
    });
  };

  // Delete selected
  const handleDeleteSelected = () => {
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selected.length} prompt${selected.length > 1 ? 's' : ''}?`,
      description: 'This action cannot be undone. All selected prompts will be permanently removed.',
      variant: 'danger',
      onConfirm: async () => {
        await Promise.all(selected.map(id => fetch(`/api/prompts/${id}`, { method: 'DELETE' })));
        setSelected([]);
        fetchPrompts();
        showToast(`${selected.length} prompt${selected.length > 1 ? 's' : ''} deleted`, 'success');
        router.refresh();
      },
    });
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo"><BrandLogo height={30} /></div>

        <div className="admin-nav-section">
          <div className="admin-nav-label">WORKSPACE</div>
          <ul className="admin-nav-menu">
            <Link href="/admin/library" style={{ textDecoration: 'none' }}>
              <li className="admin-nav-item active">
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
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Prompt Library</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Manage, edit, and upload new prompts.</p>
          </div>
          <div className="header-right">
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search library..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {selected.length > 0 && (
              <button className="btn-cancel" onClick={handleDeleteSelected} style={{color:'#DC2626', borderColor:'#DC2626'}}>
                Delete {selected.length} Selected
              </button>
            )}
            <button
              className="admin-btn-primary"
              onClick={() => setBulkImportOpen(true)}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Bulk Import
            </button>
            <button className="admin-btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Upload Prompt
            </button>
          </div>
        </header>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <span className="stat-card-title">Total Prompts</span>
            <span className="stat-card-value">{totalPrompts}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Total Copies</span>
            <span className="stat-card-value">{prompts.reduce((sum, p) => sum + (p.copies || 0), 0).toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Categories</span>
            <span className="stat-card-value">{[...new Set(prompts.map(p => p.category))].length}</span>
          </div>
        </div>

        {/* Filters and Sorting bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          background: 'var(--admin-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--admin-radius-md)',
          border: '1px solid var(--admin-border)'
        }}>
          {/* Dropdowns Row */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort By</span>
              <select
                className="form-select"
                value={sortOption}
                onChange={e => setSortOption(e.target.value)}
                style={{ padding: '6px 28px 6px 12px', fontSize: '0.85rem', width: '150px', height: '36px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="popular">Most Popular</option>
                <option value="alphabetical">Title (A-Z)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ padding: '6px 28px 6px 12px', fontSize: '0.85rem', width: '165px', height: '36px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Engine</span>
              <select
                className="form-select"
                value={engineFilter}
                onChange={e => setEngineFilter(e.target.value)}
                style={{ padding: '6px 28px 6px 12px', fontSize: '0.85rem', width: '165px', height: '36px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <option value="All">All Engines</option>
                {engines.map(eng => (
                  <option key={eng} value={eng}>{eng}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--admin-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
              <select
                className="form-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '6px 28px 6px 12px', fontSize: '0.85rem', width: '130px', height: '36px', borderRadius: '6px', cursor: 'pointer' }}
              >
                <option value="All">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Results Badge */}
          <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', fontWeight: 500 }}>
            Found <strong style={{ color: 'var(--admin-text-main)' }}>{filtered.length}</strong> matching prompts
          </div>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading prompts...</div>
          ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" className="custom-checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(p => p.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                <th style={{ width: '60px' }}>IMAGE</th>
                <th>PROMPT NAME</th>
                <th>ENGINE</th>
                <th>CATEGORY</th>
                <th>COPIES</th>
                <th>DATE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(prompt => (
                <tr key={prompt.id} className={selected.includes(prompt.id) ? 'selected' : ''}>
                  <td>
                    <input type="checkbox" className="custom-checkbox" checked={selected.includes(prompt.id)} onChange={() => toggleSelect(prompt.id)} />
                  </td>
                  <td className="td-image">
                    <Image
                      src={prompt.imageUrl}
                      alt={prompt.title}
                      width={60}
                      height={60}
                      loading="lazy"
                      quality={75}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </td>
                  <td className="td-prompt-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="p-title" style={{ marginRight: '4px' }}>{prompt.title}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: prompt.published ? '#e6f4ea' : '#f1f3f4',
                        color: prompt.published ? '#137333' : '#5f6368',
                        border: prompt.published ? '1px solid #ceead6' : '1px solid #dadce0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: 1
                      }}>
                        {prompt.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="p-desc">{prompt.promptText?.substring(0, 60)}...</div>
                  </td>
                  <td><span className="badge-gray">{prompt.engine}</span></td>
                  <td><span className="badge-gray">{prompt.category}</span></td>
                  <td>{(prompt.copies || 0).toLocaleString()}</td>
                  <td>{new Date(prompt.createdAt).toLocaleDateString()}</td>
                  <td className="td-actions">
                    <button className="action-btn" aria-label="Edit" onClick={() => handleEdit(prompt)} style={{color:'#6B7280'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="action-btn" aria-label="Delete" onClick={() => handleDelete(prompt.id)} style={{color:'#DC2626'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          <div className="table-pagination">
            <div className="pagination-info">Showing {filtered.length} of {totalPrompts} prompts</div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
        <div className="modal-content">
          <div className="modal-header">
            <h2>{editingPromptId ? 'Edit Prompt' : 'Upload New Prompt'}</h2>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="modal-body">
            {/* Left: Dropzone */}
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()} style={{cursor:'pointer', position: 'relative'}}>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileSelect} style={{display:'none'}} />
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Upload previews use blob/object URLs before persistence. */}
                  <img src={imagePreview} alt="Uploaded" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '12px' }} />
                  {isUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 500 }}>
                      Uploading...
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="upload-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12v9"></path><path d="m8 16 4-4 4 4"></path><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>
                  </div>
                  <div className="upload-title">Drag and drop your image</div>
                  <div className="upload-subtitle">or click to browse files</div>
                  <div className="upload-hint">Supports JPG, PNG, WEBP. Max 5MB.</div>
                </>
              )}
            </div>

            {/* Right: Form */}
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input type="text" className="form-input" placeholder="e.g., Cyberpunk Tokyo Rain..." value={formTitle} onChange={e => setFormTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">AI Prompt <span className="form-required">Required</span></label>
                <textarea className="form-textarea" placeholder="Paste the exact prompt here..." value={formPrompt} onChange={e => setFormPrompt(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">AI Engine</label>
                  <select 
                    className="form-select" 
                    value={formEngine} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormEngine(val);
                      setShowCustomEngine(val === 'Custom...');
                    }}
                  >
                    {engines.map(eng => (
                      <option key={eng} value={eng}>{eng}</option>
                    ))}
                    <option value="Custom...">+ Add Custom Engine...</option>
                  </select>
                  {showCustomEngine && (
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ marginTop: '8px' }}
                      placeholder="Custom Engine Name" 
                      value={customEngine} 
                      onChange={e => setCustomEngine(e.target.value)} 
                    />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select" 
                    value={formCategory} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormCategory(val);
                      setShowCustomCategory(val === 'Custom...');
                    }}
                  >
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Cyberpunk">Cyberpunk</option>
                        <option value="Dark Fantasy">Dark Fantasy</option>
                        <option value="Architecture">Architecture</option>
                        <option value="Anime">Anime</option>
                        <option value="Abstract">Abstract</option>
                        <option value="General">General</option>
                      </>
                    )}
                    <option value="Custom...">+ Add Custom Category...</option>
                  </select>
                  {showCustomCategory && (
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ marginTop: '8px' }}
                      placeholder="Custom Category Name" 
                      value={customCategory} 
                      onChange={e => setCustomCategory(e.target.value)} 
                    />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Aspect Ratio</label>
                <div className="segmented-control" style={{ flexWrap: 'wrap', gap: '4px' }}>
                  {[
                    {label: '1:1 Square', val: '1:1'},
                    {label: '16:9 Landscape', val: '16:9'},
                    {label: '9:16 Portrait', val: '9:16'},
                    {label: '4:5 Portrait', val: '4:5'},
                    {label: '3:4 Portrait', val: '3:4'},
                    {label: '21:9 Ultrawide', val: '21:9'}
                  ].map(r => (
                    <button 
                      key={r.val} 
                      type="button"
                      className={`segment-btn ${aspect === r.val ? 'active' : ''}`} 
                      onClick={() => setAspect(r.val)}
                      style={{ flex: '1 1 calc(33.333% - 4px)', minWidth: '110px', padding: '8px 4px' }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* SEO Tags */}
              <div className="form-group" style={{ marginTop: '4px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  SEO Tags
                  <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#9CA3AF' }}>Type #tag1, #tag2 or tag1, tag2</span>
                </label>
                {/* Tag Pills */}
                {formTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {formTags.map((tag, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--admin-bg)', border: '1px solid var(--admin-border)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--admin-text-main)' }}>
                        #{tag}
                        <button type="button" onClick={() => setFormTags(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', lineHeight: 1, padding: 0, display: 'flex' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  className="form-input"
                  placeholder="#photorealistic, #japan, ocean photography..."
                  value={tagInput}
                  onChange={e => {
                    const val = e.target.value;
                    // Auto-split on comma
                    if (val.includes(',')) {
                      const parts = val.split(',');
                      const toAdd = parts.slice(0, -1).map(t => t.replace(/^#+/, '').trim().toLowerCase()).filter(t => t.length > 0);
                      if (toAdd.length > 0) {
                        setFormTags(prev => [...new Set([...prev, ...toAdd])].slice(0, 30));
                      }
                      setTagInput(parts[parts.length - 1]);
                    } else {
                      setTagInput(val);
                    }
                  }}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === 'Tab') && tagInput.trim()) {
                      e.preventDefault();
                      const clean = tagInput.replace(/^#+/, '').trim().toLowerCase();
                      if (clean) setFormTags(prev => [...new Set([...prev, clean])].slice(0, 30));
                      setTagInput('');
                    } else if (e.key === 'Backspace' && !tagInput && formTags.length > 0) {
                      setFormTags(prev => prev.slice(0, -1));
                    }
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData('text');
                    const parts = pasted.split(/[,\n]+/).map(t => t.replace(/^#+/, '').trim().toLowerCase()).filter(t => t.length > 0);
                    if (parts.length > 1) {
                      setFormTags(prev => [...new Set([...prev, ...parts])].slice(0, 30));
                    } else {
                      setTagInput(prev => prev + pasted);
                    }
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                  {formTags.length}/30 tags — Press Enter or Tab to add · Backspace to remove last
                </div>
              </div>

              <div className="form-toggle" style={{marginTop: 'auto', paddingTop: '16px'}}>
                <div className="admin-toggle-switch" onClick={() => setIsPublish(!isPublish)} style={{ background: isPublish ? 'var(--admin-text-main)' : '#D1D5DB' }}>
                  <div className="admin-toggle-knob" style={{ left: isPublish ? '22px' : '2px' }}></div>
                </div>
                <div className="toggle-text">
                  <div className="toggle-title">Publish immediately</div>
                  <div className="toggle-desc">If off, prompt will be saved as a Draft.</div>
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-publish" onClick={handleSavePrompt} disabled={saving}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12v9"></path><path d="m8 16 4-4 4 4"></path><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>
              {saving ? 'Saving...' : (editingPromptId ? 'Save Changes' : 'Publish Prompt')}
            </button>
          </div>
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
        variant={confirmModal.variant}
      />
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImportComplete={() => { fetchPrompts(); fetchCategories(); }}
      />
    </>
  );
}
