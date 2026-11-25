"use server";

import { z } from "zod";
import type { AdminModuleId, AdminPermission } from "@/lib/types";
import { AccessError, audit, requireAdmin, type AdminContext } from "@/lib/server/guards";
import type { TablesUpdate } from "@/lib/supabase/database.types";

/**
 * Every administrative write in TRUEVIX goes through adminOp().
 *
 *  1. The operation name selects a handler with a fixed (module, permission) requirement.
 *  2. Input is validated with zod (unknown fields are dropped).
 *  3. requireAdmin() re-checks the caller's session and operator permissions from the database.
 *  4. The write uses the service role, and an audit entry is appended in the same request.
 *
 * Hiding a button is not security: calling this from the browser without the permission fails at step 3.
 */

export type AdminOpResult = { ok: true; id?: string; data?: unknown } | { ok: false; error: string };

const uuid = z.string().uuid();
const str = (max: number) => z.string().trim().max(max);
const reason = z.string().trim().max(1000).optional().default("");
const roleIds = ["student_idea", "student_explorer", "founder", "professional", "expert", "mentor", "participant", "institution_rep"] as const;

type Handler<S extends z.ZodTypeAny> = {
  module: AdminModuleId;
  perm: AdminPermission | ((input: z.infer<S>) => AdminPermission);
  schema: S;
  run: (c: AdminContext, input: z.infer<S>) => Promise<AdminOpResult | void>;
};
const h = <S extends z.ZodTypeAny>(x: Handler<S>) => x;

/** Awaits a query that must succeed and return data. */
async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null || data === undefined) return [] as unknown as NonNullable<T>; // writes without .select() return no rows
  return data as NonNullable<T>;
}

/** Awaits a query whose single row may legitimately be missing. */
async function maybe<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T | null> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data ?? null;
}

const defined = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as { [K in keyof T]?: Exclude<T[K], undefined> };

async function name(c: AdminContext, userId: string) {
  const { data } = await c.admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return data?.display_name || "Member";
}

async function ventureTitle(c: AdminContext, id: string) {
  const { data } = await c.admin.from("ventures").select("title").eq("id", id).maybeSingle();
  return data?.title ?? id;
}

/** Suspended/deactivated accounts are banned in Supabase Auth (no sign-in, no token refresh). */
async function applyAuthBan(c: AdminContext, userId: string, status: string) {
  const ban = status === "suspended" || status === "deactivated" ? "876000h" : "none";
  const { error } = await c.admin.auth.admin.updateUserById(userId, { ban_duration: ban });
  if (error) throw new Error(`Auth status update failed: ${error.message}`);
}

