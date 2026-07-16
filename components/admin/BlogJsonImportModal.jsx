"use client";

import React, { useEffect, useRef, useState } from 'react';

const MAX_JSON_BYTES = 1024 * 1024;
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ITEMS = 25;
const IMAGE_FILE_PATTERN = /\.(jpe?g|png|webp|gif|tiff|avif)$/i;

const SAMPLE_BLOGS = [
  {
    title: 'A Practical AI Image Workflow Guide for 2026',
    slug: 'practical-ai-image-workflow-guide-2026',
    category: 'Guide',
    author: 'topimageprompt Team',
    heroImage: '',
    heroImageFile: 'your-cover-image.png',
    heroCaption: 'A concise description and image credit when required.',
    coverImageAlt: 'AI image workflow shown from prompt to final result',
    intro: 'A short opening that explains who this guide helps and what readers will accomplish.',
    tldr: 'Choose the right model, structure the prompt, test one variable at a time, and document the winning settings.',
    content: '## What you will build\n\nExplain the outcome first. Use short paragraphs, useful lists, and original examples.\n\n## Step-by-step workflow\n\n1. Define the visual goal.\n2. Select the model.\n3. Test and compare outputs.\n\n## Troubleshooting\n\nDocument real failure cases and their fixes.',
    tags: ['AI image generation', 'prompt engineering', 'workflow'],
    readTime: '8 min read',
    faq: [
      { q: 'Which model should beginners use?', a: 'Start with the model that best matches the required output, budget, and available workflow.' },
    ],
    citations: ['https://example.com/primary-source'],
    seoTitle: 'Practical AI Image Workflow Guide (2026)',
    metaDescription: 'Follow a practical AI image workflow with tested prompting, iteration, troubleshooting, and production steps.',
    canonicalUrl: '',
    authorBioUrl: '',
    visibility: 'Public',
    published: false,
    featuredOnHome: false,
    isHeroPost: false,
    noindex: false,
    nofollow: false,
  },
];

function normalizeCoverFileName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().split(/[\\/]/).pop()?.toLowerCase() || '';
}

function imageMimeType(filename) {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'avif') return 'image/avif';
  if (extension === 'tif' || extension === 'tiff') return 'image/tiff';
  return 'application/octet-stream';
}

function parseImportText(value) {
  const parsed = JSON.parse(value);
  const posts = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.posts)
      ? parsed.posts
      : parsed && typeof parsed === 'object' && parsed.title
        ? [parsed]
        : null;

  if (!posts) throw new Error('Use one blog object, an array of blog objects, or { "posts": [...] }.');
  if (posts.length === 0) throw new Error('The JSON file does not contain any posts.');
  if (posts.length > MAX_ITEMS) throw new Error(`Import up to ${MAX_ITEMS} posts at a time.`);
  posts.forEach((post, index) => {
    if (!post || typeof post !== 'object' || Array.isArray(post)) {
      throw new Error(`Item ${index + 1} must be a JSON object.`);
    }
    if (typeof post.title !== 'string' || !post.title.trim()) {
      throw new Error(`Item ${index + 1} is missing a title.`);
    }
  });
  return posts;
}

async function readBlogZip(file) {
  const { unzipSync } = await import('fflate');
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const entryNames = Object.keys(entries).filter((name) => !name.endsWith('/'));
  const jsonName = entryNames.find((name) => normalizeCoverFileName(name) === 'blogs.json')
    || entryNames.find((name) => normalizeCoverFileName(name) === 'manifest.json')
    || entryNames.find((name) => name.toLowerCase().endsWith('.json'));
  if (!jsonName) throw new Error('ZIP package must contain blogs.json.');

  const jsonText = new TextDecoder().decode(entries[jsonName]);
  const coverFiles = entryNames
    .filter((name) => IMAGE_FILE_PATTERN.test(name))
    .map((name) => {
      const filename = name.split(/[\\/]/).pop();
      return new File([entries[name]], filename, { type: imageMimeType(filename) });
    });
  return { jsonText, jsonName, coverFiles };
}

