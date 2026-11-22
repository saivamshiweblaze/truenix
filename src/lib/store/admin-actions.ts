"use client";

import type {
  AccountStatus,
  AdminAccount,
  AdminModuleId,
  AdminPermission,
  AdminRoleId,
  Announcement,
  AuditEntry,
  CmsEntry,
  Collaboration,
  ContentModeration,
  EvidenceItem,
  HackathonConfig,
  Idea,
  IdeaReview,
  Institution,
  MemberAccount,
  Mentorship,
  ModerationReport,
  Opportunity,
  OpportunityPublication,
  Person,
  Registration,
  RegistrationStatus,
  RoleId,
  Study,
  StudyParticipation,
  TalentProfile,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { getState, resetPlatformData, setState } from "./store";
import type { AppState } from "./state";
import { ADMIN_ROLES, defaultRolePermissions, type PlatformConfig, type PlatformState } from "./platform";

/**
 * Administrative writes. Every function here records an audit entry.
 *
 * Phase 2 boundary: each export becomes an authenticated API call. The server must re-check
 * the administrator's permission, validate input and write the audit entry itself (append-only);
 * these browser functions only model that behaviour.
 */

const now = () => new Date().toISOString();
const clip = (v: string, max: number) => v.trim().slice(0, max);
const AUDIT_LIMIT = 500;

type AuditInput = Omit<AuditEntry, "id" | "actor" | "createdAt" | "actorRole">;

function withAudit(s: AppState, e: AuditInput): AppState {
  const entry: AuditEntry = {
    id: uid("au"),
    actor: s.user?.name ?? "Unknown",
    actorRole: ADMIN_ROLES.find((r) => r.id === s.platform.myAdminRole)?.label,
    createdAt: now(),
    ...e,
    reason: e.reason ? clip(e.reason, 500) : undefined,
  };
  return { ...s, admin: { ...s.admin, audit: [entry, ...s.admin.audit].slice(0, AUDIT_LIMIT) } };
}

function patchPlatform<K extends keyof PlatformState>(s: AppState, key: K, fn: (v: PlatformState[K]) => PlatformState[K]): AppState {
  return { ...s, platform: { ...s.platform, [key]: fn(s.platform[key]) } };
}

const by = (s: AppState) => s.user?.name ?? "Administrator";
const event = (s: AppState, text: string) => ({ id: uid("ev"), at: now(), by: by(s), text });

/** Applies `fn` to the matching record in a list. */
function upd<T>(list: T[], match: (x: T) => boolean, fn: (x: T) => T): T[] {
  return list.map((x) => (match(x) ? fn(x) : x));
}

/** Describes changed keys for the audit record (values only for non-private fields). */
function diff<T extends object>(before: T, after: Partial<T>, privateKeys: string[] = []) {
  const changed = (Object.keys(after) as (keyof T)[]).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  const show = (o: Partial<T>) =>
    changed.map((k) => `${String(k)}: ${privateKeys.includes(String(k)) ? "(private value)" : JSON.stringify(o[k] ?? "").slice(0, 80)}`).join("; ");
  return { changed: changed.map(String), before: show(before), after: show(after) };
}

/* ================= Members ================= */

const PRIVATE_FIELDS = ["email", "phone", "linkedin", "adminNote"];

export function adminUpdateMember(personId: string, profile: Partial<Person>, account: Partial<MemberAccount>) {
  setState((s) => {
    if (personId === "me") {
      if (!s.user) return s;
      const u = s.user;
      const { name, headline, organisation, location, bio, skills, interests } = profile;
      const allowed = Object.fromEntries(Object.entries({ name, headline, organisation, location, bio, skills, interests }).filter(([, v]) => v !== undefined));
      const next = { ...u, ...allowed, phone: account.phone ?? u.phone, linkedin: account.linkedin ?? u.linkedin, id: "me" as const };
      const d = diff(u as unknown as Record<string, unknown>, { ...profile, phone: account.phone, linkedin: account.linkedin } as Record<string, unknown>, PRIVATE_FIELDS);
      if (!d.changed.length) return s;
      return withAudit({ ...s, user: next }, { action: "Edited member profile", entity: "user", targetId: "me", target: u.name, before: d.before, after: d.after });
    }
    const p = s.platform.people.find((x) => x.id === personId);
    const a = s.platform.accounts.find((x) => x.personId === personId);
    if (!p || !a) return s;
    const dp = diff(p, profile);
    const da = diff(a, account, PRIVATE_FIELDS);
    if (!dp.changed.length && !da.changed.length) return s;
    let next = patchPlatform(s, "people", (l) => upd(l, (x) => x.id === personId, (x) => ({ ...x, ...profile })));
    next = patchPlatform(next, "accounts", (l) => upd(l, (x) => x.personId === personId, (x) => ({ ...x, ...account })));
    return withAudit(next, {
      action: "Edited member record",
      entity: "user",
      targetId: personId,
      target: p.name,
      before: [dp.before, da.before].filter(Boolean).join("; "),
      after: [dp.after, da.after].filter(Boolean).join("; "),
      sensitive: da.changed.some((k) => PRIVATE_FIELDS.includes(k)),
    });
  });
}

export function adminSetAccountStatus(personIds: string[], status: AccountStatus, reason: string) {
  setState((s) => {
    let next = s;
    for (const id of personIds) {
      if (id === "me") continue; // An administrator cannot change their own account status.
      const a = next.platform.accounts.find((x) => x.personId === id);
      const p = next.platform.people.find((x) => x.id === id);
      if (!a || !p || a.status === status) continue;
      next = patchPlatform(next, "accounts", (l) => upd(l, (x) => x.personId === id, (x) => ({ ...x, status, statusReason: clip(reason, 300) || undefined })));
      next = withAudit(next, { action: `Account ${status === "active" ? "reactivated" : status}`, entity: "user", targetId: id, target: p.name, before: a.status, after: status, reason });
    }
    return next;
  });
}

export function adminSetMemberRole(personId: string, role: RoleId) {
  setState((s) => {
    const p = s.platform.people.find((x) => x.id === personId);
    if (!p || p.role === role) return s;
    return withAudit(
      patchPlatform(s, "people", (l) => upd(l, (x) => x.id === personId, (x) => ({ ...x, role }))),
      { action: "Changed member role", entity: "user", targetId: personId, target: p.name, before: p.role, after: role },
    );
  });
}

/** Records that an administrator revealed private information. Nothing changes except the audit log. */
export function adminRecordSensitiveAccess(entity: string, targetId: string, target: string, reason: string) {
  setState((s) => withAudit(s, { action: "Viewed private information", entity, targetId, target, reason, sensitive: true }));
}

export function adminUpdateOnboarding(personId: string, patch: Partial<Pick<MemberAccount, "onboarding" | "education" | "designation" | "institutionId">>, reason: string) {
  setState((s) => {
    const a = s.platform.accounts.find((x) => x.personId === personId);
    const p = s.platform.people.find((x) => x.id === personId);
    if (!a || !p) return s;
    const d = diff(a, patch);
    if (!d.changed.length) return s;
    return withAudit(patchPlatform(s, "accounts", (l) => upd(l, (x) => x.personId === personId, (x) => ({ ...x, ...patch }))), {
      action: "Corrected onboarding record",
      entity: "user",
      targetId: personId,
      target: p.name,
      before: d.before,
      after: d.after,
      reason,
    });
  });
}

/* ================= Ideas ================= */

/** Updates an idea wherever it lives (the member's own list or the platform list). */
function patchIdea(s: AppState, id: string, fn: (i: Idea) => Idea): AppState {
  if (s.ideas.some((i) => i.id === id)) return { ...s, ideas: upd(s.ideas, (i) => i.id === id, fn) };
  return patchPlatform(s, "ideas", (l) => upd(l, (i) => i.id === id, fn));
}
const findIdea = (s: AppState, id: string) => s.ideas.find((i) => i.id === id) ?? s.platform.ideas.find((i) => i.id === id);

export function adminReviewIdeas(ids: string[], status: IdeaReview["status"], note: string) {
  const labels: Record<IdeaReview["status"], string> = { approved: "Approved idea", rejected: "Rejected idea", changes_requested: "Requested changes to idea", pending: "Returned idea to review" };
  setState((s) => {
    let next = s;
    for (const id of ids) {
      const i = findIdea(next, id);
      if (!i) continue;
      const review: IdeaReview = { status, note: clip(note, 600) || undefined, reviewedAt: now(), reviewedBy: by(s) };
      next = patchIdea(next, id, (x) => ({ ...x, review, history: [event(s, `${labels[status]}${note ? `: ${clip(note, 120)}` : ""}`), ...(x.history ?? [])] }));
      next = withAudit(next, { action: labels[status], entity: "idea", targetId: id, target: i.title, before: i.review?.status ?? "not reviewed", after: status, reason: note || undefined });
    }
    return next;
  });
}

export function adminSetIdeaPublication(id: string, publication: NonNullable<Idea["publication"]>, reason: string) {
  setState((s) => {
    const i = findIdea(s, id);
    if (!i) return s;
    const verb = { published: "Published idea", unpublished: "Unpublished idea", archived: "Archived idea" }[publication];
    return withAudit(
      patchIdea(s, id, (x) => ({ ...x, publication, history: [event(s, verb), ...(x.history ?? [])] })),
      { action: verb, entity: "idea", targetId: id, target: i.title, before: i.publication ?? "published", after: publication, reason: reason || undefined },
    );
  });
}

export function adminSetIdeaFeatured(id: string, featured: boolean) {
  setState((s) => {
    const i = findIdea(s, id);
    if (!i) return s;
    return withAudit(patchIdea(s, id, (x) => ({ ...x, featured })), { action: featured ? "Featured idea" : "Removed idea from featured", entity: "idea", targetId: id, target: i.title });
  });
}

export function adminEditIdea(id: string, patch: Partial<Pick<Idea, "title" | "summary" | "industry" | "stage" | "geography" | "visibility" | "team">>, reason: string) {
  setState((s) => {
    const i = findIdea(s, id);
    if (!i) return s;
    const d = diff(i, patch);
    if (!d.changed.length) return s;
    return withAudit(
      patchIdea(s, id, (x) => ({ ...x, ...patch, updatedAt: now(), history: [event(s, `Edited by administrator (${d.changed.join(", ")})`), ...(x.history ?? [])] })),
      { action: "Edited idea", entity: "idea", targetId: id, target: i.title, before: d.before, after: d.after, reason },
    );
  });
}

export function adminRecordConfidentialAccess(ideaId: string, title: string, reason: string) {
  setState((s) => withAudit(s, { action: "Opened confidential idea details", entity: "idea", targetId: ideaId, target: title, reason, sensitive: true }));
}

/* ================= Community content ================= */

function patchContent(s: AppState, kind: "post" | "comment", id: string, fn: (m: ContentModeration | undefined) => ContentModeration): AppState {
  if (kind === "post") {
    if (s.posts.some((p) => p.id === id)) return { ...s, posts: upd(s.posts, (p) => p.id === id, (p) => ({ ...p, moderation: fn(p.moderation) })) };
    return patchPlatform(s, "posts", (l) => upd(l, (p) => p.id === id, (p) => ({ ...p, moderation: fn(p.moderation) })));
  }
  if (s.comments.some((c) => c.id === id)) return { ...s, comments: upd(s.comments, (c) => c.id === id, (c) => ({ ...c, moderation: fn(c.moderation) })) };
  return patchPlatform(s, "comments", (l) => upd(l, (c) => c.id === id, (c) => ({ ...c, moderation: fn(c.moderation) })));
}

function contentLabel(s: AppState, kind: "post" | "comment", id: string) {
  if (kind === "post") return [...s.posts, ...s.platform.posts].find((p) => p.id === id)?.title ?? id;
  const c = [...s.comments, ...s.platform.comments].find((x) => x.id === id);
  return c ? `Comment: “${c.body.slice(0, 60)}”` : id;
}

export function adminModerateContent(kind: "post" | "comment", ids: string[], status: ContentModeration["status"], reason: string) {
  const verb = { visible: "Restored content", pending_review: "Held content for review", hidden: "Hid content", removed: "Removed content" }[status];
  setState((s) => {
    let next = s;
    for (const id of ids) {
      next = patchContent(next, kind, id, (m) => ({ ...(m ?? {}), status, reason: clip(reason, 400) || undefined, updatedAt: now(), by: by(s) }));
      next = withAudit(next, { action: verb, entity: kind, targetId: id, target: contentLabel(s, kind, id), reason: reason || undefined });
    }
    return next;
  });
}

export function adminSetPostFlags(id: string, flags: { pinned?: boolean; featured?: boolean }) {
  setState((s) => {
    const next = patchContent(s, "post", id, (m) => ({ status: "visible", ...(m ?? {}), ...flags, updatedAt: now(), by: by(s) }));
    const action = flags.pinned !== undefined ? (flags.pinned ? "Pinned post" : "Unpinned post") : flags.featured ? "Featured post" : "Removed post from featured";
    return withAudit(next, { action, entity: "post", targetId: id, target: contentLabel(s, "post", id) });
  });
}

/** Administrators may correct a post's classification. The member's words are never rewritten. */
export function adminRecategorisePost(id: string, patch: { kind?: import("@/lib/types").PostKind; industries?: import("@/lib/types").IndustryId[] }, reason: string) {
  setState((s) => {
    const apply = <T extends { id: string }>(l: T[]) => upd(l, (p) => p.id === id, (p) => ({ ...p, ...patch }));
    const next = s.posts.some((p) => p.id === id) ? { ...s, posts: apply(s.posts) } : patchPlatform(s, "posts", apply);
    return withAudit(next, { action: "Changed post category", entity: "post", targetId: id, target: contentLabel(s, "post", id), after: JSON.stringify(patch), reason });
  });
}

/* ================= Moderation reports ================= */

export function adminResolveReport(
  id: string,
  outcome: ModerationReport["status"],
  resolution: string,
  opts: { contentAction?: "remove" | "hide" | "none"; restrictUser?: AccountStatus | null } = {},
) {
  setState((s) => {
    const r = s.platform.reports.find((x) => x.id === id);
    if (!r) return s;
    let next = patchPlatform(s, "reports", (l) =>
      upd(l, (x) => x.id === id, (x) => ({ ...x, status: outcome, resolution: clip(resolution, 600) || undefined, reviewedAt: now(), reviewedBy: by(s) })),
    );
    const verb = { open: "Reopened report", in_review: "Started reviewing report", actioned: "Resolved report with action", dismissed: "Dismissed report" }[outcome];
    next = withAudit(next, { action: verb, entity: "report", targetId: id, target: r.targetLabel, before: r.status, after: outcome, reason: resolution || undefined });
    const ca = opts.contentAction ?? "none";
    if (ca !== "none" && (r.targetType === "post" || r.targetType === "comment")) {
      const status = ca === "remove" ? "removed" : "hidden";
      next = patchContent(next, r.targetType, r.targetId, (m) => ({ ...(m ?? {}), status, reason: resolution, updatedAt: now(), by: by(s) }));
      next = withAudit(next, { action: ca === "remove" ? "Removed content" : "Hid content", entity: r.targetType, targetId: r.targetId, target: r.targetLabel, reason: resolution });
    }
    if (ca !== "none" && r.targetType === "idea") {
      next = patchIdea(next, r.targetId, (x) => ({ ...x, publication: "unpublished", history: [event(s, `Unpublished after report: ${clip(resolution, 100)}`), ...(x.history ?? [])] }));
      next = withAudit(next, { action: "Unpublished idea", entity: "idea", targetId: r.targetId, target: r.targetLabel, reason: resolution });
    }
    if (outcome === "open" && (r.targetType === "post" || r.targetType === "comment")) {
      next = patchContent(next, r.targetType, r.targetId, (m) => ({ ...(m ?? {}), status: "visible", updatedAt: now(), by: by(s) }));
    }
    if (opts.restrictUser && r.reportedUserId !== "me") {
      const a = next.platform.accounts.find((x) => x.personId === r.reportedUserId);
      if (a && a.status !== opts.restrictUser) {
        next = patchPlatform(next, "accounts", (l) => upd(l, (x) => x.personId === r.reportedUserId, (x) => ({ ...x, status: opts.restrictUser!, statusReason: resolution })));
        next = withAudit(next, { action: `Account ${opts.restrictUser}`, entity: "user", targetId: r.reportedUserId, target: next.platform.people.find((p) => p.id === r.reportedUserId)?.name ?? r.reportedUserId, before: a.status, after: opts.restrictUser, reason: resolution });
      }
    }
    return next;
  });
}

/* ================= AI Researcher ================= */

export function adminSetResearchArchived(id: string, archived: boolean, reason: string) {
  setState((s) => {
    const r = [...s.research, ...s.platform.research].find((x) => x.id === id);
    if (!r) return s;
    const apply = <T extends { id: string; archived?: boolean }>(l: T[]) => upd(l, (x) => x.id === id, (x) => ({ ...x, archived }));
    const next = s.research.some((x) => x.id === id) ? { ...s, research: apply(s.research) } : patchPlatform(s, "research", apply);
    return withAudit(next, { action: archived ? "Archived research run" : "Restored research run", entity: "research", targetId: id, target: r.question, reason: reason || undefined });
  });
}

/* ================= Validation ================= */

function patchValidation(s: AppState, ideaId: string, fn: (w: import("@/lib/types").ValidationWorkspace) => import("@/lib/types").ValidationWorkspace): AppState {
  if (s.validations[ideaId]) return { ...s, validations: { ...s.validations, [ideaId]: fn(s.validations[ideaId]) } };
  const w = s.platform.validations[ideaId];
  return w ? patchPlatform(s, "validations", (v) => ({ ...v, [ideaId]: fn(w) })) : s;
}

/**
 * Evidence can only be moved to a weaker type (to "assumption") or removed, with a reason.
 * Administrators cannot create or upgrade customer, expert or experiment evidence.
 */
export function adminDowngradeEvidence(ideaId: string, ev: EvidenceItem, reason: string, remove: boolean) {
  setState((s) => {
    const next = patchValidation(s, ideaId, (w) => ({
      ...w,
      evidence: remove ? w.evidence.filter((e) => e.id !== ev.id) : w.evidence.map((e) => (e.id === ev.id ? { ...e, type: "assumption" as const, source: `${e.source} (reclassified as assumption by an administrator)` } : e)),
      updatedAt: now(),
    }));
    return withAudit(next, { action: remove ? "Removed validation evidence" : "Reclassified evidence as assumption", entity: "validation", targetId: ideaId, target: ev.text.slice(0, 80), before: ev.type, after: remove ? "removed" : "assumption", reason });
  });
}

/* ================= Opportunities ================= */

export function adminSaveOpportunity(o: Opportunity, isNew: boolean): string {
  const id = isNew ? uid("opp") : o.id;
  setState((s) => {
    const existing = s.platform.opportunities.find((x) => x.id === id);
    const record: Opportunity = {
      ...existing,
      ...o,
      id,
      title: clip(o.title, 160),
      description: clip(o.description, 4000),
      updatedAt: now(),
      createdAt: existing?.createdAt ?? now(),
      demo: false,
      history: [event(s, isNew ? "Created" : "Edited"), ...(existing?.history ?? [])],
    };
    const next = patchPlatform(s, "opportunities", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l]));
    const d = existing ? diff(existing, o) : null;
    return withAudit(next, { action: isNew ? "Created opportunity" : "Edited opportunity", entity: "opportunity", targetId: id, target: record.title, before: d?.before, after: d ? d.after : record.publication ?? "published" });
  });
  return id;
}

