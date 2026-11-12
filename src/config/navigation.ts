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
  /** Roles that see this item. Undefined = everyone. UI only — not access control. */
  roles?: RoleId[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/research", label: "AI Researcher", icon: ScanSearch },
  { href: "/validate", label: "Validate my idea", icon: FlaskConical },
  { href: "/community", label: "Community", icon: UsersRound },
  { href: "/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/workspace", label: "My workspace", icon: Briefcase },
];

export const ROLE_NAV: NavItem[] = [
  { href: "/reviews", label: "Review requests", icon: ClipboardCheck, roles: ["expert", "mentor"] },
  { href: "/studies", label: "Research studies", icon: MessagesSquare, roles: ["participant"] },
  { href: "/institution", label: "Institution", icon: Building2, roles: ["institution_admin"] },
  { href: "/admin", label: "Admin console", icon: ShieldCheck, roles: ["platform_admin"] },
];

export const MOBILE_TABS = ["/home", "/discover", "/ideas", "/research"];

export function navFor(role: RoleId | undefined) {
  return ROLE_NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
