"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import SignOutModal from '@/components/SignOutModal';
import { useToast } from '@/components/ui/Toast';
import './admin-blog-editor.css';

function AdminBlogEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [visibility, setVisibility] = useState('Public');
  const [featuredOnHome, setFeaturedOnHome] = useState(false);
  const [category, setCategory] = useState('Masterclass');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [isHeroPost, setIsHeroPost] = useState(false);
  
  // New SEO/AEO/GEO State
  const [seoTitle, setSeoTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [coverImageAlt, setCoverImageAlt] = useState('');
  const [noindex, setNoindex] = useState(false);
  const [nofollow, setNofollow] = useState(false);
  const [faq, setFaq] = useState([]); // Array of { q, a }
  const [tldr, setTldr] = useState('');
  const [citations, setCitations] = useState([]); // Array of strings
  const [authorBioUrl, setAuthorBioUrl] = useState('');
  const [activeSidebarTab, setActiveSidebarTab] = useState('publishing'); // 'publishing' | 'seo'

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);

  const editorRef = useRef(null);
  const coverInputRef = useRef(null);
  const inlineInputRef = useRef(null);

  useEffect(() => {
    if (editId) {
      fetch(`/api/blog/${editId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setTitle(data.title || '');
            setContent(typeof data.content === 'string' ? data.content : JSON.stringify(data.content));
            setCoverImage(data.heroImage || '');
            setVisibility(data.visibility || 'Public');
            setFeaturedOnHome(data.featuredOnHome || false);
            setCategory(data.category || 'Masterclass');
            setTags(Array.isArray(data.tags) ? data.tags : []);
            setSlug(data.slug || '');
            setExcerpt(data.intro || '');
            setIsHeroPost(data.isHeroPost || false);
            setSeoTitle(data.seoTitle || '');
            setMetaDescription(data.metaDescription || '');
            setCanonicalUrl(data.canonicalUrl || '');
            setCoverImageAlt(data.coverImageAlt || '');
            setNoindex(data.noindex || false);
            setNofollow(data.nofollow || false);
            setFaq(Array.isArray(data.faq) ? data.faq : []);
            setTldr(data.tldr || '');
            setCitations(Array.isArray(data.citations) ? data.citations : []);
            setAuthorBioUrl(data.authorBioUrl || '');

            if (editorRef.current) {
              let htmlContent = '';
              try {
                const parsed = JSON.parse(data.content);
                if (Array.isArray(parsed)) {
                  htmlContent = parsed.map(p => p.text).join('<br/>');
                } else {
                  htmlContent = data.content;
                }
              } catch(e) {
                htmlContent = data.content;
              }
              editorRef.current.innerHTML = htmlContent;
            }
          }
        });
    }
  }, [editId]);

  const handleSave = async (publish = false) => {
    setIsSaving(true);
    const postData = {
      title,
      content: editorRef.current ? editorRef.current.innerHTML : content,
      heroImage: coverImage,
      visibility,
      featuredOnHome,
      category,
      tags,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      intro: excerpt,
      isHeroPost,
      published: publish,
      seoTitle,
      metaDescription,
      canonicalUrl,
      coverImageAlt,
      noindex,
      nofollow,
      faq,
      tldr,
      citations,
      authorBioUrl,
    };

    try {
      const url = editId ? `/api/blog/${editId}` : '/api/blog';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        const savedPost = await res.json();
        showToast(publish ? 'Post published successfully!' : 'Draft saved!', 'success');
        if (publish) {
          router.push('/admin/blog');
        } else {
          if (!editId) {
            router.replace(`/admin/blog/editor?id=${savedPost.id}`);
          }
          router.refresh();
        }
      } else {
        const error = await res.json();
        showToast(`Error: ${error.error}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save post', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleLinkInsert = () => {
    const url = prompt('Enter link URL:');
    if (url) handleFormat('createLink', url);
  };

  // ── Image upload helper (same pipeline as prompt images → WebP) ─────────
  const uploadImageFile = async (file, onSuccess, setUploading) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSuccess(data.url || data.imageUrl);
      showToast('Image uploaded & compressed to WebP ✓', 'success');
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Markdown auto-conversion on Space / Enter ────────────────────────────
  const applyMarkdownLine = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;

    // Get current text node / block
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    // Walk up to find block element inside editor
    let block = node;
    while (block && block !== editorRef.current && block.parentNode !== editorRef.current) {
      block = block.parentNode;
    }
    if (!block || block === editorRef.current) block = node;

    const text = (block.textContent || block.innerText || '').trimEnd();

    // ## H2
    if (/^##\s/.test(text)) {
      document.execCommand('formatBlock', false, 'H2');
      // Remove the ## prefix
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^##\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    // ### H3
    if (/^###\s/.test(text)) {
      document.execCommand('formatBlock', false, 'H3');
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^###\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    // # H1
    if (/^#\s/.test(text)) {
      document.execCommand('formatBlock', false, 'H1');
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^#\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    // > blockquote
    if (/^>\s/.test(text)) {
      document.execCommand('formatBlock', false, 'BLOCKQUOTE');
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^>\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    // - bullet list
    if (/^-\s/.test(text)) {
      document.execCommand('insertUnorderedList');
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^-\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    // 1. numbered list
    if (/^\d+\.\s/.test(text)) {
      document.execCommand('insertOrderedList');
      setTimeout(() => {
        const el = window.getSelection()?.anchorNode?.parentElement;
        if (el) el.innerText = el.innerText.replace(/^\d+\.\s+/, '');
        placeCaretAtEnd(el);
      }, 0);
      return true;
    }
    return false;
  };

  // Apply inline markdown (bold, italic, strike, code, link, image) to full node text
  const applyInlineMarkdown = (nodeEl) => {
    if (!nodeEl) return;
    let html = nodeEl.innerHTML;

    // ~~strikethrough~~
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
    // **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // *italic*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // `code`
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.9em;">$1</code>');
    // ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;" />');
    // [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    if (html !== nodeEl.innerHTML) {
      nodeEl.innerHTML = html;
      placeCaretAtEnd(nodeEl);
    }
  };

  const placeCaretAtEnd = (el) => {
    if (!el) return;
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };


  const handleEditorKeyDown = (e) => {
    // ── Markdown triggers on Space or Enter ───────────────────────────────
    if (e.key === ' ') {
      const converted = applyMarkdownLine();
      // If a block-level markdown was applied, let browser insert the space
      // For inline, apply after letting char land (handled in onInput)
      if (converted) return; // let the space land normally
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      // First apply any inline markdown on current node
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode?.parentElement;
        if (node && editorRef.current?.contains(node)) {
          applyInlineMarkdown(node);
        }
      }
      // Then try block-level conversion (e.g. user typed ## then Enter)
      applyMarkdownLine();
    }

    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;
    if (!ctrl) return;

    switch (e.key.toLowerCase()) {
      case 'b': // Bold
        e.preventDefault();
        handleFormat('bold');
        break;
      case 'i': // Italic
        e.preventDefault();
        handleFormat('italic');
        break;
      case 'u': // Underline
        e.preventDefault();
        handleFormat('underline');
        break;
      case 'k': // Link
        e.preventDefault();
        handleLinkInsert();
        break;
      case 'h': // H1
        e.preventDefault();
        handleFormat('formatBlock', 'H1');
        break;
      case '2': // H2
        e.preventDefault();
        handleFormat('formatBlock', 'H2');
        break;
      case 'q': // Blockquote
        e.preventDefault();
        handleFormat('formatBlock', 'BLOCKQUOTE');
        break;
      case '`': // Code block
        e.preventDefault();
        handleFormat('insertHTML', '<pre><code>Code block</code><br/></pre>');
        break;
      case 'l': // Bullet list (Ctrl+Shift+L)
        if (e.shiftKey) {
          e.preventDefault();
          handleFormat('insertUnorderedList');
        }
        break;
      case 'o': // Numbered list (Ctrl+Shift+O)
        if (e.shiftKey) {
          e.preventDefault();
          handleFormat('insertOrderedList');
        }
        break;
      case 's': // Save draft
        e.preventDefault();
        handleSave(false);
        break;
      case 'enter': // Ctrl+Enter to publish
        e.preventDefault();
        handleSave(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <div className="header-left">
          <Link href="/admin/blog" className="back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Articles
          </Link>
          <div className="header-divider"></div>
          <div className="post-status">
            {editId ? (visibility === 'Public' ? 'Published' : 'Draft') : 'Draft'} — {title || 'Untitled Post'}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn-secondary">Preview</button>
          <button className="btn-primary" onClick={() => handleSave(true)} disabled={isSaving}>
            Publish
          </button>
        </div>
      </header>

      <div className="editor-main">
        <div className="editor-content-area">
          <div className="editor-content-inner">
            {/* Hidden file input for cover image */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImageFile(file, setCoverImage, setIsUploadingCover);
                e.target.value = '';
              }}
            />

            {!coverImage ? (
              <div
                className="cover-image-upload"
                onClick={() => coverInputRef.current?.click()}
                style={{ cursor: isUploadingCover ? 'wait' : 'pointer' }}
              >
                {isUploadingCover ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    <span>Uploading & compressing...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span>Click to upload cover image (auto-compressed to WebP)</span>
                  </>
                )}
              </div>
            ) : (
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => coverInputRef.current?.click()} title="Click to change cover image">
                <Image src={coverImage} alt="Blog cover preview" width={960} height={540} className="cover-image-preview" style={{ objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
                  transition: 'background 0.2s', fontSize: '0.85rem', color: 'white', fontWeight: 600,
                  opacity: 0
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.background = 'rgba(0,0,0,0)'; }}
                >
                  {isUploadingCover ? 'Uploading...' : '📷 Change Cover'}
                </div>
              </div>
            )}

            <input
              type="text"
              className="title-input"
              placeholder="Post Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="title-input"
              placeholder="TL;DR / Key Takeaways (Optional AEO Summary)..."
              value={tldr}
              onChange={(e) => setTldr(e.target.value)}
              style={{ fontSize: '20px', fontWeight: 500, height: '80px', resize: 'none', marginBottom: '16px' }}
            />

            <div style={{ position: 'relative' }}>
              {/* Toolbar */}
              <div className="editor-toolbar">
                <button title="Bold (Ctrl+B)" onClick={() => handleFormat('bold')} style={{ fontWeight: 'bold' }}>B</button>
                <button title="Italic (Ctrl+I)" onClick={() => handleFormat('italic')} style={{ fontStyle: 'italic' }}>I</button>
                <button title="Underline (Ctrl+U)" onClick={() => handleFormat('underline')} style={{ textDecoration: 'underline' }}>U</button>
                <button title="Link (Ctrl+K)" onClick={handleLinkInsert}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </button>
                <div className="toolbar-divider"></div>
                <button title="Heading 1 (Ctrl+H)" onClick={() => handleFormat('formatBlock', 'H1')}>H1</button>
                <button title="Heading 2 (Ctrl+2)" onClick={() => handleFormat('formatBlock', 'H2')}>H2</button>
                <button title="Heading 3" onClick={() => handleFormat('formatBlock', 'H3')}>H3</button>
                <button title="Quote (Ctrl+Q)" onClick={() => handleFormat('formatBlock', 'BLOCKQUOTE')}>&quot;</button>
                <div className="toolbar-divider"></div>
                <button title="Bullet List (Ctrl+Shift+L)" onClick={() => handleFormat('insertUnorderedList')}>• List</button>
                <button title="Numbered List (Ctrl+Shift+O)" onClick={() => handleFormat('insertOrderedList')}>1. List</button>
                <div className="toolbar-divider"></div>
                <button title="Code Block (Ctrl+`)" onClick={() => handleFormat('insertHTML', '<pre><code>Code block</code><br/></pre>')}>&lt;/&gt;</button>
                <button title="Insert Table" onClick={() => {
                  const tableHtml = '<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:1em;"><thead><tr><th style="padding:8px;">Header 1</th><th style="padding:8px;">Header 2</th></tr></thead><tbody><tr><td style="padding:8px;">Row 1 Col 1</td><td style="padding:8px;">Row 1 Col 2</td></tr></tbody></table><p><br></p>';
                  handleFormat('insertHTML', tableHtml);
                }}>Table</button>
                {/* Hidden file input for inline images */}
                <input
                  ref={inlineInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImageFile(
                      file,
                      (url) => handleFormat('insertHTML', `<img src="${url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;" />`),
                      setIsUploadingInline
                    );
                    e.target.value = '';
                  }}
                />
                <button
                  title="Insert Image (upload & auto-compress to WebP)"
                  onClick={() => inlineInputRef.current?.click()}
                  disabled={isUploadingInline}
                  style={{ opacity: isUploadingInline ? 0.6 : 1 }}
                >
                  {isUploadingInline ? '⏳' : '🖼️'}
                </button>
                <button title="Divider" onClick={() => handleFormat('insertHorizontalRule')}>—</button>
                <button title="Custom HTML" onClick={() => {
                  const html = prompt('Enter custom HTML:');
                  if(html) handleFormat('insertHTML', html);
                }}>HTML</button>
                <div className="toolbar-divider"></div>
                {/* Shortcut hints */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#9CA3AF', paddingLeft: '4px', whiteSpace: 'nowrap' }}>
                  <kbd style={{ background: '#374151', border: '1px solid #4B5563', borderRadius: '3px', padding: '1px 5px', fontSize: '0.65rem', fontFamily: 'monospace' }}>Ctrl+S</kbd>
                  <span>Save</span>
                  <kbd style={{ background: '#374151', border: '1px solid #4B5563', borderRadius: '3px', padding: '1px 5px', fontSize: '0.65rem', fontFamily: 'monospace', marginLeft: '4px' }}>Ctrl+↵</kbd>
                  <span>Publish</span>
                </div>
              </div>

              {/* Editor */}
              <div
                ref={editorRef}
                className="rich-text-editor"
                contentEditable={true}
                data-placeholder="Start writing... Use markdown shortcuts: **bold** *italic* ~~strike~~ ## H2 ### H3 > quote - list `code` [link](url)"
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onKeyDown={handleEditorKeyDown}
                suppressContentEditableWarning={true}
              ></div>

              {/* Markdown Shortcuts Hint Bar */}
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                fontSize: '0.72rem',
                color: '#6B7280',
                lineHeight: 1.8,
                fontFamily: 'monospace',
                letterSpacing: '0.01em'
              }}>
                <span style={{ color: '#9CA3AF', fontFamily: 'sans-serif', fontWeight: 600, fontSize: '0.68rem', marginRight: '8px' }}>MARKDOWN</span>
                <span style={{ color: '#6366F1' }}>**bold**</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>*italic*</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>~~strike~~</span>
                {' · '}
                <span style={{ color: '#6366F1' }}># H1</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>## H2</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>### H3</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>- list</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>{'>'}  quote</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>[link](url)</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>![img](url)</span>
                {' · '}
                <span style={{ color: '#6366F1' }}>`code`</span>
                <br/>
                <span style={{ color: '#9CA3AF', fontFamily: 'sans-serif', fontWeight: 600, fontSize: '0.68rem', marginRight: '8px' }}>SHORTCUTS</span>
                <span>Ctrl+B Bold · Ctrl+I Italic · Ctrl+U Underline · Ctrl+K Link · Ctrl+H H1 · Ctrl+2 H2 · Ctrl+Q Quote · Ctrl+Shift+L Bullet · Ctrl+S Save · Ctrl+↵ Publish</span>
              </div>
            </div>

            {/* AEO / GEO Sections below editor */}
            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #eaeaea' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>FAQ (AEO Schema Block)</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Add Q&A pairs to generate native FAQPage JSON-LD schema.</p>
              {faq.map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <input type="text" placeholder="Question..." value={item.q} onChange={e => {
                    const newFaq = [...faq];
                    newFaq[i].q = e.target.value;
                    setFaq(newFaq);
                  }} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  <textarea placeholder="Answer..." value={item.a} onChange={e => {
                    const newFaq = [...faq];
                    newFaq[i].a = e.target.value;
                    setFaq(newFaq);
                  }} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', minHeight: '60px', resize: 'vertical' }} />
                  <button onClick={() => setFaq(faq.filter((_, index) => index !== i))} style={{ alignSelf: 'flex-end', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                </div>
              ))}
              <button onClick={() => setFaq([...faq, { q: '', a: '' }])} style={{ padding: '8px 16px', background: '#fff', border: '1px dashed #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>+ Add FAQ Item</button>
            </div>

            <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #eaeaea', marginBottom: '60px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Sources & Citations (GEO)</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Cite your sources to improve Generative Engine Trust.</p>
              {citations.map((cite, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input type="text" placeholder="Citation text or URL..." value={cite} onChange={e => {
                    const newCitations = [...citations];
                    newCitations[i] = e.target.value;
                    setCitations(newCitations);
                  }} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} />
                  <button onClick={() => setCitations(citations.filter((_, index) => index !== i))} style={{ padding: '0 12px', color: '#ef4444', background: '#fff', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer' }}>X</button>
                </div>
              ))}
              <button onClick={() => setCitations([...citations, ''])} style={{ padding: '8px 16px', background: '#fff', border: '1px dashed #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', color: '#4b5563', marginTop: '8px' }}>+ Add Citation</button>
            </div>

          </div>
        </div>


        <aside className="editor-sidebar">
          <div style={{ display: 'flex', borderBottom: '1px solid #eaeaea', marginBottom: '24px' }}>
            <button 
              style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeSidebarTab === 'publishing' ? '2px solid #111' : '2px solid transparent', fontWeight: activeSidebarTab === 'publishing' ? 600 : 400, color: activeSidebarTab === 'publishing' ? '#111' : '#6b7280', cursor: 'pointer' }}
              onClick={() => setActiveSidebarTab('publishing')}
            >Publishing</button>
            <button 
              style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', borderBottom: activeSidebarTab === 'seo' ? '2px solid #111' : '2px solid transparent', fontWeight: activeSidebarTab === 'seo' ? 600 : 400, color: activeSidebarTab === 'seo' ? '#111' : '#6b7280', cursor: 'pointer' }}
              onClick={() => setActiveSidebarTab('seo')}
            >SEO</button>
          </div>

          {activeSidebarTab === 'publishing' && (
            <>
              <div className="sidebar-section">
                <label className="sidebar-label">Visibility</label>
                <select
                  className="sidebar-select with-icon"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
                <div className="toggle-row">
                  <div
                    className="toggle-switch"
                    data-active={featuredOnHome}
                    onClick={() => setFeaturedOnHome(!featuredOnHome)}
                  ></div>
                  <span className="toggle-label">Feature this post on home</span>
                </div>
              </div>

              <div className="sidebar-section">
                <label className="sidebar-label">Category</label>
                <select
                  className="sidebar-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Masterclass">Masterclass</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Guide">Guide</option>
                  <option value="News">News</option>
                </select>
              </div>

              <div className="sidebar-section">
                <label className="sidebar-label">Tags</label>
                <div className="tags-container">
                  {tags.map((tag, i) => (
                    <div key={i} className="tag-pill">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    className="tag-input"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </div>

              <div className="sidebar-section">
                <label className="sidebar-label">Slug</label>
                <input
                  type="text"
                  className="sidebar-input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="https://your-domain.example/blog/..."
                />
              </div>

              <div className="sidebar-section">
                <label className="sidebar-label">Excerpt (Blog Listing)</label>
                <textarea
                  className="sidebar-textarea"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  maxLength={200}
                  placeholder="Brief description for blog listing..."
                ></textarea>
                <span className="char-count">{excerpt.length} characters</span>
              </div>
              
              <div className="sidebar-section">
                <label className="sidebar-label">Author Bio URL (E-E-A-T)</label>
                <input
                  type="url"
                  className="sidebar-input"
                  value={authorBioUrl}
                  onChange={(e) => setAuthorBioUrl(e.target.value)}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div className="sidebar-section">
                <label className="sidebar-label">Featured Post</label>
                <div className="featured-card">
                  <div className="featured-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                  </div>
                  <div className="featured-text">
                    <div className="featured-title">Set as Hero Post</div>
                    <div className="featured-desc">Display this post in the main featured position on the blog.</div>
                  </div>
                  <div
                    className="toggle-switch"
                    data-active={isHeroPost}
                    onClick={() => setIsHeroPost(!isHeroPost)}
                  ></div>
                </div>
              </div>
            </>
          )}

          {activeSidebarTab === 'seo' && (
            <>
              <div className="sidebar-section">
                <label className="sidebar-label">SEO Title</label>
                <input
                  type="text"
                  className="sidebar-input"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Leave blank to use post title"
                />
              </div>
              
              <div className="sidebar-section">
                <label className="sidebar-label">Meta Description</label>
                <textarea
                  className="sidebar-textarea"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={160}
                  placeholder="Optimal length ~150-160 chars"
                ></textarea>
                <span className="char-count">{metaDescription.length} / 160</span>
              </div>
              
              <div className="sidebar-section">
                <label className="sidebar-label">Canonical URL</label>
                <input
                  type="url"
                  className="sidebar-input"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              
              <div className="sidebar-section">
                <label className="sidebar-label">Cover Image Alt Text</label>
                <input
                  type="text"
                  className="sidebar-input"
                  value={coverImageAlt}
                  onChange={(e) => setCoverImageAlt(e.target.value)}
                  placeholder="Describe the cover image"
                />
              </div>
              
              <div className="sidebar-section">
                <div className="toggle-row" style={{ marginTop: '16px' }}>
                  <div
                    className="toggle-switch"
                    data-active={noindex}
                    onClick={() => setNoindex(!noindex)}
                  ></div>
                  <span className="toggle-label">Noindex (Hide from search)</span>
                </div>
                <div className="toggle-row" style={{ marginTop: '16px' }}>
                  <div
                    className="toggle-switch"
                    data-active={nofollow}
                    onClick={() => setNofollow(!nofollow)}
                  ></div>
                  <span className="toggle-label">Nofollow (Don't pass link equity)</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
      <SignOutModal isOpen={isSignOutModalOpen} onClose={() => setIsSignOutModalOpen(false)} onConfirm={() => signOut({ callbackUrl: '/login' })} />
    </div>
  );
}

export default function AdminBlogEditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading editor...</div>}>
      <AdminBlogEditorContent />
    </Suspense>
  );
}
