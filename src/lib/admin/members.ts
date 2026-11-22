import type { MemberAccount, Person } from "@/lib/types";
import type { AppState } from "@/lib/store/state";
import { meAsPerson } from "@/lib/store/selectors";

export interface MemberRow {
  id: string;
  person: Person;
  account: MemberAccount;
  isMe: boolean;
  institutionName?: string;
  profileCompletion: number;
}

/** The signed-in member's account, derived from their own record (not stored twice). */
function myAccount(s: AppState): MemberAccount | null {
  const u = s.user;
  if (!u) return null;
  const edu = u.profile;
  return {
    personId: "me",
    email: u.email,
    phone: u.phone,
    linkedin: u.linkedin,
    registeredAt: u.joinedAt,
    lastActiveAt: new Date().toISOString(),
    onboarding: { completed: u.onboarded, step: u.onboarded ? 6 : 1, totalSteps: 6, profileKind: u.profileKind },
    education: edu?.educationLevel
      ? { level: String(edu.educationLevel), qualification: String(edu.qualificationName || edu.qualification || ""), status: String(edu.academicStatus ?? ""), year: String(edu.graduationYear || edu.studyYear || edu.expectedYear || "") || undefined }
      : undefined,
    emailVerification: u.emailVerified ? "simulated" : "none",
    phoneVerification: "unverified",
    resume: u.documents?.resume,
    status: "active",
    demo: false,
  };
}

export function profileCompletion(p: Person, a: MemberAccount) {
  const checks = [p.headline && p.headline !== "Member" && p.headline !== "New member", p.bio, p.skills.length, p.interests.length, p.location, p.organisation, a.linkedin, a.phone, a.onboarding.completed];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Every member with their private account record, for administration only. */
export function memberRows(s: AppState): MemberRow[] {
  const rows: MemberRow[] = [];
  for (const person of s.platform.people) {
    const account = s.platform.accounts.find((a) => a.personId === person.id);
    if (!account) continue;
    rows.push({ id: person.id, person, account, isMe: false, institutionName: s.platform.institutions.find((i) => i.id === account.institutionId)?.name, profileCompletion: profileCompletion(person, account) });
  }
  const me = meAsPerson(s);
  const mine = myAccount(s);
  if (me && mine) rows.unshift({ id: "me", person: me, account: mine, isMe: true, institutionName: s.user?.organisation || undefined, profileCompletion: profileCompletion(me, mine) });
  return rows;
}

export function memberRow(s: AppState, id: string) {
  return memberRows(s).find((r) => r.id === id);
}