export function adminSetOpportunityPublication(ids: string[], publication: OpportunityPublication, reason = "") {
  const verb = { draft: "Moved opportunity to draft", published: "Published opportunity", unpublished: "Unpublished opportunity", archived: "Archived opportunity" }[publication];
  setState((s) => {
    let next = s;
    for (const id of ids) {
      const o = next.platform.opportunities.find((x) => x.id === id);
      if (!o) continue;
      next = patchPlatform(next, "opportunities", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, publication, updatedAt: now(), history: [event(s, verb), ...(x.history ?? [])] })));
      next = withAudit(next, { action: verb, entity: "opportunity", targetId: id, target: o.title, before: o.publication ?? "published", after: publication, reason: reason || undefined });
    }
    return next;
  });
}

export function adminPatchOpportunity(id: string, patch: Partial<Opportunity>, action: string, reason?: string) {
  setState((s) => {
    const o = s.platform.opportunities.find((x) => x.id === id);
    if (!o) return s;
    return withAudit(
      patchPlatform(s, "opportunities", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, ...patch, updatedAt: now(), history: [event(s, action), ...(x.history ?? [])] }))),
      { action, entity: "opportunity", targetId: id, target: o.title, reason },
    );
  });
}

export function adminUpdateHackathon(id: string, patch: Partial<HackathonConfig>, action: string) {
  const blank: HackathonConfig = { rounds: [], criteria: [], judges: [], winners: [], certificates: { issuedTo: [] }, communications: [] };
  setState((s) => {
    const o = s.platform.opportunities.find((x) => x.id === id);
    if (!o) return s;
    return withAudit(
      patchPlatform(s, "opportunities", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, hackathon: { ...blank, ...x.hackathon, ...patch }, updatedAt: now() }))),
      { action, entity: "opportunity", targetId: id, target: o.title },
    );
  });
}

