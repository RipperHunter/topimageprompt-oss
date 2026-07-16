"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from "@/components/ui/Toast";

export default function CopyPromptButton({ prompt, idx }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = (text, promptId) => {
    navigator.clipboard.writeText(text).catch(() => {});
    
    // Track the event
    if (promptId) {
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventType: 'copy_prompt', promptId, source: 'Collection' })
        }).catch(() => {});
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Prompt copied to clipboard!', 'success');
  };

  const handleDownloadImage = async (downloadUrl, title) => {
    try {
      showToast('Downloading original image...', 'info');
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
      showToast('Download complete!', 'success');
    } catch (e) {
      console.error('Download failed', e);
      window.open(downloadUrl, '_blank');
      showToast('Could not auto-download. Opened in new tab.', 'warning');
    }
  };

  return (
    <Link 
      href={`/prompt/${prompt.slug || prompt.id}`} 
      className="explore-masonry-card"
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <Image 
        src={prompt.imageUrl || '/images/placeholder.png'} 
        alt={prompt.title || ''} 
        width={400}
        height={300}
        style={{ 
          width: '100%',
          height: 'auto',
          maxHeight: '400px',
          display: 'block',
          objectFit: 'cover',
          aspectRatio: prompt.aspectRatio === '9:16' ? '3/4' : prompt.aspectRatio === '1:1' ? '1/1' : '16/9' 
        }} 
        loading="lazy"
        quality={75}
        sizes="(max-width: 768px) 100vw, 400px"
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
        <span>{copied ? "Copied" : "Copy"}</span>
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

        {/* Top-Right Arrow Action */}
        <div className="card-action-icon" title="View details">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
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
            <span>{copied ? "Copied!" : "Copy Prompt"}</span>
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
  );
}