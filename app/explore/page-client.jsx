"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import "../explore.css";
import { useToast } from "@/components/ui/Toast";
import { fetchAllPromptPages } from "@/lib/client-prompts";
import MotionCard from "@/components/motion/MotionCard";

const ITEMS_PER_PAGE = 24;
const ENTRY_MOTION_LIMIT = 24;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 20;

function markPromptImageReady(event) {
  event.currentTarget.closest('.explore-masonry-card')?.classList.add('image-ready');
}

function markPromptImageError(event) {
  event.currentTarget.closest('.explore-masonry-card')?.classList.add('image-error');
}

function ScrollProgressIndicator({ displayedItems, totalItems, viewMode, isHydrating }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const panel = document.getElementById('exploreMainPanel');
    if (!panel) return undefined;
    if (isHydrating) {
      setProgress(0);
      return undefined;
    }

    let animationFrame = 0;
    const updateProgress = () => {
      animationFrame = 0;
      const scrollableDistance = Math.max(0, panel.scrollHeight - panel.clientHeight);
      const viewportProgress = scrollableDistance > 0
        ? Math.min(1, Math.max(0, panel.scrollTop / scrollableDistance))
        : 0;
      const libraryProgress = totalItems > 0
        ? Math.min(1, displayedItems / totalItems)
        : 0;
      const nextProgress = Math.min(
        100,
        Math.round(viewportProgress * libraryProgress * 100)
      );
      setProgress((current) => current === nextProgress ? current : nextProgress);
    };
    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateProgress);
    };

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleUpdate)
      : null;
    resizeObserver?.observe(panel);
    const grid = panel.querySelector('.explore-masonry-grid, .explore-uniform-grid');
    if (grid) resizeObserver?.observe(grid);

    panel.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      panel.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [displayedItems, totalItems, viewMode, isHydrating]);

  const progressLabel = isHydrating ? '…' : `${progress}%`;

  return (
    <div
      className="floating-btn progress-floating-btn"
      title={isHydrating ? 'Loading the complete prompt library' : `${progress}% through the prompt library`}
      aria-label={isHydrating ? 'Loading the complete prompt library' : `${progress}% through the prompt library`}
    >
      <svg className="progress-circle-svg" aria-hidden="true">
        <circle className="progress-circle-bg" cx="25" cy="25" r="20"/>
        <circle
          className="progress-circle-fg"
          cx="25"
          cy="25"
          r="20"
          style={{
            strokeDasharray: PROGRESS_CIRCUMFERENCE,
            strokeDashoffset: PROGRESS_CIRCUMFERENCE
              - (PROGRESS_CIRCUMFERENCE * progress) / 100,
          }}
          transform="rotate(-90 25 25)"
        />
      </svg>
      <span className="progress-text-label">{progressLabel}</span>
    </div>
  );
}

