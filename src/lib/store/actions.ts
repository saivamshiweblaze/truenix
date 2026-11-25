"use client";

import type { Application, CurrentUser, EvidenceItem, Idea, Post, ResearchReport, RoleId, SectionStatus, ValidationSectionId, ValidationWorkspace } from "@/lib/types";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { VALIDATION_SECTIONS } from "@/config/taxonomy";
import { features } from "@/config/brand";
import { signOutAction } from "@/features/auth/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { dbId, newId, sync, write } from "@/lib/data/remote";
import { getState, resetStore, setState } from "./store";
import type { AppState, NotificationPrefs, PrivacyPrefs } from "./state";

/**
 * Member actions. Each one updates the local read model immediately (so the interface responds at once) and
 * writes the change to Supabase under the member's own session. Row Level Security decides whether the write is
 * allowed; when it is refused the member is told and the read model is reloaded from the server.
 */

const now = () => new Date().toISOString();
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const clip = (s: string, max: number) => s.trim().slice(0, max);

function withActivity(s: AppState, text: string, href?: string): AppState {
  const id = newId();
  const t = clip(text, 300);
  sync("activity", (sb, uid) => sb.from("user_activity").insert({ id, user_id: uid, text: t, href: href ?? null }).then((r) => r), { refresh: false });
  return { ...s, activity: [{ id, text: t, href, createdAt: now() }, ...s.activity].slice(0, 60) };
}

/* ---------------- Session ---------------- */

/** Signs out on the server (clears the session cookies) and in this browser, then clears every cached record. */
export async function signOut() {
  try {
    await signOutAction();
  } catch {
    /* the browser-side sign-out below still ends the session */
  }
  if (isSupabaseConfigured()) await supabaseBrowser().auth.signOut();
  resetStore();
}

/** Developer-tools role preview. Changes the interface shown, never permissions (the database enforces those). */
export function switchDemoRole(role: RoleId) {
  if (!features.devTools) return;
  setState((s) => (s.user ? { ...s, user: { ...s.user, role } } : s));
}

/* ---------------- Profile & onboarding ---------------- */

type UserPatch = Partial<Omit<CurrentUser, "id">>;

function profileColumns(patch: UserPatch): TablesUpdate<"profiles"> {
  const out: TablesUpdate<"profiles"> = {};
  if (patch.name !== undefined) out.display_name = clip(patch.name, 120);
  if (patch.headline !== undefined) out.headline = clip(patch.headline, 160);
  if (patch.organisation !== undefined) out.organisation = clip(patch.organisation, 120);
  if (patch.location !== undefined) out.location = clip(patch.location, 100);
  if (patch.bio !== undefined) out.bio = clip(patch.bio, 1200);
  if (patch.interests !== undefined) out.interests = patch.interests;
  else if (patch.industries !== undefined) out.interests = patch.industries;
  if (patch.skills !== undefined) out.skills = patch.skills;
  if (patch.collaboration !== undefined) out.collaboration = patch.collaboration;
  if (patch.experience !== undefined) out.experience_level = patch.experience;
  if (patch.profileKind !== undefined) out.profile_kind = patch.profileKind;
  // Only self-service personas can be stored; privileged roles are granted on the server and never sent from here.
  if (patch.role !== undefined && patch.role !== "platform_admin" && patch.role !== "institution_admin") out.persona = patch.role;
  return out;
}

function accountColumns(patch: UserPatch): TablesUpdate<"account_private"> {
  const out: TablesUpdate<"account_private"> = {};
  if (patch.phone !== undefined) out.phone = patch.phone || null;
  if (patch.linkedin !== undefined) out.linkedin = patch.linkedin || null;
  return out;
}

export function updateUser(patch: UserPatch) {
  const { email: _email, ...rest } = patch; // email changes go through Supabase Auth (changeEmailAction)
  void _email;
  setState((s) => (s.user ? { ...s, user: { ...s.user, ...rest, role: s.user.role === "platform_admin" || s.user.role === "institution_admin" ? s.user.role : (rest.role ?? s.user.role) } } : s));
  const prof = profileColumns(rest);
  const acct = accountColumns(rest);
  sync("profile", async (sb, uid) => [
    ...(Object.keys(prof).length ? [await sb.from("profiles").update(prof).eq("id", uid)] : []),
    ...(Object.keys(acct).length ? [await sb.from("account_private").update(acct).eq("user_id", uid)] : []),
  ]);
}

