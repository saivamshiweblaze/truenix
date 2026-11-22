"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bell, ChevronsUpDown, LogOut, Mail, Menu as MenuIcon, Plus, Search, Settings, UserRound, X, FlaskRound } from "lucide-react";
import { brand, features } from "@/config/brand";
import { clearTransientFiles, useTransientFile } from "@/lib/store/transient-files";
import { isActive, MOBILE_TABS, NAV_GROUPS, navFor, PRIMARY_NAV, type NavItem } from "@/config/navigation";
import { ButtonLink } from "@/components/ui/button";
import { ROLES, roleShort } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { unreadCount } from "@/lib/store/selectors";
import { signOut, switchDemoRole } from "@/lib/store/actions";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/primitives";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { Logo } from "./logo";
import { GlobalSearch } from "./global-search";
import { SiteNotices } from "./site-notices";

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.hint}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-sm px-3 text-ui transition-colors duration-150",
        active ? "bg-surface font-semibold text-ink" : "text-charcoal hover:bg-surface hover:text-ink",
      )}
    >
      {active && <motion.span layoutId="nav-active" aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
      <Icon size={18} strokeWidth={active ? 2 : 1.7} aria-hidden className={cn("relative shrink-0", active ? "text-accent-text" : "text-sub")} />
      <span className="relative truncate">{item.label}</span>
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const s = useAppState();
  const extra = navFor(s.user?.role);
  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {NAV_GROUPS.map((g) => (
        <div key={g.id} className="flex flex-col gap-px">
          {g.label && <p className="mb-1 px-3 text-micro text-mute">{g.label}</p>}
          {g.items.map((n) => (
            <NavLink key={n.href} item={n} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      {extra.length > 0 && (
        <div className="flex flex-col gap-px">
          <p className="mb-1 px-3 text-micro text-mute">For your role</p>
          {extra.map((n) => (
            <NavLink key={n.href} item={n} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </nav>
  );
}

/**
 * The one action available everywhere: start a new idea.
 * Ink rather than the accent: the accent belongs to each page's own primary action.
 */
function NewIdeaButton({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  return (
    <ButtonLink href="/ideas/new" variant="primary" onClick={onNavigate} className={cn("w-full justify-start", className)}>
      <Plus size={17} strokeWidth={2.2} aria-hidden /> Submit an idea
    </ButtonLink>
  );
}

/** Developer tools only (hidden in customer builds). Changes which interface is shown; grants no real permission. */
export function DevRoleSwitcher({ side = "top" }: { side?: "top" | "bottom" }) {
  const s = useAppState();
  const router = useRouter();
  if (!features.devTools || !s.user) return null;
  return (
    <Menu
      label="Switch role (developer tools)"
      side={side}
      align="start"
      trigger={({ toggle, open, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          className="flex w-full items-center gap-2.5 rounded-sm border border-dashed border-line-strong px-3 py-2 text-left transition-colors hover:border-ink"
        >
          <FlaskRound size={15} className="shrink-0 text-sub" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[0.625rem] uppercase tracking-[0.06em] text-mute">Dev tools · role</span>
            <span className="block truncate text-meta font-medium text-ink">{roleShort(s.user!.role)}</span>
          </span>
          <ChevronsUpDown size={14} className="text-mute" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Preview the interface for a role. Developer tool — not access control.</MenuLabel>
          {ROLES.map((r) => (
            <MenuItem
              key={r.id}
              active={s.user?.role === r.id}
              onSelect={() => {
                switchDemoRole(r.id);
                close();
                toast(`Viewing as ${r.label}`);
                router.push(r.id === "platform_admin" ? "/admin" : r.id === "institution_admin" ? "/institution" : "/home");
              }}
            >
              {r.label}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
}

/** The signed-in person's avatar, using a photo attached this session when there is one. */
export function MeAvatar({ size, className }: { size: number; className?: string }) {
  const s = useAppState();
  const photo = useTransientFile("photo");
  if (!s.user) return null;
  return <Avatar name={s.user.name} size={size} me src={photo?.url} className={className} />;
}

function UserMenu({ compact }: { compact?: boolean }) {
  const s = useAppState();
  const router = useRouter();
  if (!s.user) return null;
  return (
    <Menu
      label="Account"
      trigger={({ toggle, open, id }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label="Open account menu" className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80">
          <MeAvatar size={compact ? 30 : 32} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-ui font-medium text-ink">{s.user!.name}</p>
            <p className="text-meta text-sub">{s.user!.email}</p>
          </div>
          <MenuSeparator />
          <MenuItem icon={<UserRound size={15} />} onSelect={() => (close(), router.push("/profile"))}>
            Your profile
          </MenuItem>
          <MenuItem icon={<Settings size={15} />} onSelect={() => (close(), router.push("/settings"))}>
            Settings
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<LogOut size={15} />}
            onSelect={() => {
              close();
              signOut();
              clearTransientFiles();
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

function IconLink({ href, label, count, children }: { href: string; label: string; count?: number; children: ReactNode }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link href={href} aria-label={count ? `${label}, ${count} unread` : label} className={cn("relative flex h-10 w-10 items-center justify-center rounded-sm transition-colors", active ? "bg-surface text-ink" : "text-sub hover:bg-surface hover:text-ink")}>
      {children}
      {!!count && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] font-semibold leading-none text-white ring-2 ring-paper tabular-nums">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const s = useAppState();
  const [drawer, setDrawer] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const unread = unreadCount(s);

  // Close overlays when the route changes (adjusting state during render, per React guidance).
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawer(false);
    setMobileSearch(false);
  }
  const router = useRouter();

  return (
    <div className="min-h-dvh bg-paper">
      <a href="#main" className="sr-only z-[90] rounded-sm bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-paper px-3 pb-4 pt-3.5 lg:flex">
        <div className="mb-5 px-3">
          <Logo href="/home" showSignature />
        </div>
        <NewIdeaButton className="mb-5" />
        <div className="scrollbar-none -mx-1 flex-1 overflow-y-auto px-1">
          <NavList pathname={pathname} />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <DevRoleSwitcher />
          <p className="px-1 text-[0.6875rem] leading-snug text-mute">{brand.signature}</p>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md lg:ml-60">
        <SiteNotices />
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <div className="lg:hidden">
            <Logo href="/home" />
          </div>
          <GlobalSearch className="hidden max-w-xl flex-1 md:block" />
          <div className="ml-auto flex items-center gap-1">
            <ButtonLink href="/ideas/new" variant="primary" size="sm" className="mr-1 lg:hidden" aria-label="Submit an idea">
              <Plus size={16} strokeWidth={2.2} aria-hidden /> <span className="hidden sm:inline">Idea</span>
            </ButtonLink>
            <button type="button" aria-label="Search" aria-expanded={mobileSearch} onClick={() => setMobileSearch((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-sm text-sub hover:bg-surface hover:text-ink md:hidden">
              <Search size={18} />
            </button>
            <IconLink href="/messages" label="Messages">
              <Mail size={18} strokeWidth={1.7} />
            </IconLink>
            <IconLink href="/notifications" label="Notifications" count={unread}>
              <Bell size={18} strokeWidth={1.7} />
            </IconLink>
            <div className="ml-1.5 hidden sm:block">
              <UserMenu />
            </div>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {mobileSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-visible px-4 pb-3 md:hidden">
              <GlobalSearch autoFocus onNavigate={() => setMobileSearch(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="lg:ml-60">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-5 md:px-8 md:pt-7 lg:pb-16"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE_TABS.map((href) => {
            const item = PRIMARY_NAV.find((n) => n.href === href)!;
            const Icon = item.icon;
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem]", active ? "font-semibold text-ink" : "text-sub")}>
                  {active && <motion.span layoutId="tab-indicator" aria-hidden className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-accent" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                  <span className="relative flex h-7 w-12 items-center justify-center">
                    <Icon size={20} strokeWidth={active ? 2 : 1.6} aria-hidden className={cn("relative", active && "text-accent-text")} />
                  </span>
                  {item.label === "My workspace" ? "Workspace" : item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="mobile-drawer" className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] text-sub">
              <span className="flex h-7 w-12 items-center justify-center">
                <MenuIcon size={19} strokeWidth={1.6} aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[60] lg:hidden" id="mobile-drawer">
            <motion.div className="absolute inset-0 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 right-0 flex w-[min(320px,86vw)] flex-col bg-paper px-4 pb-6 pt-4 shadow-overlay"
            >
              <div className="mb-5 flex items-center justify-between">
                {s.user && (
                  <Link href="/profile" className="flex items-center gap-2.5" onClick={() => setDrawer(false)}>
                    <MeAvatar size={34} />
                    <span>
                      <span className="block text-ui font-medium">{s.user.name}</span>
                      <span className="block text-micro text-sub">View profile</span>
                    </span>
                  </Link>
                )}
                <button type="button" aria-label="Close navigation" onClick={() => setDrawer(false)} className="rounded-sm p-2 text-sub hover:bg-surface">
                  <X size={18} />
                </button>
              </div>
              <NewIdeaButton onNavigate={() => setDrawer(false)} className="mb-5" />
              <div className="flex-1 overflow-y-auto">
                <NavList pathname={pathname} onNavigate={() => setDrawer(false)} />
                <div className="mx-3 my-3 h-px bg-line" />
                <div className="flex flex-col gap-0.5">
                  <NavLink item={{ href: "/settings", label: "Settings", icon: Settings }} pathname={pathname} onNavigate={() => setDrawer(false)} />
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      clearTransientFiles();
                      router.push("/login");
                    }}
                    className="flex h-10 items-center gap-3 rounded-sm px-3 text-ui text-charcoal hover:bg-surface hover:text-ink"
                  >
                    <LogOut size={17} strokeWidth={1.7} aria-hidden /> Sign out
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <DevRoleSwitcher />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