export default function BlogJsonImportModal({ isOpen, onClose, onImported }) {
  const packageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('');
  const [coverFiles, setCoverFiles] = useState([]);
  const [posts, setPosts] = useState([]);
  const [forceDraft, setForceDraft] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isImporting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isImporting, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setFileName('');
      setCoverFiles([]);
      setPosts([]);
      setForceDraft(true);
      setUpdateExisting(false);
      setError('');
      setDetails([]);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const inspectJson = (value) => {
    setJsonText(value);
    setResult(null);
    setDetails([]);
    try {
      setPosts(parseImportText(value));
      setError('');
    } catch (parseError) {
      setPosts([]);
      setError(parseError instanceof SyntaxError ? `Invalid JSON: ${parseError.message}` : parseError.message);
    }
  };

  const handlePackageFile = async (file) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.json') && !lowerName.endsWith('.zip')) {
      setError('Choose a .json file or a .zip package.');
      return;
    }
    if (lowerName.endsWith('.json') && file.size > MAX_JSON_BYTES) {
      setError('The JSON file must be 1 MB or smaller.');
      return;
    }
    if (lowerName.endsWith('.zip') && file.size > MAX_PACKAGE_BYTES) {
      setError('The ZIP package must be 100 MB or smaller.');
      return;
    }

    try {
      if (lowerName.endsWith('.zip')) {
        const bundle = await readBlogZip(file);
        if (bundle.coverFiles.length > MAX_ITEMS) throw new Error(`ZIP packages can contain at most ${MAX_ITEMS} cover images.`);
        const oversized = bundle.coverFiles.find((cover) => cover.size > MAX_IMAGE_BYTES);
        if (oversized) throw new Error(`${oversized.name} must be 10 MB or smaller.`);
        setFileName(`${file.name} / ${bundle.jsonName}`);
        setCoverFiles(bundle.coverFiles);
        inspectJson(bundle.jsonText);
      } else {
        setFileName(file.name);
        setCoverFiles([]);
        inspectJson(await file.text());
      }
    } catch (packageError) {
      setPosts([]);
      setCoverFiles([]);
      setError(packageError.message || 'Could not read the blog package.');
    }
  };

  const handleCoverFiles = (fileList) => {
    const selected = Array.from(fileList || []);
    if (selected.length > MAX_ITEMS) {
      setError(`Choose at most ${MAX_ITEMS} cover images.`);
      return;
    }
    const invalid = selected.find((file) => !IMAGE_FILE_PATTERN.test(file.name) || file.size <= 0 || file.size > MAX_IMAGE_BYTES);
    if (invalid) {
      setError(`${invalid.name} must be a supported image between 1 byte and 10 MB.`);
      return;
    }
    const names = selected.map((file) => normalizeCoverFileName(file.name));
    if (new Set(names).size !== names.length) {
      setError('Two selected cover images have the same filename.');
      return;
    }
    setCoverFiles(selected);
    setError('');
    setResult(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_BLOGS, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'topimageprompt-blog-import-template.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const selectedImageNames = new Set(coverFiles.map((file) => normalizeCoverFileName(file.name)));
  const postsWithCoverFiles = posts.filter((post) => post.heroImageFile);
  const missingCoverFiles = postsWithCoverFiles
    .map((post) => post.heroImageFile)
    .filter((filename) => !selectedImageNames.has(normalizeCoverFileName(filename)));
  const matchedCoverCount = postsWithCoverFiles.length - missingCoverFiles.length;

  const handleImport = async () => {
    if (posts.length === 0 || isImporting) return;
    if (missingCoverFiles.length > 0) {
      setError(`Add the missing cover image${missingCoverFiles.length === 1 ? '' : 's'}: ${missingCoverFiles.join(', ')}`);
      return;
    }
    setIsImporting(true);
    setError('');
    setDetails([]);
    try {
      const formData = new FormData();
      formData.append('payload', JSON.stringify({ posts, forceDraft, updateExisting }));
      coverFiles.forEach((file) => formData.append('coverImages', file, file.name));
      const response = await fetch('/api/admin/blogs/json-import', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setDetails(data.validationErrors || data.duplicates || []);
        throw new Error(data.error || 'Import failed.');
      }
      setResult(data);
      if (onImported) await onImported(data);
    } catch (importError) {
      setError(importError.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="blog-json-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isImporting) onClose();
    }}>
      <section className="blog-json-modal" role="dialog" aria-modal="true" aria-labelledby="blog-json-title">
        <header className="blog-json-header">
          <div>
            <span className="blog-json-kicker">Fast publishing workflow</span>
            <h2 id="blog-json-title">Import blogs with cover images</h2>
            <p>Upload JSON plus selected covers, or one ZIP containing blogs.json and every image.</p>
          </div>
          <button type="button" className="blog-json-close" aria-label="Close blog importer" onClick={onClose} disabled={isImporting}>×</button>
        </header>

        {result ? (
          <div className="blog-json-success">
            <div className="blog-json-success-icon">✓</div>
            <h3>
              {result.created ? `${result.created} ${result.created === 1 ? 'article' : 'articles'} created` : ''}
              {result.created && result.updated ? ' · ' : ''}
              {result.updated ? `${result.updated} ${result.updated === 1 ? 'article' : 'articles'} updated` : ''}
            </h3>
            <p>
              {result.updated
                ? 'Existing articles kept their publish, visibility, homepage, and hero status.'
                : result.forceDraft
                  ? 'They are saved as drafts and ready for review.'
                  : 'Their publication status was taken from the JSON file.'}
            </p>
            {result.imagesUploaded > 0 && <p>{result.imagesUploaded} cover {result.imagesUploaded === 1 ? 'image was' : 'images were'} processed and attached.</p>}
            <div className="blog-json-result-list">
              {result.posts.map((post) => (
                <div key={post.id}>
                  <span>{post.title}</span>
                  <small>{post.operation === 'updated' ? 'Updated' : post.published ? 'Created · Published' : 'Created · Draft'}</small>
                </div>
              ))}
            </div>
            <button type="button" className="admin-btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="blog-json-actions">
              <button type="button" className="blog-json-template" onClick={downloadTemplate}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                Download template
              </button>
              <button type="button" className="blog-json-file-button" onClick={() => packageInputRef.current?.click()}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Choose JSON or ZIP
              </button>
              <button type="button" className="blog-json-file-button" onClick={() => imageInputRef.current?.click()}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                Choose cover images
              </button>
              <input ref={packageInputRef} type="file" accept="application/json,.json,application/zip,.zip" hidden onChange={(event) => { handlePackageFile(event.target.files?.[0]); event.target.value = ''; }} />
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,image/avif" multiple hidden onChange={(event) => { handleCoverFiles(event.target.files); event.target.value = ''; }} />
            </div>

            <label className="blog-json-label" htmlFor="blog-json-input">
              JSON content
              <span>{fileName || 'Paste JSON, choose JSON + covers, or upload one ZIP package'}</span>
            </label>
            <textarea
              id="blog-json-input"
              className="blog-json-input"
              value={jsonText}
              onChange={(event) => inspectJson(event.target.value)}
              spellCheck="false"
              placeholder={'[\n  {\n    "title": "Your article title",\n    "heroImageFile": "your-cover.png",\n    "content": "## First section\\n\\nArticle content...",\n    "published": false\n  }\n]'}
            />

            {error && <div className="blog-json-error" role="alert">{error}</div>}
            {posts.length > 0 && coverFiles.length > 0 && (
              <div className={`blog-json-cover-summary ${missingCoverFiles.length > 0 ? 'has-missing' : ''}`}>
                <strong>{matchedCoverCount} of {postsWithCoverFiles.length} referenced covers matched</strong>
                <span>{coverFiles.length} image {coverFiles.length === 1 ? 'file' : 'files'} selected</span>
              </div>
            )}
            {posts.length > 0 && missingCoverFiles.length > 0 && (
              <div className="blog-json-error" role="alert">Missing cover images: {missingCoverFiles.join(', ')}</div>
            )}
            {details.length > 0 && (
              <div className="blog-json-error-list">
                {details.slice(0, 8).map((item, index) => (
                  <div key={`${item.slug || item.title || 'error'}-${index}`}>
                    <strong>{item.title || item.slug || `Item ${(item.index ?? index) + 1}`}</strong>
                    <span>{item.error || 'This slug already exists.'}</span>
                  </div>
                ))}
              </div>
            )}

            {posts.length > 0 && !error && (
              <div className="blog-json-preview">
                <div className="blog-json-preview-title"><strong>Ready to import</strong><span>{posts.length} {posts.length === 1 ? 'article' : 'articles'}</span></div>
                <div className="blog-json-preview-list">
                  {posts.slice(0, 6).map((post, index) => (
                    <div key={`${post.slug || post.title}-${index}`}>
                      <span>{post.title}</span>
                      <small>
                        {updateExisting ? 'Update if matched' : forceDraft ? 'Draft' : post.published ? 'Published' : 'Draft'} · {post.category || 'Guide'}
                        {post.heroImageFile ? ` · ${selectedImageNames.has(normalizeCoverFileName(post.heroImageFile)) ? 'Cover matched' : 'Cover missing'}` : post.heroImage ? ' · Cover URL' : ' · No cover'}
                      </small>
                    </div>
                  ))}
                  {posts.length > 6 && <div className="blog-json-more">+ {posts.length - 6} more</div>}
                </div>
              </div>
            )}

            <footer className="blog-json-footer">
              <div className="blog-json-import-options">
                <label className="blog-json-draft-option">
                  <input type="checkbox" checked={forceDraft} onChange={(event) => setForceDraft(event.target.checked)} />
                  <span><strong>Import new articles as drafts</strong><small>Recommended so you can preview before publishing.</small></span>
                </label>
                <label className="blog-json-draft-option">
                  <input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} />
                  <span><strong>Update matching slugs</strong><small>Also replaces a broken cover when the package supplies a new image.</small></span>
                </label>
              </div>
              <div className="blog-json-footer-actions">
                <button type="button" className="blog-json-cancel" onClick={onClose} disabled={isImporting}>Cancel</button>
                <button type="button" className="admin-btn-primary" onClick={handleImport} disabled={posts.length === 0 || Boolean(error) || missingCoverFiles.length > 0 || isImporting}>
                  {isImporting ? 'Uploading and processing…' : `Process ${posts.length || ''} ${posts.length === 1 ? 'article' : 'articles'}`}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