export function completeOnboarding(patch: UserPatch) {
  const { email: _email, ...rest } = patch;
  void _email;
  setState((s) =>
    s.user ? withActivity({ ...s, user: { ...s.user, ...rest, role: s.user.role === "platform_admin" || s.user.role === "institution_admin" ? s.user.role : (rest.role ?? s.user.role), onboarded: true } }, "Completed onboarding", "/home") : s,
  );
  const answers = (rest.profile ?? {}) as Json;
  const prof = profileColumns(rest);
  const acct = accountColumns(rest);
  return write("onboarding", async (sb, uid) => {
    const results = [
      await sb.from("profiles").update(prof).eq("id", uid),
      await sb.from("account_private").update(acct).eq("user_id", uid),
      await sb.from("onboarding_progress").update({ profile_kind: rest.profileKind ?? null, completed: true, completed_at: now(), answers }).eq("user_id", uid),
    ];
    const p = (rest.profile ?? {}) as Record<string, unknown>;
    // Institution representatives ask for their organisation to be registered; the platform team decides.
    if (rest.profileKind === "institution" && typeof p.institutionName === "string" && p.institutionName.trim()) {
      const existing = await sb.from("institution_requests").select("id").eq("requested_by", uid).eq("status", "pending").limit(1);
      if (!existing.data?.length) {
        results.push(
          await sb.from("institution_requests").insert({
            request_type: "register_institution",
            requested_by: uid,
            proposed_name: clip(p.institutionName, 160),
            position_title: typeof p.position === "string" ? clip(p.position, 120) : null,
            note: "Submitted during onboarding.",
          }),
        );
      }
    }
    // Experts and mentors apply to the talent programme; credentials stay self-declared until reviewed.
    if (rest.profileKind === "expert_mentor") {
      const existing = await sb.from("talent_profiles").select("user_id").eq("user_id", uid).maybeSingle();
      if (!existing.data) {
        results.push(
          await sb.from("talent_profiles").insert({
            user_id: uid,
            kind: rest.role === "mentor" ? "mentor" : "expert",
            areas: Array.isArray(p.areas) ? (p.areas as string[]).slice(0, 20) : [],
            application_statement: clip(rest.bio ?? "", 2000),
          }),
        );
      }
    }
    return results;
  });
}

/* ---------------- Ideas (ventures) ---------------- */

export type IdeaDraft = Pick<
  Idea,
  "title" | "problem" | "solution" | "targetUsers" | "industry" | "geography" | "stage" | "existingResearch" | "requiredSkills" | "collaborationNeeds" | "visibility"
> & { institutionId?: string };

function summarise(d: IdeaDraft) {
  const p = d.problem.trim();
  return p.length > 180 ? `${p.slice(0, 177).trimEnd()}…` : p;
}

export function saveIdea(draft: IdeaDraft, opts: { id?: string; submit: boolean }): string {
  const id = opts.id ?? newId();
  let isNew = true;
  setState((s) => {
    const existing = s.ideas.find((i) => i.id === id);
    isNew = !existing;
    const submitted = opts.submit || existing?.status === "submitted";
    const needsReview = opts.submit && existing?.status !== "submitted" && draft.visibility === "public_summary" && s.admin.settings.requireIdeaReview;
    const idea: Idea = {
      ...draft,
      title: clip(draft.title, 140),
      problem: clip(draft.problem, 2000),
      solution: clip(draft.solution, 2000),
      summary: summarise(draft),
      id,
      ownerId: existing?.ownerId ?? "me",
      team: existing?.team ?? [{ personId: "me", role: "Founder", memberRole: "owner" }],
      updates: existing?.updates ?? [],
      researchStatus: existing?.researchStatus ?? "none",
      validationStatus: existing?.validationStatus ?? "not_started",
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
      status: submitted ? "submitted" : "draft",
      review: needsReview ? { status: "pending" } : existing?.review,
      publication: existing?.publication,
      featured: existing?.featured,
      history: existing?.history,
      demo: false,
      followers: existing?.followers ?? 0,
      access: "member",
    };
    const ideas = existing ? s.ideas.map((i) => (i.id === id ? idea : i)) : [idea, ...s.ideas];
    const verb = opts.submit ? (existing?.status === "submitted" ? "Updated idea" : "Submitted idea") : "Saved draft";
    return withActivity({ ...s, ideas }, `${verb}: ${idea.title || "Untitled"}`, `/ideas/${id}`);
  });
  const idea = getState().ideas.find((i) => i.id === id)!;
  const row = {
    title: idea.title,
    summary: idea.summary,
    problem: idea.problem,
    solution: idea.solution,
    industry: idea.industry,
    target_users: clip(idea.targetUsers, 300),
    geography: clip(idea.geography, 120),
    stage: idea.stage,
    existing_research: clip(idea.existingResearch, 2000),
    required_skills: idea.requiredSkills.slice(0, 30),
    collaboration_needs: clip(idea.collaborationNeeds, 1000),
    visibility: idea.visibility,
    institution_id: idea.visibility === "institution" ? (draft.institutionId ?? idea.institutionId ?? null) : (draft.institutionId ?? null),
    status: idea.status,
  };
  sync(opts.submit ? "idea submission" : "idea draft", async (sb, uid) =>
    isNew ? sb.from("ventures").insert({ id, owner_id: uid, ...row }) : sb.from("ventures").update(row).eq("id", id),
  );
  return id;
}

