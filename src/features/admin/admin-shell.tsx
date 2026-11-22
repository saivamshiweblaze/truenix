"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bell, ChevronsLeft, ChevronsRight, LogOut, Menu as MenuIcon, Search, ShieldCheck, X } from "lucide-react";
import { brand, features } from "@/config/brand";
import { SessionGate } from "@/components/shell/session-gate";
import { RoleGate } from "@/components/shell/role-gate";
import { LogoMark } from "@/components/shell/logo";
import { Avatar } from "@/components/ui/primitives";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { signOut } from "@/lib/store/actions";
import { adminPreviewRole } from "@/lib/store/admin-actions";
import { ADMIN_ROLES } from "@/lib/store/platform";
import { adminSearch } from "@/lib/admin/search";
import { can } from "@/lib/admin/permissions";
import { cn } from "@/lib/utils";
import { pendingCounts } from "@/lib/admin/metrics";
import { ADMIN_NAV, navItemFor, type AdminNavItem } from "./registry";

const PENDING_LABEL: Record<keyof ReturnType<typeof pendingCounts>, { label: string; href: string }> = {
  reports: { label: "reports awaiting moderation", href: "/admin/moderation" },
  ideas: { label: "ideas awaiting review", href: "/admin/ideas" },
  institutions: { label: "organisation requests", href: "/admin/institutions" },
  talent: { label: "mentor or expert applications", href: "/admin/talent" },
  applications: { label: "opportunity applications to review", href: "/admin/opportunities" },
};

/* Collapsed-sidebar preference: a per-viewer convenience, so browser storage with a safe fallback. */
const COLLAPSE_KEY = "truevix.admin.sidebar";
const collapseSubs = new Set<() => void>();
function readCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function setCollapsed(v: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  collapseSubs.forEach((l) => l());
}
function useCollapsed() {
  return useSyncExternalStore(
    (l) => (collapseSubs.add(l), () => collapseSubs.delete(l)),
    readCollapsed,
    () => false,
  );
}

function NavItemLink({ item, pathname, collapsed, count, onNavigate }: { item: AdminNavItem; pathname: string; collapsed?: boolean; count?: number; onNavigate?: () => void }) {
  const active = navItemFor(pathname)?.href === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-sm text-ui transition-colors",
        collapsed ? "justify-center px-0" : "px-2.5",
        active ? "bg-surface font-semibold text-ink" : "text-charcoal hover:bg-surface hover:text-ink",
      )}
    >
      {active && <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" />}
      <Icon size={16} strokeWidth={active ? 2 : 1.7} aria-hidden className={cn("shrink-0", active ? "text-accent-text" : "text-sub")} />
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "sr-only")}>{item.label}</span>
      {!!count && (
        <span className={cn("rounded-xs bg-ink px-1.5 text-[0.6875rem] font-semibold leading-[1.125rem] text-white tabular-nums", collapsed && "absolute right-0.5 top-0 px-1 text-[0.625rem] leading-4")} aria-hidden title={`${count} pending`}>
          {count}
        </span>
      )}
    </Link>
  );
}

