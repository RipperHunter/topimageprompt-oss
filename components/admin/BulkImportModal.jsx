'use client';

/**
 * BulkImportModal.jsx
 *
 * Three-step admin modal for bulk-importing up to 250 prompts from a ZIP file.
 *
 * Step 1 – Upload: Drop zone + Ctrl+V clipboard paste for ZIP files
 * Step 2 – Preview: Table showing all manifest items before publishing
 * Step 3 – Progress: Live polling bar, failure list, results CSV download
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadCSV(results, failures) {
  const rows = [['external_id', 'status', 'promptId', 'slug', 'public_url', 'error']];
  for (const [extId, r] of Object.entries(results)) {
    rows.push([extId, 'success', r.promptId, r.slug, r.url, '']);
  }
  for (const f of failures) {
    rows.push([f.external_id, 'failed', '', '', '', f.error]);
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import_results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse manifest.json from a ZIP file using fflate (loaded dynamically in browser)
async function parseZipManifest(file) {
  const { unzipSync } = await import('fflate');
  const buf = await file.arrayBuffer();
  const files = unzipSync(new Uint8Array(buf));
  const manifestKey = Object.keys(files).find(k => k === 'manifest.json' || k.endsWith('/manifest.json'));
  if (!manifestKey) throw new Error('No manifest.json found in ZIP');
  const text = new TextDecoder().decode(files[manifestKey]);
  return JSON.parse(text);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = '#6366f1' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: '#1e1e2e', borderRadius: 8, overflow: 'hidden', height: 10 }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: `linear-gradient(90deg, ${color}, #818cf8)`,
        transition: 'width 0.4s ease',
        borderRadius: 8,
      }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { bg: '#374151', color: '#9ca3af', label: 'Pending' },
    running: { bg: '#1e3a5f', color: '#60a5fa', label: 'Running…' },
    complete: { bg: '#14532d', color: '#4ade80', label: 'Complete' },
    failed: { bg: '#450a0a', color: '#f87171', label: 'Failed' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=progress
  const [zipFile, setZipFile] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [manifestError, setManifestError] = useState('');
  const [publishMode, setPublishMode] = useState('publish'); // 'publish' | 'draft'
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  // ── Screen size detection to prevent SSR/hydration mismatch ──────────────────
  useEffect(() => {
    setIsDesktop(window.innerWidth > 600);
    const handleResize = () => setIsDesktop(window.innerWidth > 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Reset on close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setZipFile(null);
      setManifest(null);
      setManifestError('');
      setJobId(null);
      setJobState(null);
      setIsUploading(false);
      setIsParsing(false);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [isOpen]);

  // ── File chosen handler (shared between input, drop, paste) ────────────────
  const handleFileChosen = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.zip') && !file.type.includes('zip')) {
      setManifestError('Please select a .zip file');
      return;
    }
    setZipFile(file);
    setManifestError('');
    setIsParsing(true);
    try {
      const items = await parseZipManifest(file);
      if (!Array.isArray(items)) throw new Error('manifest.json must be a JSON array');
      if (items.length === 0) throw new Error('manifest.json is empty');
      if (items.length > 250) throw new Error(`Too many items: ${items.length} (max 250)`);
      setManifest(items);
      setStep(2);
    } catch (e) {
      setManifestError(`Could not read manifest: ${e.message}`);
      setManifest(null);
    }
    setIsParsing(false);
  }, []);

  // ── Ctrl+V clipboard paste ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || step !== 1) return;
    const handlePaste = async (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      
      // 1. Check for ZIP files
      const zipItem = items.find(i => i.type === 'application/zip' || i.type === 'application/x-zip-compressed');
      if (zipItem) {
        const file = zipItem.getAsFile();
        if (file) await handleFileChosen(file);
        return;
      }
      
      // Also accept files from file manager that are ZIP but have vague mime types
      const fileItem = items.find(i => i.kind === 'file');
      if (fileItem && fileItem.type === '') {
        const file = fileItem.getAsFile();
        if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
          await handleFileChosen(file);
          return;
        }
      }

      // 2. Check for pasted images (e.g. screenshots, copied image files)
      const imageItem = items.find(i => i.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
          setIsParsing(true);
          try {
            const { zipSync } = await import('fflate');
            const ext = file.type.split('/')[1] || 'png';
            const filename = `pasted_image_${Date.now()}.${ext}`;
            const manifest = [{
              external_id: `pasted_${Date.now()}`,
              title: `Pasted Image ${new Date().toLocaleDateString()}`,
              prompt: `Pasted image prompt`,
              engine: "Midjourney v6",
              category: "General",
              aspect_ratio: "1:1",
              tags: ["pasted"],
              image_filename: filename,
              publish: true
            }];
            const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
            const imageBytes = new Uint8Array(await file.arrayBuffer());
            
            const zipData = {};
            zipData["manifest.json"] = manifestBytes;
            zipData[filename] = imageBytes;

            const zipped = zipSync(zipData);
            const virtualZip = new File([zipped], `pasted_image_${Date.now()}.zip`, { type: "application/zip" });

            setZipFile(virtualZip);
            setManifest(manifest);
            setManifestError('');
            setStep(2);
          } catch (e) {
            setManifestError(`Failed to process pasted image: ${e.message}`);
          }
          setIsParsing(false);
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, step, handleFileChosen]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFileChosen(file);
  }, [handleFileChosen]);

  // ── Poll job status ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/prompts/import-jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setJobState(data);
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(pollRef.current);
          if (data.status === 'complete') onImportComplete?.();
        }
      } catch { /* network glitch, keep polling */ }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  // ── Start import ────────────────────────────────────────────────────────────
  const handleStartImport = async () => {
    if (!zipFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('package.zip', zipFile, 'package.zip');
      fd.append('publish_override', publishMode === 'publish' ? 'true' : 'false');
      const res = await fetch('/api/admin/prompts/bulk-import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setJobId(data.jobId);
      setJobState({ jobId: data.jobId, status: 'pending', total: data.total, done: 0, progressPercent: 0, failures: [], results: {} });
      setStep(3);
    } catch (e) {
      setManifestError(e.message);
    }
    setIsUploading(false);
  };

  if (!isOpen) return null;

  // ── Styles (inline, no Tailwind dependency) ─────────────────────────────────
  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  };
  const modal = {
    background: '#13131f', border: '1px solid #2a2a3e', borderRadius: 20,
    width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'auto',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    display: 'flex', flexDirection: 'column',
  };
  const header = {
    padding: '24px 28px 20px', borderBottom: '1px solid #1e1e2e',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  };
  const body = { padding: '24px 28px', flex: 1, overflow: 'auto' };
  const footer = {
    padding: '16px 28px', borderTop: '1px solid #1e1e2e',
    display: 'flex', gap: 12, justifyContent: 'flex-end',
  };
  const btnPrimary = {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
    border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 600,
    fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
  };
  const btnSecondary = {
    background: '#1e1e2e', color: '#a1a1b5', border: '1px solid #2a2a3e',
    borderRadius: 10, padding: '10px 22px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
  };
  const dropZone = {
    border: `2px dashed ${isDragging ? '#6366f1' : '#2a2a3e'}`,
    borderRadius: 16, padding: '56px 32px',
    textAlign: 'center', cursor: 'pointer',
    background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
    transition: 'all 0.2s ease',
  };

  // ── STEP 1 — Upload ─────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <div style={body}>
        <div
          ref={dropRef}
          style={dropZone}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <p style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            Drop your ZIP file here
          </p>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
            or click to browse — or press <kbd style={{ background: '#1e1e2e', border: '1px solid #374151', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>Ctrl+V</kbd> to paste
          </p>
          <p style={{ color: '#4b5563', fontSize: 12, marginTop: 12 }}>
            ZIP must contain <code style={{ background: '#1e1e2e', padding: '1px 4px', borderRadius: 3 }}>manifest.json</code> + image files · Max 200MB · Max 250 prompts
          </p>
          {isParsing && (
            <p style={{ color: '#818cf8', marginTop: 16, fontWeight: 600 }}>Reading manifest…</p>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".zip,application/zip" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); e.target.value = ''; }}
        />
        {zipFile && !manifest && (
          <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            Selected: <strong>{zipFile.name}</strong> ({formatBytes(zipFile.size)})
          </p>
        )}
        {manifestError && (
          <div style={{ marginTop: 16, background: '#450a0a', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 14 }}>
            ⚠️ {manifestError}
          </div>
        )}

        {/* Manifest format hint */}
        <details style={{ marginTop: 24 }}>
          <summary style={{ color: '#6b7280', cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
            📋 manifest.json format
          </summary>
          <pre style={{ background: '#0d0d1a', border: '1px solid #1e1e2e', borderRadius: 10, padding: 16, fontSize: 11, color: '#a5b4fc', overflow: 'auto', marginTop: 8, lineHeight: 1.6 }}>
{`[
  {
    "external_id": "my-unique-id-001",
    "title": "Neon Cyberpunk City",
    "prompt": "A futuristic city at night...",
    "engine": "Midjourney v6",
    "category": "Cyberpunk",
    "aspect_ratio": "16:9",
    "tags": ["cyberpunk", "neon", "city"],
    "image_filename": "neon_city.jpg",
    "publish": true
  }
]`}
          </pre>
        </details>
      </div>
      <div style={footer}>
        <button style={btnSecondary} onClick={onClose}>Cancel</button>
      </div>
    </>
  );

  // ── STEP 2 — Preview ────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <div style={body}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>
              {manifest?.length} prompt{manifest?.length !== 1 ? 's' : ''} ready to import
            </span>
            <span style={{ marginLeft: 12, color: '#6b7280', fontSize: 13 }}>
              from {zipFile?.name}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>Mode:</span>
            <button
              onClick={() => setPublishMode('publish')}
              style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13,
                ...(publishMode === 'publish' ? { background: '#1e3a5f', color: '#60a5fa', borderColor: '#3b82f6' } : {})
              }}
            >
              ✓ Publish All
            </button>
            <button
              onClick={() => setPublishMode('draft')}
              style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13,
                ...(publishMode === 'draft' ? { background: '#2d1b1b', color: '#fca5a5', borderColor: '#f87171' } : {})
              }}
            >
              📝 Save as Drafts
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #1e1e2e', borderRadius: 12, overflow: 'hidden', maxHeight: 440, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0d0d1a', position: 'sticky', top: 0 }}>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>#</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Image File</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Title</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Category</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Engine</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Ratio</th>
                <th style={{ padding: '10px 14px', color: '#6b7280', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #1e1e2e' }}>Tags</th>
              </tr>
            </thead>
            <tbody>
              {manifest?.map((item, i) => (
                <tr key={item.external_id || i} style={{ borderBottom: '1px solid #1a1a2a' }}>
                  <td style={{ padding: '10px 14px', color: '#4b5563' }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>
                    {item.image_filename || <span style={{ color: '#f87171' }}>⚠ missing</span>}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#e2e8f0', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || <span style={{ color: '#f87171' }}>⚠ missing</span>}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#a5b4fc' }}>{item.category || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11 }}>{item.engine || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{item.aspect_ratio || '16:9'}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 11 }}>
                    {Array.isArray(item.tags) && item.tags.length > 0
                      ? item.tags.slice(0, 3).join(', ') + (item.tags.length > 3 ? ` +${item.tags.length - 3}` : '')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {manifestError && (
          <div style={{ marginTop: 12, background: '#450a0a', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 14 }}>
            ⚠️ {manifestError}
          </div>
        )}
      </div>
      <div style={footer}>
        <button style={btnSecondary} onClick={() => { setStep(1); setManifest(null); setZipFile(null); }}>
          ← Back
        </button>
        <button
          style={{ ...btnPrimary, opacity: isUploading ? 0.7 : 1 }}
          onClick={handleStartImport}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              Uploading…
            </>
          ) : (
            <>
              🚀 Import {manifest?.length} Prompt{manifest?.length !== 1 ? 's' : ''}
              {publishMode === 'draft' ? ' as Drafts' : ''}
            </>
          )}
        </button>
      </div>
    </>
  );

  // ── STEP 3 — Progress ───────────────────────────────────────────────────────
  const renderStep3 = () => {
    const js = jobState;
    if (!js) return <div style={{ ...body, color: '#9ca3af', textAlign: 'center', paddingTop: 60 }}>Connecting to job…</div>;
    const successCount = Object.keys(js.results || {}).length;
    const failCount = (js.failures || []).length;
    const isDone = js.status === 'complete' || js.status === 'failed';

    return (
      <>
        <div style={body}>
          {/* Status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <StatusBadge status={js.status} />
            <span style={{ color: '#9ca3af', fontSize: 14 }}>
              {js.done} / {js.total} processed
            </span>
            <span style={{ color: '#4ade80', fontSize: 14 }}>✓ {successCount} imported</span>
            {failCount > 0 && <span style={{ color: '#f87171', fontSize: 14 }}>✗ {failCount} failed</span>}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 24 }}>
            <ProgressBar value={js.done} max={js.total} color={js.status === 'failed' ? '#ef4444' : '#6366f1'} />
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 6, textAlign: 'right' }}>
              {js.progressPercent}%
            </p>
          </div>

          {/* Fatal error */}
          {js.error && (
            <div style={{ background: '#450a0a', border: '1px solid #f87171', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 14, marginBottom: 16 }}>
              ⚠️ Fatal error: {js.error}
            </div>
          )}

          {/* Failures table */}
          {failCount > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: '#f87171', fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                ✗ Failed items ({failCount})
              </p>
              <div style={{ border: '1px solid #2a1a1a', borderRadius: 10, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#1a0d0d' }}>
                      <th style={{ padding: '8px 12px', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #2a1a1a' }}>external_id</th>
                      <th style={{ padding: '8px 12px', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #2a1a1a' }}>image</th>
                      <th style={{ padding: '8px 12px', color: '#6b7280', textAlign: 'left', borderBottom: '1px solid #2a1a1a' }}>error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {js.failures.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a0d0d' }}>
                        <td style={{ padding: '8px 12px', color: '#fca5a5', fontFamily: 'monospace' }}>{f.external_id}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af', fontFamily: 'monospace' }}>{f.image_filename}</td>
                        <td style={{ padding: '8px 12px', color: '#f87171' }}>{f.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success summary */}
          {isDone && successCount > 0 && (
            <div style={{ background: '#0d2818', border: '1px solid #4ade80', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
              <p style={{ color: '#4ade80', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                ✅ Import complete — {successCount} prompt{successCount !== 1 ? 's' : ''} imported
              </p>
              <p style={{ color: '#6b7280', fontSize: 13 }}>
                All imported prompts are now visible in your{' '}
                <a href="/admin/library" style={{ color: '#818cf8' }}>Library</a> and{' '}
                {publishMode === 'publish' ? 'published on the public site.' : 'saved as drafts.'}
              </p>
            </div>
          )}
        </div>

        <div style={footer}>
          {isDone && (
            <>
              <button
                style={{ ...btnSecondary, color: '#4ade80', borderColor: '#4ade80' }}
                onClick={() => downloadCSV(js.results || {}, js.failures || [])}
              >
                ⬇ Download Results CSV
              </button>
              <button style={btnPrimary} onClick={onClose}>
                Close
              </button>
            </>
          )}
          {!isDone && (
            <span style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>
              Processing… do not close this window.
            </span>
          )}
        </div>
      </>
    );
  };

  // ── Step indicators ─────────────────────────────────────────────────────────
  const steps = ['Upload ZIP', 'Preview', 'Import'];

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget && step !== 3) onClose(); }}>
      <div style={modal}>
        <div style={header}>
          <div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 20, margin: 0 }}>
              📦 Bulk Import Prompts
            </h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
              Import up to 250 prompts from a ZIP file in one operation
            </p>
          </div>
          {/* Step pills */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {steps.map((label, i) => {
              const stepNum = i + 1;
              const active = step === stepNum;
              const done = step > stepNum;
              return (
                <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    background: done ? '#4ade80' : active ? '#6366f1' : '#1e1e2e',
                    color: done || active ? '#fff' : '#4b5563',
                    border: active ? '2px solid #818cf8' : '2px solid transparent',
                  }}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#4b5563', display: isDesktop ? 'inline' : 'none' }}>
                    {label}
                  </span>
                  {i < steps.length - 1 && <div style={{ width: 20, height: 1, background: '#1e1e2e', margin: '0 4px' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
