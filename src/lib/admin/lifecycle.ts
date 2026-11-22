import type { Opportunity } from "@/lib/types";

/**
 * Status vocabulary for the admin portal. One table so every module uses the same words
 * and the same tones. Tones: functional colour only where the state carries meaning.
 */
export type StatusTone = "ink" | "mute" | "positive" | "attention" | "danger" | "accent";

const META: Record<string, { label: string; tone: StatusTone }> = {
  // Accounts
  active: { label: "Active", tone: "ink" },
  restricted: { label: "Restricted", tone: "attention" },
  suspended: { label: "Suspended", tone: "danger" },
  deactivated: { label: "Deactivated", tone: "mute" },
  // Generic publication
  draft: { label: "Draft", tone: "mute" },
  published: { label: "Published", tone: "ink" },
  unpublished: { label: "Unpublished", tone: "mute" },
  archived: { label: "Archived", tone: "mute" },
  scheduled: { label: "Scheduled", tone: "attention" },
  // Opportunity lifecycle
  upcoming: { label: "Upcoming", tone: "ink" },
  open: { label: "Open", tone: "positive" },
  closing_soon: { label: "Closing soon", tone: "attention" },
  closed: { label: "Closed", tone: "mute" },
  completed: { label: "Completed", tone: "mute" },
  // Applications
  submitted: { label: "Submitted", tone: "ink" },
  under_review: { label: "Under review", tone: "ink" },
  info_requested: { label: "Information requested", tone: "attention" },
  shortlisted: { label: "Shortlisted", tone: "accent" },
  rejected: { label: "Rejected", tone: "mute" },
  selected: { label: "Selected", tone: "positive" },
  withdrawn: { label: "Withdrawn", tone: "mute" },
  // Reviews
  pending: { label: "Pending review", tone: "attention" },
  approved: { label: "Approved", tone: "positive" },
  changes_requested: { label: "Changes requested", tone: "attention" },
  // Content moderation
  visible: { label: "Visible", tone: "ink" },
  pending_review: { label: "Held for review", tone: "attention" },
  hidden: { label: "Hidden", tone: "mute" },
  removed: { label: "Removed", tone: "danger" },
  // Reports
  in_review: { label: "In review", tone: "ink" },
  actioned: { label: "Action taken", tone: "mute" },
  dismissed: { label: "Dismissed", tone: "mute" },
  // Institutions
  verified: { label: "Verified", tone: "positive" },
  // Talent
  applied: { label: "Applied", tone: "attention" },
  paused: { label: "Paused", tone: "mute" },
  // Studies
  recruiting: { label: "Recruiting", tone: "positive" },
  in_progress: { label: "In progress", tone: "ink" },
  not_selected: { label: "Not selected", tone: "mute" },
  // Collaboration
  accepted: { label: "Accepted", tone: "positive" },
  declined: { label: "Declined", tone: "mute" },
  proposed: { label: "Proposed", tone: "attention" },
  ended: { label: "Ended", tone: "mute" },
  // Research
  failed: { label: "Failed", tone: "danger" },
};

export function statusMeta(value: string) {
  return META[value] ?? { label: value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()), tone: "ink" as StatusTone };
}

const DAY = 86_400_000;
const today = () => new Date(new Date().toISOString().slice(0, 10)).getTime();
const at = (d: string) => new Date(d.slice(0, 10)).getTime();

export type OpportunityLifecycle = "draft" | "unpublished" | "archived" | "upcoming" | "open" | "closing_soon" | "closed" | "completed";

/** Derived status of an opportunity from its publication state and dates. */
export function opportunityLifecycle(o: Opportunity): OpportunityLifecycle {
  const pub = o.publication ?? "published";
  if (pub !== "published") return pub;
  const now = today();
  if (o.resultsPublished || (o.eventEnd && at(o.eventEnd) < now)) return "completed";
  if (o.registrationOpens && at(o.registrationOpens) > now) return "upcoming";
  if (at(o.deadline) < now) return "closed";
  if ((at(o.deadline) - now) / DAY <= 7) return "closing_soon";
  return "open";
}

/** Members can register on TRUEVIX only while a published listing is open. */
export function registrationOpen(o: Opportunity) {
  const l = opportunityLifecycle(o);
  return o.registrationMode === "on_platform" && (l === "open" || l === "closing_soon");
}
