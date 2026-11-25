"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reloadAppData } from "@/lib/data/session";
import { signOut } from "@/lib/store/actions";
import { useAppSnapshot } from "@/lib/store/store";
import { BrandLoader } from "./brand-loader";

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <BrandLoader label="Loading your workspace" />
    </div>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div role="alert" className="flex max-w-md flex-col items-start gap-4">
        <h1 className="text-title font-bold">{title}</h1>
        <p className="text-body text-sub">{body}</p>
        {action}
      </div>
    </div>
  );
}

/**
 * Routing gate for signed-in areas. The session itself is verified by Supabase (proxy.ts refreshes it and every
 * query is checked by Row Level Security), so this component only decides what to show while data loads and
 * where to send members who are signed out, not yet onboarded, or whose account is suspended.
 */
export function SessionGate({ children, requireOnboarded = true }: { children: ReactNode; requireOnboarded?: boolean }) {
  const { state, hydrated } = useAppSnapshot();
  const router = useRouter();
  const pathname = usePathname();
  const loading = !hydrated || (state.signedIn && state.dataStatus === "loading");
  const needsLogin = !loading && (!state.signedIn || !state.user);
  const blocked = !loading && !!state.session && (state.session.accountStatus === "suspended" || state.session.accountStatus === "deactivated");
  const needsOnboarding = !loading && !needsLogin && !blocked && requireOnboarded && !state.user!.onboarded && state.user!.role !== "platform_admin";

  useEffect(() => {
    if (needsLogin) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (needsOnboarding) router.replace("/onboarding");
  }, [needsLogin, needsOnboarding, router, pathname]);

  if (blocked) {
    return (
      <Notice
        title={state.session!.accountStatus === "suspended" ? "This account is suspended" : "This account is deactivated"}
        body={state.session!.accountStatusReason ? `Reason: ${state.session!.accountStatusReason}` : "Contact support if you think this is a mistake."}
        action={
          <Button variant="secondary" onClick={() => void signOut().then(() => router.replace("/login"))}>
            Sign out
          </Button>
        }
      />
    );
  }
  if (state.signedIn && state.dataStatus === "error" && !state.user) {
    return (
      <Notice
        title="We couldn’t load your workspace"
        body={`TRUEVIX couldn’t reach its database. Your work is safe; try again in a moment. (${state.dataError ?? "Unknown error"})`}
        action={<Button onClick={() => void reloadAppData()}>Try again</Button>}
      />
    );
  }
  if (loading || needsLogin || needsOnboarding) return <Splash />;
  return <>{children}</>;
}