const ops = {
  /* ================= Members ================= */
  "member.update": h({
    module: "users",
    perm: "edit",
    schema: z.object({
      personId: uuid,
      profile: z.object({ name: str(120), headline: str(160), organisation: str(120), location: str(100), bio: str(1200), skills: z.array(str(60)).max(50), interests: z.array(str(40)).max(30) }).partial(),
      account: z.object({ phone: z.string().regex(/^\+[0-9]{7,15}$/).or(z.literal("")), linkedin: str(300), adminNote: str(2000), designation: str(120) }).partial(),
    }),
    run: async (c, i) => {
      const p = i.profile;
      const profile: TablesUpdate<"profiles"> = defined({ display_name: p.name, headline: p.headline, organisation: p.organisation, location: p.location, bio: p.bio, skills: p.skills, interests: p.interests });
      const a = i.account;
      const account: TablesUpdate<"account_private"> = defined({ phone: a.phone === "" ? null : a.phone, linkedin: a.linkedin, admin_note: a.adminNote, designation: a.designation });
      if (Object.keys(profile).length) await must(c.admin.from("profiles").update(profile).eq("id", i.personId), "profile");
      if (Object.keys(account).length) await must(c.admin.from("account_private").update(account).eq("user_id", i.personId), "account");
      await audit(c, { action: "Edited member record", entity: "user", targetId: i.personId, target: await name(c, i.personId), after: [...Object.keys(profile), ...Object.keys(account)].join(", "), sensitive: Object.keys(account).length > 0 });
    },
  }),
  "member.status": h({
    module: "users",
    perm: "suspend",
    schema: z.object({ ids: z.array(uuid).min(1).max(200), status: z.enum(["active", "restricted", "suspended", "deactivated"]), reason }),
    run: async (c, i) => {
      for (const id of i.ids) {
        if (id === c.user.id) throw new AccessError("You can’t change the status of your own account.");
        const before = await maybe(c.admin.from("account_status").select("status").eq("user_id", id).maybeSingle(), "status");
        if (before?.status === i.status) continue;
        await must(c.admin.from("account_status").update({ status: i.status, reason: i.reason || null, changed_by: c.user.id, changed_at: new Date().toISOString() }).eq("user_id", id), "status");
        await applyAuthBan(c, id, i.status);
        await audit(c, { action: `Account ${i.status === "active" ? "reactivated" : i.status}`, entity: "user", targetId: id, target: await name(c, id), before: before?.status, after: i.status, reason: i.reason });
      }
    },
  }),
  "member.persona": h({
    module: "users",
    perm: "edit",
    schema: z.object({ personId: uuid, role: z.enum(roleIds) }),
    run: async (c, i) => {
      const before = await maybe(c.admin.from("profiles").select("persona").eq("id", i.personId).maybeSingle(), "profile");
      await must(c.admin.from("profiles").update({ persona: i.role }).eq("id", i.personId), "profile");
      await audit(c, { action: "Changed member role", entity: "user", targetId: i.personId, target: await name(c, i.personId), before: before?.persona, after: i.role });
    },
  }),
  "member.sensitive": h({
    module: "users",
    perm: "view",
    schema: z.object({ entity: str(60), targetId: str(120), target: str(300), reason: z.string().trim().min(5).max(1000) }),
    run: async (c, i) => audit(c, { action: "Viewed private information", entity: i.entity, targetId: i.targetId, target: i.target, reason: i.reason, sensitive: true }),
  }),
  "onboarding.update": h({
    module: "onboarding",
    perm: "edit",
    schema: z.object({
      personId: uuid,
      patch: z.object({
        onboarding: z.object({ completed: z.boolean(), step: z.number().int().min(0).max(50), totalSteps: z.number().int().min(0).max(50) }).partial().optional(),
        education: z.object({ level: str(80), qualification: str(120), status: str(60), year: str(10).optional() }).optional(),
        designation: str(120).optional(),
        institutionId: uuid.optional(),
      }),
      reason: z.string().trim().min(3).max(1000),
    }),
    run: async (c, i) => {
      const o = i.patch.onboarding;
      if (o) await must(c.admin.from("onboarding_progress").update({ ...(o.completed !== undefined ? { completed: o.completed, completed_at: o.completed ? new Date().toISOString() : null } : {}), ...(o.step !== undefined ? { step: o.step } : {}), ...(o.totalSteps !== undefined ? { total_steps: o.totalSteps } : {}) }).eq("user_id", i.personId), "onboarding");
      const e = i.patch.education;
      const acct = { ...(e ? { education_level: e.level, qualification: e.qualification, education_status: e.status, graduation_year: e.year ?? null } : {}), ...(i.patch.designation !== undefined ? { designation: i.patch.designation } : {}), ...(i.patch.institutionId ? { institution_id: i.patch.institutionId } : {}) };
      if (Object.keys(acct).length) await must(c.admin.from("account_private").update(acct).eq("user_id", i.personId), "account");
      await audit(c, { action: "Corrected onboarding record", entity: "user", targetId: i.personId, target: await name(c, i.personId), after: Object.keys({ ...o, ...acct }).join(", "), reason: i.reason });
    },
  }),
  "onboarding.review": h({
    module: "onboarding",
    perm: "approve",
    schema: z.object({ personId: uuid, status: z.enum(["approved", "changes_requested", "pending"]), note: str(1000).optional() }),
    run: async (c, i) => {
      await must(c.admin.from("onboarding_progress").update({ review_status: i.status, review_note: i.note || null, reviewed_by: c.user.id, reviewed_at: new Date().toISOString() }).eq("user_id", i.personId), "onboarding");
      await audit(c, { action: "Reviewed onboarding", entity: "user", targetId: i.personId, target: await name(c, i.personId), after: i.status, reason: i.note });
    },
  }),

  /* ================= Ideas ================= */
  "idea.review": h({
    module: "ideas",
    perm: "approve",
    schema: z.object({ ids: z.array(uuid).min(1).max(100), status: z.enum(["pending", "approved", "changes_requested", "rejected"]), note: str(1000).optional().default("") }),
    run: async (c, i) => {
      const labels = { approved: "Approved idea", rejected: "Rejected idea", changes_requested: "Requested changes to idea", pending: "Returned idea to review" };
      for (const id of i.ids) {
        const v = await must(c.admin.from("ventures").select("title, review_status, owner_id").eq("id", id).single(), "venture");
        await must(c.admin.from("ventures").update({ review_status: i.status, review_note: i.note || null, reviewed_by: c.user.id, reviewed_at: new Date().toISOString() }).eq("id", id), "venture");
        await must(c.admin.from("venture_activity").insert({ venture_id: id, actor_id: c.user.id, action: "review", detail: `${labels[i.status]}${i.note ? `: ${i.note.slice(0, 200)}` : ""}` }), "activity");
        await c.admin.from("notifications").insert({ user_id: v.owner_id, kind: "review", title: labels[i.status], body: i.note?.slice(0, 200) ?? "", href: `/ideas/${id}` });
        await audit(c, { action: labels[i.status], entity: "idea", targetId: id, target: v.title, before: v.review_status ?? "not reviewed", after: i.status, reason: i.note });
      }
    },
  }),
  "idea.publication": h({
    module: "ideas",
    perm: (i: { publication: string }) => (i.publication === "archived" ? "archive" : "publish"),
    schema: z.object({ id: uuid, publication: z.enum(["published", "unpublished", "archived"]), reason }),
    run: async (c, i) => {
      const v = await must(c.admin.from("ventures").select("title, publication").eq("id", i.id).single(), "venture");
      await must(c.admin.from("ventures").update({ publication: i.publication }).eq("id", i.id), "venture");
      const verb = { published: "Published idea", unpublished: "Unpublished idea", archived: "Archived idea" }[i.publication];
      await audit(c, { action: verb, entity: "idea", targetId: i.id, target: v.title, before: v.publication, after: i.publication, reason: i.reason });
    },
  }),
  "idea.featured": h({
    module: "ideas",
    perm: "edit",
    schema: z.object({ id: uuid, featured: z.boolean() }),
    run: async (c, i) => {
      await must(c.admin.from("ventures").update({ featured: i.featured }).eq("id", i.id), "venture");
      await audit(c, { action: i.featured ? "Featured idea" : "Removed idea from featured", entity: "idea", targetId: i.id, target: await ventureTitle(c, i.id) });
    },
  }),
  "idea.edit": h({
    module: "ideas",
    perm: "edit",
    schema: z.object({ id: uuid, patch: z.object({ title: str(140), summary: str(400), industry: str(40), stage: z.enum(["concept", "research", "validation", "prototype", "pilot", "launched"]), geography: str(120) }).partial(), reason: z.string().trim().min(3).max(1000) }),
    run: async (c, i) => {
      const patch: TablesUpdate<"ventures"> = defined(i.patch);
      if (!Object.keys(patch).length) return;
      const before = await must(c.admin.from("ventures").select("title").eq("id", i.id).single(), "venture");
      await must(c.admin.from("ventures").update(patch).eq("id", i.id), "venture");
      await audit(c, { action: "Edited idea", entity: "idea", targetId: i.id, target: before.title, after: Object.keys(patch).join(", "), reason: i.reason });
    },
  }),

  /* ================= Community content ================= */
  "content.moderate": h({
    module: "content",
    perm: "edit",
    schema: z.object({ kind: z.enum(["post", "comment"]), ids: z.array(uuid).min(1).max(200), status: z.enum(["visible", "pending_review", "hidden", "removed"]), reason }),
    run: async (c, i) => {
      const verb = { visible: "Restored content", pending_review: "Held content for review", hidden: "Hid content", removed: "Removed content" }[i.status];
      const table = i.kind === "post" ? "posts" : "comments";
      for (const id of i.ids) {
        await must(c.admin.from(table).update({ moderation_status: i.status, moderation_reason: i.reason || null, moderated_by: c.user.id, moderated_at: new Date().toISOString() }).eq("id", id), i.kind);
        await audit(c, { action: verb, entity: i.kind, targetId: id, target: i.kind, reason: i.reason });
      }
    },
  }),
  "post.flags": h({
    module: "content",
    perm: "edit",
    schema: z.object({ id: uuid, pinned: z.boolean().optional(), featured: z.boolean().optional() }),
    run: async (c, i) => {
      const patch = { ...(i.pinned !== undefined ? { pinned: i.pinned } : {}), ...(i.featured !== undefined ? { featured: i.featured } : {}) };
      await must(c.admin.from("posts").update(patch).eq("id", i.id), "post");
      const action = i.pinned !== undefined ? (i.pinned ? "Pinned post" : "Unpinned post") : i.featured ? "Featured post" : "Removed post from featured";
      await audit(c, { action, entity: "post", targetId: i.id, target: "post" });
    },
  }),
  "post.recategorise": h({
    module: "content",
    perm: "edit",
    schema: z.object({ id: uuid, kind: z.enum(["idea", "technology", "problem", "project", "founder_update", "research", "trend", "collaboration", "challenge", "question", "discussion"]).optional(), industries: z.array(str(40)).max(10).optional(), reason }),
    run: async (c, i) => {
      await must(c.admin.from("posts").update({ ...(i.kind ? { kind: i.kind } : {}), ...(i.industries ? { industries: i.industries } : {}) }).eq("id", i.id), "post");
      await audit(c, { action: "Changed post category", entity: "post", targetId: i.id, target: "post", after: JSON.stringify({ kind: i.kind, industries: i.industries }), reason: i.reason });
    },
  }),

  /* ================= Moderation reports ================= */
  "report.resolve": h({
    module: "moderation",
    perm: "approve",
    schema: z.object({ id: uuid, outcome: z.enum(["open", "in_review", "actioned", "dismissed"]), resolution: str(1000).default(""), contentAction: z.enum(["remove", "hide", "none"]).default("none"), restrictUser: z.enum(["restricted", "suspended", "deactivated"]).nullable().optional() }),
    run: async (c, i) => {
      const r = await must(c.admin.from("moderation_reports").select("*").eq("id", i.id).single(), "report");
      await must(c.admin.from("moderation_reports").update({ status: i.outcome, resolution: i.resolution || null, reviewed_by: c.user.id, reviewed_at: new Date().toISOString() }).eq("id", i.id), "report");
      const verb = { open: "Reopened report", in_review: "Started reviewing report", actioned: "Resolved report with action", dismissed: "Dismissed report" }[i.outcome];
      await audit(c, { action: verb, entity: "report", targetId: i.id, target: r.target_label, before: r.status, after: i.outcome, reason: i.resolution });
      if (i.contentAction !== "none" && (r.target_type === "post" || r.target_type === "comment")) {
        const status = i.contentAction === "remove" ? "removed" : "hidden";
        await must(c.admin.from(r.target_type === "post" ? "posts" : "comments").update({ moderation_status: status, moderation_reason: i.resolution, moderated_by: c.user.id, moderated_at: new Date().toISOString() }).eq("id", r.target_id), "content");
        await audit(c, { action: status === "removed" ? "Removed content" : "Hid content", entity: r.target_type, targetId: r.target_id, target: r.target_label, reason: i.resolution });
      }
      if (i.contentAction !== "none" && r.target_type === "venture") {
        await must(c.admin.from("ventures").update({ publication: "unpublished" }).eq("id", r.target_id), "venture");
        await audit(c, { action: "Unpublished idea", entity: "idea", targetId: r.target_id, target: r.target_label, reason: i.resolution });
      }
      if (i.restrictUser && r.reported_user_id && r.reported_user_id !== c.user.id) {
        if (!c.ctx.adminPermissions.some((p) => p.module === "users" && p.permission === "suspend")) throw new AccessError("Restricting the member also needs the “suspend” permission for users.");
        await must(c.admin.from("account_status").update({ status: i.restrictUser, reason: i.resolution, changed_by: c.user.id, changed_at: new Date().toISOString() }).eq("user_id", r.reported_user_id), "status");
        await applyAuthBan(c, r.reported_user_id, i.restrictUser);
        await audit(c, { action: `Account ${i.restrictUser}`, entity: "user", targetId: r.reported_user_id, target: await name(c, r.reported_user_id), after: i.restrictUser, reason: i.resolution });
      }
    },
  }),

  /* ================= Research and validation oversight ================= */
  "research.archive": h({
    module: "research",
    perm: "archive",
    schema: z.object({ id: uuid, archived: z.boolean(), reason }),
    run: async (c, i) => {
      const p = await must(c.admin.from("research_projects").select("question").eq("id", i.id).single(), "research");
      await must(c.admin.from("research_projects").update({ archived: i.archived, archived_reason: i.archived ? i.reason || null : null }).eq("id", i.id), "research");
      await audit(c, { action: i.archived ? "Archived research run" : "Restored research run", entity: "research", targetId: i.id, target: p.question, reason: i.reason });
    },
  }),
  "evidence.downgrade": h({
    module: "validation",
    perm: "edit",
    schema: z.object({ evidenceId: uuid, reason: z.string().trim().min(5).max(500), remove: z.boolean() }),
    run: async (c, i) => {
      const e = await must(c.admin.from("evidence").select("body, evidence_type, workspace_id").eq("id", i.evidenceId).single(), "evidence");
      if (i.remove) await must(c.admin.from("evidence").delete().eq("id", i.evidenceId), "evidence");
      else await must(c.admin.from("evidence").update({ evidence_type: "assumption", downgraded_reason: i.reason }).eq("id", i.evidenceId), "evidence");
      await audit(c, { action: i.remove ? "Removed validation evidence" : "Reclassified evidence as assumption", entity: "validation", targetId: e.workspace_id, target: e.body.slice(0, 80), before: e.evidence_type, after: i.remove ? "removed" : "assumption", reason: i.reason });
    },
  }),

  /* ================= Opportunities ================= */
  "opportunity.save": h({
    module: "opportunities",
    perm: (i: { isNew: boolean }) => (i.isNew ? "create" : "edit"),
    schema: z.object({
      isNew: z.boolean(),
      o: z.object({
        id: uuid,
        kind: z.enum(["incubator", "accelerator", "hackathon", "competition", "grant", "challenge", "mentorship", "university", "event", "industry", "internship", "scholarship", "workshop", "startup_programme"]),
        title: z.string().trim().min(3).max(200),
        organisation: z.string().trim().min(1).max(160),
        description: str(5000).default(""),
        eligibility: str(2000).default(""),
        industries: z.array(str(40)).max(20).default([]),
        stage: z.array(str(20)).max(10).default([]),
        location: str(120).default(""),
        deadline: z.string().max(40).optional().nullable(),
        officialUrl: z.string().url().max(500).nullable().optional(),
        publication: z.enum(["draft", "published", "unpublished", "archived"]).default("draft"),
        featured: z.boolean().optional(),
        source: z.enum(["weblaze", "external"]).default("external"),
        sourceUrl: z.string().url().max(500).nullable().optional(),
        sourceVerification: z.enum(["unverified", "verified", "needs_recheck"]).optional(),
        education: str(200).optional(),
        format: z.enum(["online", "offline", "hybrid"]).optional(),
        registrationOpens: z.string().max(40).optional(),
        eventStart: z.string().max(40).optional(),
        eventEnd: z.string().max(40).optional(),
        teamMin: z.number().int().min(1).max(50).optional(),
        teamMax: z.number().int().min(1).max(50).optional(),
        prizes: str(2000).optional(),
        instructions: str(5000).optional(),
        contact: str(300).optional(),
        registrationMode: z.enum(["on_platform", "external", "none"]).default("external"),
      }),
    }),
    run: async (c, i) => {
      const o = i.o;
      const d = (v?: string | null) => (v ? v.slice(0, 10) : null);
      const row = {
        id: o.id, kind: o.kind, title: o.title, organisation: o.organisation, description: o.description, eligibility: o.eligibility, industries: o.industries, stages: o.stage, location: o.location,
        deadline: d(o.deadline), official_url: o.officialUrl || null, publication: o.publication, featured: !!o.featured, source: o.source, source_url: o.sourceUrl || null,
        source_verification: o.sourceVerification ?? "unverified", education: o.education || null, format: o.format ?? null, registration_opens: d(o.registrationOpens), event_start: d(o.eventStart),
        event_end: d(o.eventEnd), team_min: o.teamMin ?? null, team_max: o.teamMax ?? null, prizes: o.prizes || null, instructions: o.instructions || null, contact: o.contact || null,
        registration_mode: o.registrationMode,
      };
      if (i.isNew) await must(c.admin.from("opportunities").insert({ ...row, created_by: c.user.id }), "opportunity");
      else await must(c.admin.from("opportunities").update(row).eq("id", o.id), "opportunity");
      await audit(c, { action: i.isNew ? "Created opportunity" : "Edited opportunity", entity: "opportunity", targetId: o.id, target: o.title, after: o.publication });
      return { ok: true, id: o.id };
    },
  }),
  "opportunity.publication": h({
    module: "opportunities",
    perm: (i: { publication: string }) => (i.publication === "archived" ? "archive" : "publish"),
    schema: z.object({ ids: z.array(uuid).min(1).max(100), publication: z.enum(["draft", "published", "unpublished", "archived"]), reason }),
    run: async (c, i) => {
      const verb = { draft: "Moved opportunity to draft", published: "Published opportunity", unpublished: "Unpublished opportunity", archived: "Archived opportunity" }[i.publication];
      for (const id of i.ids) {
        const o = await must(c.admin.from("opportunities").select("title, publication").eq("id", id).single(), "opportunity");
        await must(c.admin.from("opportunities").update({ publication: i.publication }).eq("id", id), "opportunity");
        await audit(c, { action: verb, entity: "opportunity", targetId: id, target: o.title, before: o.publication, after: i.publication, reason: i.reason });
      }
    },
  }),
  "opportunity.patch": h({
    module: "opportunities",
    perm: "edit",
    schema: z.object({ id: uuid, patch: z.object({ featured: z.boolean(), sourceVerification: z.enum(["unverified", "verified", "needs_recheck"]), lastCheckedAt: z.string().max(40), resultsPublished: z.boolean(), registrationMode: z.enum(["on_platform", "external", "none"]) }).partial(), action: str(120), reason: str(1000).optional() }),
    run: async (c, i) => {
      const p = i.patch;
      const row: TablesUpdate<"opportunities"> = defined({ featured: p.featured, source_verification: p.sourceVerification, last_checked_at: p.lastCheckedAt, results_published: p.resultsPublished, registration_mode: p.registrationMode });
      if (Object.keys(row).length) await must(c.admin.from("opportunities").update(row).eq("id", i.id), "opportunity");
      const o = await must(c.admin.from("opportunities").select("title").eq("id", i.id).single(), "opportunity");
      await audit(c, { action: i.action || "Edited opportunity", entity: "opportunity", targetId: i.id, target: o.title, reason: i.reason });
    },
  }),
  "hackathon.update": h({
    module: "opportunities",
    perm: "edit",
    schema: z.object({
      id: uuid,
      patch: z.object({
        rounds: z.array(z.object({ id: uuid, name: str(120).min(1), deadline: z.string().max(40).optional().default(""), description: str(1000).default("") })).max(20),
        criteria: z.array(z.object({ id: uuid, label: str(120).min(1), weight: z.number().int().min(1).max(100) })).max(30),
        judges: z.array(uuid).max(50),
        winners: z.array(z.object({ registrationId: uuid, place: str(60) })).max(50),
        certificates: z.object({ issuedTo: z.array(uuid).max(1000) }),
        communications: z.array(z.object({ id: uuid, subject: str(160).min(1), body: str(4000).min(1), audience: z.enum(["all", "shortlisted", "selected"]) })).max(200),
      }).partial(),
      action: str(120),
    }),
    run: async (c, i) => {
      const p = i.patch;
      if (p.rounds) {
        const keep = p.rounds.map((r) => r.id);
        await must(c.admin.from("opportunity_rounds").upsert(p.rounds.map((r, n) => ({ id: r.id, opportunity_id: i.id, name: r.name, description: r.description, deadline: r.deadline || null, position: n }))), "rounds");
        if (keep.length) await must(c.admin.from("opportunity_rounds").delete().eq("opportunity_id", i.id).not("id", "in", `(${keep.join(",")})`), "rounds");
        else await must(c.admin.from("opportunity_rounds").delete().eq("opportunity_id", i.id), "rounds");
      }
      if (p.criteria) {
        const keep = p.criteria.map((r) => r.id);
        await must(c.admin.from("opportunity_criteria").upsert(p.criteria.map((r, n) => ({ id: r.id, opportunity_id: i.id, label: r.label, weight: r.weight, position: n }))), "criteria");
        if (keep.length) await must(c.admin.from("opportunity_criteria").delete().eq("opportunity_id", i.id).not("id", "in", `(${keep.join(",")})`), "criteria");
        else await must(c.admin.from("opportunity_criteria").delete().eq("opportunity_id", i.id), "criteria");
      }
      if (p.judges) {
        await must(c.admin.from("opportunity_organisers").delete().eq("opportunity_id", i.id).eq("role", "judge"), "judges");
        if (p.judges.length) await must(c.admin.from("opportunity_organisers").insert(p.judges.map((u) => ({ opportunity_id: i.id, user_id: u, role: "judge", added_by: c.user.id }))), "judges");
      }
      if (p.winners) {
        await must(c.admin.from("registrations").update({ award_place: null }).eq("opportunity_id", i.id), "winners");
        for (const w of p.winners) await must(c.admin.from("registrations").update({ award_place: w.place }).eq("id", w.registrationId).eq("opportunity_id", i.id), "winners");
      }
      if (p.certificates) {
        for (const reg of p.certificates.issuedTo) await must(c.admin.from("registrations").update({ certificate_issued_at: new Date().toISOString() }).eq("id", reg).eq("opportunity_id", i.id).is("certificate_issued_at", null), "certificates");
      }
      if (p.communications) {
        const existing = (await must(c.admin.from("opportunity_communications").select("id").eq("opportunity_id", i.id), "communications")).map((x) => x.id);
        const fresh = p.communications.filter((m) => !existing.includes(m.id));
        for (const m of fresh) {
          await must(c.admin.from("opportunity_communications").insert({ id: m.id, opportunity_id: i.id, subject: m.subject, body: m.body, audience: m.audience, sent_by: c.user.id }), "communications");
          // In-app delivery only: no email provider is configured.
          const statuses = m.audience === "all" ? ["submitted", "under_review", "info_requested", "shortlisted", "selected", "rejected"] : m.audience === "shortlisted" ? ["shortlisted", "selected"] : ["selected"];
          const regs = await must(c.admin.from("registrations").select("applicant_id").eq("opportunity_id", i.id).in("status", statuses), "registrations");
          if (regs.length) await must(c.admin.from("notifications").insert(regs.map((r) => ({ user_id: r.applicant_id, kind: "opportunity", title: m.subject.slice(0, 200), body: m.body.slice(0, 500), href: `/opportunities/${i.id}` }))), "notifications");
        }
      }
      const o = await must(c.admin.from("opportunities").select("title").eq("id", i.id).single(), "opportunity");
      await audit(c, { action: i.action || "Updated hackathon settings", entity: "opportunity", targetId: i.id, target: o.title, after: Object.keys(p).join(", ") });
    },
  }),
  "registration.status": h({
    module: "opportunities",
    perm: "approve",
    schema: z.object({ ids: z.array(uuid).min(1).max(500), status: z.enum(["submitted", "under_review", "info_requested", "shortlisted", "rejected", "selected", "withdrawn"]), note: str(1000).default("") }),
    run: async (c, i) => {
      for (const id of i.ids) {
        const r = await must(c.admin.from("registrations").select("status, team_name").eq("id", id).single(), "registration");
        if (r.status === i.status) continue;
        await must(c.admin.from("registrations").update({ status: i.status }).eq("id", id), "registration");
        if (i.note) await must(c.admin.from("registration_notes").insert({ registration_id: id, author_id: c.user.id, body: `Status → ${i.status}: ${i.note}` }), "note");
        await audit(c, { action: "Changed application status", entity: "registration", targetId: id, target: r.team_name ?? id, before: r.status, after: i.status, reason: i.note });
      }
    },
  }),
  "registration.note": h({
    module: "opportunities",
    perm: "edit",
    schema: z.object({ id: uuid, text: z.string().trim().min(1).max(2000) }),
    run: async (c, i) => {
      await must(c.admin.from("registration_notes").insert({ registration_id: i.id, author_id: c.user.id, body: i.text }), "note");
      await audit(c, { action: "Added internal reviewer note", entity: "registration", targetId: i.id, target: "registration" });
    },
  }),
  "registration.score": h({
    module: "opportunities",
    perm: "edit",
    schema: z.object({ regId: uuid, roundId: uuid.or(z.literal("")), judgeId: uuid, criterionId: uuid, score: z.number().min(0).max(10) }),
    run: async (c, i) => {
      const score = Math.round(i.score);
      const round = i.roundId || null;
      let q = c.admin.from("judging_scores").select("id").eq("registration_id", i.regId).eq("criterion_id", i.criterionId).eq("judge_id", i.judgeId);
      q = round ? q.eq("round_id", round) : q.is("round_id", null);
      const existing = await maybe(q.maybeSingle(), "score");
      if (existing) await must(c.admin.from("judging_scores").update({ score, updated_at: new Date().toISOString() }).eq("id", existing.id), "score");
      else await must(c.admin.from("judging_scores").insert({ registration_id: i.regId, round_id: round, criterion_id: i.criterionId, judge_id: i.judgeId, score }), "score");
      await audit(c, { action: "Recorded score", entity: "registration", targetId: i.regId, target: "registration", after: `${score}` });
    },
  }),

  /* ================= Institutions ================= */
  "institution.save": h({
    module: "institutions",
    perm: (i: { isNew: boolean }) => (i.isNew ? "create" : "edit"),
    schema: z.object({
      isNew: z.boolean(),
      inst: z.object({
        id: uuid,
        name: z.string().trim().min(2).max(160),
        kind: z.enum(["university", "college", "incubator", "accelerator", "company", "industry_partner", "research_org"]),
        location: str(120).default(""),
        website: z.string().url().max(300).optional().or(z.literal("")),
        description: str(2000).default(""),
        status: z.enum(["pending", "verified", "rejected", "archived"]).default("pending"),
        relationship: z.enum(["listed", "registered", "partner_confirmed"]).default("listed"),
        agreementRef: str(120).optional(),
      }),
    }),
    run: async (c, i) => {
      const x = i.inst;
      const relationship = x.relationship === "partner_confirmed" && !x.agreementRef?.trim() ? "registered" : x.relationship;
      const row = { id: x.id, name: x.name, kind: x.kind, location: x.location, website: x.website || null, description: x.description, status: x.status, relationship, agreement_ref: x.agreementRef?.trim() || null };
      if (i.isNew) await must(c.admin.from("institutions").insert({ ...row, created_by: c.user.id }), "institution");
      else await must(c.admin.from("institutions").update(row).eq("id", x.id), "institution");
      await audit(c, { action: i.isNew ? "Created organisation" : "Edited organisation", entity: "institution", targetId: x.id, target: x.name, after: `${x.status}/${relationship}` });
      return { ok: true, id: x.id };
    },
  }),
  "institution.status": h({
    module: "institutions",
    perm: "approve",
    schema: z.object({ id: uuid, status: z.enum(["pending", "verified", "rejected", "archived"]), reason }),
    run: async (c, i) => {
      const x = await must(c.admin.from("institutions").select("name, status").eq("id", i.id).single(), "institution");
      await must(c.admin.from("institutions").update({ status: i.status }).eq("id", i.id), "institution");
      const verb = { verified: "Approved organisation", rejected: "Rejected organisation", pending: "Returned organisation to review", archived: "Archived organisation" }[i.status];
      await audit(c, { action: verb, entity: "institution", targetId: i.id, target: x.name, before: x.status, after: i.status, reason: i.reason });
    },
  }),
  /**
   * Approving a representative's request: creates/links the institution, adds them as an active representative
   * and — only when the request is for administrator access, or the operator explicitly asks — grants the
   * restricted institution_admin role. This is the only path to that role.
   */
  "institution.request": h({
    module: "institutions",
    perm: "approve",
    schema: z.object({ requestId: uuid, decision: z.enum(["approved", "rejected"]), grantAdmin: z.boolean().default(false), note: str(1000).default(""), institutionId: uuid.optional() }),
    run: async (c, i) => {
      const r = await must(c.admin.from("institution_requests").select("*").eq("id", i.requestId).single(), "request");
      if (r.status !== "pending") throw new Error("This request has already been decided.");
      let instId = i.institutionId ?? r.institution_id;
      if (i.decision === "approved") {
        if (!instId) {
          const created = await must(c.admin.from("institutions").insert({ name: r.proposed_name ?? "Institution", kind: r.proposed_kind ?? "university", status: "verified", relationship: "registered", created_by: c.user.id }).select("id").single(), "institution");
          instId = created.id;
        }
        await must(c.admin.from("institution_members").upsert({ institution_id: instId, user_id: r.requested_by, member_role: "representative", status: "active", approved_by: c.user.id }, { onConflict: "institution_id,user_id" }), "membership");
        await must(c.admin.from("account_private").update({ institution_id: instId }).eq("user_id", r.requested_by), "account");
        if (i.grantAdmin || r.request_type === "administrator_access") {
          const existing = await must(c.admin.from("user_roles").select("id").eq("user_id", r.requested_by).eq("role", "institution_admin").eq("institution_id", instId).is("revoked_at", null), "roles");
          if (!existing.length) await must(c.admin.from("user_roles").insert({ user_id: r.requested_by, role: "institution_admin", institution_id: instId, granted_by: c.user.id, grant_reason: i.note || "Institution request approved" }), "role");
          await audit(c, { action: "Granted institution administrator role", entity: "user", targetId: r.requested_by, target: await name(c, r.requested_by), after: instId, reason: i.note });
        }
      }
      await must(c.admin.from("institution_requests").update({ status: i.decision, institution_id: instId ?? null, reviewed_by: c.user.id, reviewed_at: new Date().toISOString(), review_note: i.note || null }).eq("id", i.requestId), "request");
      await c.admin.from("notifications").insert({ user_id: r.requested_by, kind: "system", title: i.decision === "approved" ? "Institution request approved" : "Institution request not approved", body: i.note.slice(0, 200), href: "/institution" });
      await audit(c, { action: i.decision === "approved" ? "Approved institution request" : "Rejected institution request", entity: "institution", targetId: instId ?? i.requestId, target: r.proposed_name ?? "", reason: i.note });
    },
  }),
  "institution.revokeAdmin": h({
    module: "institutions",
    perm: "approve",
    schema: z.object({ userId: uuid, institutionId: uuid, reason: z.string().trim().min(3).max(500) }),
    run: async (c, i) => {
      await must(c.admin.from("user_roles").update({ revoked_at: new Date().toISOString(), revoked_by: c.user.id }).eq("user_id", i.userId).eq("role", "institution_admin").eq("institution_id", i.institutionId).is("revoked_at", null), "role");
      await audit(c, { action: "Revoked institution administrator role", entity: "user", targetId: i.userId, target: await name(c, i.userId), reason: i.reason });
    },
  }),

  /* ================= Mentors, experts, studies, collaboration ================= */
  "talent.review": h({
    module: "talent",
    perm: "approve",
    schema: z.object({ personId: uuid, patch: z.object({ status: z.enum(["applied", "approved", "rejected", "paused"]), verification: z.enum(["self_declared", "references_requested", "admin_reviewed"]), reviewNote: str(1000), availability: z.enum(["available", "limited", "unavailable"]), capacity: z.number().int().min(0).max(50), hoursPerMonth: z.number().int().min(0).max(200), areas: z.array(str(80)).max(30) }).partial(), action: str(120) }),
    run: async (c, i) => {
      const p = i.patch;
      const row: TablesUpdate<"talent_profiles"> = defined({ status: p.status, verification: p.verification, review_note: p.reviewNote, availability: p.availability, capacity: p.capacity, hours_per_month: p.hoursPerMonth, areas: p.areas });
      await must(c.admin.from("talent_profiles").update({ ...row, reviewed_by: c.user.id, reviewed_at: new Date().toISOString() }).eq("user_id", i.personId), "talent");
      if (p.status === "approved") {
        const t = await must(c.admin.from("talent_profiles").select("kind").eq("user_id", i.personId).single(), "talent");
        await must(c.admin.from("profiles").update({ persona: t.kind }).eq("id", i.personId), "profile");
      }
      await audit(c, { action: i.action || "Reviewed talent profile", entity: "talent", targetId: i.personId, target: await name(c, i.personId), after: Object.keys(row).join(", "), reason: p.reviewNote });
    },
  }),
  "mentorship.save": h({
    module: "talent",
    perm: "edit",
    schema: z.object({ id: uuid, mentorId: uuid, menteeId: uuid, ideaId: uuid.optional(), focus: str(300).default(""), status: z.enum(["proposed", "active", "completed", "ended"]), startedAt: z.string().max(40).optional() }),
    run: async (c, i) => {
      await must(c.admin.from("mentorships").upsert({ id: i.id, mentor_id: i.mentorId, mentee_id: i.menteeId, venture_id: i.ideaId ?? null, focus: i.focus, status: i.status, ...(i.status === "ended" || i.status === "completed" ? { ended_at: new Date().toISOString() } : {}) }), "mentorship");
      await audit(c, { action: `Mentorship ${i.status}`, entity: "mentorship", targetId: i.id, target: `${await name(c, i.mentorId)} → ${await name(c, i.menteeId)}`, after: i.status });
    },
  }),
  "study.save": h({
    module: "studies",
    perm: (i: { isNew: boolean }) => (i.isNew ? "create" : "edit"),
    schema: z.object({
      isNew: z.boolean(),
      st: z.object({ id: uuid, ownerId: uuid, ideaId: uuid.optional(), title: z.string().trim().min(3).max(160), description: str(2000).default(""), format: str(120).default(""), eligibility: str(500).default(""), note: str(500).default(""), status: z.enum(["draft", "recruiting", "in_progress", "completed", "closed"]), start: z.string().max(40).optional(), end: z.string().max(40).optional(), target: z.number().int().min(0).max(10000), consentText: str(4000).default("") }),
    }),
    run: async (c, i) => {
      const s = i.st;
      const row = { id: s.id, owner_id: s.ownerId, venture_id: s.ideaId ?? null, title: s.title, description: s.description, format: s.format, eligibility: s.eligibility, note: s.note, status: s.status, starts_on: s.start?.slice(0, 10) || null, ends_on: s.end?.slice(0, 10) || null, target_participants: s.target, consent_text: s.consentText };
      if (i.isNew) await must(c.admin.from("studies").insert(row), "study");
      else await must(c.admin.from("studies").update(row).eq("id", s.id), "study");
      await audit(c, { action: i.isNew ? "Created study" : "Edited study", entity: "study", targetId: s.id, target: s.title, after: s.status });
      return { ok: true, id: s.id };
    },
  }),
  "participation.set": h({
    module: "studies",
    perm: "edit",
    schema: z.object({ id: uuid, status: z.enum(["applied", "selected", "not_selected", "completed", "withdrawn"]).optional() }),
    run: async (c, i) => {
      // Consent belongs to the participant; administrators only change selection status.
      if (i.status) await must(c.admin.from("study_participants").update({ status: i.status }).eq("id", i.id), "participation");
      await audit(c, { action: "Updated study participation", entity: "study", targetId: i.id, target: "participation", after: i.status });
    },
  }),
  "collaboration.set": h({
    module: "collaboration",
    perm: "edit",
    schema: z.object({ id: uuid, status: z.enum(["open", "pending", "accepted", "declined", "closed"]).optional(), role: str(80).optional(), clearFlag: z.boolean().optional(), reason }),
    run: async (c, i) => {
      const row = { ...(i.status ? { status: i.status } : {}), ...(i.role ? { role: i.role } : {}), ...(i.clearFlag ? { flagged_reason: null, flagged_at: null } : {}) };
      await must(c.admin.from("collaboration_requests").update(row).eq("id", i.id), "collaboration");
      await audit(c, { action: i.clearFlag ? "Cleared collaboration flag" : "Updated collaboration", entity: "collaboration", targetId: i.id, target: i.role ?? "collaboration", after: JSON.stringify(row), reason: i.reason });
    },
  }),

  /* ================= Announcements ================= */
  "announcement.save": h({
    module: "communications",
    perm: "edit",
    schema: z.object({ id: uuid, isNew: z.boolean(), title: z.string().trim().min(1).max(160), body: str(4000), audience: z.array(z.enum([...roleIds, "institution_admin", "platform_admin"])).max(10), channels: z.array(z.enum(["in_app", "banner", "email"])).min(1).max(3) }),
    run: async (c, i) => {
      const row = { id: i.id, title: i.title, body: i.body, audience: i.audience, channels: i.channels };
      if (i.isNew) await must(c.admin.from("announcements").insert({ ...row, created_by: c.user.id }), "announcement");
      else await must(c.admin.from("announcements").update(row).eq("id", i.id), "announcement");
      await audit(c, { action: i.isNew ? "Drafted announcement" : "Edited announcement", entity: "announcement", targetId: i.id, target: i.title });
      return { ok: true, id: i.id };
    },
  }),
  "announcement.publish": h({
    module: "communications",
    perm: "publish",
    schema: z.object({ id: uuid, scheduleFor: z.string().datetime({ offset: true }).optional() }),
    run: async (c, i) => {
      const a = await must(c.admin.from("announcements").select("*").eq("id", i.id).single(), "announcement");
      if (i.scheduleFor) {
        await must(c.admin.from("announcements").update({ status: "scheduled", scheduled_for: i.scheduleFor }).eq("id", i.id), "announcement");
        await audit(c, { action: "Scheduled announcement", entity: "announcement", targetId: i.id, target: a.title, after: i.scheduleFor });
        return;
      }
      await must(c.admin.from("announcements").update({ status: "published", published_at: new Date().toISOString(), scheduled_for: null }).eq("id", i.id), "announcement");
      const deliveries: { announcement_id: string; channel: string; status: string; detail: string }[] = [];
      for (const ch of a.channels) {
        if (ch === "in_app") {
          // Matching members receive a real in-app notification.
          const personas = a.audience.filter((r) => r !== "platform_admin" && r !== "institution_admin");
          let q = c.admin.from("profiles").select("id");
          if (a.audience.length) q = q.in("persona", personas.length ? personas : ["__none__"]);
          const rows = await must(q.limit(5000), "audience");
          for (let n = 0; n < rows.length; n += 500) {
            const chunk = rows.slice(n, n + 500);
            if (chunk.length) await must(c.admin.from("notifications").insert(chunk.map((r) => ({ user_id: r.id, kind: "system", title: a.title.slice(0, 200), body: a.body.slice(0, 500), href: "/notifications" }))), "notifications");
          }
          deliveries.push({ announcement_id: i.id, channel: ch, status: "delivered_in_app", detail: `Added to ${rows.length} member notification inbox${rows.length === 1 ? "" : "es"}.` });
        } else if (ch === "banner") {
          deliveries.push({ announcement_id: i.id, channel: ch, status: "shown_as_banner", detail: "Shown as the site banner while published." });
        } else {
          deliveries.push({ announcement_id: i.id, channel: ch, status: "not_sent", detail: "Not sent: no email provider (custom SMTP) is configured." });
        }
      }
      if (deliveries.length) await must(c.admin.from("announcement_deliveries").insert(deliveries), "deliveries");
      await audit(c, { action: "Published announcement", entity: "announcement", targetId: i.id, target: a.title, after: a.channels.join(", ") });
    },
  }),
  "announcement.archive": h({
    module: "communications",
    perm: "archive",
    schema: z.object({ id: uuid }),
    run: async (c, i) => {
      const a = await must(c.admin.from("announcements").select("title").eq("id", i.id).single(), "announcement");
      await must(c.admin.from("announcements").update({ status: "archived" }).eq("id", i.id), "announcement");
      await audit(c, { action: "Archived announcement", entity: "announcement", targetId: i.id, target: a.title });
    },
  }),
  "conversation.access": h({
    module: "moderation",
    perm: "approve",
    schema: z.object({ threadId: uuid, subject: str(160), reason: z.string().trim().min(10).max(800), caseRef: z.string().trim().min(2).max(40) }),
    run: async (c, i) => {
      await audit(c, { action: "Opened private conversation", entity: "message_thread", targetId: i.threadId, target: i.subject, reason: `${i.reason} (case ${i.caseRef})`, sensitive: true });
      const messages = await must(c.admin.from("messages").select("id, author_id, body, created_at").eq("thread_id", i.threadId).order("created_at"), "messages");
      return { ok: true, data: messages };
    },
  }),

  /* ================= CMS ================= */
  "cms.draft": h({
    module: "cms",
    perm: "edit",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/), fields: z.record(z.string().max(60), z.string().max(4000)) }),
    run: async (c, i) => {
      const e = await must(c.admin.from("cms_content").select("kind, label").eq("id", i.id).single(), "cms");
      const label = e.kind === "faq" ? `FAQ: ${i.fields.question ?? ""}` : e.kind === "help" ? `Help: ${i.fields.title ?? ""}` : e.label;
      await must(c.admin.from("cms_content").update({ draft: i.fields, label: label.slice(0, 120), updated_by: c.user.id }).eq("id", i.id), "cms");
      await audit(c, { action: "Saved content draft", entity: "cms", targetId: i.id, target: label });
    },
  }),
  "cms.publish": h({
    module: "cms",
    perm: "publish",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/) }),
    run: async (c, i) => {
      const e = await must(c.admin.from("cms_content").select("draft, label").eq("id", i.id).single(), "cms");
      const versions = await must(c.admin.from("cms_versions").select("version").eq("cms_id", i.id).order("version", { ascending: false }).limit(1), "versions");
      const version = (versions[0]?.version ?? 0) + 1;
      await must(c.admin.from("cms_content").update({ published: e.draft, status: "published", updated_by: c.user.id }).eq("id", i.id), "cms");
      await must(c.admin.from("cms_versions").insert({ cms_id: i.id, version, fields: e.draft, published_by: c.user.id }), "versions");
      await audit(c, { action: "Published site content", entity: "cms", targetId: i.id, target: e.label, after: `version ${version}` });
    },
  }),
  "cms.unpublish": h({
    module: "cms",
    perm: "publish",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/) }),
    run: async (c, i) => {
      await must(c.admin.from("cms_content").update({ status: "unpublished", updated_by: c.user.id }).eq("id", i.id), "cms");
      await audit(c, { action: "Unpublished site content", entity: "cms", targetId: i.id, target: i.id });
    },
  }),
  "cms.restore": h({
    module: "cms",
    perm: "edit",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/), version: z.number().int().min(1) }),
    run: async (c, i) => {
      const v = await must(c.admin.from("cms_versions").select("fields").eq("cms_id", i.id).eq("version", i.version).single(), "version");
      await must(c.admin.from("cms_content").update({ draft: v.fields, updated_by: c.user.id }).eq("id", i.id), "cms");
      await audit(c, { action: `Restored version ${i.version} to draft`, entity: "cms", targetId: i.id, target: i.id });
    },
  }),
  "cms.create": h({
    module: "cms",
    perm: "create",
    schema: z.object({ id: z.string().regex(/^[a-z0-9-]{2,60}$/), kind: z.enum(["faq", "help"]) }),
    run: async (c, i) => {
      const fields = i.kind === "faq" ? { question: "", answer: "" } : { title: "", body: "" };
      const max = await must(c.admin.from("cms_content").select("position").eq("kind", i.kind).order("position", { ascending: false }).limit(1), "cms");
      const label = i.kind === "faq" ? "FAQ: New question" : "Help: New article";
      await must(c.admin.from("cms_content").insert({ id: i.id, kind: i.kind, label, draft: fields, status: "draft", position: (max[0]?.position ?? 0) + 1, updated_by: c.user.id }), "cms");
      await audit(c, { action: "Created content entry", entity: "cms", targetId: i.id, target: label });
      return { ok: true, id: i.id };
    },
  }),

  /* ================= Administrators and permissions ================= */
  /**
   * Grants or changes platform administrator access for an EXISTING account (looked up by email). There is no
   * self-service path to this role and no invitation email is sent (no email provider is configured).
   */
  "adminAccount.save": h({
    module: "access",
    perm: "manage_permissions",
    schema: z.object({ email: z.string().email().max(254), role: z.enum(["super_admin", "platform_admin", "user_manager", "content_manager", "opportunity_manager", "institution_manager", "moderator", "analyst"]), status: z.enum(["active", "deactivated"]) }),
    run: async (c, i) => {
      const acct = await must(c.admin.from("account_private").select("user_id").eq("email", i.email.toLowerCase()).maybeSingle(), "account");
      if (!acct) throw new Error("No TRUEVIX account uses that email. Ask the person to register and confirm their email first.");
      const target = acct.user_id;
      if (target === c.user.id && i.status === "deactivated") throw new AccessError("You can’t remove your own administrator access.");
      const label = await name(c, target);
      if (i.status === "active") {
        const existing = await must(c.admin.from("user_roles").select("id").eq("user_id", target).eq("role", "platform_admin").is("revoked_at", null), "roles");
        if (!existing.length) await must(c.admin.from("user_roles").insert({ user_id: target, role: "platform_admin", granted_by: c.user.id, grant_reason: `Granted by ${c.actorLabel}` }), "role");
        await must(c.admin.from("admin_role_assignments").upsert({ user_id: target, admin_role_id: i.role, assigned_by: c.user.id, assigned_at: new Date().toISOString() }), "assignment");
        await audit(c, { action: existing.length ? "Changed administrator role" : "Granted platform administrator access", entity: "admin_account", targetId: target, target: label, after: i.role });
      } else {
        await must(c.admin.from("user_roles").update({ revoked_at: new Date().toISOString(), revoked_by: c.user.id }).eq("user_id", target).eq("role", "platform_admin").is("revoked_at", null), "role");
        await must(c.admin.from("admin_role_assignments").delete().eq("user_id", target), "assignment");
        await audit(c, { action: "Revoked platform administrator access", entity: "admin_account", targetId: target, target: label });
      }
    },
  }),
  "permission.set": h({
    module: "access",
    perm: "manage_permissions",
    schema: z.object({ role: z.enum(["platform_admin", "user_manager", "content_manager", "opportunity_manager", "institution_manager", "moderator", "analyst"]), module: z.enum(["overview", "users", "onboarding", "ideas", "content", "moderation", "research", "validation", "opportunities", "institutions", "talent", "studies", "collaboration", "communications", "cms", "analytics", "access", "audit", "settings"]), perm: z.enum(["view", "create", "edit", "approve", "publish", "suspend", "archive", "delete", "export", "manage_permissions"]), on: z.boolean() }),
    run: async (c, i) => {
      // super_admin is deliberately excluded from the schema: its access is fixed.
      if (i.on) await must(c.admin.from("admin_permissions").upsert({ admin_role_id: i.role, module: i.module, permission: i.perm }), "permission");
      else await must(c.admin.from("admin_permissions").delete().eq("admin_role_id", i.role).eq("module", i.module).eq("permission", i.perm), "permission");
      await audit(c, { action: i.on ? "Granted permission" : "Revoked permission", entity: "permissions", targetId: i.role, target: `${i.role} · ${i.module}`, after: `${i.perm}: ${i.on ? "allowed" : "denied"}` });
    },
  }),
  "audit.note": h({
    module: "overview",
    perm: "view",
    schema: z.object({ action: z.enum(["Switched admin role preview", "Exported records", "Opened confidential idea details"]), entity: str(60), target: str(300), targetId: str(120).optional(), after: str(300).optional(), reason: str(1000).optional(), sensitive: z.boolean().optional() }),
    run: async (c, i) => audit(c, { action: i.action, entity: i.entity, target: i.target, targetId: i.targetId, after: i.after, reason: i.reason, sensitive: i.sensitive }),
  }),

  /* ================= Settings ================= */
  "settings.update": h({
    module: "settings",
    perm: "edit",
    schema: z.object({ openRegistration: z.boolean(), requireIdeaReview: z.boolean(), researchEnabled: z.boolean(), communityPosting: z.boolean(), opportunityRegistration: z.boolean(), studiesRecruiting: z.boolean() }).partial(),
    run: async (c, i) => {
      const row: TablesUpdate<"platform_settings"> = defined({ open_registration: i.openRegistration, require_idea_review: i.requireIdeaReview, research_enabled: i.researchEnabled, community_posting: i.communityPosting, opportunity_registration: i.opportunityRegistration, studies_recruiting: i.studiesRecruiting });
      await must(c.admin.from("platform_settings").update({ ...row, updated_by: c.user.id }).eq("id", true), "settings");
      await audit(c, { action: "Changed platform settings", entity: "settings", target: Object.keys(row).join(", "), after: JSON.stringify(row) });
    },
  }),
  "config.update": h({
    module: "settings",
    perm: "edit",
    schema: z.object({ section: z.enum(["identity", "moderation", "notifications", "retention", "maintenance", "security", "taxonomy"]), patch: z.record(z.string().max(60), z.union([z.string().max(2000), z.number(), z.boolean(), z.array(z.string().max(80)).max(500)])) }),
    run: async (c, i) => {
      const s = await must(c.admin.from("platform_settings").select("config").eq("id", true).single(), "settings");
      const config = { ...((s.config ?? {}) as Record<string, Record<string, unknown>>) };
      config[i.section] = { ...(config[i.section] ?? {}), ...i.patch };
      await must(c.admin.from("platform_settings").update({ config: config as never, updated_by: c.user.id }).eq("id", true), "settings");
      await audit(c, { action: "Changed platform settings", entity: "settings", targetId: i.section, target: i.section, after: Object.keys(i.patch).join(", ") });
    },
  }),
  /** Removes every record marked is_demo (never real members' data). Super administrators only by default. */
  "demo.purge": h({
    module: "settings",
    perm: "delete",
    schema: z.object({ reason: z.string().trim().min(5).max(500), confirm: z.literal("DELETE DEMO DATA") }),
    run: async (c, i) => {
      await audit(c, { action: "Removed demonstration data", entity: "settings", target: "All records marked as demo", reason: i.reason, sensitive: true });
      await must(c.admin.rpc("purge_demo_data"), "purge");
    },
  }),
} satisfies Record<string, Handler<z.ZodTypeAny>>;

