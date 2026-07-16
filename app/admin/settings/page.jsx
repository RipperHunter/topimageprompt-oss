"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SignOutModal from '@/components/SignOutModal';
import { useToast } from '@/components/ui/Toast';
import BrandLogo from '@/components/BrandLogo';

const getEngineGradientDefault = (engine) => {
  const eng = engine.toLowerCase();
  if (eng.includes("midjourney")) return "linear-gradient(135deg, #1e3a8a, #3b82f6)";
  if (eng.includes("dall-e") || eng.includes("dalle") || eng.includes("dall.e")) return "linear-gradient(135deg, #065f46, #10b981)";
  if (eng.includes("stable diffusion") || eng.includes("sdxl")) return "linear-gradient(135deg, #7c3aed, #c084fc)";
  if (eng.includes("playground")) return "linear-gradient(135deg, #b91c1c, #f87171)";
  if (eng.includes("leonardo")) return "linear-gradient(135deg, #d97706, #fbbf24)";
  return "linear-gradient(135deg, #4b5563, #9ca3af)";
};

const getEngineIconDefault = (engine) => {
  const eng = engine.toLowerCase();
  if (eng.includes("midjourney")) return "⛵";
  if (eng.includes("dall-e") || eng.includes("dalle") || eng.includes("dall.e")) return "🎨";
  if (eng.includes("stable diffusion") || eng.includes("sdxl")) return "🌪️";
  if (eng.includes("playground")) return "🎮";
  if (eng.includes("leonardo")) return "🦁";
  return "🤖";
};

const getStyleGradientDefault = (styleName) => {
  const s = styleName.toLowerCase();
  if (s.includes("photo")) return "linear-gradient(135deg, #0f172a, #334155)";
  if (s.includes("digital")) return "linear-gradient(135deg, #4c1d95, #8b5cf6)";
  if (s.includes("illustr")) return "linear-gradient(135deg, #db2777, #f472b6)";
  if (s.includes("3d") || s.includes("render")) return "linear-gradient(135deg, #0369a1, #38bdf8)";
  if (s.includes("anime")) return "linear-gradient(135deg, #b91c1c, #f43f5e)";
  if (s.includes("cinema")) return "linear-gradient(135deg, #111827, #4b5563)";
  if (s.includes("line")) return "linear-gradient(135deg, #1e293b, #f1f5f9)";
  if (s.includes("abstract")) return "linear-gradient(135deg, #fbbf24, #ec4899)";
  if (s.includes("oil") || s.includes("paint")) return "linear-gradient(135deg, #78350f, #d97706)";
  if (s.includes("pixel")) return "linear-gradient(135deg, #14532d, #22c55e)";
  return "linear-gradient(135deg, #374151, #6b7280)";
};

const getStyleIconDefault = (styleName) => {
  const s = styleName.toLowerCase();
  if (s.includes("photo")) return "📷";
  if (s.includes("digital")) return "💻";
  if (s.includes("illustr")) return "✏️";
  if (s.includes("3d") || s.includes("render")) return "🧊";
  if (s.includes("anime")) return "🌸";
  if (s.includes("cinema")) return "🎬";
  if (s.includes("line")) return "🖋️";
  if (s.includes("abstract")) return "🌀";
  if (s.includes("oil") || s.includes("paint")) return "🖌️";
  if (s.includes("pixel")) return "👾";
  return "🎨";
};