/* ---------------- Registrations ---------------- */

export function adminAddRegistration(input: Pick<Registration, "opportunityId" | "applicantId" | "mode" | "teamName" | "members" | "statement">): string {
  const id = uid("reg");
  setState((s) => {
    const o = s.platform.opportunities.find((x) => x.id === input.opportunityId);
    const reg: Registration = { ...input, id, status: "submitted", submissions: [], scores: [], notes: [], history: [event(s, "Registration added by an administrator")], createdAt: now(), demo: false };
    return withAudit(patchPlatform(s, "registrations", (l) => [reg, ...l]), { action: "Added registration", entity: "registration", targetId: id, target: `${input.teamName || input.members[0]?.name} → ${o?.title ?? input.opportunityId}` });
  });
  return id;
}

export function adminSetRegistrationStatus(ids: string[], status: RegistrationStatus, note: string) {
  setState((s) => {
    let next = s;
    for (const id of ids) {
      const r = next.platform.registrations.find((x) => x.id === id);
      if (!r || r.status === status) continue;
      next = patchPlatform(next, "registrations", (l) =>
        upd(l, (x) => x.id === id, (x) => ({ ...x, status, history: [event(s, `Status changed to ${status.replace("_", " ")}${note ? `: ${clip(note, 140)}` : ""}`), ...x.history] })),
      );
      next = withAudit(next, { action: "Changed application status", entity: "registration", targetId: id, target: r.teamName || r.members[0]?.name || id, before: r.status, after: status, reason: note || undefined });
    }
    return next;
  });
}

