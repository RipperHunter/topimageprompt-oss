const blocksByVariant = {
  grid: 12,
  collections: 6,
  blog: 6,
  detail: 1,
};

export default function PageSkeleton({ variant = "grid" }) {
  const count = blocksByVariant[variant] || blocksByVariant.grid;
  const isDetail = variant === "detail";

  return (
    <main className={`page-loading-shell page-loading-${variant}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page content</span>
      <div className="loading-heading-group" aria-hidden="true">
        <div className="loading-shimmer loading-eyebrow" />
        <div className="loading-shimmer loading-title" />
        <div className="loading-shimmer loading-subtitle" />
      </div>

      {isDetail ? (
        <div className="loading-detail-layout" aria-hidden="true">
          <div className="loading-shimmer loading-detail-media" />
          <div className="loading-detail-copy">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                className="loading-shimmer loading-copy-line"
                style={{ width: `${index % 3 === 2 ? 68 : 100}%` }}
                key={index}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={`loading-card-grid loading-card-grid-${variant}`} aria-hidden="true">
          {Array.from({ length: count }, (_, index) => (
            <div className="loading-card" key={index}>
              <div className="loading-shimmer loading-card-media" />
              <div className="loading-shimmer loading-card-line loading-card-line-wide" />
              <div className="loading-shimmer loading-card-line" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
