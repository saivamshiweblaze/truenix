import type {
  AdminAccount,
  AdminModuleId,
  AdminPermission,
  AdminRoleId,
  Announcement,
  CmsEntry,
  Collaboration,
  Comment,
  Idea,
  Institution,
  MemberAccount,
  Mentorship,
  ModerationReport,
  Opportunity,
  Person,
  Post,
  Registration,
  ResearchReport,
  Study,
  StudyParticipation,
  TalentProfile,
  ValidationWorkspace,
} from "@/lib/types";
import { SEED_IDEAS } from "@/lib/demo-data/ideas";
import { PEOPLE } from "@/lib/demo-data/people";
import { SEED_COMMENTS, SEED_POSTS } from "@/lib/demo-data/feed";
import { SEED_OPPORTUNITIES } from "@/lib/demo-data/opportunities";
import {
  ADMIN_ACCOUNTS_SEED,
  ADMIN_ANNOUNCEMENTS,
  ADMIN_CMS,
  ADMIN_COLLABORATIONS,
  ADMIN_DRAFT_OPPORTUNITY,
  ADMIN_EXTRA_PEOPLE,
  ADMIN_INSTITUTIONS,
  ADMIN_MENTORSHIPS,
  ADMIN_PARTICIPATIONS,
  ADMIN_REGISTRATIONS,
  ADMIN_REPORTS,
  ADMIN_RESEARCH,
  ADMIN_STUDIES,
  ADMIN_TALENT,
  ADMIN_TEAM,
  ADMIN_VALIDATIONS,
  IDEA_ADMIN_FIELDS,
  OPPORTUNITY_ADMIN_FIELDS,
} from "@/lib/demo-data/admin";
import { SKILLS } from "@/config/taxonomy";

/**
 * The shared platform data set: every member's public profile and private account record,
 * other members' ideas and posts, and everything operators manage (opportunities, institutions,
 * reports, CMS content…).
 *
 * The signed-in member's own work stays in the top-level AppState fields (ideas, posts, research…).
 * Public pages and the admin portal both read this slice through lib/store/selectors.ts, so an
 * admin change is visible everywhere at once.
 *
 * Phase 2 boundary: each collection here maps to a server table. Replace reads with queries
 * (see lib/admin/query.ts for the paging contract) and writes in admin-actions.ts with API calls.
 */
export interface PlatformConfig {
  identity: { displayName: string; supportEmail: string; tagline: string };
  features: { communityPosting: boolean; opportunityRegistration: boolean; studiesRecruiting: boolean };
  moderation: { autoHideAfterReports: number; notifyReporter: boolean };
  notifications: { weeklyDigestDefault: boolean; deadlineReminders: boolean };
  retention: { auditDays: number; removedContentDays: number; inactiveAccountMonths: number };
  maintenance: { enabled: boolean; message: string };
  security: { sessionTimeoutMinutes: number; adminIpAllowlist: string };
  taxonomy: { customSkills: string[]; hiddenSkills: string[] };
}

export interface PlatformState {
  seedVersion: number;
  people: Person[];
  accounts: MemberAccount[];
  ideas: Idea[];
  posts: Post[];
  comments: Comment[];
  opportunities: Opportunity[];
  registrations: Registration[];
  institutions: Institution[];
  reports: ModerationReport[];
  talent: TalentProfile[];
  mentorships: Mentorship[];
  studies: Study[];
  participations: StudyParticipation[];
  collaborations: Collaboration[];
  research: ResearchReport[];
  validations: Record<string, ValidationWorkspace>;
  announcements: Announcement[];
  cms: CmsEntry[];
  adminTeam: AdminAccount[];
  /** Role assigned to the signed-in operator. Super administrator by default. */
  myAdminRole: AdminRoleId;
  rolePermissions: Record<AdminRoleId, Partial<Record<AdminModuleId, AdminPermission[]>>>;
  config: PlatformConfig;
  expertReviews?: import("@/lib/types").ExpertReview[];
  institutionRequests?: import("@/lib/types").InstitutionRequest[];
  publicSettings?: import("./state").PublicSettings;
}

export const SEED_VERSION = 1;

export const ADMIN_ROLES: { id: AdminRoleId; label: string; description: string }[] = [
  { id: "super_admin", label: "Super administrator", description: "Complete access, including administrator accounts and permissions." },
  { id: "platform_admin", label: "Platform administrator", description: "Broad management of members, content and programmes." },
  { id: "user_manager", label: "User manager", description: "Members, accounts and onboarding." },
  { id: "content_manager", label: "Content manager", description: "Public site content, announcements and community posts." },
  { id: "opportunity_manager", label: "Opportunity manager", description: "Opportunities, hackathons and applications." },
  { id: "institution_manager", label: "Institution manager", description: "Institutions and organisations." },
  { id: "moderator", label: "Community moderator", description: "Reports and moderation decisions." },
  { id: "analyst", label: "Analyst", description: "Read-only analytics and reports." },
];

export const ALL_PERMISSIONS: AdminPermission[] = ["view", "create", "edit", "approve", "publish", "suspend", "archive", "delete", "export", "manage_permissions"];

export const ADMIN_MODULE_LABEL: Record<AdminModuleId, string> = {
  overview: "Overview",
  users: "Users",
  onboarding: "Onboarding",
  ideas: "Ideas and projects",
  content: "Community content",
  moderation: "Moderation queue",
  research: "AI Researcher",
  validation: "Validation",
  opportunities: "Opportunities",
  institutions: "Institutions",
  talent: "Mentors and experts",
  studies: "Research studies",
  collaboration: "Collaboration",
  communications: "Announcements",
  cms: "Site content",
  analytics: "Analytics",
  access: "Admin roles",
  audit: "Audit log",
  settings: "Settings and data",
};

