"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import SignOutModal from '@/components/SignOutModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import BrandLogo from '@/components/BrandLogo';

export default function AdminMessagesPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null });

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contact/messages');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const filtered = messages.filter(m =>
    (m.name || '').toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.message.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkRead = async (id) => {
    try {
      await fetch(`/api/contact/messages?id=${id}`, { method: 'PUT' });
      fetchMessages();
      if (selectedMessage && selectedMessage.id === id) {
          setSelectedMessage({...selectedMessage, status: 'Read'});
      }
    } catch(e) { console.error(e); }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      onConfirm: async () => {
        try {
          await fetch(`/api/contact/messages?id=${id}`, { method: 'DELETE' });
          fetchMessages();
          if (selectedMessage && selectedMessage.id === id) {
            setSelectedMessage(null);
          }
          showToast('Message deleted', 'success');
        } catch(e) { console.error(e); }
      },
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
              <li className="admin-nav-item active">
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

      <main className="admin-main" style={{display: 'flex', flexDirection: 'column'}}>
        <header className="admin-header">
          <div className="admin-header-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1 style={{ margin: '0 0 4px 0', lineHeight: 1 }}>Contact Messages</h1>
            <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>Read and manage inquiries from the contact form.</p>
          </div>
          <div className="header-right">
            <div className="admin-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)} style={{width: '260px'}} />
            </div>
          </div>
        </header>

        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <span className="stat-card-title">Total Messages</span>
            <span className="stat-card-value">{messages.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">Unread</span>
            <span className="stat-card-value">{messages.filter(m => m.status === 'Unread').length}</span>
          </div>
        </div>

        <div style={{display: 'flex', gap: '24px', flex: 1, minHeight: 0}}>
          <div className="admin-table-container" style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column'}}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#888' }}>Loading messages...</div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px'}}>
                {filtered.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)'}}>No messages found.</div>
                ) : (
                  filtered.map(msg => (
                    <div key={msg.id} onClick={() => setSelectedMessage(msg)} style={{
                      padding: '16px', 
                      background: selectedMessage?.id === msg.id ? 'var(--admin-hover)' : '#fff',
                      border: '1px solid var(--admin-border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                          {msg.status === 'Unread' && <div style={{width: '8px', height: '8px', borderRadius: '50%', background: '#10B981'}}></div>}
                          <span style={{fontWeight: 600, color: 'var(--admin-text-main)'}}>{msg.name}</span>
                        </div>
                        <span style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)'}}>
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{fontWeight: 500, fontSize: '0.9rem'}}>{msg.subject || 'No Subject'}</div>
                      <div style={{fontSize: '0.85rem', color: 'var(--admin-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{flex: 1, background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto'}}>
            {selectedMessage ? (
              <>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '24px'}}>
                  <div>
                    <h2 style={{fontSize: '1.25rem', marginBottom: '8px'}}>{selectedMessage.subject || 'No Subject'}</h2>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--admin-text-muted)'}}>
                      <span style={{fontWeight: 600, color: 'var(--admin-text-main)'}}>{selectedMessage.name}</span>
                      <span>&lt;{selectedMessage.email}&gt;</span>
                    </div>
                    <div style={{fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '4px'}}>
                      Received on {new Date(selectedMessage.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {selectedMessage.status === 'Unread' && (
                      <button onClick={() => handleMarkRead(selectedMessage.id)} style={{padding: '6px 12px', background: '#F3F4F6', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500}}>Mark Read</button>
                    )}
                    <button onClick={() => handleDelete(selectedMessage.id)} style={{padding: '6px 12px', background: '#FEE2E2', color: '#DC2626', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500}}>Delete</button>
                  </div>
                </div>
                <div style={{lineHeight: 1.6, fontSize: '0.95rem', color: 'var(--admin-text-main)', whiteSpace: 'pre-wrap'}}>
                  {selectedMessage.message}
                </div>
                <div style={{marginTop: 'auto', paddingTop: '24px'}}>
                  <a href={`mailto:${selectedMessage.email}`} style={{display: 'inline-block', padding: '10px 20px', background: 'var(--admin-text-main)', color: '#fff', borderRadius: '8px', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none'}}>Reply to {selectedMessage.name}</a>
                </div>
              </>
            ) : (
              <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: '0.95rem'}}>
                Select a message to read
              </div>
            )}
          </div>
          <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmModal.onConfirm || (() => {})}
            title="Delete this message?"
            description="This message will be permanently removed."
            confirmLabel="Delete"
            variant="danger"
          />
    </div>

      </main>
    </>
  );
}