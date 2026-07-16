import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: '60px 32px'
    }}>
      <h1 style={{
        fontSize: '8rem',
        fontWeight: '800',
        lineHeight: '1',
        letterSpacing: '-0.04em',
        color: 'var(--text-main)',
        marginBottom: '24px'
      }}>
        404<span style={{color: '#3b82f6'}}>.</span>
      </h1>

      <h2 style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: 'var(--text-main)',
        marginBottom: '16px'
      }}>
        Lost in the Latent Space
      </h2>

      <p style={{
        fontSize: '1.1rem',
        color: 'var(--text-muted)',
        maxWidth: '500px',
        marginBottom: '40px',
        lineHeight: '1.6'
      }}>
        The prompt or page you are looking for doesn&apos;t exist. It might have been deleted, or perhaps the AI hasn&apos;t hallucinated it yet.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          className="btn-black"
          style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '9999px', textDecoration: 'none' }}
        >
          Return to Vault
        </Link>
        <Link
          href="/explore"
          className="btn-outline"
          style={{ padding: '14px 28px', fontSize: '1rem', borderRadius: '9999px', textDecoration: 'none' }}
        >
          Browse Prompts
        </Link>
      </div>
    </main>
  );
}