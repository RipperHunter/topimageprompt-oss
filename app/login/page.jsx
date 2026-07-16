"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import '../auth.css';

export default function Login() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginImages, setLoginImages] = useState([]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
      router.refresh();
    }
  }, [status, router]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.loginImages) {
          let parsed = [];
          try {
             parsed = typeof data.settings.loginImages === 'string' ? JSON.parse(data.settings.loginImages) : data.settings.loginImages;
          } catch(e) {
             parsed = [data.settings.loginImages];
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLoginImages(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Social sign-in: OAuth providers not yet configured — show informational message
  const handleSocialSignIn = (providerName) => {
    setError(`${providerName} sign-in is not yet available. Please use email and password.`);
  };

  const fallbackImages = ['/demo/abstract.svg', '/demo/cyber.svg', '/demo/monochrome.svg', '/demo/abstract.svg', '/demo/fantasy.svg', '/demo/landscape.svg', '/demo/portrait.svg'];
  const getImg = (idx) => {
    const sourceArray = loginImages.length > 0 ? loginImages : fallbackImages;
    return sourceArray[idx % sourceArray.length];
  };

  const renderScrollImage = (idx) => (
    <Image
      key={idx}
      src={getImg(idx)}
      className="scroll-img"
      alt="AI artwork preview"
      width={180}
      height={240}
      loading="lazy"
      style={{ objectFit: 'cover' }}
    />
  );

  return (
    <>
      <div className="auth-container">
    
    {/* Left Scrolling Tilted Images */}
    <div className="auth-side left">
      <div className="scroll-track-wrapper">
        <div className="scroll-track">
          {[0,1,2,3,4,5].map(renderScrollImage)}
        </div>
        <div className="scroll-track reverse">
          {[6,7,8,9,10,11].map(renderScrollImage)}
        </div>
        <div className="scroll-track">
          {[12,13,14,15,16,17].map(renderScrollImage)}
        </div>
      </div>
    </div>

    {/* Center Card */}
    <div className="auth-center">
      <div className="auth-card">
        <div className="auth-logo">
          <BrandLogo height={38} priority />
        </div>
        
        <h1 className="auth-title">Sign in to your account<span className="auth-title-dot" style={{color: '#3b82f6'}}>.</span></h1>
        <p className="auth-subtitle">Welcome back to topimageprompt.</p>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#DC2626', fontSize: '0.9rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Social Sign-In Options */}
        <div className="social-btns" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <button onClick={() => signIn('google', { callbackUrl: '/' })} className="btn-social" type="button" disabled={loading} style={{ justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ marginLeft: '8px' }}>Continue with Google</span>
          </button>
        </div>

        <div className="auth-divider">or continue with email</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <div className="form-input-container">
              <input type="email" id="email" className="form-input" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <label className="form-label" htmlFor="password">Password</label>
            </div>
            <div className="form-input-container">
              <input type={showPassword ? 'text' : 'password'} id="password" className="form-input password-input" placeholder="••••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
              <div className="password-toggle" onClick={() => setShowPassword(!showPassword)} style={{cursor:'pointer'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              </div>
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer-link">
          Don&apos;t have an account? <Link href="/signup">Sign up <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '2px', verticalAlign: 'text-bottom'}}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></Link>
        </div>
      </div>
    </div>

    {/* Right Scrolling Tilted Images */}
    <div className="auth-side right">
      <div className="scroll-track-wrapper">
        <div className="scroll-track reverse">
          {[18,19,20,21,22,23].map(renderScrollImage)}
        </div>
        <div className="scroll-track">
          {[24,25,26,27,28,29].map(renderScrollImage)}
        </div>
        <div className="scroll-track reverse">
          {[30,31,32,33,34,35].map(renderScrollImage)}
        </div>
      </div>
    </div>

  </div>
    </>
  );
}
