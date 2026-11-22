"use client";

import type {
  Application,
  CurrentUser,
  EvidenceItem,
  Idea,
  IndustryId,
  Post,
  ResearchReport,
  RoleId,
  SectionStatus,
  ValidationSectionId,
  ValidationWorkspace,
} from "@/lib/types";
import { VALIDATION_SECTIONS } from "@/config/taxonomy";
import { features } from "@/config/brand";
import { uid } from "@/lib/utils";
import { getState, setState } from "./store";
import type { AppState, NotificationPrefs, PrivacyPrefs } from "./state";

const now = () => new Date().toISOString();
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const clip = (s: string, max: number) => s.trim().slice(0, max);

function withActivity(s: AppState, text: string, href?: string): AppState {
  return { ...s, activity: [{ id: uid("a"), text, href, createdAt: now() }, ...s.activity].slice(0, 60) };
}

/* ---------------- Account & browser-local auth ---------------- */

export function createAccount(input: { name: string; email: string }) {
  const user: CurrentUser = {
    id: "me",
    name: clip(input.name, 80),
    email: clip(input.email, 160).toLowerCase(),
    role: "student_explorer",
    headline: "",
    organisation: "",
    location: "",
    bio: "",
    interests: [],
    skills: [],
    industries: [],
    experience: "learning",
    collaboration: [],
    emailVerified: false,
    onboarded: false,
    joinedAt: now(),
  };
  setState((s) => withActivity({ ...s, user, signedIn: true }, "Created your account"));
}

/** Browser-local sign-in: matches the email of the account stored in this browser. No password is stored or checked. */
export function signIn(email: string): { ok: true } | { ok: false; reason: string } {
  const s = getState();
  if (!s.user || s.user.email !== email.trim().toLowerCase()) {
    return { ok: false, reason: "We couldn’t find an account with that email on this device. Accounts are saved per browser for now, so create one here to continue." };
  }
  setState((st) => ({ ...st, signedIn: true }));
  return { ok: true };
}

const PERSONA_NAMES: Record<RoleId, { name: string; headline: string; org: string; interests: IndustryId[] }> = {
  student_idea: { name: "Meera Krishnan", headline: "Electronics student working on a crop-storage sensor", org: "Northfield Institute of Technology", interests: ["agriculture", "ai", "logistics"] },
  student_explorer: { name: "Arjun Nair", headline: "First-year student exploring climate and health", org: "Northfield Institute of Technology", interests: ["sustainability", "healthcare", "energy"] },
  founder: { name: "Lena Brandt", headline: "Founder exploring energy software for small factories", org: "Independent", interests: ["energy", "manufacturing", "ai"] },
  professional: { name: "Nadia Rahman", headline: "Operations manager · food processing", org: "Independent", interests: ["manufacturing", "logistics"] },
  expert: { name: "Dr. Samuel Osei", headline: "Supply-chain analyst · cold-chain logistics", org: "Independent consultant", interests: ["logistics", "agriculture"] },
  mentor: { name: "Grace Liu", headline: "Product mentor · ten years in consumer apps", org: "Independent", interests: ["consumer", "education"] },
  participant: { name: "Ravi Shankar", headline: "Small-farm owner and research participant", org: "Farmer producer organisation (sample)", interests: ["agriculture", "water"] },
  institution_admin: { name: "Kofi Asante", headline: "Innovation cell coordinator", org: "Northfield Institute of Technology", interests: ["education", "ai"] },
  platform_admin: { name: "Platform Operator", headline: "Trust and safety, platform operations", org: "Platform team", interests: ["ai"] },
};

/** Developer tools only. A no-op in builds where developer tools are disabled. */
export function signInAsPersona(role: RoleId) {
  if (!features.devTools) return;
  const p = PERSONA_NAMES[role];
  const user: CurrentUser = {
    id: "me",
    name: p.name,
    email: `${role}@sample.local`,
    role,
    headline: p.headline,
    organisation: p.org,
    location: "",
    bio: "",
    interests: p.interests,
    skills: [],
    industries: p.interests,
    experience: role.startsWith("student") ? "learning" : "senior",
    collaboration: [],
    emailVerified: true,
    onboarded: true,
    joinedAt: now(),
  };
  setState((s) => withActivity({ ...s, user, signedIn: true }, `Signed in as sample persona: ${p.name}`));
}

