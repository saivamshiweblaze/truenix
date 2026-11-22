import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  FlaskConical,
  Gauge,
  GraduationCap,
  Handshake,
  KeyRound,
  Lightbulb,
  Megaphone,
  MessageSquareWarning,
  MessagesSquare,
  ScanSearch,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminModuleId } from "@/lib/types";
import type { AppState } from "@/lib/store/state";
import { memberRow } from "@/lib/admin/members";
import { allIdeasAdmin } from "@/lib/store/selectors";
import { AdminOverview } from "./modules/overview";
import { AdminSearchPage } from "./modules/search";
import { UserDetail, UsersList } from "./modules/users";
import { OnboardingPage } from "./modules/onboarding";
import { IdeaAdminDetail, IdeasList } from "./modules/ideas";
import { ContentPage } from "./modules/content";
import { ModerationQueue, ReportDetail } from "./modules/moderation";
import { ResearchDetail, ResearchList } from "./modules/research";
import { ValidationDetail, ValidationList } from "./modules/validation";
import { OpportunitiesList, OpportunityAdminDetail } from "./modules/opportunities";
import { OpportunityForm } from "./modules/opportunity-form";
import { ApplicationDetail } from "./modules/applications";
import { InstitutionDetail, InstitutionForm, InstitutionsList } from "./modules/institutions";
import { TalentDetail, TalentPage } from "./modules/talent";
import { StudiesList, StudyDetail, StudyForm } from "./modules/studies";
import { CollaborationsPage } from "./modules/collaborations";
import { CommunicationsPage } from "./modules/communications";
import { CmsEditor, CmsList } from "./modules/cms";
import { AnalyticsPage } from "./modules/analytics";
import { AccessPage } from "./modules/access";
import { AuditPage } from "./modules/audit";
import { SettingsPage } from "./modules/settings";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module: AdminModuleId;
  /** Key into the pending-count map shown as a badge. */
  pending?: "reports" | "ideas" | "institutions" | "talent" | "applications";
}

/** Sidebar departments. Every admin destination appears exactly once. */
export const ADMIN_NAV: { id: string; label: string; items: AdminNavItem[] }[] = [
  {
    id: "ops",
    label: "Operations",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge, module: "overview" },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, module: "analytics" },
      { href: "/admin/audit", label: "Audit log", icon: ClipboardList, module: "audit" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, module: "users" },
      { href: "/admin/onboarding", label: "Onboarding", icon: UserCheck, module: "onboarding" },
      { href: "/admin/talent", label: "Mentors and experts", icon: GraduationCap, module: "talent", pending: "talent" },
      { href: "/admin/institutions", label: "Institutions", icon: Building2, module: "institutions", pending: "institutions" },
      { href: "/admin/collaboration", label: "Collaboration", icon: Handshake, module: "collaboration" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/ideas", label: "Ideas and projects", icon: Lightbulb, module: "ideas", pending: "ideas" },
      { href: "/admin/content", label: "Community content", icon: MessagesSquare, module: "content" },
      { href: "/admin/moderation", label: "Moderation queue", icon: MessageSquareWarning, module: "moderation", pending: "reports" },
      { href: "/admin/cms", label: "Site content", icon: FileText, module: "cms" },
      { href: "/admin/communications", label: "Announcements", icon: Megaphone, module: "communications" },
    ],
  },
  {
    id: "programmes",
    label: "Programmes",
    items: [
      { href: "/admin/opportunities", label: "Opportunities", icon: Sparkles, module: "opportunities", pending: "applications" },
      { href: "/admin/studies", label: "Research studies", icon: ClipboardList, module: "studies" },
    ],
  },
  {
    id: "intel",
    label: "Research and validation",
    items: [
      { href: "/admin/research", label: "AI Researcher", icon: ScanSearch, module: "research" },
      { href: "/admin/validation", label: "Validation", icon: FlaskConical, module: "validation" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/access", label: "Admin roles", icon: KeyRound, module: "access" },
      { href: "/admin/settings", label: "Settings and data", icon: Settings, module: "settings" },
    ],
  },
];