function AdminNavList({ pathname, collapsed, onNavigate }: { pathname: string; collapsed?: boolean; onNavigate?: () => void }) {
  const s = useAppState();
  const counts = pendingCounts(s);
  return (
    <nav aria-label="Admin" className="flex flex-col gap-4">
      {ADMIN_NAV.map((g) => {
        const items = g.items.filter((i) => can(s, i.module, "view"));
        if (!items.length) return null;
        return (
          <div key={g.id} className="flex flex-col gap-px">
            {collapsed ? <span aria-hidden className="mx-2 mb-1 h-px bg-line" /> : <p className="mb-1 px-2.5 text-micro text-mute">{g.label}</p>}
            {items.map((i) => (
              <NavItemLink key={i.href} item={i} pathname={pathname} collapsed={collapsed} count={i.pending ? counts[i.pending] : undefined} onNavigate={onNavigate} />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function AdminSearchBox({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const s = useAppState();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const hits = adminSearch(s, q, 8);
  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const go = (href: string) => {
    setOpen(false);
    setQ("");
    onNavigate?.();
    router.push(href);
  };
  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="flex h-9 items-center gap-2 rounded-sm border border-line-strong bg-paper px-3 focus-within:border-ink">
        <Search size={15} className="shrink-0 text-sub" aria-hidden />
        <input
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls="admin-search-list"
          aria-label="Search all admin records"
          placeholder="Search members, ideas, opportunities…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, -1));
            } else if (e.key === "Enter" && q.trim().length >= 2) {
              e.preventDefault();
              go(active >= 0 && hits[active] ? hits[active].href : `/admin/search?q=${encodeURIComponent(q.trim())}`);
            } else if (e.key === "Escape") setOpen(false);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-ui placeholder:text-mute focus:outline-none"
        />
        <kbd className="hidden rounded-xs border border-line px-1 text-[0.625rem] text-mute xl:inline">Enter</kbd>
      </div>
      {open && q.trim().length >= 2 && (
        <ul id="admin-search-list" role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-line bg-paper p-1 shadow-overlay">
          {hits.length ? (
            hits.map((h, i) => (
              <li key={`${h.kind}-${h.id}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(h.href)} className={cn("flex w-full items-start gap-3 rounded-sm px-2.5 py-2 text-left hover:bg-surface", i === active && "bg-surface")}>
                  <span className="mt-0.5 w-20 shrink-0 text-micro text-mute">{h.kind}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-ui text-ink">{h.title}</span>
                    <span className="block truncate text-micro text-sub">{h.detail}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-2.5 py-2 text-meta text-sub">No records match “{q}”.</li>
          )}
          {hits.length > 0 && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(`/admin/search?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-sm px-2.5 py-2 text-left text-meta font-medium text-ink hover:bg-surface">
                See all results for “{q}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function PendingBell() {
  const s = useAppState();
  const counts = pendingCounts(s);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const router = useRouter();
  return (
    <Menu
      label="Pending actions"
      trigger={({ open, toggle, id }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id} aria-label={`Pending actions: ${total}`} className="relative flex h-9 w-9 items-center justify-center rounded-sm text-sub hover:bg-surface hover:text-ink">
          <Bell size={17} strokeWidth={1.7} aria-hidden />
          {total > 0 && <span aria-hidden className="absolute right-1 top-1 min-w-4 rounded-full bg-ink px-1 text-center text-[0.625rem] font-semibold leading-4 text-white tabular-nums">{total}</span>}
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Waiting for an administrator</MenuLabel>
          {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
            <MenuItem key={k} onSelect={() => (close(), router.push(PENDING_LABEL[k].href))}>
              <span className="tabular-nums font-semibold">{counts[k]}</span> {PENDING_LABEL[k].label}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

function AdminProfileMenu() {
  const s = useAppState();
  const router = useRouter();
  const role = ADMIN_ROLES.find((r) => r.id === s.platform.myAdminRole);
  if (!s.user) return null;
  return (
    <Menu
      label="Administrator account"
      trigger={({ open, toggle, id }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-controls={id} className="flex h-9 items-center gap-2 rounded-sm px-1.5 hover:bg-surface" aria-label="Administrator account">
          <Avatar name={s.user!.name} size={26} />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block text-meta font-medium text-ink">{s.user!.name}</span>
            <span className="block text-micro text-mute">{role?.label}</span>
          </span>
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>
            Signed in as {s.user!.email}
            <br />
            Admin role: {role?.label}
          </MenuLabel>
          <MenuSeparator />
          {features.devTools && (
            <>
              <MenuLabel>Preview another admin role (interface only, not access control)</MenuLabel>
              {ADMIN_ROLES.map((r) => (
                <MenuItem
                  key={r.id}
                  active={r.id === s.platform.myAdminRole}
                  onSelect={() => {
                    adminPreviewRole(r.id);
                    toast(`Previewing as ${r.label}`, { body: "Changes what the interface offers. Real enforcement needs the Phase 2 server." });
                    close();
                  }}
                >
                  {r.label}
                </MenuItem>
              ))}
              <MenuSeparator />
            </>
          )}
          <MenuItem icon={<ArrowLeft size={15} />} onSelect={() => (close(), router.push("/home"))}>
            Back to {brand.productName}
          </MenuItem>
          <MenuItem
            icon={<LogOut size={15} />}
            onSelect={() => {
              close();
              signOut();
              router.push("/login");
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useCollapsed();
  const s = useAppState();
  const [drawer, setDrawer] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawer(false);
  }
  return (
    <SessionGate>
      <div className="min-h-dvh bg-canvas">
        <a href="#main" className="sr-only z-[90] rounded-sm bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-paper">
          <div className="flex h-14 items-center gap-2 px-3 md:gap-3 md:px-4">
            <button type="button" aria-label="Open admin menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="flex h-9 w-9 items-center justify-center rounded-sm text-sub hover:bg-surface hover:text-ink lg:hidden">
              <MenuIcon size={18} aria-hidden />
            </button>
            <Link href="/admin" className="flex shrink-0 items-center gap-2" aria-label={`${brand.productName} admin overview`}>
              <LogoMark size={22} />
              <span className="font-display text-ui font-bold tracking-tight text-ink">{brand.productName}</span>
              <span className="hidden rounded-xs border border-line-strong px-1.5 text-micro font-medium text-sub sm:inline">Admin</span>
            </Link>
            <AdminSearchBox className="ml-2 hidden max-w-xl flex-1 md:block" />
            <div className="ml-auto flex items-center gap-1">
              <Link href="/admin/search" aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-sm text-sub hover:bg-surface hover:text-ink md:hidden">
                <Search size={17} aria-hidden />
              </Link>
              <PendingBell />
              <AdminProfileMenu />
            </div>
          </div>
          {s.platform.config.maintenance.enabled && (
            <p className="border-t border-line bg-surface px-4 py-1.5 text-meta text-caution" role="status">
              Maintenance mode is on. Members see a maintenance notice. <Link href="/admin/settings?tab=general" className="underline underline-offset-4">Change</Link>
            </p>
          )}
        </header>

        <RoleGate roles={["platform_admin"]}>
          <div className="flex">
            <aside className={cn("sticky top-14 hidden h-[calc(100dvh-3.5rem)] shrink-0 flex-col border-r border-line bg-paper transition-[width] duration-200 lg:flex", collapsed ? "w-16" : "w-60")}>
              <div className="scrollbar-none flex-1 overflow-y-auto px-2 py-4">
                <AdminNavList pathname={pathname} collapsed={collapsed} />
              </div>
              <div className="flex flex-col gap-2 border-t border-line p-2">
                {!collapsed && (
                  <p className="flex gap-1.5 px-1 text-micro leading-snug text-mute">
                    <ShieldCheck size={13} className="mt-px shrink-0" aria-hidden />
                    Data lives in this browser. Permissions are interface rules until server enforcement (Phase 2).
                  </p>
                )}
                <button type="button" onClick={() => setCollapsed(!collapsed)} className="flex h-8 items-center justify-center gap-2 rounded-sm text-meta text-sub hover:bg-surface hover:text-ink" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                  {collapsed ? <ChevronsRight size={16} aria-hidden /> : <ChevronsLeft size={16} aria-hidden />}
                  {!collapsed && "Collapse"}
                </button>
              </div>
            </aside>
            <main id="main" className="min-w-0 flex-1 px-4 pb-16 pt-4 md:px-8 md:pt-6">
              <div className="mx-auto max-w-[1280px]">{children}</div>
            </main>
          </div>
        </RoleGate>

        <AnimatePresence>
          {drawer && (
            <div className="fixed inset-0 z-[60] lg:hidden">
              <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-paper shadow-overlay"
              >
                <div className="flex h-14 items-center justify-between border-b border-line px-4">
                  <span className="font-display text-ui font-bold">{brand.productName} admin</span>
                  <button type="button" onClick={() => setDrawer(false)} aria-label="Close admin menu" className="rounded-sm p-1.5 text-sub hover:bg-surface hover:text-ink">
                    <X size={18} aria-hidden />
                  </button>
                </div>
                <div className="border-b border-line p-3">
                  <AdminSearchBox onNavigate={() => setDrawer(false)} />
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <AdminNavList pathname={pathname} onNavigate={() => setDrawer(false)} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </SessionGate>
  );
}