export function adminAddRegistrationNote(id: string, text: string) {
  const body = clip(text, 1000);
  if (!body) return;
  setState((s) => {
    const r = s.platform.registrations.find((x) => x.id === id);
    if (!r) return s;
    return withAudit(
      patchPlatform(s, "registrations", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, notes: [{ id: uid("note"), at: now(), by: by(s), text: body }, ...x.notes] }))),
      { action: "Added internal reviewer note", entity: "registration", targetId: id, target: r.teamName || r.members[0]?.name || id },
    );
  });
}

export function adminSetScore(regId: string, roundId: string, judgeId: string, criterionId: string, score: number) {
  const v = Math.max(0, Math.min(10, Math.round(score)));
  setState((s) => {
    const r = s.platform.registrations.find((x) => x.id === regId);
    if (!r) return s;
    const rest = r.scores.filter((x) => !(x.roundId === roundId && x.judgeId === judgeId && x.criterionId === criterionId));
    return withAudit(
      patchPlatform(s, "registrations", (l) => upd(l, (x) => x.id === regId, (x) => ({ ...x, scores: [...rest, { id: uid("sc"), roundId, judgeId, criterionId, score: v }] }))),
      { action: "Recorded score", entity: "registration", targetId: regId, target: r.teamName || r.members[0]?.name || regId, after: `${criterionId} = ${v} (judge ${judgeId}, ${roundId})` },
    );
  });
}

