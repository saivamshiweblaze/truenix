import type { Announcement, Comment, ContentModeration, Idea, MemberAccount, Notification, Opportunity, Person, Post, Thread } from "@/lib/types";
import { SEED_MESSAGES, SEED_NOTIFICATIONS, SEED_THREADS } from "@/lib/demo-data/feed";
import type { AppState } from "./state";

/**
 * Read model shared by the public product and the admin portal.
 * Public selectors apply publication, moderation and account-status rules;
 * admin views read `s.platform` (plus the signed-in member's own records) unfiltered.
 */

/** The current user rendered as a Person so shared components can display them. */
export function meAsPerson(s: AppState): Person | null {
  if (!s.user) return null;
  const u = s.user;
  return {
    id: "me",
    name: u.name,
    headline: u.headline || "Member",
    organisation: u.organisation,
    location: u.location,
    role: u.role,
    skills: u.skills,
    interests: u.interests,
    experience: [],
    collaboration: u.collaboration,
    bio: u.bio,
    demo: false,
  };
}

export function personById(s: AppState, id: string): Person | undefined {
  if (id === "me") return meAsPerson(s) ?? undefined;
  return s.platform.people.find((p) => p.id === id);
}

export function accountFor(s: AppState, personId: string): MemberAccount | undefined {
  return s.platform.accounts.find((a) => a.personId === personId);
}

/** Members whose accounts are suspended or deactivated are hidden from other members. */
export function isPersonListed(s: AppState, personId: string) {
  const a = accountFor(s, personId);
  if (!a) return true;
  return a.status !== "suspended" && a.status !== "deactivated" && a.onboarding.completed;
}

const hiddenContent = (m: ContentModeration | undefined) => m?.status === "removed" || m?.status === "hidden";

/** Whether an idea may be shown to members other than its owner. */
export function isIdeaListed(i: Idea) {
  if (i.publication === "unpublished" || i.publication === "archived") return false;
  if (i.review && i.review.status !== "approved") return false;
  return true;
}

/** Ideas visible to the current user: their own (including drafts) plus listed ideas from others. */
export function visibleIdeas(s: AppState): Idea[] {
  return [...s.ideas, ...s.platform.ideas.filter((i) => isIdeaListed(i))];
}

export function publicIdeas(s: AppState): Idea[] {
  return visibleIdeas(s).filter((i) => i.status === "submitted" && (i.ownerId === "me" || i.visibility === "public_summary"));
}

export function ideaById(s: AppState, id: string): Idea | undefined {
  return visibleIdeas(s).find((i) => i.id === id);
}

export function myIdeas(s: AppState) {
  return s.ideas;
}

/** Every idea on the platform, for administration. */
export function allIdeasAdmin(s: AppState): Idea[] {
  return [...s.ideas, ...s.platform.ideas];
}

export function feedPosts(s: AppState): Post[] {
  return [...s.posts, ...s.platform.posts]
    .filter((p) => p.authorId === "me" || (!hiddenContent(p.moderation) && p.moderation?.status !== "pending_review"))
    .sort((a, b) => Number(!!b.moderation?.pinned) - Number(!!a.moderation?.pinned) || b.createdAt.localeCompare(a.createdAt));
}

export function allPostsAdmin(s: AppState): Post[] {
  return [...s.posts, ...s.platform.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function allCommentsAdmin(s: AppState): Comment[] {
  return [...s.platform.comments, ...s.comments];
}

export function commentsFor(s: AppState, targetId: string): Comment[] {
  return allCommentsAdmin(s)
    .filter((c) => c.targetId === targetId && !hiddenContent(c.moderation))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function commentCount(s: AppState, targetId: string) {
  return commentsFor(s, targetId).length;
}

export function isOpportunityPublic(o: Opportunity) {
  return (o.publication ?? "published") === "published";
}

/** Published opportunities, featured first. */
export function opportunities(s: AppState) {
  return s.platform.opportunities.filter(isOpportunityPublic).sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
}

export function opportunityById(s: AppState, id: string) {
  return s.platform.opportunities.find((o) => o.id === id);
}

export function institutionById(s: AppState, id: string | undefined) {
  return id ? s.platform.institutions.find((i) => i.id === id) : undefined;
}

/** Published CMS fields for a public page, or the given fallback when unpublished. */
export function cmsFields(s: AppState, id: string): Record<string, string> | null {
  const e = s.platform.cms.find((c) => c.id === id);
  return e && e.status === "published" && e.published ? e.published : null;
}

export function publishedCms(s: AppState, kind: string) {
  return s.platform.cms.filter((c) => c.kind === kind && c.status === "published" && c.published).sort((a, b) => a.order - b.order);
}

/** Published, or scheduled with its time reached (no background job runs in Phase 1). */
export function isAnnouncementLive(a: Announcement) {
  return a.status === "published" || (a.status === "scheduled" && !!a.scheduledFor && new Date(a.scheduledFor).getTime() <= Date.now());
}

export function allNotifications(s: AppState): (Notification & { read: boolean })[] {
  const generated: Notification[] = [];
  s.comments
    .filter((c) => c.authorId === "me")
    .slice(-3)
    .forEach((c) =>
      generated.push({
        id: `gen-${c.id}`,
        kind: "comment",
        title: "Your comment was posted",
        body: c.body.slice(0, 80),
        href: c.targetId.startsWith("i-") || c.targetId.startsWith("idea-") ? `/ideas/${c.targetId}` : "/discover",
        createdAt: c.createdAt,
        demo: false,
      }),
    );
  s.ideas
    .filter((i) => i.status === "submitted")
    .forEach((i) =>
      generated.push({ id: `gen-sub-${i.id}`, kind: "system", title: "Idea submitted", body: i.title, href: `/ideas/${i.id}`, createdAt: i.createdAt, demo: false }),
    );
  // Platform announcements delivered in-app to the member's role.
  const role = s.user?.role;
  s.platform.announcements
    .filter((a) => isAnnouncementLive(a) && a.channels.includes("in_app") && (a.audience.length === 0 || (role && a.audience.includes(role))))
    .forEach((a) => generated.push({ id: `ann-${a.id}`, kind: "system", title: a.title, body: a.body.slice(0, 140), href: "/notifications", createdAt: a.publishedAt ?? a.scheduledFor ?? a.createdAt, demo: false }));
  return [...generated, ...s.notifications, ...SEED_NOTIFICATIONS]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => ({ ...n, read: s.readNotifications.includes(n.id) }));
}

export function unreadCount(s: AppState) {
  return allNotifications(s).filter((n) => !n.read).length;
}

export function allThreads(s: AppState): Thread[] {
  return [...s.threads, ...SEED_THREADS];
}

export function messagesFor(s: AppState, threadId: string) {
  return [...SEED_MESSAGES, ...s.messages].filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Members listed to other members (active accounts with completed onboarding). */
export function allPeople(s: AppState): Person[] {
  return s.platform.people.filter((p) => isPersonListed(s, p.id));
}

/** Announcement banner shown across the site, if one is published. */
export function siteBanner(s: AppState): { text: string; linkLabel?: string; linkHref?: string } | null {
  const f = cmsFields(s, "site-banner");
  if (f?.text?.trim()) return { text: f.text, linkLabel: f.linkLabel, linkHref: f.linkHref };
  const ann = s.platform.announcements.find((a) => isAnnouncementLive(a) && a.channels.includes("banner"));
  return ann ? { text: `${ann.title}. ${ann.body}` } : null;
}