export function signOut() {
  setState((s) => ({ ...s, signedIn: false }));
}

export function requestPasswordReset(email: string) {
  setState((s) => ({ ...s, pendingResetEmail: email.trim().toLowerCase() }));
}

export function completePasswordReset() {
  setState((s) => ({ ...s, pendingResetEmail: null }));
}

export function updateUser(patch: Partial<Omit<CurrentUser, "id">>) {
  setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
}

export function completeOnboarding(patch: Partial<Omit<CurrentUser, "id">>) {
  setState((s) =>
    s.user ? withActivity({ ...s, user: { ...s.user, ...patch, onboarded: true } }, "Completed onboarding", "/home") : s,
  );
}

/** Developer-tools role switcher. Changes the interface shown, not permissions. */
export function switchDemoRole(role: RoleId) {
  if (!features.devTools) return;
  setState((s) => (s.user ? { ...s, user: { ...s.user, role } } : s));
}

/* ---------------- Ideas ---------------- */

export type IdeaDraft = Pick<
  Idea,
  "title" | "problem" | "solution" | "targetUsers" | "industry" | "geography" | "stage" | "existingResearch" | "requiredSkills" | "collaborationNeeds" | "visibility"
>;

function summarise(d: IdeaDraft) {
  const p = d.problem.trim();
  return p.length > 180 ? `${p.slice(0, 177).trimEnd()}…` : p;
}

export function saveIdea(draft: IdeaDraft, opts: { id?: string; submit: boolean }): string {
  const id = opts.id ?? uid("idea");
  setState((s) => {
    const existing = s.ideas.find((i) => i.id === id);
    const idea: Idea = {
      ...draft,
      title: clip(draft.title, 140),
      problem: clip(draft.problem, 2000),
      solution: clip(draft.solution, 2000),
      summary: summarise(draft),
      id,
      ownerId: "me",
      team: existing?.team ?? [{ personId: "me", role: "Founder" }],
      updates: existing?.updates ?? [],
      researchStatus: existing?.researchStatus ?? "none",
      validationStatus: existing?.validationStatus ?? "not_started",
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
      status: opts.submit ? "submitted" : existing?.status === "submitted" ? "submitted" : "draft",
      // Newly submitted public ideas wait for platform review when the setting is on.
      review:
        opts.submit && existing?.status !== "submitted" && draft.visibility === "public_summary" && s.admin.settings.requireIdeaReview
          ? { status: "pending" as const }
          : existing?.review,
      publication: existing?.publication,
      featured: existing?.featured,
      history: existing?.history,
      demo: false,
      followers: existing?.followers ?? 0,
    };
    const ideas = existing ? s.ideas.map((i) => (i.id === id ? idea : i)) : [idea, ...s.ideas];
    const verb = opts.submit ? (existing?.status === "submitted" ? "Updated idea" : "Submitted idea") : "Saved draft";
    return withActivity({ ...s, ideas }, `${verb}: ${idea.title || "Untitled"}`, `/ideas/${id}`);
  });
  return id;
}

export function deleteIdea(id: string) {
  setState((s) => withActivity({ ...s, ideas: s.ideas.filter((i) => i.id !== id) }, "Deleted a draft"));
}

export function addIdeaUpdate(ideaId: string, title: string, body: string) {
  setState((s) => ({
    ...s,
    ideas: s.ideas.map((i) =>
      i.id === ideaId ? { ...i, updates: [{ id: uid("u"), date: now(), title: clip(title, 120), body: clip(body, 1200) }, ...i.updates], updatedAt: now() } : i,
    ),
  }));
}

export function toggleSaveIdea(id: string) {
  setState((s) => {
    const saving = !s.saved.ideas.includes(id);
    const next = { ...s, saved: { ...s.saved, ideas: toggle(s.saved.ideas, id) } };
    return saving ? withActivity(next, "Saved an idea", `/ideas/${id}`) : next;
  });
}

export function toggleFollowIdea(id: string) {
  setState((s) => {
    const following = !s.following.ideas.includes(id);
    const next = { ...s, following: { ...s.following, ideas: toggle(s.following.ideas, id) } };
    return following ? withActivity(next, "Followed a project", `/ideas/${id}`) : next;
  });
}

