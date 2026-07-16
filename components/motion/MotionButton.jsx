"use client";

import * as m from "motion/react-m";

export default function MotionButton({ children, className = "", type = "button", ...props }) {
  return (
    <m.button
      type={type}
      className={className}
      initial={{ y: 0, scale: 1 }}
      animate={{ y: 0, scale: 1 }}
      whileHover={{ y: -2, scale: 1.025 }}
      whileTap={{ y: 0, scale: 0.965 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    >
      {children}
    </m.button>
  );
}