export default function AdminSettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [allPrompts, setAllPrompts] = useState([]);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const [currentUploadField, setCurrentUploadField] = useState(null);

  const addEngineOption = () => {
    setSettings(prev => {
      const nextMeta = [...(prev.engineMetadata || [])];
      nextMeta.push({ name: '', icon: '🤖', gradient: 'linear-gradient(135deg, #4b5563, #9ca3af)', imageUrl: null });
      return { ...prev, engineMetadata: nextMeta };
    });
  };

  const removeEngineOption = (idx) => {
    setSettings(prev => {
      const nextMeta = [...(prev.engineMetadata || [])];
      nextMeta.splice(idx, 1);
      return { ...prev, engineMetadata: nextMeta };
    });
  };

  const updateEngineOption = (idx, field, value) => {
    setSettings(prev => {
      const nextMeta = [...(prev.engineMetadata || [])];
      if (nextMeta[idx]) {
        nextMeta[idx] = { ...nextMeta[idx], [field]: value };
      }
      return { ...prev, engineMetadata: nextMeta };
    });
  };

  const addStyleOption = () => {
    setSettings(prev => {
      const nextMeta = [...(prev.styleMetadata || [])];
      nextMeta.push({ name: '', icon: '🎨', gradient: 'linear-gradient(135deg, #374151, #6b7280)', imageUrl: null });
      return { ...prev, styleMetadata: nextMeta };
    });
  };

  const removeStyleOption = (idx) => {
    setSettings(prev => {
      const nextMeta = [...(prev.styleMetadata || [])];
      nextMeta.splice(idx, 1);
      return { ...prev, styleMetadata: nextMeta };
    });
  };

  const updateStyleOption = (idx, field, value) => {
    setSettings(prev => {
      const nextMeta = [...(prev.styleMetadata || [])];
      if (nextMeta[idx]) {
        nextMeta[idx] = { ...nextMeta[idx], [field]: value };
      }
      return { ...prev, styleMetadata: nextMeta };
    });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/prompts?limit=500').then(res => res.json())
    ]).then(([settingsData, promptsData]) => {
      const loadedSettings = settingsData.settings || {};
      
      let parsedEngines = [];
      if (loadedSettings.engineMetadata) {
        try {
          parsedEngines = typeof loadedSettings.engineMetadata === 'string'
            ? JSON.parse(loadedSettings.engineMetadata)
            : loadedSettings.engineMetadata;
        } catch (e) {}
      }
      if (!Array.isArray(parsedEngines) || parsedEngines.length === 0) {
        let rawEngines = [];
        if (loadedSettings.allowedEngines) {
          try {
            rawEngines = typeof loadedSettings.allowedEngines === 'string'
              ? JSON.parse(loadedSettings.allowedEngines)
              : loadedSettings.allowedEngines;
          } catch(e) {}
        }
        if (!Array.isArray(rawEngines) || rawEngines.length === 0) {
          rawEngines = ["Midjourney", "DALL-E 3", "Stable Diffusion XL", "Playground v2.5", "Leonardo AI"];
        }
        parsedEngines = rawEngines.map(name => ({
          name,
          icon: getEngineIconDefault(name),
          gradient: getEngineGradientDefault(name),
          imageUrl: null
        }));
      }

      let parsedStyles = [];
      if (loadedSettings.styleMetadata) {
        try {
          parsedStyles = typeof loadedSettings.styleMetadata === 'string'
            ? JSON.parse(loadedSettings.styleMetadata)
            : loadedSettings.styleMetadata;
        } catch (e) {}
      }
      if (!Array.isArray(parsedStyles) || parsedStyles.length === 0) {
        let rawStyles = [];
        if (loadedSettings.allowedStyles) {
          try {
            rawStyles = typeof loadedSettings.allowedStyles === 'string'
              ? JSON.parse(loadedSettings.allowedStyles)
              : loadedSettings.allowedStyles;
          } catch(e) {}
        }
        if (!Array.isArray(rawStyles) || rawStyles.length === 0) {
          rawStyles = ["Photorealistic", "Digital Art", "Illustration", "3D Render", "Anime", "Cinematic", "Line Art", "Abstract", "Oil Painting", "Pixel Art"];
        }
        parsedStyles = rawStyles.map(name => ({
          name,
          icon: getStyleIconDefault(name),
          gradient: getStyleGradientDefault(name),
          imageUrl: null
        }));
      }

      setSettings({
        ...loadedSettings,
        engineMetadata: parsedEngines,
        styleMetadata: parsedStyles
      });
      setAllPrompts(promptsData.prompts || []);
      setLoading(false);
    });
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField) return;
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const uploadedUrl = data.url || data.imageUrl;
      if (uploadedUrl) {
        if (currentUploadField === 'loginImages') {
          setSettings(prev => {
            let currentImages = [];
            if (prev.loginImages) {
              try { currentImages = typeof prev.loginImages === 'string' ? JSON.parse(prev.loginImages) : prev.loginImages; } catch(e) { currentImages = [prev.loginImages]; }
            }
            if (!Array.isArray(currentImages)) currentImages = [];
            return { ...prev, loginImages: JSON.stringify([...currentImages, uploadedUrl]) };
          });
        } else if (currentUploadField.startsWith('engineImage-')) {
          const idx = parseInt(currentUploadField.split('-')[1], 10);
          setSettings(prev => {
            const nextMeta = [...(prev.engineMetadata || [])];
            if (nextMeta[idx]) {
              nextMeta[idx] = { ...nextMeta[idx], imageUrl: uploadedUrl };
            }
            return { ...prev, engineMetadata: nextMeta };
          });
        } else if (currentUploadField.startsWith('styleImage-')) {
          const idx = parseInt(currentUploadField.split('-')[1], 10);
          setSettings(prev => {
            const nextMeta = [...(prev.styleMetadata || [])];
            if (nextMeta[idx]) {
              nextMeta[idx] = { ...nextMeta[idx], imageUrl: uploadedUrl };
            }
            return { ...prev, styleMetadata: nextMeta };
          });
        } else {
          setSettings(prev => ({ ...prev, [currentUploadField]: uploadedUrl }));
        }
      }
    } catch (err) { console.error(err); }
  };

  const triggerUpload = (fieldName) => {
    setCurrentUploadField(fieldName);
    if(fileInputRef.current) fileInputRef.current.click();
  };

  const saveSettings = async () => {
    setSaving(true);
    const cleanArrayString = (val, defaults) => {
      let arr = [];
      if (val) {
        try {
          arr = typeof val === 'string' ? JSON.parse(val) : val;
        } catch(e) {}
      }
      if (!Array.isArray(arr) || arr.length === 0) {
        return JSON.stringify(defaults);
      }
      const cleaned = arr.map(line => line.trim()).filter(line => line !== '');
      return JSON.stringify(cleaned);
    };

    try {
      const engineMetaList = Array.isArray(settings.engineMetadata) ? settings.engineMetadata : [];
      const styleMetaList = Array.isArray(settings.styleMetadata) ? settings.styleMetadata : [];

      const allowedEngines = engineMetaList.map(item => item.name.trim()).filter(name => name !== '');
      const allowedStyles = styleMetaList.map(item => item.name.trim()).filter(name => name !== '');

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroImageLeftOut: settings.heroImageLeftOut,
          heroImageLeft: settings.heroImageLeft,
          heroImageCenter: settings.heroImageCenter,
          heroImageRight: settings.heroImageRight,
          heroImageRightOut: settings.heroImageRightOut,
          exploreHero: settings.exploreHero,
          pinterestImage1: settings.pinterestImage1,
          pinterestImage2: settings.pinterestImage2,
          pinterestImage3: settings.pinterestImage3,
          pinterestImage4: settings.pinterestImage4,
          pinterestImage5: settings.pinterestImage5,
          loginImages: typeof settings.loginImages === 'string' ? settings.loginImages : JSON.stringify(settings.loginImages || []),
          heroPrompts: typeof settings.heroPrompts === 'string' ? settings.heroPrompts : JSON.stringify(settings.heroPrompts || []),
          heroCustomTexts: typeof settings.heroCustomTexts === 'string' ? settings.heroCustomTexts : JSON.stringify(settings.heroCustomTexts || []),
          allowedEngines: JSON.stringify(allowedEngines),
          allowedStyles: JSON.stringify(allowedStyles),
          allowedRatios: cleanArrayString(settings.allowedRatios, ["1:1 (Square)", "4:5 (Portrait)", "3:4 (Portrait)", "16:9 (Landscape)", "21:9 (Ultrawide)", "9:16 (Mobile)"]),
          engineMetadata: JSON.stringify(engineMetaList),
          styleMetadata: JSON.stringify(styleMetaList)
        }),
      });
      showToast('Settings saved successfully!', 'success');
      router.refresh();
    } catch (e) {
      console.error(e);
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleLoginImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const uploadedUrl = data.url || data.imageUrl;
      if (uploadedUrl) {
        setSettings(prev => {
          const currentImages = prev.loginImages ? (typeof prev.loginImages === 'string' ? JSON.parse(prev.loginImages) : prev.loginImages) : [];
          return { ...prev, loginImages: [...currentImages, uploadedUrl] };
        });
      }
    } catch (err) { console.error(err); }
  };

  const removeLoginImage = (index) => {
    setSettings(prev => {
      const currentImages = prev.loginImages ? (typeof prev.loginImages === 'string' ? JSON.parse(prev.loginImages) : prev.loginImages) : [];
      const newImages = [...currentImages];
      newImages.splice(index, 1);
      return { ...prev, loginImages: newImages };
    });
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
              <li className="admin-nav-item active">
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
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Site Settings</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Customize images, logos, and global site appearance.</p>
          </div>
          <div className="header-right">
            <button className="admin-btn-primary" onClick={saveSettings} disabled={saving}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading settings...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '1400px' }}>
            
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{display: 'none'}} />

            {/* Homepage Hero Cards & Prompts */}
            <div style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px', marginTop: 0 }}>Homepage Hero Cards</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', marginBottom: '24px', marginTop: 0 }}>Configure the 5 overlapping cards at the top of the homepage. You can assign a specific prompt to each card, and optionally upload a custom image to override the prompt's default image.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Left-Out', field: 'heroImageLeftOut' },
                  { label: 'Left', field: 'heroImageLeft' },
                  { label: 'Center', field: 'heroImageCenter' },
                  { label: 'Right', field: 'heroImageRight' },
                  { label: 'Right-Out', field: 'heroImageRightOut' }
                ].map((config, idx) => {
                  let promptIds = [];
                  if (settings.heroPrompts) {
                    try { promptIds = typeof settings.heroPrompts === 'string' ? JSON.parse(settings.heroPrompts) : settings.heroPrompts; } catch(e) {}
                  }
                  if (!Array.isArray(promptIds)) promptIds = [];
                  while(promptIds.length < 5) promptIds.push("");

                  let customTexts = [];
                  if (settings.heroCustomTexts) {
                    try { customTexts = typeof settings.heroCustomTexts === 'string' ? JSON.parse(settings.heroCustomTexts) : settings.heroCustomTexts; } catch(e) {}
                  }
                  if (!Array.isArray(customTexts)) customTexts = [];
                  while(customTexts.length < 5) customTexts.push("");
                  
                  const field = config.field;
                  return (
                    <div key={config.label} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#F9FAFB', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>{config.label} Card</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>LINKED PROMPT</label>
                        <select 
                          value={promptIds[idx] || ''} 
                          onChange={e => {
                            const newIds = [...promptIds];
                            newIds[idx] = e.target.value;
                            setSettings(s => ({ ...s, heroPrompts: JSON.stringify(newIds) }));
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', textOverflow: 'ellipsis', backgroundColor: '#fff' }}
                        >
                          <option value="">-- Default --</option>
                          {allPrompts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>CUSTOM TEXT OVERRIDE</label>
                        <textarea 
                          value={customTexts[idx] || ''} 
                          onChange={e => {
                            const newTexts = [...customTexts];
                            newTexts[idx] = e.target.value;
                            setSettings(s => ({ ...s, heroCustomTexts: JSON.stringify(newTexts) }));
                          }}
                          placeholder="Optional: Overrides prompt text"
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', resize: 'vertical', minHeight: '60px', backgroundColor: '#fff' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>CUSTOM IMAGE OVERRIDE</label>
                        <div 
                          onClick={() => triggerUpload(field)}
                          style={{ width: '100%', aspectRatio: '4/5', background: '#fff', border: '1px dashed #D1D5DB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                        >
                          {settings[field] ? (
                            <Image src={settings[field]} alt="Homepage hero image override" width={320} height={400} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#9CA3AF' }}>
                              <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span style={{ fontSize: '0.75rem' }}>Upload</span>
                            </div>
                          )}
                        </div>
                        {settings[field] && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setSettings(prev => ({...prev, [field]: null})); }}
                             style={{ fontSize: '0.75rem', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}
                           >
                             Remove Image
                           </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explore Page Hero */}
            <div style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px', marginTop: 0 }}>Explore Header Graphic</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', marginBottom: '24px', marginTop: 0 }}>The main visual shown at the top of the `/explore` page.</p>
              
              <div 
                onClick={() => triggerUpload('exploreHero')}
                style={{ width: '100%', height: '200px', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
              >
                {settings.exploreHero ? (
                  <Image src={settings.exploreHero} alt="Explore hero image" width={960} height={320} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#9CA3AF' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style={{ fontSize: '0.9rem' }}>Upload wide landscape image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pinterest Section Layout */}
            <div style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px', marginTop: 0 }}>Pinterest Promo Section</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', marginBottom: '24px', marginTop: 0 }}>Images used in the masonry layout in the homepage Pinterest banner.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {['pinterestImage1', 'pinterestImage2', 'pinterestImage3', 'pinterestImage4', 'pinterestImage5'].map((field, idx) => (
                  <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>Masonry Image {idx + 1}</div>
                    <div 
                      onClick={() => triggerUpload(field)}
                      style={{ width: '100%', height: '180px', background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                    >
                      {settings[field] ? (
                        <Image src={settings[field]} alt={`Pinterest promo image ${idx + 1}`} width={240} height={360} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Login Infinite Scroll Images */}
            <div style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--admin-text-main)', margin: 0 }}>Login Infinite Scroll Images</h2>
                <button 
                  onClick={() => triggerUpload('loginImages')} 
                  style={{ background: 'var(--admin-text-main)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  + Add Image
                </button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', marginBottom: '24px', marginTop: 0 }}>Upload multiple images to populate the scrolling masonry grid on the `/login` and `/signup` pages.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px' }}>
                {(() => {
                  let currentImages = [];
                  if (settings.loginImages) {
                    try { currentImages = typeof settings.loginImages === 'string' ? JSON.parse(settings.loginImages) : settings.loginImages; } catch(e) { currentImages = [settings.loginImages]; }
                  }
                  if (!Array.isArray(currentImages)) currentImages = [];
                  return currentImages.map((imgUrl, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                      <Image src={imgUrl} alt="Login page scrolling artwork" width={180} height={180} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        onClick={() => removeLoginImage(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Manage Search Filters */}
            <div style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '32px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--admin-text-main)', marginBottom: '8px', marginTop: 0 }}>Manage Search Filters</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--admin-text-muted)', marginBottom: '24px', marginTop: 0 }}>Customize the filter values shown on the public Explore page sidebar and home page engine selectors. Upload custom images/icons or set emojis and background gradients.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* AI Engines Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--admin-text-main)' }}>AI Engines</h3>
                    <button type="button" onClick={addEngineOption} className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      + Add AI Engine
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(settings.engineMetadata || []).map((eng, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                        {/* Image Thumbnail Upload */}
                        <div 
                          onClick={() => triggerUpload(`engineImage-${idx}`)}
                          style={{ width: '48px', height: '48px', flexShrink: 0, background: eng.imageUrl ? 'none' : (eng.gradient || 'linear-gradient(135deg, #4b5563, #9ca3af)'), borderRadius: '8px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                        >
                          {eng.imageUrl ? (
                            <Image src={eng.imageUrl} alt={eng.name || 'engine'} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>{eng.icon || '🤖'}</span>
                          )}
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                            Upload
                          </div>
                        </div>
                        {eng.imageUrl && (
                          <button 
                            type="button" 
                            onClick={() => updateEngineOption(idx, 'imageUrl', null)}
                            style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                          >
                            Clear Image
                          </button>
                        )}
                        
                        {/* Name Input */}
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>ENGINE NAME</label>
                          <input 
                            type="text" 
                            value={eng.name || ''} 
                            onChange={e => updateEngineOption(idx, 'name', e.target.value)}
                            placeholder="e.g. Midjourney"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff' }}
                          />
                        </div>

                        {/* Emoji Icon Input */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>EMOJI ICON</label>
                          <input 
                            type="text" 
                            value={eng.icon || ''} 
                            onChange={e => updateEngineOption(idx, 'icon', e.target.value)}
                            placeholder="e.g. ⛵"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff', textAlign: 'center' }}
                          />
                        </div>

                        {/* CSS Gradient Input */}
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>CSS GRADIENT BACKGROUND</label>
                          <input 
                            type="text" 
                            value={eng.gradient || ''} 
                            onChange={e => updateEngineOption(idx, 'gradient', e.target.value)}
                            placeholder="linear-gradient(...)"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff' }}
                          />
                        </div>

                        {/* Delete Button */}
                        <button 
                          type="button" 
                          onClick={() => removeEngineOption(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px' }}
                          aria-label="Delete engine option"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Styles Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--admin-text-main)' }}>Styles</h3>
                    <button type="button" onClick={addStyleOption} className="admin-btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      + Add Style
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(settings.styleMetadata || []).map((style, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                        {/* Image Thumbnail Upload */}
                        <div 
                          onClick={() => triggerUpload(`styleImage-${idx}`)}
                          style={{ width: '48px', height: '48px', flexShrink: 0, background: style.imageUrl ? 'none' : (style.gradient || 'linear-gradient(135deg, #374151, #6b7280)'), borderRadius: '8px', border: '1px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                        >
                          {style.imageUrl ? (
                            <Image src={style.imageUrl} alt={style.name || 'style'} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>{style.icon || '🎨'}</span>
                          )}
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px' }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                            Upload
                          </div>
                        </div>
                        {style.imageUrl && (
                          <button 
                            type="button" 
                            onClick={() => updateStyleOption(idx, 'imageUrl', null)}
                            style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                          >
                            Clear Image
                          </button>
                        )}
                        
                        {/* Name Input */}
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>STYLE NAME</label>
                          <input 
                            type="text" 
                            value={style.name || ''} 
                            onChange={e => updateStyleOption(idx, 'name', e.target.value)}
                            placeholder="e.g. Photorealistic"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff' }}
                          />
                        </div>

                        {/* Emoji Icon Input */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>EMOJI ICON</label>
                          <input 
                            type="text" 
                            value={style.icon || ''} 
                            onChange={e => updateStyleOption(idx, 'icon', e.target.value)}
                            placeholder="e.g. 📷"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff', textAlign: 'center' }}
                          />
                        </div>

                        {/* CSS Gradient Input */}
                        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>CSS GRADIENT BACKGROUND</label>
                          <input 
                            type="text" 
                            value={style.gradient || ''} 
                            onChange={e => updateStyleOption(idx, 'gradient', e.target.value)}
                            placeholder="linear-gradient(...)"
                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--admin-border)', fontSize: '0.85rem', width: '100%', background: '#fff' }}
                          />
                        </div>

                        {/* Delete Button */}
                        <button 
                          type="button" 
                          onClick={() => removeStyleOption(idx)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '8px' }}
                          aria-label="Delete style option"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratios Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--admin-text-main)' }}>Aspect Ratios</label>
                  <textarea 
                    value={(() => {
                      let arr = [];
                      if (settings.allowedRatios) {
                        try { arr = typeof settings.allowedRatios === 'string' ? JSON.parse(settings.allowedRatios) : settings.allowedRatios; } catch(e) {}
                      }
                      if (!Array.isArray(arr) || arr.length === 0) {
                        arr = ["1:1 (Square)", "4:5 (Portrait)", "3:4 (Portrait)", "16:9 (Landscape)", "21:9 (Ultrawide)", "9:16 (Mobile)"];
                      }
                      return arr.join('\n');
                    })()}
                    onChange={e => {
                      const lines = e.target.value.split('\n');
                      setSettings(prev => ({ ...prev, allowedRatios: JSON.stringify(lines) }));
                    }}
                    placeholder="Enter ratios (one per line)"
                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--admin-border)', fontSize: '0.9rem', width: '100%', minHeight: '120px', fontFamily: 'inherit', backgroundColor: '#fff', color: 'var(--admin-text-main)' }}
                  />
                </div>
              </div>
            </div>

            <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
    </div>
        )}
      </main>
    </>
  );
}