export function deleteIdea(id: string) {
  setState((s) => withActivity({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }, "Deleted an idea"));
  sync("delete idea", (sb) => sb.from("ventures").delete().eq("id", id).then((r) => r));
}

export function addIdeaUpdate(ideaId: string, title: string, body: string) {
  const id = newId();
  const idea = getState().ideas.find((i) => i.id === ideaId);
  const isPublic = idea?.visibility === "public_summary";
  setState((s) => ({
    ...s,
    ideas: s.ideas.map((i) => (i.id === ideaId ? { ...i, updates: [{ id, date: now(), title: clip(title, 120), body: clip(body, 1200), isPublic }, ...i.updates], updatedAt: now() } : i)),
  }));
  sync("project update", (sb, uid) => sb.from("venture_updates").insert({ id, venture_id: ideaId, author_id: uid, title: clip(title, 120), body: clip(body, 1200), is_public: isPublic }).then((r) => r));
}

export function toggleSaveIdea(id: string) {
  const saving = !getState().saved.ideas.includes(id);
  setState((s) => {
    const next = { ...s, saved: { ...s.saved, ideas: toggle(s.saved.ideas, id) } };
    return saving ? withActivity(next, "Saved an idea", `/ideas/${id}`) : next;
  });
  sync("saved idea", (sb, uid) => (saving ? sb.from("saved_items").insert({ user_id: uid, venture_id: id }) : sb.from("saved_items").delete().eq("user_id", uid).eq("venture_id", id)).then((r) => r), { refresh: false });
}

export function toggleFollowIdea(id: string) {
  const following = !getState().following.ideas.includes(id);
  setState((s) => {
    const next = { ...s, following: { ...s.following, ideas: toggle(s.following.ideas, id) } };
    return following ? withActivity(next, "Followed a project", `/ideas/${id}`) : next;
  });
  sync("follow project", (sb, uid) => (following ? sb.from("follows").insert({ follower_id: uid, followed_venture_id: id }) : sb.from("follows").delete().eq("follower_id", uid).eq("followed_venture_id", id)).then((r) => r), { refresh: false });
}

/** Sends a collaboration request to the idea's owner and opens a conversation with them. */
export function expressInterest(ideaId: string, ownerId: string, ideaTitle: string, note: string) {
  const threadId = newId();
  const collabId = newId();
  const message = clip(note, 1000);
  setState((s) =>
    withActivity(
      {
        ...s,
        threads: [{ id: threadId, participantId: ownerId, subject: `Collaboration interest: ${ideaTitle}`, kind: "collaboration_request", demo: false }, ...s.threads],
        platform: { ...s.platform, collaborations: [{ id: collabId, kind: "request" as const, fromId: "me", toId: ownerId, ideaId, role: "Contributor", message: clip(note, 600), status: "pending" as const, createdAt: now(), demo: false }, ...s.platform.collaborations] },
        messages: [...s.messages, { id: newId(), threadId, authorId: "me", body: message, createdAt: now() }],
      },
      `Expressed collaboration interest in ${ideaTitle}`,
      `/ideas/${ideaId}`,
    ),
  );
  sync("collaboration request", async (sb, uid) => [
    await sb.from("collaboration_requests").insert({ id: collabId, from_id: uid, to_id: dbId(ownerId), venture_id: ideaId, role: "Contributor", message: clip(note, 1000) }),
    await sb.rpc("start_thread", { p_recipient: dbId(ownerId)!, p_subject: clip(`Collaboration interest: ${ideaTitle}`, 160), p_body: message, p_kind: "collaboration_request", p_venture: ideaId, p_thread_id: threadId }),
  ]);
  return threadId;
}

/** Responds to a collaboration request (recipient or venture owner). Accepting adds the requester to the team. */
export function respondToCollaboration(id: string, status: "accepted" | "declined" | "closed") {
  setState((s) => ({ ...s, platform: { ...s.platform, collaborations: s.platform.collaborations.map((c) => (c.id === id ? { ...c, status } : c)) } }));
  sync("collaboration response", (sb) => sb.from("collaboration_requests").update({ status }).eq("id", id).then((r) => r));
}

