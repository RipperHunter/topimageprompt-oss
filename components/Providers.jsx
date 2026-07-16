"use client";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";
import { Suspense } from "react";
import MotionProvider from "@/components/motion/MotionProvider";

export default function Providers({ children }) {
  return (
    <MotionProvider>
      <ToastProvider>
        <SessionProvider>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </SessionProvider>
      </ToastProvider>
    </MotionProvider>
  );
}