export function adminAddSubmission(regId: string, sub: Registration["submissions"][number]) {
  setState((s) => {
    const r = s.platform.registrations.find((x) => x.id === regId);
    if (!r) return s;
    return withAudit(
      patchPlatform(s, "registrations", (l) => upd(l, (x) => x.id === regId, (x) => ({ ...x, submissions: [sub, ...x.submissions] }))),
      { action: "Recorded submission", entity: "registration", targetId: regId, target: sub.title },
    );
  });
}

/* ================= Institutions ================= */

export function adminSaveInstitution(inst: Institution, isNew: boolean): string {
  const id = isNew ? uid("inst") : inst.id;
  setState((s) => {
    const existing = s.platform.institutions.find((x) => x.id === id);
    const record: Institution = { ...existing, ...inst, id, name: clip(inst.name, 160), createdAt: existing?.createdAt ?? now(), demo: existing?.demo ?? false };
    // A partner label requires an agreement reference.
    if (record.relationship === "partner_confirmed" && !record.agreementRef?.trim()) record.relationship = existing?.relationship === "partner_confirmed" ? "partner_confirmed" : "listed";
    const d = existing ? diff(existing, inst) : null;
    return withAudit(
      patchPlatform(s, "institutions", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l])),
      { action: isNew ? "Created organisation" : "Edited organisation", entity: "institution", targetId: id, target: record.name, before: d?.before, after: d?.after },
    );
  });
  return id;
}

export function adminSetInstitutionStatus(id: string, status: Institution["status"], reason: string) {
  setState((s) => {
    const i = s.platform.institutions.find((x) => x.id === id);
    if (!i) return s;
    const verb = { verified: "Approved organisation", rejected: "Rejected organisation", pending: "Returned organisation to review", archived: "Archived organisation" }[status];
    return withAudit(patchPlatform(s, "institutions", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, status }))), { action: verb, entity: "institution", targetId: id, target: i.name, before: i.status, after: status, reason: reason || undefined });
  });
}

/* ================= Mentors and experts ================= */

export function adminReviewTalent(personId: string, patch: Partial<Pick<TalentProfile, "status" | "verification" | "reviewNote" | "availability" | "capacity" | "hoursPerMonth" | "areas">>, action: string) {
  setState((s) => {
    const t = s.platform.talent.find((x) => x.personId === personId);
    const p = s.platform.people.find((x) => x.id === personId);
    if (!t) return s;
    const d = diff(t, patch);
    let next = patchPlatform(s, "talent", (l) => upd(l, (x) => x.personId === personId, (x) => ({ ...x, ...patch })));
    // Approving a mentor application gives the member the mentor role in the shared profile.
    if (patch.status === "approved" && p && t.kind === "mentor" && p.role !== "mentor") {
      next = patchPlatform(next, "people", (l) => upd(l, (x) => x.id === personId, (x) => ({ ...x, role: "mentor" as RoleId })));
    }
    return withAudit(next, { action, entity: "talent", targetId: personId, target: p?.name ?? personId, before: d.before, after: d.after, reason: patch.reviewNote });
  });
}

