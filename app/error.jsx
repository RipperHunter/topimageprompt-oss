'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '24px',
      textAlign: 'center',
      background: 'var(--bg-color)',
      color: 'var(--text-main)'
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        background: 'rgba(239, 68, 68, 0.08)',
        color: '#EF4444',
        borderRadius: '50%',
        marginBottom: '24px'
      }}>
        <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        marginBottom: '16px',
        letterSpacing: '-0.025em'
      }}>
        Something went wrong!
      </h1>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '1.1rem',
        maxWidth: '500px',
        lineHeight: '1.6',
        marginBottom: '32px'
      }}>
        An unexpected server error occurred. Our team has been notified. Please try resetting the page or returning home.
      </p>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => reset()}
          className="btn-black"
          style={{ padding: '12px 28px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Try Again
        </button>
        <Link href="/">
          <button
            className="btn-outline"
            style={{ padding: '12px 28px', fontSize: '1rem', cursor: 'pointer' }}
          >
            Go Back Home
          </button>
        </Link>
      </div>
    </div>
  );
}