export type AdminOpName = keyof typeof ops;
export type AdminOpInput<K extends AdminOpName> = z.input<(typeof ops)[K]["schema"]>;

export async function adminOp<K extends AdminOpName>(op: K, input: AdminOpInput<K>): Promise<AdminOpResult> {
  const handler = ops[op] as Handler<z.ZodTypeAny> | undefined;
  if (!handler) return { ok: false, error: "Unknown operation." };
  const parsed = handler.schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Invalid input: ${parsed.error.issues[0]?.path.join(".") || "value"} — ${parsed.error.issues[0]?.message}` };
  try {
    const perm = typeof handler.perm === "function" ? handler.perm(parsed.data) : handler.perm;
    const ctx = await requireAdmin(handler.module, perm);
    const res = await handler.run(ctx, parsed.data);
    return res ?? { ok: true };
  } catch (e) {
    if (e instanceof AccessError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "The operation failed." };
  }
}

/** Audited reveal of confidential records, executed with the administrator's own session (database function). */
export async function adminReveal(kind: "venture" | "research" | "validation", id: string, reasonText: string): Promise<AdminOpResult> {
  const parsed = z.object({ id: uuid, reason: z.string().trim().min(5).max(1000) }).safeParse({ id, reason: reasonText });
  if (!parsed.success) return { ok: false, error: "Give a reason of at least 5 characters." };
  const adminModule = kind === "venture" ? "ideas" : kind;
  try {
    const c = await requireAdmin(adminModule, "view");
    const fn = kind === "venture" ? "admin_reveal_venture" : kind === "research" ? "admin_reveal_research" : "admin_reveal_validation";
    const args = kind === "venture" ? { p_venture: id, p_reason: reasonText } : kind === "research" ? { p_project: id, p_reason: reasonText } : { p_workspace: id, p_reason: reasonText };
    const { data, error } = await c.supabase.rpc(fn as "admin_reveal_venture", args as { p_venture: string; p_reason: string });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not permitted." };
  }
}