const MODULES = Object.keys(ADMIN_MODULE_LABEL) as AdminModuleId[];

function grant(modules: AdminModuleId[], perms: AdminPermission[]) {
  return Object.fromEntries(modules.map((m) => [m, perms])) as Partial<Record<AdminModuleId, AdminPermission[]>>;
}

const MANAGE: AdminPermission[] = ["view", "create", "edit", "approve", "publish", "suspend", "archive", "export"];

export function defaultRolePermissions(): PlatformState["rolePermissions"] {
  const viewAll = grant(MODULES, ["view"]);
  return {
    super_admin: grant(MODULES, ALL_PERMISSIONS),
    platform_admin: { ...grant(MODULES.filter((m) => m !== "access"), [...MANAGE, "delete"]), access: ["view"] },
    user_manager: { ...grant(["overview", "audit"], ["view"]), ...grant(["users", "onboarding"], ["view", "create", "edit", "approve", "suspend", "archive", "export"]) },
    content_manager: { ...grant(["overview"], ["view"]), ...grant(["cms", "communications", "content", "ideas"], ["view", "create", "edit", "approve", "publish", "archive", "export"]) },
    opportunity_manager: { ...grant(["overview"], ["view"]), ...grant(["opportunities", "studies"], ["view", "create", "edit", "approve", "publish", "archive", "export"]), institutions: ["view"] },
    institution_manager: { ...grant(["overview"], ["view"]), ...grant(["institutions", "talent", "collaboration"], ["view", "create", "edit", "approve", "archive", "export"]) },
    moderator: { ...grant(["overview", "ideas", "users"], ["view"]), ...grant(["moderation", "content", "collaboration"], ["view", "edit", "approve", "suspend", "archive"]) },
    analyst: { ...viewAll, access: [], settings: [], ...grant(["analytics"], ["view", "export"]) },
  };
}

export const defaultConfig = (): PlatformConfig => ({
  identity: { displayName: "TRUEVIX", supportEmail: "support@truevix.example", tagline: "Discover problems. Research opportunities. Validate ideas. Build together." },
  features: { communityPosting: true, opportunityRegistration: true, studiesRecruiting: true },
  moderation: { autoHideAfterReports: 3, notifyReporter: true },
  notifications: { weeklyDigestDefault: false, deadlineReminders: true },
  retention: { auditDays: 730, removedContentDays: 90, inactiveAccountMonths: 24 },
  maintenance: { enabled: false, message: "TRUEVIX is undergoing scheduled maintenance. Some actions may be unavailable." },
  security: { sessionTimeoutMinutes: 60, adminIpAllowlist: "" },
  taxonomy: { customSkills: [], hiddenSkills: [] },
});

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Builds the platform data set from the seed files. Called once per browser, and by "Reset to seed". */
export function seedPlatform(): PlatformState {
  const opportunities = SEED_OPPORTUNITIES.map((o) => ({ ...o, publication: "published" as const, source: "external" as const, registrationMode: "external" as const, ...OPPORTUNITY_ADMIN_FIELDS[o.id] }));
  return clone({
    seedVersion: SEED_VERSION,
    people: [...PEOPLE, ...ADMIN_EXTRA_PEOPLE],
    accounts: ADMIN_ACCOUNTS_SEED,
    ideas: SEED_IDEAS.map((i) => ({ ...i, ...IDEA_ADMIN_FIELDS[i.id] })),
    posts: SEED_POSTS,
    comments: SEED_COMMENTS,
    opportunities: [ADMIN_DRAFT_OPPORTUNITY, ...opportunities],
    registrations: ADMIN_REGISTRATIONS,
    institutions: ADMIN_INSTITUTIONS,
    reports: ADMIN_REPORTS,
    talent: ADMIN_TALENT,
    mentorships: ADMIN_MENTORSHIPS,
    studies: ADMIN_STUDIES,
    participations: ADMIN_PARTICIPATIONS,
    collaborations: ADMIN_COLLABORATIONS,
    research: ADMIN_RESEARCH,
    validations: ADMIN_VALIDATIONS,
    announcements: ADMIN_ANNOUNCEMENTS,
    cms: ADMIN_CMS,
    adminTeam: ADMIN_TEAM,
    myAdminRole: "super_admin" as AdminRoleId,
    rolePermissions: defaultRolePermissions(),
    config: defaultConfig(),
  });
}

/** Platform slice before any data has loaded (and after sign-out). Filled from Supabase by lib/data/load.ts. */
export function emptyPlatform(): PlatformState {
  return {
    seedVersion: SEED_VERSION,
    people: [],
    accounts: [],
    ideas: [],
    posts: [],
    comments: [],
    opportunities: [],
    registrations: [],
    institutions: [],
    reports: [],
    talent: [],
    mentorships: [],
    studies: [],
    participations: [],
    collaborations: [],
    research: [],
    validations: {},
    announcements: [],
    cms: [],
    adminTeam: [],
    myAdminRole: "analyst",
    rolePermissions: defaultRolePermissions(),
    config: defaultConfig(),
  };
}

/** Skills offered in selectors: the built-in list plus custom entries, minus hidden ones. */
export function skillOptions(config: PlatformConfig) {
  return [...SKILLS, ...config.taxonomy.customSkills].filter((k) => !config.taxonomy.hiddenSkills.includes(k));
}