const PromptCard = React.memo(function PromptCard({
  prompt,
  index,
  isEager,
  isPriority,
  isUniform = false,
  showMobileCopy,
  isCopied,
  onCopy,
  onDownload,
}) {
  const [showControls, setShowControls] = useState(false);
  const hideControlsWhenUnfocused = (event) => {
    if (!event.currentTarget.contains(document.activeElement)) {
      setShowControls(false);
    }
  };

  return (
    <MotionCard index={index} disabled={index >= ENTRY_MOTION_LIMIT} fast>
      <Link
        href={`/prompt/${prompt.slug || prompt.id}`}
        className="explore-masonry-card prompt-image-loading"
        onPointerEnter={() => setShowControls(true)}
        onPointerLeave={hideControlsWhenUnfocused}
        onFocus={() => setShowControls(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setShowControls(false);
          }
        }}
      >
        <Image
          src={prompt.imageUrl || '/images/placeholder.png'}
          alt={prompt.title || ''}
          width={400}
          height={isUniform ? 400 : 600}
          style={isUniform
            ? { width: '100%', height: '100%', objectFit: 'cover' }
            : { width: '100%', height: 'auto', display: 'block' }}
          loading={isEager ? 'eager' : 'lazy'}
          priority={isPriority}
          fetchPriority={isPriority ? 'high' : 'auto'}
          decoding="async"
          quality={65}
          sizes="(max-width: 768px) 50vw, 25vw"
          onLoad={markPromptImageReady}
          onError={markPromptImageError}
        />

        {showMobileCopy && (
          <button
            type="button"
            className="mobile-card-copy-btn"
            onClick={(event) => onCopy(event, prompt)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        )}

        {showControls && (
          <div className="card-hover-overlay">
            <button
              type="button"
              className="card-action-icon"
              title="Download Wallpaper"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDownload(prompt.originalImageUrl || prompt.imageUrl, prompt.title);
              }}
              style={{ left: '16px', right: 'auto' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>

            <div className="card-action-icon" title="View details">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </div>

            <div className="card-hover-center">
              <button
                type="button"
                className="copy-prompt-btn"
                onClick={(event) => onCopy(event, prompt)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Prompt</span>
              </button>
            </div>

            <div className="card-hover-details">
              <h4 className="card-hover-title">{prompt.title}</h4>
              <div className="card-hover-tags">
                {prompt.engine && <span className="card-hover-tag">{prompt.engine}</span>}
                {prompt.category && <span className="card-hover-tag">#{prompt.category}</span>}
                {prompt.aspectRatio && <span className="card-hover-tag">{prompt.aspectRatio}</span>}
              </div>
            </div>
          </div>
        )}
      </Link>
    </MotionCard>
  );
});

// Preset values matching the target design checklist
const DEFAULT_ENGINES = [
  "Midjourney",
  "DALL-E 3",
  "Stable Diffusion XL",
  "Playground v2.5",
  "Leonardo AI"
];

const DEFAULT_STYLES = [
  "Photorealistic",
  "Digital Art",
  "Illustration",
  "3D Render",
  "Anime",
  "Cinematic",
  "Line Art",
  "Abstract",
  "Oil Painting",
  "Pixel Art"
];

const DEFAULT_RATIOS = [
  "1:1 (Square)",
  "4:5 (Portrait)",
  "3:4 (Portrait)",
  "16:9 (Landscape)",
  "21:9 (Ultrawide)",
  "9:16 (Mobile)"
];

const getEngineGradient = (engine) => {
  const eng = engine.toLowerCase();
  if (eng.includes("midjourney")) return "linear-gradient(135deg, #1e3a8a, #3b82f6)";
  if (eng.includes("dall-e") || eng.includes("dalle") || eng.includes("dall.e")) return "linear-gradient(135deg, #065f46, #10b981)";
  if (eng.includes("stable diffusion") || eng.includes("sdxl")) return "linear-gradient(135deg, #7c3aed, #c084fc)";
  if (eng.includes("playground")) return "linear-gradient(135deg, #b91c1c, #f87171)";
  if (eng.includes("leonardo")) return "linear-gradient(135deg, #d97706, #fbbf24)";
  return "linear-gradient(135deg, #4b5563, #9ca3af)";
};

const getEngineIcon = (engine) => {
  const eng = engine.toLowerCase();
  if (eng.includes("midjourney")) return "⛵";
  if (eng.includes("dall-e") || eng.includes("dalle") || eng.includes("dall.e")) return "🎨";
  if (eng.includes("stable diffusion") || eng.includes("sdxl")) return "🌪️";
  if (eng.includes("playground")) return "🎮";
  if (eng.includes("leonardo")) return "🦁";
  return "🤖";
};

const getStyleGradient = (styleName) => {
  const s = styleName.toLowerCase();
  if (s.includes("photo")) return "linear-gradient(135deg, #0f172a, #334155)";
  if (s.includes("digital")) return "linear-gradient(135deg, #4c1d95, #8b5cf6)";
  if (s.includes("illustr")) return "linear-gradient(135deg, #db2777, #f472b6)";
  if (s.includes("3d") || s.includes("render")) return "linear-gradient(135deg, #0369a1, #38bdf8)";
  if (s.includes("anime")) return "linear-gradient(135deg, #b91c1c, #f43f5e)";
  if (s.includes("cinema")) return "linear-gradient(135deg, #111827, #4b5563)";
  if (s.includes("line")) return "linear-gradient(135deg, #1e293b, #f1f5f9)";
  if (s.includes("abstract")) return "linear-gradient(135deg, #fbbf24, #ec4899)";
  if (s.includes("oil") || s.includes("paint")) return "linear-gradient(135deg, #78350f, #d97706)";
  if (s.includes("pixel")) return "linear-gradient(135deg, #14532d, #22c55e)";
  return "linear-gradient(135deg, #374151, #6b7280)";
};

const getStyleIcon = (styleName) => {
  const s = styleName.toLowerCase();
  if (s.includes("photo")) return "📷";
  if (s.includes("digital")) return "💻";
  if (s.includes("illustr")) return "✏️";
  if (s.includes("3d") || s.includes("render")) return "🧊";
  if (s.includes("anime")) return "🌸";
  if (s.includes("cinema")) return "🎬";
  if (s.includes("line")) return "🖋️";
  if (s.includes("abstract")) return "🌀";
  if (s.includes("oil") || s.includes("paint")) return "🖌️";
  if (s.includes("pixel")) return "👾";
  return "🎨";
};

const getRatioPreview = (ratioName) => {
  const r = ratioName.toLowerCase();
  let width = 14;
  let height = 14;
  
  if (r.includes("1:1") || r.includes("square")) {
    width = 14; height = 14;
  } else if (r.includes("4:5") || r.includes("3:4") || r.includes("portrait")) {
    width = 11; height = 15;
  } else if (r.includes("16:9") || r.includes("21:9") || r.includes("landscape")) {
    width = 18; height = 10;
  } else if (r.includes("9:16") || r.includes("mobile")) {
    width = 9; height = 16;
  }
  
  return (
    <div className="ratio-preview-box" style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{
        width: `${width}px`,
        height: `${height}px`,
        border: '1.5px solid currentColor',
        borderRadius: '2px',
        opacity: 0.85
      }} />
    </div>
  );
};

function ExplorePageContent({ initialPrompts, initialSettings, initialSearchParams = {} }) {
  const router = useRouter();
  const { showToast } = useToast();
  // Data states initialized from server-fetched props
  const [allPrompts, setAllPrompts] = useState(initialPrompts || []);
  const [siteSettings] = useState(initialSettings || {});
  const [isInitialLoading, setIsInitialLoading] = useState((initialPrompts || []).length === 0);
  const [isLibraryHydrating, setIsLibraryHydrating] = useState(true);

  const engineMetadata = React.useMemo(() => {
    if (siteSettings.engineMetadata) {
      try {
        return typeof siteSettings.engineMetadata === 'string'
          ? JSON.parse(siteSettings.engineMetadata)
          : siteSettings.engineMetadata;
      } catch (e) {}
    }
    return [];
  }, [siteSettings.engineMetadata]);

  const styleMetadata = React.useMemo(() => {
    if (siteSettings.styleMetadata) {
      try {
        return typeof siteSettings.styleMetadata === 'string'
          ? JSON.parse(siteSettings.styleMetadata)
          : siteSettings.styleMetadata;
      } catch (e) {}
    }
    return [];
  }, [siteSettings.styleMetadata]);

  const getEngineUI = (engName) => {
    const meta = engineMetadata.find(m => m.name?.toLowerCase() === engName.toLowerCase());
    if (meta) {
      return {
        icon: meta.icon || "🤖",
        gradient: meta.gradient || "linear-gradient(135deg, #4b5563, #9ca3af)",
        imageUrl: meta.imageUrl || null
      };
    }
    return {
      icon: getEngineIcon(engName),
      gradient: getEngineGradient(engName),
      imageUrl: null
    };
  };

  const getStyleUI = (styleName) => {
    const meta = styleMetadata.find(m => m.name?.toLowerCase() === styleName.toLowerCase());
    if (meta) {
      return {
        icon: meta.icon || "🎨",
        gradient: meta.gradient || "linear-gradient(135deg, #374151, #6b7280)",
        imageUrl: meta.imageUrl || null
      };
    }
    return {
      icon: getStyleIcon(styleName),
      gradient: getStyleGradient(styleName),
      imageUrl: null
    };
  };

  const getEnginesList = () => {
    if (siteSettings.allowedEngines) {
      try {
        const parsed = JSON.parse(siteSettings.allowedEngines);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_ENGINES;
  };

  const getStylesList = () => {
    if (siteSettings.allowedStyles) {
      try {
        const parsed = JSON.parse(siteSettings.allowedStyles);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_STYLES;
  };

  const getRatiosList = () => {
    if (siteSettings.allowedRatios) {
      try {
        const parsed = JSON.parse(siteSettings.allowedRatios);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_RATIOS;
  };

  const ENGINES = getEnginesList();
  const STYLES = getStylesList();
  const RATIOS = getRatiosList();

  const [page, setPage] = useState(1);
  // Initialize displayedPrompts synchronously from the first page of processedPrompts
  // This prevents the flash of empty content on first render
  const [displayedPrompts, setDisplayedPrompts] = useState(() => {
    const initial = (initialPrompts || []).slice(0, 24);
    return initial;
  });
  const displayedPromptCountRef = useRef(displayedPrompts.length);
  useEffect(() => {
    displayedPromptCountRef.current = displayedPrompts.length;
  }, [displayedPrompts.length]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEngines, setSelectedEngines] = useState(new Set());
  const [selectedStyles, setSelectedStyles] = useState(new Set());
  const [selectedRatios, setSelectedRatios] = useState(new Set());

  // UI state variables
  const [isEngineOpen, setIsEngineOpen] = useState(true);
  const [isStyleOpen, setIsStyleOpen] = useState(true);
  const [isRatioOpen, setIsRatioOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [theme, setTheme] = useState("light");
  const [activeTab, setActiveTab] = useState("trending");
  const [sortBy, setSortBy] = useState("highly-rated");
  const [viewMode, setViewMode] = useState("masonry");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const dropdownRef = useRef(null);
  const categoryPillsRef = useRef(null);
  const loaderRef = useRef(null);
  // The dominant desktop layout renders with its final column count immediately;
  // smaller breakpoints are corrected as soon as the client measures the viewport.
  const [numCols, setNumCols] = useState(4);
  const [isMobileViewport, setIsMobileViewport] = useState(false);


  // Track responsive column count (mirrors CSS breakpoints)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobileViewport(w <= 768);
      if (w <= 480) setNumCols(2);
      else if (w <= 768) setNumCols(2);
      else if (w <= 1024) setNumCols(2);
      else if (w <= 1400) setNumCols(3);
      else setNumCols(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Draggable category pills handler
  useEffect(() => {
    const slider = categoryPillsRef.current;
    if (!slider) return;

    let isDown = false;
    let startX;
    let scrollLeft;
    let hasMoved = false;

    const handleMouseDown = (e) => {
      isDown = true;
      hasMoved = false;
      slider.classList.add('dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      slider.classList.remove('dragging');
    };

    const handleMouseUp = () => {
      isDown = false;
      slider.classList.remove('dragging');
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.8;
      if (Math.abs(x - startX) > 5) {
        hasMoved = true;
      }
      e.preventDefault();
      slider.scrollLeft = scrollLeft - walk;
    };

    const handleChildClick = (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    slider.addEventListener('mousedown', handleMouseDown, { passive: false });
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove, { passive: false });
    slider.addEventListener('click', handleChildClick, true);

    return () => {
      if (slider) {
        slider.removeEventListener('mousedown', handleMouseDown);
        slider.removeEventListener('mouseleave', handleMouseLeave);
        slider.removeEventListener('mouseup', handleMouseUp);
        slider.removeEventListener('mousemove', handleMouseMove);
        slider.removeEventListener('click', handleChildClick, true);
      }
    };
  }, []);

  // Close sorting dropdown on clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Theme synchronization
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const handleThemeChange = (e) => {
      setTheme(e.detail);
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));
  };

  // Parse and apply URL query parameters
  useEffect(() => {
    const engineParam = initialSearchParams.engine;
    const styleParam = initialSearchParams.style || initialSearchParams.category;
    const ratioParam = initialSearchParams.ratio;
    const sortParam = initialSearchParams.sort || initialSearchParams.sortBy;

    if (engineParam) {
      const matched = ENGINES.find(e => e.toLowerCase() === engineParam.toLowerCase() || e.toLowerCase().includes(engineParam.toLowerCase()));
      if (matched) {
        setSelectedEngines(new Set([matched]));
      }
    } else {
      setSelectedEngines(new Set());
    }

    if (styleParam) {
      const matched = STYLES.find(s => s.toLowerCase() === styleParam.toLowerCase() || s.toLowerCase().includes(styleParam.toLowerCase()));
      if (matched) {
        setSelectedStyles(new Set([matched]));
      } else {
        // Allow dynamic match for custom categories that aren't in DEFAULT_STYLES
        setSelectedStyles(new Set([styleParam]));
      }
    } else {
      setSelectedStyles(new Set());
    }

    if (ratioParam) {
      const matched = RATIOS.find(r => r.startsWith(ratioParam) || r.includes(ratioParam));
      if (matched) {
        setSelectedRatios(new Set([matched]));
      }
    } else {
      setSelectedRatios(new Set());
    }

    if (sortParam) {
      let mappedSort = sortParam.toLowerCase();
      if (mappedSort === 'popular') mappedSort = 'most-copied';
      if (['newest', 'most-copied', 'alphabetical', 'highly-rated'].includes(mappedSort)) {
        setSortBy(mappedSort);
      }
    }
  }, [initialSearchParams.engine, initialSearchParams.style, initialSearchParams.category, initialSearchParams.ratio, initialSearchParams.sort, initialSearchParams.sortBy]);

  // Handle Random Prompt redirection
  useEffect(() => {
    if (initialSearchParams.random === 'true' && allPrompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * allPrompts.length);
      const randomPrompt = allPrompts[randomIndex];
      if (randomPrompt && randomPrompt.id) {
        router.push(`/prompt/${randomPrompt.slug || randomPrompt.id}`);
      }
    }
  }, [initialSearchParams.random, allPrompts, router]);

  // Filter triggers
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const toggleFilter = (set, setVal, item) => {
    const nextSet = new Set(set);
    if (nextSet.has(item)) {
      nextSet.delete(item);
    } else {
      nextSet.add(item);
    }
    setVal(nextSet);
  };

  const handleCopyPrompt = useCallback((e, prompt) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.promptText).catch(() => {});
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2500);

    // Track analytics copy event
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'copy_prompt', promptId: prompt.id, source: 'Explore' })
    }).catch(() => {});
  }, []);

  const handleDownloadImage = useCallback(async (downloadUrl, title) => {
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
  }, [showToast]);

  // Filtering and sorting can touch hundreds of records. Memoize the result so
  // unrelated UI updates never rebuild the whole library.
  const processedPrompts = useMemo(() => {
    const filteredPrompts = allPrompts.filter(prompt => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = prompt.title?.toLowerCase().includes(q);
        const matchesText = prompt.promptText?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesText) return false;
      }

      if (selectedEngines.size > 0) {
        let matchesEngine = false;
        const promptEngine = (prompt.engine || "").toLowerCase();

        selectedEngines.forEach(eng => {
          const engLower = eng.toLowerCase();
          if (engLower === "midjourney" && (promptEngine.includes("midjourney") || promptEngine.includes("mj"))) {
            matchesEngine = true;
          } else if (engLower === "dall-e 3" && (promptEngine.includes("dall-e") || promptEngine.includes("dalle") || promptEngine.includes("dall.e"))) {
            matchesEngine = true;
          } else if (engLower === "stable diffusion xl" && (promptEngine.includes("stable diffusion") || promptEngine.includes("sdxl") || promptEngine.includes("sd xl"))) {
            matchesEngine = true;
          } else if (engLower === "playground v2.5" && promptEngine.includes("playground")) {
            matchesEngine = true;
          } else if (engLower === "leonardo ai" && promptEngine.includes("leonardo")) {
            matchesEngine = true;
          } else if (promptEngine.includes(engLower)) {
            matchesEngine = true;
          }
        });
        if (!matchesEngine) return false;
      }

      if (selectedStyles.size > 0) {
        let matchesStyle = false;
        const promptCat = (prompt.category || "").toLowerCase();

        selectedStyles.forEach(style => {
          const styleLower = style.toLowerCase();
          if (styleLower === "photorealistic" && (promptCat.includes("photo") || promptCat.includes("realis") || promptCat.includes("realistic"))) {
            matchesStyle = true;
          } else if (styleLower === "digital art" && (promptCat.includes("digital") || promptCat.includes("art"))) {
            matchesStyle = true;
          } else if (styleLower === "illustration" && promptCat.includes("illustr")) {
            matchesStyle = true;
          } else if (styleLower === "3d render" && (promptCat.includes("3d") || promptCat.includes("render"))) {
            matchesStyle = true;
          } else if (styleLower === "anime" && promptCat.includes("anime")) {
            matchesStyle = true;
          } else if (styleLower === "cinematic" && promptCat.includes("cinema")) {
            matchesStyle = true;
          } else if (styleLower === "line art" && promptCat.includes("line")) {
            matchesStyle = true;
          } else if (styleLower === "abstract" && promptCat.includes("abstract")) {
            matchesStyle = true;
          } else if (styleLower === "oil painting" && (promptCat.includes("oil") || promptCat.includes("paint"))) {
            matchesStyle = true;
          } else if (styleLower === "pixel art" && promptCat.includes("pixel")) {
            matchesStyle = true;
          } else if (promptCat.includes(styleLower)) {
            matchesStyle = true;
          }
        });
        if (!matchesStyle) return false;
      }

      if (selectedRatios.size > 0) {
        let matchesRatio = false;
        const promptRatio = prompt.aspectRatio || "16:9";

        selectedRatios.forEach(ratio => {
          const ratioClean = ratio.split(" ")[0];
          if (promptRatio === ratioClean) {
            matchesRatio = true;
          } else if (ratioClean === "4:5" && (promptRatio === "4:5" || promptRatio === "4/5" || promptRatio === "2:3" || promptRatio === "3:4")) {
            matchesRatio = true;
          } else if (ratioClean === "3:4" && (promptRatio === "3:4" || promptRatio === "3/4" || promptRatio === "2:3")) {
            matchesRatio = true;
          } else if (ratioClean === "16:9" && (promptRatio === "16:9" || promptRatio === "16/9")) {
            matchesRatio = true;
          } else if (ratioClean === "21:9" && (promptRatio === "21:9" || promptRatio === "21/9")) {
            matchesRatio = true;
          } else if (ratioClean === "9:16" && (promptRatio === "9:16" || promptRatio === "9/16" || promptRatio === "3:4")) {
            matchesRatio = true;
          }
        });
        if (!matchesRatio) return false;
      }

      return true;
    });

    let nextPrompts = [...filteredPrompts];
    if (activeTab === "staff-picks") {
      const picks = filteredPrompts.filter(p => (p.copies || 0) >= 2);
      if (picks.length > 0) {
        nextPrompts = picks;
      }
    }

    nextPrompts.sort((a, b) => {
      let sortVal = sortBy;
      if (activeTab === "newest") {
        sortVal = "newest";
      } else if (activeTab === "most-copied") {
        sortVal = "most-copied";
      }

      if (sortVal === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortVal === "most-copied") {
        return (b.copies || 0) - (a.copies || 0);
      } else if (sortVal === "alphabetical") {
        return (a.title || "").localeCompare(b.title || "");
      } else {
        if ((b.copies || 0) !== (a.copies || 0)) {
          return (b.copies || 0) - (a.copies || 0);
        }
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return nextPrompts;
  }, [allPrompts, searchQuery, selectedEngines, selectedStyles, selectedRatios, sortBy, activeTab]);
  const processedPromptsRef = useRef(processedPrompts);
  const filterSignature = useMemo(() => JSON.stringify({
    searchQuery,
    engines: [...selectedEngines].sort(),
    styles: [...selectedStyles].sort(),
    ratios: [...selectedRatios].sort(),
    sortBy,
    activeTab,
  }), [searchQuery, selectedEngines, selectedStyles, selectedRatios, sortBy, activeTab]);
  const previousFilterSignatureRef = useRef(filterSignature);

  // When filters/sort change, reset to first page and rebuild displayed list
  useEffect(() => {
    const filtersChanged = previousFilterSignatureRef.current !== filterSignature;
    previousFilterSignatureRef.current = filterSignature;
    processedPromptsRef.current = processedPrompts;
    const desiredCount = filtersChanged
      ? ITEMS_PER_PAGE
      : Math.max(ITEMS_PER_PAGE, displayedPromptCountRef.current);
    const nextCount = Math.min(processedPrompts.length, desiredCount);
    setPage(Math.max(1, Math.ceil(nextCount / ITEMS_PER_PAGE)));
    setDisplayedPrompts(processedPrompts.slice(0, nextCount));
    setIsLoadingMore(false);
  }, [processedPrompts, filterSignature]);

  // When page increments (by observer), append next batch — never re-render old cards
  useEffect(() => {
    if (page === 1) return;
    const nextBatch = processedPromptsRef.current.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    if (nextBatch.length === 0) return;
    setDisplayedPrompts((prev) => [...prev, ...nextBatch]);
    setIsLoadingMore(false);
  }, [page]);

  // Hydrate the complete published library after the server renders the first fast page.
  useEffect(() => {
    const controller = new AbortController();
    let idleCallbackId = null;
    let fallbackTimerId = null;

    const hydrateLibrary = () => {
      fetchAllPromptPages({ signal: controller.signal })
        .then(({ prompts }) => {
          if (prompts.length > 0) setAllPrompts(prompts);
          setIsInitialLoading(false);
          setIsLibraryHydrating(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setIsInitialLoading(false);
            setIsLibraryHydrating(false);
          }
        });
    };

    if ((initialPrompts || []).length === 0) {
      hydrateLibrary();
    } else if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(hydrateLibrary, { timeout: 1200 });
    } else {
      fallbackTimerId = window.setTimeout(hydrateLibrary, 250);
    }

    return () => {
      controller.abort();
      if (idleCallbackId !== null) window.cancelIdleCallback(idleCallbackId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
    };
  }, [initialPrompts]);

  // Infinite Scroll IntersectionObserver — use the scrollable panel as root on desktop
  useEffect(() => {
    const loaderNode = loaderRef.current;
    if (!loaderNode) return;

    // Use the panel element as root so the observer fires relative to it, not the window
    const scrollRoot = document.getElementById('exploreMainPanel') || null;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore) {
          const hasMore = displayedPrompts.length < processedPrompts.length;
          if (hasMore) {
            setIsLoadingMore(true);
            window.requestAnimationFrame(() => setPage((prev) => prev + 1));
          }
        }
      },
      { root: scrollRoot, threshold: 0, rootMargin: '1800px 0px' }
    );

    observer.observe(loaderNode);

    return () => {
      if (loaderNode) observer.unobserve(loaderNode);
    };
  }, [isLoadingMore, displayedPrompts.length, processedPrompts.length]);
  const currentSortLabel = sortBy === 'newest' ? 'Newest Arrived' : sortBy === 'most-copied' ? 'Most Popular' : sortBy === 'alphabetical' ? 'Alphabetical (A-Z)' : 'Highly Rated';

  return (
    <div className="explore-layout">
      {/* Mobile Sidebar Backdrop */}
      <div 
        className={`mobile-sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Left Sidebar */}
      <aside className={`explore-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="explore-sidebar-scrollable">
          
          {/* Mobile close button & Title */}
          <div className="mobile-sidebar-header">
            <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>Filters</span>
            <button onClick={() => setIsSidebarOpen(false)} className="mobile-sidebar-close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Search box */}
          <div className="explore-search-wrapper">
            <span className="explore-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input 
              type="text" 
              className="explore-search-input" 
              placeholder="Search prompts..." 
              value={searchQuery} 
              onChange={handleSearchChange} 
            />
          </div>

          {/* Mobile-only Sort Options inside Sidebar */}
          <div className="mobile-sidebar-sort-section">
            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '12px' }}>Sort Options</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: "highly-rated", label: "Highly Rated" },
                { value: "newest", label: "Newest Arrived" },
                { value: "most-copied", label: "Most Popular" },
                { value: "alphabetical", label: "Alphabetical (A-Z)" }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    if (option.value === 'newest') setActiveTab('newest');
                    else if (option.value === 'most-copied') setActiveTab('most-copied');
                    else if (option.value === 'highly-rated') setActiveTab('trending');
                    else setActiveTab('custom');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-light)',
                    background: sortBy === option.value ? 'var(--text-main)' : 'var(--bg-color)',
                    color: sortBy === option.value ? 'var(--bg-color)' : 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
            </div>
            <div style={{ height: '1px', background: 'var(--border-light)', margin: '24px 0 12px 0' }}></div>
          </div>

          {/* AI Engine collapsible checklist */}
          <div className="filter-group">
            <div className="filter-group-header" onClick={() => setIsEngineOpen(!isEngineOpen)}>
              <span>AI Engine</span>
              <span className={`filter-group-chevron ${!isEngineOpen ? 'collapsed' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div className="filter-group-content" style={{ maxHeight: isEngineOpen ? "400px" : "0px", opacity: isEngineOpen ? 1 : 0 }}>
              {ENGINES.map(eng => {
                const ui = getEngineUI(eng);
                return (
                  <label className="filter-checkbox-label" key={eng}>
                    <input 
                      type="checkbox" 
                      className="filter-checkbox-input" 
                      checked={selectedEngines.has(eng)}
                      onChange={() => toggleFilter(selectedEngines, setSelectedEngines, eng)}
                    />
                    <div className="filter-thumbnail" style={{ background: ui.imageUrl ? 'none' : ui.gradient, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ui.imageUrl ? (
                        <img src={ui.imageUrl} alt={eng} width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                      ) : (
                        ui.icon
                      )}
                    </div>
                    <span className="filter-checkbox-text">{eng}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Style collapsible checklist */}
          <div className="filter-group">
            <div className="filter-group-header" onClick={() => setIsStyleOpen(!isStyleOpen)}>
              <span>Style</span>
              <span className={`filter-group-chevron ${!isStyleOpen ? 'collapsed' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div className="filter-group-content" style={{ maxHeight: isStyleOpen ? `${STYLES.length * 48 + 16}px` : "0px", opacity: isStyleOpen ? 1 : 0 }}>
              {STYLES.map(style => {
                const ui = getStyleUI(style);
                return (
                  <label className="filter-checkbox-label" key={style}>
                    <input 
                      type="checkbox" 
                      className="filter-checkbox-input" 
                      checked={selectedStyles.has(style)}
                      onChange={() => toggleFilter(selectedStyles, setSelectedStyles, style)}
                    />
                    <div className="filter-thumbnail" style={{ background: ui.imageUrl ? 'none' : ui.gradient, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ui.imageUrl ? (
                        <img src={ui.imageUrl} alt={style} width={24} height={24} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                      ) : (
                        ui.icon
                      )}
                    </div>
                    <span className="filter-checkbox-text">{style}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio collapsible checklist */}
          <div className="filter-group">
            <div className="filter-group-header" onClick={() => setIsRatioOpen(!isRatioOpen)}>
              <span>Aspect Ratio</span>
              <span className={`filter-group-chevron ${!isRatioOpen ? 'collapsed' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </div>
            <div className="filter-group-content" style={{ maxHeight: isRatioOpen ? "400px" : "0px", opacity: isRatioOpen ? 1 : 0 }}>
              {RATIOS.map(ratio => (
                <label className="filter-checkbox-label" key={ratio}>
                  <input 
                    type="checkbox" 
                    className="filter-checkbox-input" 
                    checked={selectedRatios.has(ratio)}
                    onChange={() => toggleFilter(selectedRatios, setSelectedRatios, ratio)}
                  />
                  {getRatioPreview(ratio)}
                  <span className="filter-checkbox-text">{ratio}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Sidebar Sticky Footer */}
        <div className="explore-sidebar-footer">
          <button className="sidebar-footer-link" onClick={handleToggleTheme}>
            {theme === "dark" ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <span>Theme: Light</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <span>Theme: Dark</span>
              </>
            )}
          </button>
          
          <Link href="/about" className="sidebar-footer-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>About</span>
          </Link>
        </div>
      </aside>

      {/* Right Main Panel */}
      <main className="explore-main-panel" id="exploreMainPanel">
        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)', lineHeight: 1.1, margin: '0 0 8px' }}>
          Explore AI Image Prompts
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Browse copy-ready prompts by AI model, visual style, aspect ratio, and popularity.
        </p>
        
        {/* Mobile Header */}
        <header className="mobile-explore-header">
          <Link href="/" className="mobile-logo-link">
            <BrandLogo variant="mark" height={30} />
          </Link>
          
          <div className="mobile-search-wrapper">
            <span className="mobile-search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input 
              type="text" 
              className="mobile-search-input" 
              placeholder="Search prompts..." 
              value={searchQuery} 
              onChange={handleSearchChange} 
            />
          </div>

          <button className="mobile-filter-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            {(selectedEngines.size + selectedStyles.size + selectedRatios.size) > 0 && (
              <span className="mobile-filter-badge">
                {selectedEngines.size + selectedStyles.size + selectedRatios.size}
              </span>
            )}
          </button>
        </header>

        {/* Mobile Horizontal Scrollable Filter Pills */}
        <div className="mobile-filter-pills" ref={categoryPillsRef}>
          <button 
            className={`mobile-pill-btn ${(activeTab === 'trending' && selectedStyles.size === 0) ? 'active' : ''}`}
            onClick={() => {
              setSelectedStyles(new Set());
              setSelectedEngines(new Set());
              setSelectedRatios(new Set());
              setActiveTab('trending');
              setSortBy('highly-rated');
            }}
          >
            Trending
          </button>
          {STYLES.map(style => {
            const isActive = selectedStyles.has(style);
            return (
              <button 
                key={style}
                className={`mobile-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => {
                  toggleFilter(selectedStyles, setSelectedStyles, style);
                }}
              >
                {style}
              </button>
            );
          })}
        </div>

        {/* Explore hero if administrative settings have one configured */}
        {siteSettings.exploreHero && (
          <div style={{ width: '100%', height: '220px', marginBottom: '24px', overflow: 'hidden', borderRadius: '12px', position: 'relative' }}>
            <Image 
              src={siteSettings.exploreHero} 
              alt="Explore Hero Banner" 
              fill
              style={{ objectFit: 'cover' }} 
              priority={true}
              loading="eager"
            />
          </div>
        )}

        {/* Top Header Bar */}
        <div className="explore-top-bar">
          <div className="top-bar-left">
            <span>Showing {processedPrompts.length.toLocaleString('en-US')} prompts</span>
          </div>

          <div className="top-bar-center">
            <button 
              className={`top-bar-tab ${activeTab === 'trending' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('trending');
                setSortBy('highly-rated');
              }}
            >
              Trending
            </button>
            <button 
              className={`top-bar-tab ${activeTab === 'newest' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('newest');
                setSortBy('newest');
              }}
            >
              Newest
            </button>
            <button 
              className={`top-bar-tab ${activeTab === 'most-copied' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('most-copied');
                setSortBy('most-copied');
              }}
            >
              Most Copied
            </button>
            <button 
              className={`top-bar-tab ${activeTab === 'staff-picks' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('staff-picks');
                setSortBy('highly-rated');
              }}
            >
              Staff Picks
            </button>
          </div>

          <div className="top-bar-right">
            <div className="custom-dropdown-container" ref={dropdownRef}>
              <div 
                className="sort-dropdown-trigger"
                onClick={() => setIsSortOpen(!isSortOpen)}
              >
                <span className="sort-dropdown-label">Sort by:</span>
                <span className="sort-dropdown-value">{currentSortLabel}</span>
                <span className={`sort-dropdown-chevron ${isSortOpen ? 'open' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
              </div>

              {isSortOpen && (
                <div className="sort-dropdown-menu">
                  {[
                    { value: "highly-rated", label: "Highly Rated" },
                    { value: "newest", label: "Newest Arrived" },
                    { value: "most-copied", label: "Most Popular" },
                    { value: "alphabetical", label: "Alphabetical (A-Z)" }
                  ].map(option => (
                    <div 
                      key={option.value}
                      className={`sort-dropdown-item ${sortBy === option.value ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy(option.value);
                        if (option.value === 'newest') setActiveTab('newest');
                        else if (option.value === 'most-copied') setActiveTab('most-copied');
                        else if (option.value === 'highly-rated') setActiveTab('trending');
                        else setActiveTab('custom');
                        setIsSortOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && (
                        <span className="sort-dropdown-check">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="layout-toggles">
              <button 
                className={`layout-toggle-btn ${viewMode === 'masonry' ? 'active' : ''}`}
                onClick={() => setViewMode('masonry')}
                title="Masonry Layout"
                aria-label="Masonry Layout"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="5" rx="1"></rect>
                  <rect x="14" y="11" width="7" height="9" rx="1"></rect>
                  <rect x="3" y="15" width="7" height="6" rx="1"></rect>
                </svg>
              </button>
              <button 
                className={`layout-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid Layout"
                aria-label="Grid Layout"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                  <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                  <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Skeleton loading state — shown when server gave empty data and client is fetching */}
        {isInitialLoading && (
          <div className="explore-masonry-grid" style={{ pointerEvents: 'none' }}>
            {Array.from({ length: numCols }, (_, colIdx) => (
              <div key={colIdx} className="masonry-col">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="explore-masonry-card skeleton-card"
                    style={{
                      height: `${[280, 380, 240, 320, 200][( colIdx * 3 + i) % 5]}px`,
                      background: 'var(--bg-light)',
                      animation: 'skeletonPulse 1.4s ease-in-out infinite',
                      animationDelay: `${(colIdx * 0.1 + i * 0.15)}s`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Grid Layout — Pinterest-style fixed column divs */}
        {!isInitialLoading && viewMode === 'masonry' ? (
          <div className="explore-masonry-grid">
            {Array.from({ length: numCols }, (_, colIdx) => (
              <div key={colIdx} className="masonry-col">
                {displayedPrompts
                  .filter((_, i) => i % numCols === colIdx)
                  .map((prompt, cardIndex) => {
                    const absoluteIndex = colIdx + cardIndex * numCols;
                    const isPriority = absoluteIndex < 4;
                    const isEager = isPriority;
                    return (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                        index={absoluteIndex}
                        isEager={isEager}
                        isPriority={isPriority}
                        showMobileCopy={isMobileViewport}
                        isCopied={copiedId === prompt.id}
                        onCopy={handleCopyPrompt}
                        onDownload={handleDownloadImage}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
        ) : (
          <div className="explore-uniform-grid">
            {displayedPrompts.map((prompt, idx) => {
              const isPriority = idx < 4;
              const isEager = isPriority;
              return (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  index={idx}
                  isEager={isEager}
                  isPriority={isPriority}
                  isUniform
                  showMobileCopy={isMobileViewport}
                  isCopied={copiedId === prompt.id}
                  onCopy={handleCopyPrompt}
                  onDownload={handleDownloadImage}
                />
              );
            })}
          </div>
        )}

        {/* Empty Search / Filter state */}
        {processedPrompts.length === 0 && (
          <div className="explore-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <p>No prompts found matching your criteria.</p>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {processedPrompts.length > 0 && (
          <div 
            ref={loaderRef}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '36px', marginBottom: '36px', minHeight: '60px' }}
          >
            {isLoadingMore ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="infinite-scroll-spinner" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>Loading more prompts...</span>
              </div>
            ) : displayedPrompts.length < processedPrompts.length ? (
              <div style={{ height: '20px' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
                Showing all {processedPrompts.length} prompts
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Navigation Menu bottom-right */}
      <div className="floating-nav">
        {/* Go back Home */}
        <Link href="/">
          <button className="floating-btn" aria-label="Go Home" title="Go Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
        </Link>

        {/* Return to top of main panel */}
        <button 
          className="floating-btn btn-dark" 
          aria-label="Return to Top" 
          title="Return to Top"
          onClick={() => {
            const panel = document.getElementById("exploreMainPanel");
            if (panel) {
              panel.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>

        <ScrollProgressIndicator
          displayedItems={displayedPrompts.length}
          totalItems={processedPrompts.length}
          viewMode={viewMode}
          isHydrating={isLibraryHydrating}
        />
      </div>

      {/* Toast Notification */}
      <div className={`toast-notification ${copiedId ? 'active' : ''}`}>
        <svg width="18" height="18" fill="none" stroke="#10B981" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        <span style={{ fontWeight: 600 }}>Prompt copied to clipboard!</span>
      </div>

    </div>
  );
}

export default function ExplorePageClient({ initialPrompts, initialSettings, initialSearchParams }) {
  return <ExplorePageContent initialPrompts={initialPrompts} initialSettings={initialSettings} initialSearchParams={initialSearchParams} />;
}
