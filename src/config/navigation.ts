import {
  Briefcase,
  Building2,
  ClipboardCheck,
  Compass,
  FlaskConical,
  House,
  Lightbulb,
  MessagesSquare,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One-line purpose, used as the link's description and in the mobile drawer. */
  hint?: string;
  /** Roles that see this item. Undefined = everyone. UI only — not access control. */
  roles?: RoleId[];
}

export interface NavGroup {
  id: string;
  /** Visible group label. Undefined = no heading (the top group). */
  label?: string;
  items: NavItem[];
}

/**
 * Navigation is grouped by what the person is trying to do, so a new member can tell
 * where to find ideas, where to work on their own, and where to find people and programmes.
 * Every destination appears exactly once.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "you",
    items: [
      { href: "/home", label: "Home", icon: House, hint: "Your next step and what’s new for you" },
      { href: "/workspace", label: "My workspace", icon: Briefcase, hint: "Your projects, tasks and saved items" },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    items: [
      { href: "/discover", label: "Discover", icon: Compass, hint: "Problems, findings and founder updates" },
      { href: "/ideas", label: "Ideas", icon: Lightbulb, hint: "Startup ideas and projects people share" },
      { href: "/community", label: "Community", icon: UsersRound, hint: "People, questions and collaboration" },
      { href: "/opportunities", label: "Opportunities", icon: Sparkles, hint: "Programmes, grants and hackathons" },
    ],
  },
  {
    id: "build",
    label: "Work on an idea",
    items: [
      { href: "/research", label: "AI Researcher", icon: ScanSearch, hint: "Plan market and customer research" },
      { href: "/validate", label: "Validate my idea", icon: FlaskConical, hint: "Test assumptions with evidence" },
    ],
  },
];

/** Flat list, in sidebar order. */
export const PRIMARY_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const ROLE_NAV: NavItem[] = [
  { href: "/reviews", label: "Review requests", icon: ClipboardCheck, roles: ["expert", "mentor"] },
  { href: "/studies", label: "Research studies", icon: MessagesSquare, roles: ["participant"] },
  { href: "/institution", label: "Institution", icon: Building2, roles: ["institution_admin"] },
  { href: "/admin", label: "Admin console", icon: ShieldCheck, roles: ["platform_admin"] },
];

/** Bottom tab bar on small screens; everything else is under "More". */
export const MOBILE_TABS = ["/home", "/discover", "/ideas", "/workspace"];

export function navFor(role: RoleId | undefined) {
  return ROLE_NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
