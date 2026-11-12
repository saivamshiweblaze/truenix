"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { hydrateStore } from "@/lib/store/store";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    hydrateStore();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster />
    </MotionConfig>
  );
}
