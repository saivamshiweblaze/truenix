"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { SessionSync } from "@/lib/data/session";
import { Toaster } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionSync />
      {children}
      <Toaster />
    </MotionConfig>
  );
}