export function adminSaveMentorship(m: Omit<Mentorship, "id" | "demo"> & { id?: string }) {
  setState((s) => {
    const id = m.id ?? uid("ms");
    const existing = s.platform.mentorships.find((x) => x.id === id);
    const record: Mentorship = { ...m, id, demo: existing?.demo ?? false };
    const names = `${s.platform.people.find((p) => p.id === m.mentorId)?.name ?? m.mentorId} → ${m.menteeId === "me" ? s.user?.name : s.platform.people.find((p) => p.id === m.menteeId)?.name ?? m.menteeId}`;
    return withAudit(
      patchPlatform(s, "mentorships", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l])),
      { action: existing ? `Mentorship ${m.status}` : "Created mentorship assignment", entity: "mentorship", targetId: id, target: names, after: m.status },
    );
  });
}

/* ================= Studies ================= */

export function adminSaveStudy(st: Study, isNew: boolean): string {
  const id = isNew ? uid("st") : st.id;
  setState((s) => {
    const existing = s.platform.studies.find((x) => x.id === id);
    const record = { ...st, id, demo: existing?.demo ?? false };
    const d = existing ? diff(existing, st) : null;
    return withAudit(patchPlatform(s, "studies", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l])), {
      action: isNew ? "Created study" : "Edited study",
      entity: "study",
      targetId: id,
      target: record.title,
      before: d?.before,
      after: d?.after,
    });
  });
  return id;
}

export function adminSetParticipation(id: string, patch: Partial<Pick<StudyParticipation, "status" | "consent">>) {
  setState((s) => {
    const p = s.platform.participations.find((x) => x.id === id);
    if (!p) return s;
    const d = diff(p, patch);
    const name = p.personId === "me" ? s.user?.name : s.platform.people.find((x) => x.id === p.personId)?.name;
    return withAudit(
      patchPlatform(s, "participations", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, ...patch, consentAt: patch.consent === "given" ? now() : x.consentAt }))),
      { action: "Updated study participation", entity: "study", targetId: p.studyId, target: name ?? p.personId, before: d.before, after: d.after },
    );
  });
}

/* ================= Collaboration ================= */

export function adminSetCollaboration(id: string, patch: Partial<Pick<Collaboration, "status" | "role">> & { clearFlag?: boolean }, reason: string) {
  setState((s) => {
    const c = s.platform.collaborations.find((x) => x.id === id);
    if (!c) return s;
    const { clearFlag, ...rest } = patch;
    const d = diff(c, rest);
    return withAudit(
      patchPlatform(s, "collaborations", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, ...rest, flagged: clearFlag ? undefined : x.flagged }))),
      { action: clearFlag ? "Cleared collaboration flag" : "Updated collaboration", entity: "collaboration", targetId: id, target: c.role, before: d.before, after: d.after, reason: reason || undefined },
    );
  });
}

/* ================= Announcements and messaging ================= */

export function adminSaveAnnouncement(a: Omit<Announcement, "id" | "createdAt" | "createdBy" | "deliveries" | "status"> & { id?: string }): string {
  const id = a.id ?? uid("ann");
  setState((s) => {
    const existing = s.platform.announcements.find((x) => x.id === id);
    const record: Announcement = {
      ...a,
      id,
      title: clip(a.title, 140),
      body: clip(a.body, 1200),
      status: existing?.status === "published" ? "published" : "draft",
      createdAt: existing?.createdAt ?? now(),
      createdBy: existing?.createdBy ?? by(s),
      deliveries: existing?.deliveries ?? [],
    };
    return withAudit(patchPlatform(s, "announcements", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l])), {
      action: existing ? "Edited announcement" : "Drafted announcement",
      entity: "announcement",
      targetId: id,
      target: record.title,
    });
  });
  return id;
}

/** Publishing delivers in-app and banner announcements in this browser. Email has no provider, so it is recorded as not sent. */
export function adminPublishAnnouncement(id: string, scheduleFor?: string) {
  setState((s) => {
    const a = s.platform.announcements.find((x) => x.id === id);
    if (!a) return s;
    if (scheduleFor) {
      return withAudit(patchPlatform(s, "announcements", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, status: "scheduled" as const, scheduledFor: scheduleFor }))), {
        action: "Scheduled announcement",
        entity: "announcement",
        targetId: id,
        target: a.title,
        after: scheduleFor,
      });
    }
    const at = now();
    const deliveries = a.channels.map((channel) =>
      channel === "in_app"
        ? { channel, status: "delivered_in_app" as const, detail: "Added to matching members’ notifications (browser-local).", at }
        : channel === "banner"
          ? { channel, status: "shown_as_banner" as const, detail: "Shown as the site banner.", at }
          : { channel, status: "not_sent" as const, detail: "Not sent: no email provider is connected in this phase.", at },
    );
    return withAudit(
      patchPlatform(s, "announcements", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, status: "published" as const, publishedAt: at, scheduledFor: undefined, deliveries: [...deliveries, ...x.deliveries] }))),
      { action: "Published announcement", entity: "announcement", targetId: id, target: a.title, after: a.channels.join(", ") },
    );
  });
}

