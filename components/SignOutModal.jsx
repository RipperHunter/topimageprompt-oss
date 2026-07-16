"use client";
import React from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignOutModal({ isOpen, onClose, onConfirm }) {
  const router = useRouter();
  
  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (onConfirm) {
      onConfirm();
    } else {
      await signOut({ redirect: false });
      router.push('/');
      router.refresh();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-light)', border: '1px solid var(--border-light)',
        borderRadius: '16px', padding: '2.5rem 2rem', maxWidth: '400px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: '1' }}>🥺</div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Leaving so soon?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5', fontSize: '0.95rem' }}>
          Leaving the vault so soon? The pixels will miss you. Are you absolutely sure you want to log out and face the un-prompted real world?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
          <button className="btn-black" onClick={handleConfirm} style={{ width: '100%', background: '#DC2626', color: '#fff', border: 'none' }}>
            Yes, let me escape
          </button>
          <button className="btn-outline" onClick={onClose} style={{ width: '100%' }}>
            Nevermind, I'll stay
          </button>
        </div>
      </div>
    </div>
  );
}
