"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './profile.css';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

export default function Profile() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { showToast: showGlobalToast } = useToast();

  const [activeTab, setActiveTab] = useState('saved');
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState([]);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null });

  // Settings & Profile Forms state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Sync state from session
  useEffect(() => {
    if (session?.user) {
      const nameParts = session.user.name ? session.user.name.split(' ') : [];
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setAvatar(session.user.avatar || '');
      setEmailNotifications(session.user.emailNotifications !== false);
      setPublicProfile(!!session.user.publicProfile);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/user/saved')
        .then(r => r.json())
        .then(data => {
          const prompts = Array.isArray(data) ? data : (data.prompts || []);
          setSavedPrompts(prompts);
        })
        .catch(() => {});

      // Fetch API keys
      fetch('/api/keys')
        .then(r => r.json())
        .then(data => setApiKeys(data.keys || []))
        .catch(() => {});
    }
  }, [status]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const name = `${firstName} ${lastName}`.trim();
    if (!name) {
      showGlobalToast('Name cannot be empty', 'error');
      setProfileError('Name cannot be empty');
      return;
    }
    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileSuccess('Profile updated successfully!');
        showGlobalToast('Name updated', 'success');
        await update();
        router.refresh();
      } else {
        const errMsg = data.error || 'Failed to update profile';
        setProfileError(errMsg);
        showGlobalToast(errMsg, 'error');
      }
    } catch (err) {
      setProfileError('An unexpected error occurred');
      showGlobalToast('An unexpected error occurred', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showGlobalToast('All password fields are required', 'error');
      setPasswordError('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      showGlobalToast('New passwords do not match', 'error');
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      showGlobalToast('Password must be at least 8 characters', 'error');
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setIsSavingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess('Password updated successfully!');
        showGlobalToast('Password updated', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        router.refresh();
      } else {
        const errMsg = data.error || 'Failed to update password';
        setPasswordError(errMsg);
        showGlobalToast(errMsg, 'error');
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred');
      showGlobalToast('An unexpected error occurred', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleToggleEmail = async () => {
    const newVal = !emailNotifications;
    setEmailNotifications(newVal);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications: newVal })
      });
      if (res.ok) {
        await update();
      } else {
        setEmailNotifications(!newVal);
      }
    } catch (e) {
      setEmailNotifications(!newVal);
    }
  };

  const handleTogglePublic = async () => {
    const newVal = !publicProfile;
    setPublicProfile(newVal);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicProfile: newVal })
      });
      if (res.ok) {
        await update();
      } else {
        setPublicProfile(!newVal);
      }
    } catch (e) {
      setPublicProfile(!newVal);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setAvatar(data.imageUrl);
          showGlobalToast('Avatar uploaded successfully', 'success');
        } else {
          showGlobalToast('Upload failed: Invalid response', 'error');
        }
      } else {
        const err = await res.json();
        showGlobalToast(err.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showGlobalToast('Upload failed', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Sync active tab with URL search query parameter — run only once on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'saved' || tab === 'settings' || tab === 'api') {
        setActiveTab(tab);
      }
    }
  }, []); // Only on mount — window.location.search is not a reactive value

  if (status === 'loading') {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>Loading...</div>;
  }

  if (!session) {
    return null; // redirecting
  }

  const handleCopy = async (promptText, promptId) => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
    } catch (err) {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = promptText;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(textArea);
    }

    if (promptId) {
      setCopiedId(promptId);
      setTimeout(() => setCopiedId(null), 2500);
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'copy_prompt', promptId, source: 'Profile' })
      }).catch(() => {});
    }

    showGlobalToast('Prompt copied to clipboard!', 'success');
  };

  const handleDownloadImage = async (downloadUrl, title) => {
    try {
      showGlobalToast('Downloading original image...', 'info');
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
      showGlobalToast('Download complete!', 'success');
    } catch (e) {
      console.error('Download failed', e);
      window.open(downloadUrl, '_blank');
      showGlobalToast('Could not auto-download. Opened in new tab.', 'warning');
    }
  };

  const handleUnsave = async (promptId) => {
    try {
      const res = await fetch('/api/prompts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId })
      });
      const data = await res.json();
      if (data && data.saved === false) {
        setSavedPrompts(prev => prev.filter(p => p.id !== promptId));
        showGlobalToast('Prompt removed from saved vault', 'success');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setGenerating(true);
    setGeneratedKey(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName })
      });
      const data = await res.json();
      if (data.success) {
        setApiKeys(prev => [data.apiKey, ...prev]);
        setGeneratedKey(data.key);
        setKeyName('');
      } else {
        showGlobalToast(data.error || 'Failed to generate key', 'error');
      }
    } catch (e) {
      console.error(e);
      showGlobalToast('An error occurred generating the key', 'error');
    }
    setGenerating(false);
  };

  const handleRevokeKey = (keyId) => {
    setConfirmModal({
      isOpen: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/keys/${keyId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            setApiKeys(prev => prev.filter(k => k.id !== keyId));
            showGlobalToast('API key revoked', 'success');
          } else {
            showGlobalToast(data.error || 'Failed to revoke key', 'error');
          }
        } catch (e) {
          console.error(e);
          showGlobalToast('An error occurred', 'error');
        }
      },
    });
  };

  const half = Math.ceil(savedPrompts.length / 2);
  const col1 = savedPrompts.slice(0, half);
  const col2 = savedPrompts.slice(half);

  const initial = session.user?.name ? session.user.name[0].toUpperCase() : session.user?.email?.[0].toUpperCase() || 'U';

  return (
    <main className="profile-container container" style={{ minHeight: '80vh', position: 'relative' }}>
      
      {/* Decorative background blob */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 100%)',
        filter: 'blur(60px)',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      {/* Profile Header */}
      <section className="profile-header">
        
        {/* Glow orb background */}
        <div className="profile-header-glow"></div>
        
        {/* Abstract pattern inside card */}
        <div className="profile-header-grid">
          <svg viewBox="0 0 100 100" fill="none">
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.25"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="profile-header-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-initials" style={{ 
              backgroundImage: avatar ? (avatar.startsWith('linear-gradient') ? avatar : `url(${avatar})`) : 'none',
              backgroundColor: avatar ? 'transparent' : 'var(--text-main)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: avatar ? '#fff' : 'var(--bg-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '2.5rem'
            }}>
              {(!avatar || avatar.startsWith('linear-gradient')) && initial}
            </div>
            <div className="online-indicator"></div>
          </div>
          
          <div className="profile-info">
            <h1 className="profile-name">{session.user?.name || 'User'}</h1>
            <p className="profile-bio">{session.user?.email}</p>
            
            <div className="profile-stats">
              <div className="p-stat">
                <span className="p-stat-label">Account Type</span>
                <span className="p-stat-value">
                  {session.user?.role === 'ADMIN' ? 'Admin' : 'Member'}
                </span>
              </div>
              <div className="profile-stats-divider"></div>
              <div className="p-stat">
                <span className="p-stat-label">Saved Vault</span>
                <span className="p-stat-value">
                  {savedPrompts.length} Prompts
                </span>
              </div>
              <div className="profile-stats-divider"></div>
              <div className="p-stat">
                <span className="p-stat-label">Member Since</span>
                <span className="p-stat-value">
                  {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="profile-actions">
            {session.user?.role === 'ADMIN' && (
              <Link href="/admin/library" style={{ textDecoration: 'none' }}>
                <button className="btn-black">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  Admin Dashboard
                </button>
              </Link>
            )}
            <button className="btn-outline" onClick={() => setActiveTab('settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </section>

      {/* Profile Navigation */}
      <nav className="profile-nav" style={{ gap: '48px', marginBottom: '48px', borderBottom: '2px solid var(--border-light)' }}>
        <button 
          className={`p-nav-item ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
          style={{ fontSize: '1.1rem', paddingBottom: '20px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          Saved Prompts
        </button>
        <button 
          className={`p-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ fontSize: '1.1rem', paddingBottom: '20px' }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Account Settings
        </button>
      </nav>

      {/* Tab Content */}
      <section className="profile-content">
        
        {activeTab === 'settings' && (
          <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
            
            <div className="settings-sidebar">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Personal Information</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>Update your personal details here. This information will be displayed publicly on your profile if you choose to share your collections.</p>
            </div>

            <div className="api-dashboard glass-card" style={{ padding: '40px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {profileSuccess && (
                    <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10B981', fontSize: '0.9rem', fontWeight: '500' }}>
                      {profileSuccess}
                    </div>
                  )}
                  {profileError && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontSize: '0.9rem', fontWeight: '500' }}>
                      {profileError}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>First Name</label>
                      <input 
                        type="text" 
                        value={firstName} 
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="First name" 
                        required
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Last Name</label>
                      <input 
                        type="text" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Last name" 
                        required
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Email Address</label>
                    <input type="email" value={session.user?.email || ''} disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'var(--bg-color)', color: 'var(--text-muted)', cursor: 'not-allowed', fontSize: '1rem' }} />
                    <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email address cannot be changed directly. Contact support if needed.</p>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Bio</label>
                    <textarea 
                      placeholder="Tell us a little about your AI art journey..." 
                      rows="4" 
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }}
                    ></textarea>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Select Profile Avatar Gradient</label>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[
                        { name: 'Default', value: '' },
                        { name: 'Sunset', value: 'linear-gradient(135deg, #FF512F, #DD2476)' },
                        { name: 'Ocean', value: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
                        { name: 'Emerald', value: 'linear-gradient(135deg, #11998e, #38ef7d)' },
                        { name: 'Midnight', value: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' },
                        { name: 'Sherbet', value: 'linear-gradient(135deg, #f857a6, #ff5858)' },
                        { name: 'Golden', value: 'linear-gradient(135deg, #F3904F, #3B4371)' }
                      ].map((opt, i) => (
                        <div 
                          key={i}
                          onClick={() => setAvatar(opt.value)}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: opt.value || 'var(--text-muted)',
                            cursor: 'pointer',
                            border: avatar === opt.value ? '4px solid var(--accent-color)' : '2px solid var(--border-light)',
                            boxShadow: avatar === opt.value ? '0 0 12px var(--primary)' : 'none',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            userSelect: 'none'
                          }}
                          title={opt.name}
                        >
                          {opt.value === '' && 'None'}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-light)', paddingTop: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Or Upload Custom Avatar Image</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {avatar && !avatar.startsWith('linear-gradient') ? (
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundImage: `url(${avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '2px solid var(--border-light)'
                          }} />
                        ) : (
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--bg-light)',
                            border: '2px dashed var(--border-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem'
                          }}>No Image</div>
                        )}
                        <div>
                          <input 
                            type="file" 
                            id="avatar-upload" 
                            accept="image/*" 
                            onChange={handleAvatarUpload} 
                            style={{ display: 'none' }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => document.getElementById('avatar-upload').click()}
                            disabled={isUploadingAvatar}
                            className="btn-outline" 
                            style={{ padding: '8px 16px', fontSize: '0.9rem', cursor: 'pointer' }}
                          >
                            {isUploadingAvatar ? 'Uploading...' : 'Choose Image'}
                          </button>
                          <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP, or GIF. Max 5MB.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                     <button type="button" className="btn-outline" style={{ padding: '12px 24px' }} onClick={() => router.refresh()}>Reset</button>
                     <button type="submit" disabled={isSavingProfile} className="btn-black" style={{ padding: '12px 32px' }}>
                       {isSavingProfile ? 'Saving...' : 'Save Changes'}
                     </button>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Preferences Section */}
            <div className="settings-sidebar" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Preferences</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>Customize your prompt vault experience.</p>
            </div>

            <div className="api-dashboard glass-card" style={{ padding: '40px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginTop: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Email Notifications</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive updates when new prompts are added to your favorite categories.</p>
                  </div>
                  <label 
                    onClick={handleToggleEmail}
                    style={{ 
                      position: 'relative', 
                      display: 'inline-block', 
                      width: '50px', 
                      height: '28px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: emailNotifications ? 'var(--accent-color, #10B981)' : 'var(--border-light, #e2e8f0)', 
                      transition: '.3s', 
                      borderRadius: '34px' 
                    }}>
                      <span style={{ 
                        position: 'absolute', 
                        height: '20px', 
                        width: '20px', 
                        left: emailNotifications ? '26px' : '4px', 
                        bottom: '4px', 
                        backgroundColor: 'white', 
                        transition: '.3s', 
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}></span>
                    </span>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Public Profile</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Allow other users to see your public collections.</p>
                  </div>
                  <label 
                    onClick={handleTogglePublic}
                    style={{ 
                      position: 'relative', 
                      display: 'inline-block', 
                      width: '50px', 
                      height: '28px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: publicProfile ? 'var(--accent-color, #10B981)' : 'var(--border-light, #e2e8f0)', 
                      transition: '.3s', 
                      borderRadius: '34px' 
                    }}>
                      <span style={{ 
                        position: 'absolute', 
                        height: '20px', 
                        width: '20px', 
                        left: publicProfile ? '26px' : '4px', 
                        bottom: '4px', 
                        backgroundColor: 'white', 
                        transition: '.3s', 
                        borderRadius: '50%',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}></span>
                    </span>
                  </label>
                </div>

              </div>
            </div>

            {/* Password Change Section */}
            <div className="settings-sidebar" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Change Password</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>Ensure your account is using a long, random password to stay secure.</p>
            </div>

            <div className="api-dashboard glass-card" style={{ padding: '40px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginTop: '40px' }}>
              <form onSubmit={handleSavePassword}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {passwordSuccess && (
                    <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10B981', fontSize: '0.9rem', fontWeight: '500' }}>
                      {passwordSuccess}
                    </div>
                  )}
                  {passwordError && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontSize: '0.9rem', fontWeight: '500' }}>
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Current Password</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                     <button type="submit" disabled={isSavingPassword} className="btn-black" style={{ padding: '12px 32px' }}>
                       {isSavingPassword ? 'Updating...' : 'Update Password'}
                     </button>
                  </div>
                </div>
              </form>
            </div>

          </div>
        )}

        {activeTab === 'api' && (
          <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px' }}>
            <div className="settings-sidebar">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Developer API Integration</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Use API keys to integrate topimageprompt directly into your applications, automation scripts, or external designs.
              </p>
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#10B981', fontWeight: '600' }}>API Access Endpoint</h4>
                <code style={{ fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all', display: 'block', background: 'var(--bg-color)', padding: '8px', borderRadius: '6px' }}>
                  GET /api/developer/prompts
                </code>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Authenticate by passing the key in the <code>x-api-key</code> header.
                </p>
              </div>
            </div>

            <div className="api-dashboard glass-card" style={{ padding: '40px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
              {/* Key Generation Section */}
              <div style={{ marginBottom: '40px', paddingBottom: '32px', borderBottom: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)' }}>Create a New API Key</h3>
                <form onSubmit={handleGenerateKey} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>Key Description Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. My Website Bot, Dev App" 
                      value={keyName} 
                      onChange={e => setKeyName(e.target.value)} 
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-light)', outline: 'none', background: 'var(--bg-light)', color: 'var(--text-main)', fontSize: '1rem' }} 
                    />
                  </div>
                  <button type="submit" disabled={generating} className="btn-black" style={{ padding: '14px 28px', height: '50px', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                    {generating ? 'Generating...' : 'Generate Key'}
                  </button>
                </form>

                {generatedKey && (
                  <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#EF4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      Copy Your API Key Now!
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      This is the only time you will see this plain text key. Store it securely in a safe place.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <code style={{ flex: 1, padding: '12px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-light)', wordBreak: 'break-all', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                        {generatedKey}
                      </code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey);
                          showGlobalToast('API key copied to clipboard!', 'success');
                        }}
                        className="btn-outline" 
                        style={{ padding: '10px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* API Keys List */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--text-main)' }}>Your Active API Keys</h3>
                {apiKeys.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', padding: '24px' }}>
                    No developer API keys have been generated yet.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <th style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Name</th>
                          <th style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Key Prefix</th>
                          <th style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Usage</th>
                          <th style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Limit/hr</th>
                          <th style={{ padding: '12px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map(key => (
                          <tr key={key.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '16px 8px', fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{key.name}</td>
                            <td style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}><code>{key.prefix}</code></td>
                            <td style={{ padding: '16px 8px', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '600' }}>{key.requests} reqs</td>
                            <td style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{key.rateLimit} / hr</td>
                            <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                              <button 
                                onClick={() => handleRevokeKey(key.id)}
                                style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', border: '1px solid transparent', transition: 'all 0.2s' }}
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <>
            {savedPrompts.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--card-bg)', border: '1px dashed var(--border-light)', borderRadius: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: 'var(--bg-light)', borderRadius: '50%', marginBottom: '24px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-main)' }}>No saved prompts yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>You haven't saved any prompts yet. Explore our library to find inspiration for your next masterpiece.</p>
                <Link href="/explore">
                  <button className="btn-black" style={{ padding: '14px 32px', fontSize: '1.05rem' }}>Explore Prompts</button>
                </Link>
              </div>
            ) : (
              <div className="masonry-grid">
                <div className="masonry-column">
                  {col1.map(prompt => (
                    <Link 
                      href={`/prompt/${prompt.slug || prompt.id}`} 
                      className="explore-masonry-card" 
                      key={prompt.id}
                      style={{ display: 'block', textDecoration: 'none' }}
                    >
                      <Image
                        src={prompt.imageUrl || '/images/placeholder.png'}
                        alt={prompt.title}
                        width={320}
                        height={426}
                        loading="lazy"
                        quality={75}
                        style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                      />
                      
                      {/* Mobile Direct Copy Button */}
                      <button 
                        className="mobile-card-copy-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopy(prompt.promptText, prompt.id);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>{copiedId === prompt.id ? "Copied" : "Copy"}</span>
                      </button>

                      {/* Mobile Direct Unsave Button */}
                      <button 
                        className="mobile-card-unsave-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnsave(prompt.id);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
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
                            handleDownloadImage(prompt.originalImageUrl || prompt.imageUrl, prompt.title);
                          }}
                          style={{ left: '16px', right: 'auto' }}
                        >
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>

                        {/* Top-Right Bookmark Action */}
                        <div 
                          className="card-action-icon" 
                          title="Remove from Saved"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnsave(prompt.id);
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </div>

                        {/* Centered Copy Button */}
                        <div className="card-hover-center">
                          <button 
                            className="copy-prompt-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopy(prompt.promptText, prompt.id);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>{copiedId === prompt.id ? "Copied!" : "Copy Prompt"}</span>
                          </button>
                        </div>

                        {/* Bottom Details (Title and Tags) */}
                        <div className="card-hover-details">
                          <h4 className="card-hover-title">{prompt.title}</h4>
                          <div className="card-hover-tags">
                            {prompt.engine && <span className="card-hover-tag">{prompt.engine}</span>}
                            {prompt.category && <span className="card-hover-tag">#{prompt.category}</span>}
                            {prompt.aspectRatio && <span className="card-hover-tag">{prompt.aspectRatio}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                
                <div className="masonry-column">
                  {col2.map(prompt => (
                    <Link 
                      href={`/prompt/${prompt.slug || prompt.id}`} 
                      className="explore-masonry-card" 
                      key={prompt.id}
                      style={{ display: 'block', textDecoration: 'none' }}
                    >
                      <Image
                        src={prompt.imageUrl || '/images/placeholder.png'}
                        alt={prompt.title}
                        width={320}
                        height={426}
                        loading="lazy"
                        quality={75}
                        style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
                      />
                      
                      {/* Mobile Direct Copy Button */}
                      <button 
                        className="mobile-card-copy-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopy(prompt.promptText, prompt.id);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>{copiedId === prompt.id ? "Copied" : "Copy"}</span>
                      </button>

                      {/* Mobile Direct Unsave Button */}
                      <button 
                        className="mobile-card-unsave-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnsave(prompt.id);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
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
                            handleDownloadImage(prompt.originalImageUrl || prompt.imageUrl, prompt.title);
                          }}
                          style={{ left: '16px', right: 'auto' }}
                        >
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>

                        {/* Top-Right Bookmark Action */}
                        <div 
                          className="card-action-icon" 
                          title="Remove from Saved"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnsave(prompt.id);
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                          </svg>
                        </div>

                        {/* Centered Copy Button */}
                        <div className="card-hover-center">
                          <button 
                            className="copy-prompt-btn"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopy(prompt.promptText, prompt.id);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>{copiedId === prompt.id ? "Copied!" : "Copy Prompt"}</span>
                          </button>
                        </div>

                        {/* Bottom Details (Title and Tags) */}
                        <div className="card-hover-details">
                          <h4 className="card-hover-title">{prompt.title}</h4>
                          <div className="card-hover-tags">
                            {prompt.engine && <span className="card-hover-tag">{prompt.engine}</span>}
                            {prompt.category && <span className="card-hover-tag">#{prompt.category}</span>}
                            {prompt.aspectRatio && <span className="card-hover-tag">{prompt.aspectRatio}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* No local toast anymore — handled by global useToast */}

      {/* Responsive styles — inline style tag (styled-jsx not supported in App Router) */}
      <style>{`
        @media (max-width: 768px) {
          .profile-header > div {
            flex-direction: column !important;
            text-align: center !important;
          }
          .profile-stats {
            flex-direction: column !important;
            gap: 16px !important;
          }
          .profile-stats > div:nth-child(2), .profile-stats > div:nth-child(4) {
            display: none !important;
          }
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title="Revoke this API key?"
        description="This key will stop working immediately. This action cannot be undone."
        confirmLabel="Revoke Key"
        variant="danger"
      />

    </main>
  );
}