export function adminArchiveAnnouncement(id: string) {
  setState((s) => {
    const a = s.platform.announcements.find((x) => x.id === id);
    if (!a) return s;
    return withAudit(patchPlatform(s, "announcements", (l) => upd(l, (x) => x.id === id, (x) => ({ ...x, status: "archived" as const }))), { action: "Archived announcement", entity: "announcement", targetId: id, target: a.title });
  });
}

/** Break-glass access to a private conversation. Requires a documented reason and case reference. */
export function adminAccessConversation(threadId: string, subject: string, reason: string, caseRef: string) {
  setState((s) => withAudit(s, { action: "Opened private conversation", entity: "message_thread", targetId: threadId, target: subject, reason: `${reason} (case ${clip(caseRef, 40)})`, sensitive: true }));
}

/* ================= CMS ================= */

function patchCms(s: AppState, id: string, fn: (e: CmsEntry) => CmsEntry) {
  return patchPlatform(s, "cms", (l) => upd(l, (x) => x.id === id, fn));
}

export function adminSaveCmsDraft(id: string, fields: Record<string, string>) {
  setState((s) => {
    const e = s.platform.cms.find((x) => x.id === id);
    if (!e) return s;
    const clean = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, clip(v, 4000)]));
    return withAudit(patchCms(s, id, (x) => ({ ...x, draft: clean, updatedAt: now(), label: x.kind === "faq" ? `FAQ: ${clean.question ?? ""}` : x.kind === "help" ? `Help: ${clean.title ?? ""}` : x.label })), {
      action: "Saved content draft",
      entity: "cms",
      targetId: id,
      target: e.label,
    });
  });
}

export function adminPublishCms(id: string) {
  setState((s) => {
    const e = s.platform.cms.find((x) => x.id === id);
    if (!e) return s;
    const version = (e.versions[0]?.version ?? 0) + 1;
    return withAudit(
      patchCms(s, id, (x) => ({ ...x, published: { ...x.draft }, status: "published", updatedAt: now(), versions: [{ version, fields: { ...x.draft }, publishedAt: now(), by: by(s) }, ...x.versions].slice(0, 20) })),
      { action: "Published site content", entity: "cms", targetId: id, target: e.label, after: `version ${version}` },
    );
  });
}

export function adminUnpublishCms(id: string) {
  setState((s) => {
    const e = s.platform.cms.find((x) => x.id === id);
    if (!e) return s;
    return withAudit(patchCms(s, id, (x) => ({ ...x, status: "unpublished", updatedAt: now() })), { action: "Unpublished site content", entity: "cms", targetId: id, target: e.label });
  });
}

export function adminRestoreCmsVersion(id: string, version: number) {
  setState((s) => {
    const e = s.platform.cms.find((x) => x.id === id);
    const v = e?.versions.find((x) => x.version === version);
    if (!e || !v) return s;
    return withAudit(patchCms(s, id, (x) => ({ ...x, draft: { ...v.fields }, updatedAt: now() })), { action: `Restored version ${version} to draft`, entity: "cms", targetId: id, target: e.label });
  });
}

export function adminCreateCmsEntry(kind: "faq" | "help"): string {
  const id = uid(kind);
  setState((s) => {
    const fields: Record<string, string> = kind === "faq" ? { question: "", answer: "" } : { title: "", body: "" };
    const order = Math.max(0, ...s.platform.cms.filter((c) => c.kind === kind).map((c) => c.order)) + 1;
    const entry: CmsEntry = { id, kind, label: kind === "faq" ? "FAQ: New question" : "Help: New article", draft: fields, published: null, status: "draft", versions: [], order, updatedAt: now() };
    return withAudit(patchPlatform(s, "cms", (l) => [...l, entry]), { action: "Created content entry", entity: "cms", targetId: id, target: entry.label });
  });
  return id;
}

/* ================= Admin accounts and permissions ================= */

export function adminSaveAdminAccount(a: Omit<AdminAccount, "id" | "createdAt" | "demo"> & { id?: string }) {
  setState((s) => {
    const id = a.id ?? uid("adm");
    const existing = s.platform.adminTeam.find((x) => x.id === id);
    const record: AdminAccount = { ...a, id, name: clip(a.name, 100), email: clip(a.email, 160).toLowerCase(), createdAt: existing?.createdAt ?? now(), demo: existing?.demo ?? false };
    const d = existing ? diff(existing, a) : null;
    return withAudit(patchPlatform(s, "adminTeam", (l) => (existing ? upd(l, (x) => x.id === id, () => record) : [record, ...l])), {
      action: existing ? (existing.status !== a.status ? (a.status === "active" ? "Reactivated administrator" : "Deactivated administrator") : "Edited administrator") : "Created administrator account",
      entity: "admin_account",
      targetId: id,
      target: record.name,
      before: d?.before,
      after: d?.after ?? record.role,
    });
  });
}

export function adminSetPermission(role: AdminRoleId, module: AdminModuleId, perm: AdminPermission, on: boolean) {
  setState((s) => {
    if (role === "super_admin") return s; // Super administrator access is fixed.
    const current = s.platform.rolePermissions[role]?.[module] ?? [];
    const nextPerms = on ? Array.from(new Set([...current, perm])) : current.filter((p) => p !== perm);
    return withAudit(
      patchPlatform(s, "rolePermissions", (rp) => ({ ...rp, [role]: { ...rp[role], [module]: nextPerms } })),
      { action: on ? "Granted permission" : "Revoked permission", entity: "permissions", targetId: role, target: `${role} · ${module}`, after: `${perm}: ${on ? "allowed" : "denied"}` },
    );
  });
}