export const NAV_FLAT = ADMIN_NAV.flatMap((g) => g.items);

type Params = Record<string, string>;
export interface Crumb {
  label: string;
  href?: string;
}

interface AdminRoute {
  pattern: string;
  module: AdminModuleId;
  crumbs: (p: Params, s: AppState) => Crumb[];
  render: (p: Params) => ReactNode;
}

const section = (href: string): Crumb => {
  const n = NAV_FLAT.find((x) => x.href === href);
  return { label: n?.label ?? "Admin", href };
};
const oppTitle = (s: AppState, id: string) => s.platform.opportunities.find((o) => o.id === id)?.title ?? "Not found";

export const ADMIN_ROUTES: AdminRoute[] = [
  { pattern: "", module: "overview", crumbs: () => [], render: () => <AdminOverview /> },
  { pattern: "search", module: "overview", crumbs: () => [{ label: "Search" }], render: () => <AdminSearchPage /> },
  { pattern: "analytics", module: "analytics", crumbs: () => [section("/admin/analytics")], render: () => <AnalyticsPage /> },
  { pattern: "audit", module: "audit", crumbs: () => [section("/admin/audit")], render: () => <AuditPage /> },
  { pattern: "users", module: "users", crumbs: () => [section("/admin/users")], render: () => <UsersList /> },
  { pattern: "users/:id", module: "users", crumbs: (p, s) => [section("/admin/users"), { label: memberRow(s, p.id)?.person.name ?? "Not found" }], render: (p) => <UserDetail id={p.id} /> },
  { pattern: "onboarding", module: "onboarding", crumbs: () => [section("/admin/onboarding")], render: () => <OnboardingPage /> },
  { pattern: "talent", module: "talent", crumbs: () => [section("/admin/talent")], render: () => <TalentPage /> },
  { pattern: "talent/:id", module: "talent", crumbs: (p, s) => [section("/admin/talent"), { label: s.platform.people.find((x) => x.id === p.id)?.name ?? "Not found" }], render: (p) => <TalentDetail id={p.id} /> },
  { pattern: "institutions", module: "institutions", crumbs: () => [section("/admin/institutions")], render: () => <InstitutionsList /> },
  { pattern: "institutions/new", module: "institutions", crumbs: () => [section("/admin/institutions"), { label: "New organisation" }], render: () => <InstitutionForm /> },
  { pattern: "institutions/:id", module: "institutions", crumbs: (p, s) => [section("/admin/institutions"), { label: s.platform.institutions.find((x) => x.id === p.id)?.name ?? "Not found" }], render: (p) => <InstitutionDetail id={p.id} /> },
  { pattern: "institutions/:id/edit", module: "institutions", crumbs: (p, s) => [section("/admin/institutions"), { label: s.platform.institutions.find((x) => x.id === p.id)?.name ?? "Not found", href: `/admin/institutions/${p.id}` }, { label: "Edit" }], render: (p) => <InstitutionForm id={p.id} /> },
  { pattern: "collaboration", module: "collaboration", crumbs: () => [section("/admin/collaboration")], render: () => <CollaborationsPage /> },
  { pattern: "ideas", module: "ideas", crumbs: () => [section("/admin/ideas")], render: () => <IdeasList /> },
  { pattern: "ideas/:id", module: "ideas", crumbs: (p, s) => [section("/admin/ideas"), { label: allIdeasAdmin(s).find((i) => i.id === p.id)?.title.split(":")[0] ?? "Not found" }], render: (p) => <IdeaAdminDetail id={p.id} /> },
  { pattern: "content", module: "content", crumbs: () => [section("/admin/content")], render: () => <ContentPage /> },
  { pattern: "moderation", module: "moderation", crumbs: () => [section("/admin/moderation")], render: () => <ModerationQueue /> },
  { pattern: "moderation/:id", module: "moderation", crumbs: (p) => [section("/admin/moderation"), { label: `Report ${p.id}` }], render: (p) => <ReportDetail id={p.id} /> },
  { pattern: "cms", module: "cms", crumbs: () => [section("/admin/cms")], render: () => <CmsList /> },
  { pattern: "cms/:id", module: "cms", crumbs: (p, s) => [section("/admin/cms"), { label: s.platform.cms.find((c) => c.id === p.id)?.label ?? "Not found" }], render: (p) => <CmsEditor id={p.id} /> },
  { pattern: "communications", module: "communications", crumbs: () => [section("/admin/communications")], render: () => <CommunicationsPage /> },
  { pattern: "opportunities", module: "opportunities", crumbs: () => [section("/admin/opportunities")], render: () => <OpportunitiesList /> },
  { pattern: "opportunities/new", module: "opportunities", crumbs: () => [section("/admin/opportunities"), { label: "New opportunity" }], render: () => <OpportunityForm /> },
  { pattern: "opportunities/:id", module: "opportunities", crumbs: (p, s) => [section("/admin/opportunities"), { label: oppTitle(s, p.id) }], render: (p) => <OpportunityAdminDetail id={p.id} /> },
  { pattern: "opportunities/:id/edit", module: "opportunities", crumbs: (p, s) => [section("/admin/opportunities"), { label: oppTitle(s, p.id), href: `/admin/opportunities/${p.id}` }, { label: "Edit" }], render: (p) => <OpportunityForm id={p.id} /> },
  {
    pattern: "opportunities/:id/applications/:regId",
    module: "opportunities",
    crumbs: (p, s) => {
      const r = s.platform.registrations.find((x) => x.id === p.regId);
      return [section("/admin/opportunities"), { label: oppTitle(s, p.id), href: `/admin/opportunities/${p.id}?tab=applications` }, { label: r ? r.teamName || r.members[0]?.name || "Application" : "Not found" }];
    },
    render: (p) => <ApplicationDetail opportunityId={p.id} id={p.regId} />,
  },
  { pattern: "studies", module: "studies", crumbs: () => [section("/admin/studies")], render: () => <StudiesList /> },
  { pattern: "studies/new", module: "studies", crumbs: () => [section("/admin/studies"), { label: "New study" }], render: () => <StudyForm /> },
  { pattern: "studies/:id", module: "studies", crumbs: (p, s) => [section("/admin/studies"), { label: s.platform.studies.find((x) => x.id === p.id)?.title ?? "Not found" }], render: (p) => <StudyDetail id={p.id} /> },
  { pattern: "research", module: "research", crumbs: () => [section("/admin/research")], render: () => <ResearchList /> },
  { pattern: "research/:id", module: "research", crumbs: (p) => [section("/admin/research"), { label: `Run ${p.id}` }], render: (p) => <ResearchDetail id={p.id} /> },
  { pattern: "validation", module: "validation", crumbs: () => [section("/admin/validation")], render: () => <ValidationList /> },
  { pattern: "validation/:id", module: "validation", crumbs: (p, s) => [section("/admin/validation"), { label: allIdeasAdmin(s).find((i) => i.id === p.id)?.title.split(":")[0] ?? p.id }], render: (p) => <ValidationDetail ideaId={p.id} /> },
  { pattern: "access", module: "access", crumbs: () => [section("/admin/access")], render: () => <AccessPage /> },
  { pattern: "settings", module: "settings", crumbs: () => [section("/admin/settings")], render: () => <SettingsPage /> },
];

/** Matches "/admin/<path>" segments against the route table. */
export function matchAdminRoute(segments: string[]) {
  for (const r of ADMIN_ROUTES) {
    const parts = r.pattern ? r.pattern.split("/") : [];
    if (parts.length !== segments.length) continue;
    const params: Params = {};
    let ok = true;
    parts.forEach((part, i) => {
      if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(segments[i]);
      else if (part !== segments[i]) ok = false;
    });
    if (ok) return { route: r, params };
  }
  return null;
}

/** Which sidebar item a path belongs to. */
export function navItemFor(pathname: string) {
  const sorted = [...NAV_FLAT].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((n) => (n.href === "/admin" ? pathname === "/admin" || pathname === "/admin/search" : pathname === n.href || pathname.startsWith(`${n.href}/`)));
}
