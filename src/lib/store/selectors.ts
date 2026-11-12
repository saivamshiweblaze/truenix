import type { Comment, Idea, Notification, Person, Post, Thread } from "@/lib/types";
import { SEED_IDEAS } from "@/lib/demo-data/ideas";
import { PEOPLE } from "@/lib/demo-data/people";
import { SEED_COMMENTS, SEED_MESSAGES, SEED_NOTIFICATIONS, SEED_POSTS, SEED_THREADS } from "@/lib/demo-data/feed";
import { SEED_OPPORTUNITIES } from "@/lib/demo-data/opportunities";
import type { AppState } from "./state";

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
  return PEOPLE.find((p) => p.id === id);
}

/** Ideas visible to the current user: their own (including drafts) plus public seeded ideas. */
export function visibleIdeas(s: AppState): Idea[] {
  const removed = s.admin.moderation;
  const seeded = SEED_IDEAS.filter((i) => removed[i.id] !== "removed");
  return [...s.ideas, ...seeded];
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

export function feedPosts(s: AppState): Post[] {
  const removed = s.admin.moderation;
  return [...s.posts, ...SEED_POSTS.filter((p) => removed[p.id] !== "removed")].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function commentsFor(s: AppState, targetId: string): Comment[] {
  return [...SEED_COMMENTS, ...s.comments].filter((c) => c.targetId === targetId && s.admin.moderation[c.id] !== "removed").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function commentCount(s: AppState, targetId: string) {
  return commentsFor(s, targetId).length;
}

export function opportunities(s: AppState) {
  return SEED_OPPORTUNITIES.filter((o) => s.admin.opportunityStatus[o.id] !== "hidden");
}

export function opportunityById(id: string) {
  return SEED_OPPORTUNITIES.find((o) => o.id === id);
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

export function allPeople(s: AppState): Person[] {
  return PEOPLE.map((p) => ({ ...p, role: s.admin.roleOverrides[p.id] ?? p.role }));
}
