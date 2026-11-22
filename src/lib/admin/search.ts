import type { AppState } from "@/lib/store/state";
import { allIdeasAdmin, allPostsAdmin } from "@/lib/store/selectors";
import { memberRows } from "./members";

export interface AdminHit {
  id: string;
  kind: "Member" | "Idea" | "Post" | "Opportunity" | "Organisation" | "Report" | "Application" | "Study" | "Content" | "Admin";
  title: string;
  detail: string;
  href: string;
}

const has = (q: string, ...f: (string | undefined)[]) => f.some((x) => x?.toLowerCase().includes(q));

/**
 * Admin-wide search. Email matches are allowed (administrators look members up by email)
 * but results show the name only, so private values never appear in the result list.
 */
export function adminSearch(s: AppState, query: string, limit = 50): AdminHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: AdminHit[] = [];
  for (const m of memberRows(s)) if (has(q, m.person.name, m.account.email, m.person.organisation, m.person.headline)) out.push({ id: m.id, kind: "Member", title: m.person.name, detail: m.person.headline, href: `/admin/users/${m.id}` });
  for (const i of allIdeasAdmin(s)) if (has(q, i.title, i.summary, i.geography)) out.push({ id: i.id, kind: "Idea", title: i.title, detail: i.summary, href: `/admin/ideas/${i.id}` });
  for (const o of s.platform.opportunities) if (has(q, o.title, o.organisation, o.description)) out.push({ id: o.id, kind: "Opportunity", title: o.title, detail: o.organisation, href: `/admin/opportunities/${o.id}` });
  for (const i of s.platform.institutions) if (has(q, i.name, i.location)) out.push({ id: i.id, kind: "Organisation", title: i.name, detail: i.location, href: `/admin/institutions/${i.id}` });
  for (const p of allPostsAdmin(s)) if (has(q, p.title, p.body)) out.push({ id: p.id, kind: "Post", title: p.title, detail: p.body.slice(0, 90), href: `/admin/content?post=${p.id}` });
  for (const r of s.platform.reports) if (has(q, r.targetLabel, r.reason)) out.push({ id: r.id, kind: "Report", title: r.targetLabel, detail: r.reason, href: `/admin/moderation/${r.id}` });
  for (const r of s.platform.registrations) if (has(q, r.teamName, ...r.members.map((m) => m.name))) out.push({ id: r.id, kind: "Application", title: r.teamName || r.members[0]?.name || r.id, detail: s.platform.opportunities.find((o) => o.id === r.opportunityId)?.title ?? "", href: `/admin/opportunities/${r.opportunityId}/applications/${r.id}` });
  for (const st of s.platform.studies) if (has(q, st.title)) out.push({ id: st.id, kind: "Study", title: st.title, detail: st.format, href: `/admin/studies/${st.id}` });
  for (const c of s.platform.cms) if (has(q, c.label, ...Object.values(c.draft))) out.push({ id: c.id, kind: "Content", title: c.label, detail: "Site content", href: `/admin/cms/${c.id}` });
  for (const a of s.platform.adminTeam) if (has(q, a.name)) out.push({ id: a.id, kind: "Admin", title: a.name, detail: a.role.replace("_", " "), href: "/admin/access" });
  return out.slice(0, limit);
}
