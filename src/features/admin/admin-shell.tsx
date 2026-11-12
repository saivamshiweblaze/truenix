"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, Building2, ClipboardList, Flag, Gauge, Lightbulb, MessageSquareWarning, Settings, Sparkles, UserCog, Users } from "lucide-react";
import { brand } from "@/config/brand";
import { SessionGate } from "@/components/shell/session-gate";
import { RoleGate } from "@/components/shell/role-gate";
import { LogoMark } from "@/components/shell/logo";
import { DemoRoleSwitcher } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";

export const ADMIN_SECTIONS = [
  { slug: "", label: "Overview", icon: Gauge },
  { slug: "users", label: "Users", icon: Users },
  { slug: "roles", label: "Roles", icon: UserCog },
  { slug: "ideas", label: "Idea moderation", icon: Lightbulb },
  { slug: "moderation", label: "Content moderation", icon: MessageSquareWarning },
  { slug: "reports", label: "Reported content", icon: Flag },
  { slug: "institutions", label: "Institutions", icon: Building2 },
  { slug: "opportunities", label: "Opportunities", icon: Sparkles },
  { slug: "settings", label: "Platform settings", icon: Settings },
  { slug: "audit", label: "Audit activity", icon: ClipboardList },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <SessionGate>
      <div className="min-h-dvh bg-surface">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 bg-ink px-4 text-white md:px-6">
          <LogoMark size={22} inverted />
          <span className="text-ui font-medium">{brand.productNameDisplay} admin console</span>
          <span className="hidden rounded-xs border border-white/30 px-1.5 py-px text-micro text-white/70 sm:inline">Demo — changes stay in this browser</span>
          <Link href="/home" className="ml-auto inline-flex items-center gap-1.5 text-meta text-white/70 hover:text-white">
            <ArrowLeft size={14} aria-hidden /> Back to app
          </Link>
        </header>
        <RoleGate roles={["platform_admin"]}>
          <div className="lg:flex">
            <aside className="border-b border-line bg-paper lg:sticky lg:top-12 lg:h-[calc(100dvh-3rem)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
              <nav aria-label="Admin" className="scrollbar-none flex gap-1 overflow-x-auto p-3 lg:flex-col">
                {ADMIN_SECTIONS.map((s) => {
                  const href = s.slug ? `/admin/${s.slug}` : "/admin";
                  const active = pathname === href;
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.slug}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex h-9 shrink-0 items-center gap-2.5 rounded-sm px-3 text-ui", active ? "bg-ink text-white" : "text-sub hover:bg-surface hover:text-ink")}
                    >
                      <Icon size={15} aria-hidden />
                      {s.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="hidden p-3 lg:block">
                <DemoRoleSwitcher />
              </div>
            </aside>
            <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-8">
              <div className="mx-auto max-w-5xl rounded-md border border-line bg-paper p-5 md:p-8">{children}</div>
            </main>
          </div>
        </RoleGate>
      </div>
    </SessionGate>
  );
}
