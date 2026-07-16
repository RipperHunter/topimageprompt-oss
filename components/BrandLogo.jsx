"use client";

import Image from "next/image";
import { BRAND_FAVICON, BRAND_LOGO, BRAND_NAME } from "@/lib/brand";

export default function BrandLogo({
  variant = "full",
  className = "",
  priority = false,
  height = 42,
}) {
  const isMark = variant === "mark";
  const width = isMark ? height : Math.round(height * 3.58);

  return (
    <span
      className={`brand-logo brand-logo-${variant} ${className}`.trim()}
      aria-label={BRAND_NAME}
      style={{ "--brand-logo-height": `${height}px` }}
    >
      {isMark ? (
        <Image
          src={BRAND_FAVICON}
          alt={BRAND_NAME}
          width={width}
          height={height}
          priority={priority}
          className="brand-logo-image"
        />
      ) : (
        <>
          <Image
            src={BRAND_LOGO}
            alt={BRAND_NAME}
            width={width}
            height={height}
            priority={priority}
            className="brand-logo-image logo-light"
          />
          <Image
            src="/logos/main-logo-white.svg"
            alt={BRAND_NAME}
            width={width}
            height={height}
            priority={priority}
            className="brand-logo-image logo-dark"
          />
        </>
      )}
    </span>
  );
}