/* ---------------- Controlled disclosure ---------------- */

export function shareIdea(ideaId: string, personId: string, accessLevel: "viewer" | "collaborator" | "reviewer", scope: "summary" | "full" | "documents", note = "") {
  return write("share idea", (sb, uid) =>
    sb.from("venture_disclosures").insert({ venture_id: ideaId, grantee_user_id: dbId(personId), access_level: accessLevel, scope, note: clip(note, 500) || null, granted_by: uid }).then((r) => r),
  );
}

export function shareIdeaWithInstitution(ideaId: string, institutionId: string, scope: "summary" | "full") {
  return write("share with institution", (sb, uid) =>
    sb.from("venture_disclosures").insert({ venture_id: ideaId, grantee_institution_id: institutionId, access_level: "viewer", scope, granted_by: uid }).then((r) => r),
  );
}

export function revokeDisclosure(disclosureId: string) {
  return write("revoke access", (sb, uid) => sb.from("venture_disclosures").update({ revoked_at: now(), revoked_by: uid }).eq("id", disclosureId).then((r) => r));
}

export function addTeamMember(ideaId: string, personId: string, memberRole: "editor" | "collaborator", title: string) {
  return write("add team member", (sb, uid) =>
    sb.from("venture_members").insert({ venture_id: ideaId, user_id: dbId(personId)!, member_role: memberRole, title: clip(title, 80), added_by: uid }).then((r) => r),
  );
}

export function removeTeamMember(ideaId: string, personId: string) {
  return write("remove team member", (sb) => sb.from("venture_members").delete().eq("venture_id", ideaId).eq("user_id", dbId(personId)!).then((r) => r));
}

/* ---------------- Expert reviews ---------------- */

export function requestExpertReview(ideaId: string, reviewerId: string, note: string) {
  return write("review request", (sb, uid) =>
    sb.from("expert_reviews").insert({ venture_id: ideaId, reviewer_id: dbId(reviewerId)!, requested_by: uid, request_note: clip(note, 1000) }).then((r) => r),
  );
}

export function respondToReview(reviewId: string, status: "accepted" | "declined" | "completed" | "cancelled", feedback?: { feedback: string; recommendation?: "proceed" | "revise" | "reconsider" }) {
  setState((s) => ({ ...s, platform: { ...s.platform, expertReviews: (s.platform.expertReviews ?? []).map((r) => (r.id === reviewId ? { ...r, status, ...(feedback ?? {}) } : r)) } }));
  return write("review", (sb) =>
    sb
      .from("expert_reviews")
      .update({ status, ...(feedback ? { feedback: clip(feedback.feedback, 4000), recommendation: feedback.recommendation ?? null } : {}) })
      .eq("id", reviewId)
      .then((r) => r),
  );
}

/* ---------------- Feed & community ---------------- */

export function toggleLike(id: string) {
  const liking = !getState().liked.includes(id);
  setState((s) => ({ ...s, liked: toggle(s.liked, id) }));
  sync("reaction", (sb, uid) => (liking ? sb.from("reactions").insert({ user_id: uid, post_id: id }) : sb.from("reactions").delete().eq("user_id", uid).eq("post_id", id)).then((r) => r), { refresh: false });
}

export function toggleSavePost(id: string) {
  const saving = !getState().saved.posts.includes(id);
  setState((s) => ({ ...s, saved: { ...s.saved, posts: toggle(s.saved.posts, id) } }));
  sync("saved post", (sb, uid) => (saving ? sb.from("saved_items").insert({ user_id: uid, post_id: id }) : sb.from("saved_items").delete().eq("user_id", uid).eq("post_id", id)).then((r) => r), { refresh: false });
}

export function toggleFollowPerson(id: string) {
  const following = !getState().following.people.includes(id);
  setState((s) => ({ ...s, following: { ...s.following, people: toggle(s.following.people, id) } }));
  sync("follow", (sb, uid) => (following ? sb.from("follows").insert({ follower_id: uid, followed_user_id: dbId(id) }) : sb.from("follows").delete().eq("follower_id", uid).eq("followed_user_id", dbId(id)!)).then((r) => r), { refresh: false });
}