export function expressInterest(ideaId: string, ownerId: string, ideaTitle: string, note: string) {
  const threadId = uid("t");
  setState((s) =>
    withActivity(
      {
        ...s,
        threads: [{ id: threadId, participantId: ownerId, subject: `Collaboration interest: ${ideaTitle}`, kind: "collaboration_request", demo: false }, ...s.threads],
        platform: {
          ...s.platform,
          collaborations: [
            { id: uid("col"), kind: "request" as const, fromId: "me", toId: ownerId, ideaId, role: "Contributor", message: clip(note, 600), status: "pending" as const, createdAt: now(), demo: false },
            ...s.platform.collaborations,
          ],
        },
        messages: [...s.messages, { id: uid("m"), threadId, authorId: "me", body: clip(note, 1000), createdAt: now() }],
      },
      `Expressed collaboration interest in ${ideaTitle}`,
      `/ideas/${ideaId}`,
    ),
  );
  return threadId;
}

/* ---------------- Feed & community ---------------- */

export function toggleLike(id: string) {
  setState((s) => ({ ...s, liked: toggle(s.liked, id) }));
}
export function toggleSavePost(id: string) {
  setState((s) => ({ ...s, saved: { ...s.saved, posts: toggle(s.saved.posts, id) } }));
}
export function toggleFollowPerson(id: string) {
  setState((s) => ({ ...s, following: { ...s.following, people: toggle(s.following.people, id) } }));
}
export function toggleConnect(id: string) {
  setState((s) => {
    const adding = !s.connections.includes(id);
    const next = { ...s, connections: toggle(s.connections, id) };
    return adding ? withActivity(next, "Sent a connection request", `/people/${id}`) : next;
  });
}

export function addComment(targetId: string, body: string) {
  const text = clip(body, 1500);
  if (!text) return;
  setState((s) => withActivity({ ...s, comments: [...s.comments, { id: uid("c"), targetId, authorId: "me", body: text, createdAt: now(), demo: false }] }, "Commented on a discussion"));
}

export function deleteComment(id: string) {
  setState((s) => ({ ...s, comments: s.comments.filter((c) => !(c.id === id && c.authorId === "me")) }));
}

export function createPost(input: Pick<Post, "kind" | "title" | "body" | "industries">) {
  setState((s) =>
    withActivity(
      {
        ...s,
        posts: [{ ...input, title: clip(input.title, 160), body: clip(input.body, 3000), id: uid("post"), authorId: "me", createdAt: now(), likes: 0, demo: false }, ...s.posts],
      },
      `Posted: ${input.title}`,
      "/community",
    ),
  );
}

/* ---------------- Research ---------------- */

export function storeResearch(r: ResearchReport) {
  setState((s) => {
    const next = { ...s, research: [r, ...s.research.filter((x) => x.id !== r.id)] };
    const ideas = r.ideaId ? next.ideas.map((i) => (i.id === r.ideaId ? { ...i, researchStatus: "report_available" as const } : i)) : next.ideas;
    return withActivity({ ...next, ideas }, `Ran research: ${r.question}`, `/research/${r.id}`);
  });
}

export function toggleSaveResearch(id: string) {
  setState((s) => ({ ...s, research: s.research.map((r) => (r.id === id ? { ...r, saved: !r.saved } : r)) }));
}

export function deleteResearch(id: string) {
  setState((s) => ({ ...s, research: s.research.filter((r) => r.id !== id) }));
}

/* ---------------- Validation ---------------- */

function emptyWorkspace(ideaId: string): ValidationWorkspace {
  const sections = Object.fromEntries(VALIDATION_SECTIONS.map((v) => [v.id, { status: "not_started" as SectionStatus, notes: "" }])) as ValidationWorkspace["sections"];
  return { ideaId, sections, evidence: [], openQuestions: [], updatedAt: now() };
}

export function ensureValidation(ideaId: string) {
  setState((s) => (s.validations[ideaId] ? s : { ...s, validations: { ...s.validations, [ideaId]: emptyWorkspace(ideaId) } }));
}

function patchWs(ideaId: string, fn: (w: ValidationWorkspace) => ValidationWorkspace) {
  setState((s) => {
    const ws = s.validations[ideaId] ?? emptyWorkspace(ideaId);
    const next = { ...fn(ws), updatedAt: now() };
    const ideas = s.ideas.map((i) =>
      i.id === ideaId ? { ...i, validationStatus: next.evidence.some((e) => e.type === "customer_response" || e.type === "experiment_result") ? ("evidence_collected" as const) : ("in_progress" as const) } : i,
    );
    return { ...s, ideas, validations: { ...s.validations, [ideaId]: next } };
  });
}

