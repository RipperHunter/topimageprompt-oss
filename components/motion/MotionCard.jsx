"use client";

import * as m from "motion/react-m";

export default function MotionCard({
  children,
  className = "",
  index = 0,
  disabled = false,
  fast = false,
}) {
  const resolvedClassName = `motion-card-shell ${className}`.trim();

  if (disabled) {
    return <div className={resolvedClassName}>{children}</div>;
  }

  return (
    <m.div
      className={resolvedClassName}
      initial={{ opacity: 0.94, y: 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: fast ? 0.16 : 0.38,
        delay: Math.min(index, 8) * (fast ? 0.005 : 0.025),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </m.div>
  );
}
