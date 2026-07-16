"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

export default function PageTransition({ children }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.div
      className="page-motion-stage"
      initial={{ opacity: shouldReduceMotion ? 1 : 0.94, y: shouldReduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