export function setSectionStatus(ideaId: string, sectionId: ValidationSectionId, status: SectionStatus) {
  patchWs(ideaId, (w) => ({ ...w, sections: { ...w.sections, [sectionId]: { ...w.sections[sectionId], status } } }));
}

export function setSectionNotes(ideaId: string, sectionId: ValidationSectionId, notes: string) {
  patchWs(ideaId, (w) => ({ ...w, sections: { ...w.sections, [sectionId]: { ...w.sections[sectionId], notes: clip(notes, 4000) } } }));
}

export function addEvidence(ideaId: string, item: Omit<EvidenceItem, "id" | "createdAt">) {
  patchWs(ideaId, (w) => ({
    ...w,
    evidence: [...w.evidence, { ...item, text: clip(item.text, 2000), source: clip(item.source, 200), id: uid("ev"), createdAt: now() }],
    sections: w.sections[item.sectionId].status === "not_started" ? { ...w.sections, [item.sectionId]: { ...w.sections[item.sectionId], status: "in_progress" } } : w.sections,
  }));
}

export function removeEvidence(ideaId: string, id: string) {
  patchWs(ideaId, (w) => ({ ...w, evidence: w.evidence.filter((e) => e.id !== id) }));
}

export function addOpenQuestion(ideaId: string, text: string) {
  if (!text.trim()) return;
  patchWs(ideaId, (w) => ({ ...w, openQuestions: [...w.openQuestions, { id: uid("q"), text: clip(text, 300), resolved: false }] }));
}

export function toggleOpenQuestion(ideaId: string, id: string) {
  patchWs(ideaId, (w) => ({ ...w, openQuestions: w.openQuestions.map((q) => (q.id === id ? { ...q, resolved: !q.resolved } : q)) }));
}

/* ---------------- Opportunities ---------------- */

export function toggleSaveOpportunity(id: string) {
  setState((s) => ({ ...s, saved: { ...s.saved, opportunities: toggle(s.saved.opportunities, id) } }));
}

export function setApplication(opportunityId: string, status: Application["status"] | null) {
  setState((s) => {
    const rest = s.applications.filter((a) => a.opportunityId !== opportunityId);
    const applications = status ? [{ opportunityId, status, updatedAt: now() }, ...rest] : rest;
    return withActivity({ ...s, applications }, status ? `Application tracked: ${status}` : "Removed an application", `/opportunities/${opportunityId}`);
  });
}

/* ---------------- Notifications, messages, tasks ---------------- */

export function markNotificationRead(id: string) {
  setState((s) => (s.readNotifications.includes(id) ? s : { ...s, readNotifications: [...s.readNotifications, id] }));
}
export function markAllNotificationsRead(ids: string[]) {
  setState((s) => ({ ...s, readNotifications: Array.from(new Set([...s.readNotifications, ...ids])) }));
}

export function sendMessage(threadId: string, body: string) {
  const text = clip(body, 2000);
  if (!text) return;
  setState((s) => ({ ...s, messages: [...s.messages, { id: uid("m"), threadId, authorId: "me", body: text, createdAt: now() }] }));
}

export function startThread(participantId: string, subject: string, body: string) {
  const id = uid("t");
  setState((s) => ({
    ...s,
    threads: [{ id, participantId, subject: clip(subject, 120), kind: "direct", demo: false }, ...s.threads],
    messages: [...s.messages, { id: uid("m"), threadId: id, authorId: "me", body: clip(body, 2000), createdAt: now() }],
  }));
  return id;
}

export function addTask(text: string) {
  if (!text.trim()) return;
  setState((s) => ({ ...s, tasks: [{ id: uid("task"), text: clip(text, 200), done: false, createdAt: now() }, ...s.tasks] }));
}
export function toggleTask(id: string) {
  setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) }));
}
export function removeTask(id: string) {
  setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
}

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
}
export function updatePrivacy(patch: Partial<PrivacyPrefs>) {
  setState((s) => ({ ...s, privacy: { ...s.privacy, ...patch } }));
}