/** Sends a connection request, or withdraws/removes an existing connection. */
export function toggleConnect(id: string) {
  const adding = !getState().connections.includes(id);
  setState((s) => {
    const next = { ...s, connections: toggle(s.connections, id), connectionStates: { ...s.connectionStates, ...(adding ? { [id]: { status: "pending" as const, incoming: false } } : {}) } };
    if (!adding) delete next.connectionStates[id];
    return adding ? withActivity(next, "Sent a connection request", `/people/${id}`) : next;
  });
  const other = dbId(id)!;
  sync("connection", (sb, uid) =>
    (adding ? sb.from("connections").insert({ requester_id: uid, addressee_id: other }) : sb.from("connections").delete().or(`and(requester_id.eq.${uid},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${uid})`)).then((r) => r),
  );
}

export function respondToConnection(personId: string, status: "accepted" | "declined") {
  setState((s) => ({ ...s, connectionStates: { ...s.connectionStates, [personId]: { status, incoming: true } } }));
  sync("connection response", (sb, uid) => sb.from("connections").update({ status, responded_at: now() }).eq("requester_id", dbId(personId)!).eq("addressee_id", uid).then((r) => r));
}

export function addComment(targetId: string, body: string) {
  const text = clip(body, 1500);
  if (!text) return;
  const s0 = getState();
  const isIdea = [...s0.ideas, ...s0.platform.ideas].some((i) => i.id === targetId);
  const id = newId();
  setState((s) => withActivity({ ...s, comments: [...s.comments, { id, targetId, targetType: isIdea ? "idea" : "post", authorId: "me", body: text, createdAt: now(), demo: false }] }, "Commented on a discussion"));
  sync("comment", (sb, uid) => sb.from("comments").insert({ id, author_id: uid, body: text, ...(isIdea ? { venture_id: targetId } : { post_id: targetId }) }).then((r) => r));
}

export function deleteComment(id: string) {
  setState((s) => ({ ...s, comments: s.comments.filter((c) => !(c.id === id && c.authorId === "me")) }));
  sync("delete comment", (sb, uid) => sb.from("comments").delete().eq("id", id).eq("author_id", uid).then((r) => r));
}

export function createPost(input: Pick<Post, "kind" | "title" | "body" | "industries"> & { ideaId?: string }) {
  const id = newId();
  const title = clip(input.title, 160);
  const body = clip(input.body, 3000);
  setState((s) =>
    withActivity({ ...s, posts: [{ ...input, title, body, id, authorId: "me", createdAt: now(), likes: 0, demo: false }, ...s.posts] }, `Posted: ${input.title}`, "/community"),
  );
  sync("post", (sb, uid) => sb.from("posts").insert({ id, author_id: uid, kind: input.kind, title, body, industries: input.industries, venture_id: input.ideaId ?? null }).then((r) => r));
  return id;
}

export function reportContent(input: { targetType: "post" | "comment" | "venture" | "user" | "collaboration" | "message"; targetId: string; targetLabel: string; reportedUserId?: string; reason: "spam" | "harassment" | "misinformation" | "inappropriate" | "ip_concern" | "impersonation" | "other"; details: string }) {
  return write("report", (sb, uid) =>
    sb
      .from("moderation_reports")
      .insert({ target_type: input.targetType, target_id: dbId(input.targetId)!, target_label: clip(input.targetLabel, 200), reported_user_id: dbId(input.reportedUserId), reporter_id: uid, reason: input.reason, details: clip(input.details, 2000) })
      .then((r) => r),
  );
}

/* ---------------- Research ---------------- */