export function adminResetPermissions() {
  setState((s) => withAudit(patchPlatform(s, "rolePermissions", () => defaultRolePermissions()), { action: "Reset role permissions to defaults", entity: "permissions", target: "All roles" }));
}

/** Interface preview of another administrator role. Not access control. */
export function adminPreviewRole(role: AdminRoleId) {
  setState((s) => withAudit(patchPlatform(s, "myAdminRole", () => role), { action: "Switched admin role preview", entity: "permissions", target: s.user?.name ?? "Administrator", before: s.platform.myAdminRole, after: role }));
}

/* ================= Settings and data ================= */

export function adminUpdateConfig<K extends keyof PlatformConfig>(section: K, patch: Partial<PlatformConfig[K]>) {
  setState((s) => {
    const before = s.platform.config[section];
    const d = diff(before as object, patch as object);
    if (!d.changed.length) return s;
    return withAudit(
      patchPlatform(s, "config", (c) => ({ ...c, [section]: { ...c[section], ...patch } })),
      { action: "Changed platform settings", entity: "settings", targetId: String(section), target: String(section), before: d.before, after: d.after },
    );
  });
}

export function adminUpdateSettings(patch: Partial<AppState["admin"]["settings"]>) {
  setState((s) =>
    withAudit({ ...s, admin: { ...s.admin, settings: { ...s.admin.settings, ...patch } } }, { action: "Changed platform settings", entity: "settings", target: Object.keys(patch).join(", "), after: JSON.stringify(patch) }),
  );
}

export function adminResetDemoData(reason: string) {
  resetPlatformData((s) => withAudit(s, { action: "Reset demonstration data to seed", entity: "settings", target: "Platform data set", reason }));
}

export function adminRecordExport(what: string, count: number) {
  setState((s) => withAudit(s, { action: "Exported records", entity: "export", target: what, after: `${count} rows`, sensitive: true }));
}

/** Replaces the platform data set with a validated import. The audit log is kept and records the import. */
export function adminImportPlatform(platform: PlatformState, fileName: string) {
  setState((s) => withAudit({ ...s, platform: { ...s.platform, ...platform, config: { ...s.platform.config, ...platform.config } } }, { action: "Imported platform data", entity: "settings", target: fileName, sensitive: true }));
}

/** Snapshot for the data-management export. The admin's own browser state (session, drafts) is excluded. */
export function platformSnapshot() {
  const s = getState();
  return { exportedAt: now(), format: "truevix-platform-v1", platform: s.platform };
}

/* ================= Member-side actions that feed the admin portal ================= */

/** A member registers for an on-platform opportunity. */
export function registerForOpportunity(input: { opportunityId: string; mode: "individual" | "team"; teamName?: string; members: { name: string; role: string }[]; statement: string }): string {
  const id = uid("reg");
  setState((s) => {
    if (!s.user) return s;
    const reg: Registration = {
      id,
      opportunityId: input.opportunityId,
      applicantId: "me",
      mode: input.mode,
      teamName: input.teamName ? clip(input.teamName, 80) : undefined,
      members: [{ name: s.user.name, role: "Lead", personId: "me" }, ...input.members.map((m) => ({ name: clip(m.name, 80), role: clip(m.role, 60) }))],
      statement: clip(input.statement, 1200),
      status: "submitted",
      submissions: [],
      scores: [],
      notes: [],
      history: [{ id: uid("ev"), at: now(), by: s.user.name, text: input.mode === "team" ? "Registered as a team" : "Registered individually" }],
      createdAt: now(),
      demo: false,
    };
    return patchPlatform(s, "registrations", (l) => [reg, ...l]);
  });
  return id;
}

export function withdrawRegistration(id: string) {
  setState((s) =>
    patchPlatform(s, "registrations", (l) =>
      upd(l, (x) => x.id === id && x.applicantId === "me", (x) => ({ ...x, status: "withdrawn" as const, history: [{ id: uid("ev"), at: now(), by: s.user?.name ?? "Member", text: "Withdrew registration" }, ...x.history] })),
    ),
  );
}

/** A participant volunteers for a study; consent is recorded only when they confirm it. */
export function joinStudy(studyId: string, consent: boolean) {
  setState((s) => {
    const existing = s.platform.participations.find((p) => p.studyId === studyId && p.personId === "me");
    if (existing) {
      return patchPlatform(s, "participations", (l) => upd(l, (x) => x.id === existing.id, (x) => ({ ...x, status: "applied" as const, consent: consent ? "given" : x.consent, consentAt: consent ? now() : x.consentAt })));
    }
    const p: StudyParticipation = { id: uid("sp"), studyId, personId: "me", status: "applied", consent: consent ? "given" : "not_recorded", consentAt: consent ? now() : undefined, appliedAt: now() };
    return patchPlatform(s, "participations", (l) => [p, ...l]);
  });
}

export function leaveStudy(studyId: string) {
  setState((s) =>
    patchPlatform(s, "participations", (l) => upd(l, (x) => x.studyId === studyId && x.personId === "me", (x) => ({ ...x, status: "withdrawn" as const, consent: x.consent === "given" ? ("withdrawn" as const) : x.consent }))),
  );
}
