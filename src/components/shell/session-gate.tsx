"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppSnapshot } from "@/lib/store/store";
import { BrandLoader } from "./brand-loader";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <BrandLoader label="Loading your workspace" />
    </div>
  );
}

/**
 * Client-side routing gate for the browser-local session. This is a UX redirect only:
 * Phase 1 has no server, so nothing here is a security boundary.
 */
export function SessionGate({ children, requireOnboarded = true }: { children: ReactNode; requireOnboarded?: boolean }) {
  const { state, hydrated } = useAppSnapshot();
  const router = useRouter();
  const pathname = usePathname();
  const needsLogin = hydrated && (!state.signedIn || !state.user);
  const needsOnboarding = hydrated && !needsLogin && requireOnboarded && !state.user!.onboarded;

  useEffect(() => {
    if (needsLogin) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (needsOnboarding) router.replace("/onboarding");
  }, [needsLogin, needsOnboarding, router, pathname]);

  if (!hydrated || needsLogin || needsOnboarding) return <Splash />;
  return <>{children}</>;
}