/** Stores a completed research run. Template ("framework") runs are labelled as such; live runs are written by the server. */
export function storeResearch(r: ResearchReport) {
  setState((s) => {
    const next = { ...s, research: [r, ...s.research.filter((x) => x.id !== r.id)] };
    const ideas = r.ideaId ? next.ideas.map((i) => (i.id === r.ideaId ? { ...i, researchStatus: "report_available" as const } : i)) : next.ideas;
    return withActivity({ ...next, ideas }, `Ran research: ${r.question}`, `/research/${r.id}`);
  });
  if (r.provenance === "live") return; // persisted by the server route that ran the provider
  const runId = newId();
  const isMine = !!r.ideaId && getState().ideas.some((i) => i.id === r.ideaId && i.access === "member");
  sync("research report", async (sb, uid) => {
    const out = [
      await sb.from("research_projects").insert({ id: r.id, owner_id: uid, venture_id: isMine ? r.ideaId : null, question: clip(r.question, 500), categories: r.categories, depth: r.depth, saved: r.saved }),
    ];
    if (out[0].error) return out;
    out.push(await sb.from("research_runs").insert({ id: runId, project_id: r.id, status: "completed", provenance: "framework", completed_at: now() }));
    if (out[1].error) return out;
    if (r.sections.length) out.push(await sb.from("research_findings").insert(r.sections.map((sec, i) => ({ run_id: runId, section_key: sec.id.slice(0, 60), heading: sec.heading.slice(0, 200), body: sec.body.slice(0, 8000), bullets: sec.bullets ?? [], position: i }))));
    if (r.sources.length) out.push(await sb.from("research_sources").insert(r.sources.map((src, i) => ({ run_id: runId, title: src.title.slice(0, 300), kind: src.kind.slice(0, 80), note: src.note.slice(0, 1000), url: src.url && /^https?:\/\//.test(src.url) ? src.url : null, position: i }))));
    if (isMine) out.push(await sb.from("ventures").update({ research_status: "report_available" }).eq("id", r.ideaId!));
    return out;
  });
}

export function toggleSaveResearch(id: string) {
  const r = getState().research.find((x) => x.id === id);
  setState((s) => ({ ...s, research: s.research.map((x) => (x.id === id ? { ...x, saved: !x.saved } : x)) }));
  if (r) sync("saved research", (sb) => sb.from("research_projects").update({ saved: !r.saved }).eq("id", id).then((res) => res), { refresh: false });
}

export function deleteResearch(id: string) {
  setState((s) => ({ ...s, research: s.research.filter((r) => r.id !== id) }));
  sync("delete research", (sb) => sb.from("research_projects").delete().eq("id", id).then((r) => r));
}

/* ---------------- Validation ---------------- */

function emptyWorkspace(ideaId: string, workspaceId = newId()): ValidationWorkspace {
  const sections = Object.fromEntries(VALIDATION_SECTIONS.map((v) => [v.id, { status: "not_started" as SectionStatus, notes: "" }])) as ValidationWorkspace["sections"];
  return { ideaId, workspaceId, sections, evidence: [], openQuestions: [], updatedAt: now() };
}

let pendingWorkspace: Partial<Record<string, Promise<boolean>>> = {};

/** Creates the validation workspace for an idea once (members only; RLS enforces it). */
export function ensureValidation(ideaId: string) {
  const s = getState();
  if (s.validations[ideaId] || s.platform.validations[ideaId]) return;
  if (!s.ideas.some((i) => i.id === ideaId && i.access === "member")) return;
  const ws = emptyWorkspace(ideaId);
  setState((st) => (st.validations[ideaId] ? st : { ...st, validations: { ...st.validations, [ideaId]: ws } }));
  pendingWorkspace[ideaId] = write("validation workspace", (sb, uid) => sb.from("validation_workspaces").insert({ id: ws.workspaceId!, venture_id: ideaId, created_by: uid }).then((r) => r), { refresh: false });
}

async function workspaceId(ideaId: string): Promise<string | null> {
  if (pendingWorkspace[ideaId]) {
    await pendingWorkspace[ideaId];
    pendingWorkspace = Object.fromEntries(Object.entries(pendingWorkspace).filter(([k]) => k !== ideaId));
  }
  const s = getState();
  return (s.validations[ideaId] ?? s.platform.validations[ideaId])?.workspaceId ?? null;
}

function patchWs(ideaId: string, fn: (w: ValidationWorkspace) => ValidationWorkspace) {
  let status: Idea["validationStatus"] = "in_progress";
  setState((s) => {
    const ws = s.validations[ideaId] ?? emptyWorkspace(ideaId);
    const next = { ...fn(ws), updatedAt: now() };
    status = next.evidence.some((e) => e.type === "customer_response" || e.type === "experiment_result") ? "evidence_collected" : "in_progress";
    const ideas = s.ideas.map((i) => (i.id === ideaId ? { ...i, validationStatus: status } : i));
    return { ...s, ideas, validations: { ...s.validations, [ideaId]: next } };
  });
  const idea = getState().ideas.find((i) => i.id === ideaId);
  if (idea && idea.access === "member" && (idea.team.find((t) => t.personId === "me")?.memberRole ?? "owner") !== "collaborator") {
    sync("validation status", (sb) => sb.from("ventures").update({ validation_status: status }).eq("id", ideaId).then((r) => r), { refresh: false });
  }
}

function upsertSection(ideaId: string, sectionId: ValidationSectionId) {
  sync("validation section", async (sb) => {
    const ws = await workspaceId(ideaId);
    const sec = getState().validations[ideaId]?.sections[sectionId];
    if (!ws || !sec) return;
    return sb.from("validation_sections").upsert({ workspace_id: ws, section_id: sectionId, status: sec.status, notes: sec.notes }, { onConflict: "workspace_id,section_id" }).then((r) => r);
  }, { refresh: false });
}

export function setSectionStatus(ideaId: string, sectionId: ValidationSectionId, status: SectionStatus) {
  patchWs(ideaId, (w) => ({ ...w, sections: { ...w.sections, [sectionId]: { ...w.sections[sectionId], status } } }));
  upsertSection(ideaId, sectionId);
}

const noteTimers: Record<string, number> = {};
export function setSectionNotes(ideaId: string, sectionId: ValidationSectionId, notes: string) {
  patchWs(ideaId, (w) => ({ ...w, sections: { ...w.sections, [sectionId]: { ...w.sections[sectionId], notes: clip(notes, 4000) } } }));
  // Notes are typed continuously; save once typing pauses.
  const key = `${ideaId}:${sectionId}`;
  window.clearTimeout(noteTimers[key]);
  noteTimers[key] = window.setTimeout(() => upsertSection(ideaId, sectionId), 700);
}

export function addEvidence(ideaId: string, item: Omit<EvidenceItem, "id" | "createdAt">) {
  const id = newId();
  const wasNotStarted = getState().validations[ideaId]?.sections[item.sectionId]?.status === "not_started";
  patchWs(ideaId, (w) => ({
    ...w,
    evidence: [...w.evidence, { ...item, text: clip(item.text, 2000), source: clip(item.source, 200), id, createdAt: now() }],
    sections: w.sections[item.sectionId].status === "not_started" ? { ...w.sections, [item.sectionId]: { ...w.sections[item.sectionId], status: "in_progress" } } : w.sections,
  }));
  sync("evidence", async (sb, uid) => {
    const ws = await workspaceId(ideaId);
    if (!ws) return { error: { message: "Validation workspace not found." } };
    return sb
      .from("evidence")
      .insert({ id, workspace_id: ws, section_id: item.sectionId, evidence_type: item.type, body: clip(item.text, 2000), source: clip(item.source, 200), framework_generated: item.demoGenerated && item.type === "ai_analysis", created_by: uid })
      .then((r) => r);
  });
  if (wasNotStarted) upsertSection(ideaId, item.sectionId);
}

export function removeEvidence(ideaId: string, id: string) {
  patchWs(ideaId, (w) => ({ ...w, evidence: w.evidence.filter((e) => e.id !== id) }));
  sync("remove evidence", (sb) => sb.from("evidence").delete().eq("id", id).then((r) => r));
}

export function addOpenQuestion(ideaId: string, text: string) {
  if (!text.trim()) return;
  const id = newId();
  patchWs(ideaId, (w) => ({ ...w, openQuestions: [...w.openQuestions, { id, text: clip(text, 300), resolved: false }] }));
  sync("open question", async (sb, uid) => {
    const ws = await workspaceId(ideaId);
    if (!ws) return { error: { message: "Validation workspace not found." } };
    return sb.from("assumptions").insert({ id, workspace_id: ws, statement: clip(text, 300), created_by: uid }).then((r) => r);
  }, { refresh: false });
}

export function toggleOpenQuestion(ideaId: string, id: string) {
  const q = getState().validations[ideaId]?.openQuestions.find((x) => x.id === id);
  patchWs(ideaId, (w) => ({ ...w, openQuestions: w.openQuestions.map((x) => (x.id === id ? { ...x, resolved: !x.resolved } : x)) }));
  if (q) sync("open question", (sb) => sb.from("assumptions").update({ status: q.resolved ? "open" : "resolved" }).eq("id", id).then((r) => r), { refresh: false });
}

/* ---------------- Opportunities ---------------- */

export function toggleSaveOpportunity(id: string) {
  const saving = !getState().saved.opportunities.includes(id);
  setState((s) => ({ ...s, saved: { ...s.saved, opportunities: toggle(s.saved.opportunities, id) } }));
  sync("saved opportunity", (sb, uid) => (saving ? sb.from("saved_items").insert({ user_id: uid, opportunity_id: id }) : sb.from("saved_items").delete().eq("user_id", uid).eq("opportunity_id", id)).then((r) => r), { refresh: false });
}

export function setApplication(opportunityId: string, status: Application["status"] | null) {
  setState((s) => {
    const rest = s.applications.filter((a) => a.opportunityId !== opportunityId);
    const applications = status ? [{ opportunityId, status, updatedAt: now() }, ...rest] : rest;
    return withActivity({ ...s, applications }, status ? `Application tracked: ${status}` : "Removed an application", `/opportunities/${opportunityId}`);
  });
  sync("application tracker", (sb, uid) =>
    (status ? sb.from("applications").upsert({ user_id: uid, opportunity_id: opportunityId, status }, { onConflict: "user_id,opportunity_id" }) : sb.from("applications").delete().eq("user_id", uid).eq("opportunity_id", opportunityId)).then((r) => r),
    { refresh: false },
  );
}

/* ---------------- Notifications, messages, tasks ---------------- */

const isStored = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

export function markNotificationRead(id: string) {
  if (getState().readNotifications.includes(id)) return;
  setState((s) => ({ ...s, readNotifications: [...s.readNotifications, id] }));
  if (isStored(id)) sync("notification", (sb) => sb.from("notifications").update({ read_at: now() }).eq("id", id).then((r) => r), { refresh: false });
}

export function markAllNotificationsRead(ids: string[]) {
  setState((s) => ({ ...s, readNotifications: Array.from(new Set([...s.readNotifications, ...ids])) }));
  const stored = ids.filter(isStored);
  if (stored.length) sync("notifications", (sb) => sb.from("notifications").update({ read_at: now() }).in("id", stored).is("read_at", null).then((r) => r), { refresh: false });
}

export function sendMessage(threadId: string, body: string) {
  const text = clip(body, 2000);
  if (!text) return;
  const id = newId();
  setState((s) => ({ ...s, messages: [...s.messages, { id, threadId, authorId: "me", body: text, createdAt: now() }] }));
  sync("message", (sb, uid) => sb.from("messages").insert({ id, thread_id: threadId, author_id: uid, body: text }).then((r) => r), { refresh: false });
}

export function startThread(participantId: string, subject: string, body: string) {
  const id = newId();
  setState((s) => ({
    ...s,
    threads: [{ id, participantId, subject: clip(subject, 120), kind: "direct", demo: false }, ...s.threads],
    messages: [...s.messages, { id: newId(), threadId: id, authorId: "me", body: clip(body, 2000), createdAt: now() }],
  }));
  sync("conversation", (sb) => sb.rpc("start_thread", { p_recipient: dbId(participantId)!, p_subject: clip(subject, 160), p_body: clip(body, 2000), p_thread_id: id }).then((r) => r));
  return id;
}

export function addTask(text: string) {
  if (!text.trim()) return;
  const id = newId();
  const t = clip(text, 200);
  setState((s) => ({ ...s, tasks: [{ id, text: t, done: false, createdAt: now() }, ...s.tasks] }));
  sync("task", (sb, uid) => sb.from("user_tasks").insert({ id, user_id: uid, text: t }).then((r) => r), { refresh: false });
}
export function toggleTask(id: string) {
  const t = getState().tasks.find((x) => x.id === id);
  setState((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  if (t) sync("task", (sb) => sb.from("user_tasks").update({ done: !t.done }).eq("id", id).then((r) => r), { refresh: false });
}
export function removeTask(id: string) {
  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  sync("task", (sb) => sb.from("user_tasks").delete().eq("id", id).then((r) => r), { refresh: false });
}

/** Local, per-session choices such as hiding a study you are not interested in. */
export function setDecision(id: string, decision: "accepted" | "declined" | "completed" | null, label: string) {
  setState((s) => {
    const decisions = { ...s.decisions };
    if (decision) decisions[id] = decision;
    else delete decisions[id];
    return decision ? withActivity({ ...s, decisions }, `${decision[0].toUpperCase()}${decision.slice(1)}: ${label}`) : { ...s, decisions };
  });
}

/* ---------------- Settings ---------------- */

export function updateNotificationPrefs(patch: Partial<NotificationPrefs>) {
  setState((s) => ({ ...s, notificationPrefs: { ...s.notificationPrefs, ...patch } }));
  const p = getState().notificationPrefs;
  sync("notification settings", (sb, uid) =>
    sb
      .from("user_preferences")
      .update({ notify_comments: p.comments, notify_follows: p.follows, notify_collaboration: p.collaboration, notify_opportunities: p.opportunities, notify_research: p.research, weekly_digest: p.weeklyDigest })
      .eq("user_id", uid)
      .then((r) => r),
    { refresh: false },
  );
}

export function updatePrivacy(patch: Partial<PrivacyPrefs>) {
  setState((s) => ({ ...s, privacy: { ...s.privacy, ...patch } }));
  const p = getState().privacy;
  sync("privacy settings", async (sb, uid) => [
    await sb.from("profiles").update({ visibility: p.profileVisibility, show_organisation: p.showOrganisation }).eq("id", uid),
    await sb.from("user_preferences").update({ allow_messages: p.allowMessages, show_activity: p.showActivity }).eq("user_id", uid),
  ], { refresh: false });
}
