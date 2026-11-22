import type { AppState } from "@/lib/store/state";
import { allIdeasAdmin, allPostsAdmin } from "@/lib/store/selectors";
import { ROLES } from "@/config/taxonomy";
import { memberRows } from "./members";
import { opportunityLifecycle } from "./lifecycle";

/**
 * Figures for the overview and analytics pages, calculated from the records in this browser.
 * Nothing here is sampled, projected or fetched from an analytics service.
 */

export type RangeId = "7" | "30" | "90" | "all";
export const RANGES: { value: RangeId; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

export function inRange(iso: string | undefined, range: RangeId) {
  if (!iso) return false;
  if (range === "all") return true;
  return Date.now() - new Date(iso).getTime() <= Number(range) * 86_400_000;
}

/** Counts per calendar week (Monday start) for the last `weeks` weeks. */
export function weekly(dates: string[], weeks = 10) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * (weeks - 1));
  const labels: string[] = [];
  const values: number[] = Array(weeks).fill(0);
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start.getTime() + i * 7 * 86_400_000);
    labels.push(d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));
  }
  for (const iso of dates) {
    const idx = Math.floor((new Date(iso).getTime() - start.getTime()) / (7 * 86_400_000));
    if (idx >= 0 && idx < weeks) values[idx]++;
  }
  return { labels, values };
}

export function computeMetrics(s: AppState, range: RangeId) {
  const members = memberRows(s);
  const ideas = allIdeasAdmin(s);
  const posts = allPostsAdmin(s);
  const opps = s.platform.opportunities;
  const regs = s.platform.registrations;
  const research = [...s.research, ...s.platform.research];
  const validations = { ...s.platform.validations, ...s.validations };
  const roleCounts = ROLES.map((r) => ({ label: r.label, value: members.filter((m) => m.person.role === r.id).length })).filter((r) => r.value > 0);
  return {
    members: members.length,
    newMembers: members.filter((m) => inRange(m.account.registeredAt, range)).length,
    onboarded: members.filter((m) => m.account.onboarding.completed).length,
    onboardingIncomplete: members.filter((m) => !m.account.onboarding.completed).length,
    active: members.filter((m) => m.account.status === "active").length,
    restricted: members.filter((m) => m.account.status === "restricted").length,
    suspended: members.filter((m) => m.account.status === "suspended").length,
    roleCounts,
    ideas: ideas.filter((i) => i.status === "submitted").length,
    ideasInRange: ideas.filter((i) => i.status === "submitted" && inRange(i.createdAt, range)).length,
    ideasPending: ideas.filter((i) => i.status === "submitted" && i.review?.status === "pending").length,
    drafts: ideas.filter((i) => i.status === "draft").length,
    research: research.length,
    researchInRange: research.filter((r) => inRange(r.createdAt, range)).length,
    researchFailed: research.filter((r) => r.runStatus === "failed").length,
    validations: Object.keys(validations).length,
    evidence: Object.values(validations).reduce((a, w) => a + w.evidence.length, 0),
    posts: posts.length,
    postsInRange: posts.filter((p) => inRange(p.createdAt, range)).length,
    comments: s.platform.comments.length + s.comments.length,
    reportsOpen: s.platform.reports.filter((r) => r.status === "open" || r.status === "in_review").length,
    oppsOpen: opps.filter((o) => ["open", "closing_soon"].includes(opportunityLifecycle(o))).length,
    hackathons: opps.filter((o) => o.kind === "hackathon").length,
    oppsDraft: opps.filter((o) => (o.publication ?? "published") === "draft").length,
    registrations: regs.length,
    registrationsInRange: regs.filter((r) => inRange(r.createdAt, range)).length,
    institutions: s.platform.institutions.filter((i) => i.status !== "archived").length,
    institutionsPending: s.platform.institutions.filter((i) => i.status === "pending").length,
    mentorsActive: s.platform.mentorships.filter((m) => m.status === "active").length,
    talentApplied: s.platform.talent.filter((t) => t.status === "applied").length,
    regWeekly: weekly(members.map((m) => m.account.registeredAt)),
    ideaWeekly: weekly(ideas.filter((i) => i.status === "submitted").map((i) => i.createdAt)),
  };
}

/** Counts of work waiting for an administrator, shown as sidebar badges and in the bell. */
export function pendingCounts(s: AppState) {
  return {
    reports: s.platform.reports.filter((r) => r.status === "open" || r.status === "in_review").length,
    ideas: [...s.ideas, ...s.platform.ideas].filter((i) => i.status === "submitted" && i.review?.status === "pending").length,
    institutions: s.platform.institutions.filter((i) => i.status === "pending").length,
    talent: s.platform.talent.filter((t) => t.status === "applied").length,
    applications: s.platform.registrations.filter((r) => r.status === "submitted" || r.status === "under_review").length,
  };
}
