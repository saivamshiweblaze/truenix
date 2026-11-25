"use client";

import type { User } from "@supabase/supabase-js";
import type { TypedClient } from "@/lib/supabase/client";
import type { Database, Json, Tables } from "@/lib/supabase/database.types";
import type {
  AdminAccount,
  AdminModuleId,
  AdminPermission,
  AdminRoleId,
  Announcement,
  AuditEntry,
  CmsEntry,
  Collaboration,
  Comment,
  CurrentUser,
  EvidenceItem,
  ExperienceLevel,
  FileMeta,
  Idea,
  IndustryId,
  Institution,
  InstitutionRequest,
  MemberAccount,
  Mentorship,
  Message,
  ModerationReport,
  Notification,
  OnboardingRole,
  Opportunity,
  Person,
  Post,
  ProfileValue,
  Registration,
  ResearchReport,
  RoleId,
  Study,
  StudyParticipation,
  TalentProfile,
  Thread,
  ValidationSectionId,
  ValidationWorkspace,
} from "@/lib/types";
import { VALIDATION_SECTIONS } from "@/config/taxonomy";
import { defaultConfig, defaultRolePermissions, emptyPlatform, type PlatformConfig, type PlatformState } from "@/lib/store/platform";
import { initialState, type AppState, type PublicSettings, type SessionInfo } from "@/lib/store/state";
import { parseSession } from "./load-session";

/**
 * Builds the client read model from Supabase. Every query runs with the member's own session, so Row Level
 * Security decides what can appear here: nothing in this file grants access, it only shapes rows.
 * The signed-in member's own id is mapped to "me" (the convention the interface uses for "mine").
 */

type Row<T extends keyof Database["public"]["Tables"]> = Tables<T>;

const LIMITS = { people: 500, posts: 300, comments: 1500, reactions: 10000, notifications: 200, messages: 2000, audit: 500 };

function check<T>(label: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function fileMeta(f: Row<"files"> | undefined | null): FileMeta | undefined {
  if (!f || f.deleted_at) return undefined;
  return { id: f.id, name: f.original_name, size: f.size_bytes, type: f.mime_type, addedAt: f.created_at, storage: "stored", bucket: f.bucket, path: f.object_path };
}

/** Front-end role: privileged grants first (they come only from the server), then the self-service persona. */
export function effectiveRole(session: SessionInfo | null, persona: string): RoleId {
  if (session?.roles.some((r) => r.role === "platform_admin") && session.adminRole) return "platform_admin";
  if (session?.roles.some((r) => r.role === "institution_admin")) return "institution_admin";
  return persona as RoleId;
}

function parsePublicSettings(raw: Json | null): PublicSettings {
  const r = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, Json>;
  return {
    openRegistration: r.open_registration !== false,
    requireIdeaReview: r.require_idea_review !== false,
    researchEnabled: r.research_enabled !== false,
    communityPosting: r.community_posting !== false,
    opportunityRegistration: r.opportunity_registration !== false,
    studiesRecruiting: r.studies_recruiting !== false,
  };
}

export async function loadAppState(sb: TypedClient, user: User): Promise<AppState> {
  const uid = user.id;
  const me = (id: string | null | undefined) => (id && id === uid ? "me" : (id ?? ""));

  const [ctxRes, settingsRes] = await Promise.all([sb.rpc("my_session_context"), sb.rpc("public_settings")]);
  const session = parseSession(check("session", ctxRes) as Json);
  const publicSettings = parsePublicSettings(check("settings", settingsRes) as Json);
  const isAdmin = !!session?.adminRole;
  const perm = (m: AdminModuleId) => !!session?.adminPermissions.some((p) => p.module === m && p.permission === "view");

  // ---------------- Batch 1: everything RLS lets this member see ----------------
  const [
    profileRes, privRes, onboardRes, prefsRes, peopleRes, expRes, venturesRes, publicRes, updatesRes, followsRes, postsRes, reactionsRes,
    commentsRes, savedRes, connRes, researchRes, workspacesRes, notifRes, threadsRes, participantsRes, messagesRes, appsRes, regsRes,
    oppsRes, institutionsRes, programmesRes, instMembersRes, studiesRes, participationsRes, collabRes, talentRes, mentorshipsRes,
    annRes, cmsRes, tasksRes, activityRes, filesRes, reviewsRes,
  ] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
    sb.from("account_private").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("onboarding_progress").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("user_preferences").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("profiles").select("*").neq("id", uid).order("created_at", { ascending: false }).limit(LIMITS.people),
    sb.from("profile_experiences").select("*").order("position"),
    sb.from("ventures").select("*, venture_members(user_id, member_role, title)").order("updated_at", { ascending: false }),
    sb.from("venture_public_summaries").select("*").order("published_at", { ascending: false }),
    sb.from("venture_updates").select("*").order("created_at", { ascending: false }),
    sb.from("follows").select("*").eq("follower_id", uid),
    sb.from("posts").select("*").order("created_at", { ascending: false }).limit(LIMITS.posts),
    sb.from("reactions").select("post_id, user_id").limit(LIMITS.reactions),
    sb.from("comments").select("*").order("created_at").limit(LIMITS.comments),
    sb.from("saved_items").select("*").eq("user_id", uid),
    sb.from("connections").select("*"),
    sb.from("research_projects").select("*, research_runs(*, research_findings(*), research_sources(*))").order("created_at", { ascending: false }),
    sb.from("validation_workspaces").select("*, validation_sections(*), evidence(*), assumptions(*)"),
    sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(LIMITS.notifications),
    sb.from("message_threads").select("*"),
    sb.from("thread_participants").select("*"),
    sb.from("messages").select("*").order("created_at").limit(LIMITS.messages),
    sb.from("applications").select("*"),
    sb.from("registrations").select("*, registration_events(*), submissions(*), judging_scores(*)").order("created_at", { ascending: false }),
    sb.from("opportunities").select("*, opportunity_rounds(*), opportunity_criteria(*), opportunity_communications(*)").order("deadline", { ascending: true, nullsFirst: false }),
    sb.from("institutions").select("*"),
    sb.from("institution_programmes").select("*"),
    sb.from("institution_members").select("*"),
    sb.from("studies").select("*").order("created_at", { ascending: false }),
    sb.from("study_participants").select("*"),
    sb.from("collaboration_requests").select("*").order("created_at", { ascending: false }),
    sb.from("talent_profiles").select("*"),
    sb.from("mentorships").select("*"),
    sb.from("announcements").select("*").order("created_at", { ascending: false }),
    perm("cms") ? sb.from("cms_content").select("*, cms_versions(*)").order("position") : sb.rpc("published_cms"),
    sb.from("user_tasks").select("*").order("created_at", { ascending: false }),
    sb.from("user_activity").select("*").order("created_at", { ascending: false }).limit(60),
    sb.from("files").select("*").is("deleted_at", null),
    sb.from("expert_reviews").select("*").order("created_at", { ascending: false }),
  ]);

  const profile = check("profile", profileRes);
  const priv = check("account", privRes);
  const onboarding = check("onboarding", onboardRes);
  const prefs = check("preferences", prefsRes);
  const files = check("files", filesRes) as Row<"files">[];
  const fileById = new Map(files.map((f) => [f.id, f]));

  // ---------------- The member ----------------
  const persona = profile?.persona ?? "student_explorer";
  const answers = (onboarding?.answers && typeof onboarding.answers === "object" && !Array.isArray(onboarding.answers) ? onboarding.answers : {}) as Record<string, ProfileValue>;
  const currentUser: CurrentUser = {
    id: "me",
    name: profile?.display_name || user.email?.split("@")[0] || "Member",
    email: user.email ?? priv?.email ?? "",
    role: effectiveRole(session, persona),
    headline: profile?.headline ?? "",
    organisation: profile?.organisation ?? "",
    location: profile?.location ?? "",
    bio: profile?.bio ?? "",
    interests: (profile?.interests ?? []) as IndustryId[],
    industries: (profile?.interests ?? []) as IndustryId[],
    skills: profile?.skills ?? [],
    experience: (profile?.experience_level ?? "learning") as ExperienceLevel,
    collaboration: profile?.collaboration ?? [],
    emailVerified: !!user.email_confirmed_at,
    onboarded: !!onboarding?.completed,
    joinedAt: profile?.created_at ?? user.created_at,
    phone: priv?.phone ?? undefined,
    phoneVerified: !!priv?.phone_verified,
    linkedin: priv?.linkedin ?? undefined,
    profileKind: (profile?.profile_kind ?? onboarding?.profile_kind ?? undefined) as OnboardingRole | undefined,
    profile: answers,
    documents: { resume: fileMeta(priv?.resume_file_id ? fileById.get(priv.resume_file_id) : null), photo: fileMeta(profile?.avatar_file_id ? fileById.get(profile.avatar_file_id) : null) },
    persona: persona as RoleId,
    avatarUrl: avatarUrl(sb, profile?.avatar_file_id ? fileById.get(profile.avatar_file_id) : undefined),
  };

  // ---------------- People ----------------
  const experiences = check("experiences", expRes) as Row<"profile_experiences">[];
  const peopleRows = check("people", peopleRes) as Row<"profiles">[];
  const people: Person[] = peopleRows.map((p) => ({
    id: p.id,
    name: p.display_name || "Member",
    headline: p.headline,
    organisation: p.show_organisation ? p.organisation : "",
    location: p.location,
    role: p.persona as RoleId,
    skills: p.skills,
    interests: p.interests as IndustryId[],
    experience: experiences.filter((e) => e.user_id === p.id).map((e) => ({ title: e.title, org: e.organisation, period: e.period })),
    collaboration: p.collaboration,
    bio: p.bio,
    demo: p.is_demo,
    avatarUrl: avatarUrl(sb, p.avatar_file_id ? fileById.get(p.avatar_file_id) : undefined),
  }));

  // ---------------- Ventures ----------------
  type VentureRow = Row<"ventures"> & { venture_members: { user_id: string; member_role: string; title: string }[] };
  const ventures = check("ventures", venturesRes) as unknown as VentureRow[];
  const updates = check("updates", updatesRes) as Row<"venture_updates">[];
  const follows = check("follows", followsRes) as Row<"follows">[];
  const ventureIds = new Set(ventures.map((v) => v.id));
  const publicSummaries = (check("public", publicRes) as Row<"venture_public_summaries">[]).filter((p) => !ventureIds.has(p.venture_id));
  const allIdeaIds = [...ventureIds, ...publicSummaries.map((p) => p.venture_id)];
  const followerCounts = new Map<string, number>();
  if (allIdeaIds.length) {
    const fc = await sb.rpc("venture_follower_counts", { p_ids: allIdeaIds });
    (check("followers", fc) as { venture_id: string; followers: number }[]).forEach((r) => followerCounts.set(r.venture_id, Number(r.followers)));
  }
  const myFollowedIdeas = new Set(follows.map((f) => f.followed_venture_id).filter(Boolean) as string[]);
  const followersExcludingMe = (id: string) => Math.max(0, (followerCounts.get(id) ?? 0) - (myFollowedIdeas.has(id) ? 1 : 0));
  const updatesFor = (id: string) => updates.filter((u) => u.venture_id === id).map((u) => ({ id: u.id, date: u.created_at, title: u.title, body: u.body, isPublic: u.is_public }));

  const toIdea = (v: VentureRow): Idea => ({
    id: v.id,
    title: v.title,
    summary: v.summary,
    problem: v.problem,
    solution: v.solution,
    industry: v.industry as IndustryId,
    targetUsers: v.target_users,
    geography: v.geography,
    stage: v.stage as Idea["stage"],
    existingResearch: v.existing_research,
    requiredSkills: v.required_skills,
    collaborationNeeds: v.collaboration_needs,
    visibility: v.visibility as Idea["visibility"],
    institutionId: v.institution_id ?? undefined,
    ownerId: me(v.owner_id),
    team: [...v.venture_members].sort((a, b) => (a.member_role === "owner" ? -1 : b.member_role === "owner" ? 1 : 0)).map((m) => ({ personId: me(m.user_id), role: m.title || m.member_role, memberRole: m.member_role as "owner" | "editor" | "collaborator" })),
    updates: updatesFor(v.id),
    researchStatus: v.research_status as Idea["researchStatus"],
    validationStatus: v.validation_status as Idea["validationStatus"],
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    status: v.status as Idea["status"],
    demo: v.is_demo,
    followers: followersExcludingMe(v.id),
    review: v.review_status ? { status: v.review_status as NonNullable<Idea["review"]>["status"], note: v.review_note ?? undefined, reviewedAt: v.reviewed_at ?? undefined } : undefined,
    publication: v.publication as Idea["publication"],
    featured: v.featured,
    access: v.venture_members.some((m) => m.user_id === uid) ? "member" : "disclosed",
  });
  const summaryIdea = (p: Row<"venture_public_summaries">): Idea => ({
    id: p.venture_id,
    title: p.title,
    summary: p.summary,
    problem: p.problem,
    solution: p.solution,
    industry: p.industry as IndustryId,
    targetUsers: p.target_users,
    geography: p.geography,
    stage: p.stage as Idea["stage"],
    existingResearch: "",
    requiredSkills: p.required_skills,
    collaborationNeeds: p.collaboration_needs,
    visibility: "public_summary",
    ownerId: me(p.owner_id),
    team: [{ personId: me(p.owner_id), role: "Founder" }],
    updates: updatesFor(p.venture_id),
    researchStatus: "none",
    validationStatus: "not_started",
    createdAt: p.published_at,
    updatedAt: p.updated_at,
    status: "submitted",
    demo: p.is_demo,
    followers: followersExcludingMe(p.venture_id),
    publication: "published",
    review: { status: "approved" },
    featured: p.featured,
    access: "public_summary",
  });
  const myIdeas = ventures.filter((v) => v.venture_members.some((m) => m.user_id === uid)).map(toIdea);
  const otherIdeas = [...ventures.filter((v) => !v.venture_members.some((m) => m.user_id === uid)).map(toIdea), ...publicSummaries.map(summaryIdea)];

  // ---------------- Community ----------------
  const reactions = check("reactions", reactionsRes) as { post_id: string; user_id: string }[];
  const likeCount = new Map<string, number>();
  reactions.forEach((r) => r.user_id !== uid && likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1));
  const moderation = (r: { moderation_status: string; moderation_reason: string | null; moderated_at: string | null; pinned?: boolean; featured?: boolean }) =>
    r.moderation_status === "visible" && !r.pinned && !r.featured && !r.moderated_at
      ? undefined
      : { status: r.moderation_status as "visible", reason: r.moderation_reason ?? undefined, pinned: r.pinned, featured: r.featured, updatedAt: r.moderated_at ?? "", by: "Platform team" };
  const postRows = check("posts", postsRes) as Row<"posts">[];
  const toPost = (p: Row<"posts">): Post => ({
    id: p.id,
    kind: p.kind as Post["kind"],
    authorId: me(p.author_id),
    title: p.title,
    body: p.body,
    industries: p.industries as IndustryId[],
    ideaId: p.venture_id ?? undefined,
    figure: (p.figure ?? undefined) as Post["figure"],
    createdAt: p.created_at,
    likes: likeCount.get(p.id) ?? 0,
    demo: p.is_demo,
    moderation: moderation(p),
  });
  const commentRows = check("comments", commentsRes) as Row<"comments">[];
  const toComment = (c: Row<"comments">): Comment => ({
    id: c.id,
    targetId: c.post_id ?? c.venture_id ?? "",
    targetType: c.post_id ? "post" : "idea",
    authorId: me(c.author_id),
    body: c.body,
    createdAt: c.created_at,
    demo: c.is_demo,
    moderation: moderation(c),
  });
  const saved = check("saved", savedRes) as Row<"saved_items">[];
  const connections = check("connections", connRes) as Row<"connections">[];

  // ---------------- Research ----------------
  type RunRow = Row<"research_runs"> & { research_findings: Row<"research_findings">[]; research_sources: Row<"research_sources">[] };
  const researchRows = check("research", researchRes) as unknown as (Row<"research_projects"> & { research_runs: RunRow[] })[];
  const toReport = (p: (typeof researchRows)[number]): ResearchReport => {
    const run = [...p.research_runs].sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
    return {
      id: p.id,
      question: p.question,
      ideaId: p.venture_id,
      categories: p.categories as ResearchReport["categories"],
      depth: p.depth as ResearchReport["depth"],
      createdAt: p.created_at,
      sections: (run?.research_findings ?? []).sort((a, b) => a.position - b.position).map((f) => ({ id: f.section_key, heading: f.heading, body: f.body, bullets: f.bullets.length ? f.bullets : undefined })),
      sources: (run?.research_sources ?? []).sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, title: s.title, kind: s.kind, note: s.note, url: s.url })),
      provenance: run?.provenance === "live" ? "live" : "demo",
      saved: p.saved,
      ownerId: me(p.owner_id),
      runStatus: run?.status === "failed" || run?.status === "provider_not_configured" ? "failed" : "completed",
      failureReason: run?.failure_reason ?? undefined,
      archived: p.archived,
    };
  };
  const reports = researchRows.map(toReport);

  // ---------------- Validation ----------------
  type WsRow = Row<"validation_workspaces"> & { validation_sections: Row<"validation_sections">[]; evidence: Row<"evidence">[]; assumptions: Row<"assumptions">[] };
  const wsRows = check("validation", workspacesRes) as unknown as WsRow[];
  const toWorkspace = (w: WsRow): ValidationWorkspace => {
    const sections = Object.fromEntries(VALIDATION_SECTIONS.map((v) => [v.id, { status: "not_started", notes: "" }])) as ValidationWorkspace["sections"];
    w.validation_sections.forEach((s) => (sections[s.section_id as ValidationSectionId] = { status: s.status as "done", notes: s.notes }));
    return {
      ideaId: w.venture_id,
      workspaceId: w.id,
      sections,
      evidence: [...w.evidence].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((e): EvidenceItem => ({
        id: e.id,
        sectionId: e.section_id as ValidationSectionId,
        type: e.evidence_type as EvidenceItem["type"],
        text: e.body,
        source: e.downgraded_reason ? `${e.source} (reclassified by an administrator: ${e.downgraded_reason})` : e.source,
        createdAt: e.created_at,
        demoGenerated: e.framework_generated,
      })),
      openQuestions: [...w.assumptions].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((a) => ({ id: a.id, text: a.statement, resolved: a.status === "resolved" || a.status === "supported" || a.status === "refuted" })),
      updatedAt: w.updated_at,
    };
  };
  const myVentureIds = new Set(myIdeas.map((i) => i.id));
  const myValidations: Record<string, ValidationWorkspace> = {};
  const otherValidations: Record<string, ValidationWorkspace> = {};
  wsRows.forEach((w) => ((myVentureIds.has(w.venture_id) ? myValidations : otherValidations)[w.venture_id] = toWorkspace(w)));

  // ---------------- Notifications and messages ----------------
  const notifRows = check("notifications", notifRes) as Row<"notifications">[];
  const notifications: Notification[] = notifRows.map((n) => ({ id: n.id, kind: n.kind as Notification["kind"], title: n.title, body: n.body, href: n.href, createdAt: n.created_at, demo: n.is_demo }));
  const participants = check("participants", participantsRes) as Row<"thread_participants">[];
  const threads: Thread[] = (check("threads", threadsRes) as Row<"message_threads">[]).map((t) => ({
    id: t.id,
    participantId: me(participants.find((p) => p.thread_id === t.id && p.user_id !== uid)?.user_id ?? t.created_by),
    subject: t.subject,
    kind: t.kind as Thread["kind"],
    demo: t.is_demo,
  }));
  const messages: Message[] = (check("messages", messagesRes) as Row<"messages">[]).map((m) => ({ id: m.id, threadId: m.thread_id, authorId: me(m.author_id), body: m.body, createdAt: m.created_at }));

  // ---------------- Opportunities ----------------
  type OppRow = Row<"opportunities"> & { opportunity_rounds: Row<"opportunity_rounds">[]; opportunity_criteria: Row<"opportunity_criteria">[]; opportunity_communications: Row<"opportunity_communications">[] };
  const oppRows = check("opportunities", oppsRes) as unknown as OppRow[];
  type RegRow = Row<"registrations"> & { registration_events: Row<"registration_events">[]; submissions: Row<"submissions">[]; judging_scores: Row<"judging_scores">[] };
  const regRows = check("registrations", regsRes) as unknown as RegRow[];

  // ---------------- Batch 2: rows that depend on batch 1 ----------------
  const teamIds = regRows.map((r) => r.team_id).filter(Boolean) as string[];
  const canSeeOrganisers = isAdmin;
  const [teamMembersRes, organisersRes, notesRes] = await Promise.all([
    teamIds.length ? sb.from("team_members").select("*").in("team_id", teamIds) : Promise.resolve({ data: [], error: null }),
    canSeeOrganisers || oppRows.length ? sb.from("opportunity_organisers").select("*") : Promise.resolve({ data: [], error: null }),
    sb.from("registration_notes").select("*").order("created_at", { ascending: false }),
  ]);
  const teamMembers = check("team members", teamMembersRes) as Row<"team_members">[];
  const organisers = check("organisers", organisersRes) as Row<"opportunity_organisers">[];
  const regNotes = check("notes", notesRes) as Row<"registration_notes">[];

  const opportunities: Opportunity[] = oppRows.map((o) => {
    const judges = organisers.filter((x) => x.opportunity_id === o.id && x.role === "judge").map((x) => me(x.user_id));
    const winners = regRows.filter((r) => r.opportunity_id === o.id && r.award_place).map((r) => ({ registrationId: r.id, place: r.award_place! }));
    return {
      id: o.id,
      kind: o.kind as Opportunity["kind"],
      title: o.title,
      organisation: o.organisation,
      description: o.description,
      eligibility: o.eligibility,
      industries: o.industries as IndustryId[],
      location: o.location,
      deadline: o.deadline ?? "",
      stage: o.stages as Opportunity["stage"],
      officialUrl: o.official_url,
      demo: o.is_demo,
      publication: o.publication as Opportunity["publication"],
      featured: o.featured,
      source: o.source as Opportunity["source"],
      sourceUrl: o.source_url,
      sourceVerification: o.source_verification as Opportunity["sourceVerification"],
      lastCheckedAt: o.last_checked_at ?? undefined,
      organiserId: o.institution_id ?? undefined,
      education: o.education ?? undefined,
      format: (o.format ?? undefined) as Opportunity["format"],
      registrationOpens: o.registration_opens ?? undefined,
      eventStart: o.event_start ?? undefined,
      eventEnd: o.event_end ?? undefined,
      teamMin: o.team_min ?? undefined,
      teamMax: o.team_max ?? undefined,
      prizes: o.prizes ?? undefined,
      instructions: o.instructions ?? undefined,
      contact: o.contact ?? undefined,
      registrationMode: o.registration_mode as Opportunity["registrationMode"],
      banner: fileMeta(o.banner_file_id ? fileById.get(o.banner_file_id) : null),
      resultsPublished: o.results_published,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      hackathon:
        o.opportunity_rounds.length || o.opportunity_criteria.length || judges.length || o.opportunity_communications.length
          ? {
              rounds: [...o.opportunity_rounds].sort((a, b) => a.position - b.position).map((r) => ({ id: r.id, name: r.name, deadline: r.deadline ?? "", description: r.description })),
              criteria: [...o.opportunity_criteria].sort((a, b) => a.position - b.position).map((c) => ({ id: c.id, label: c.label, weight: c.weight })),
              judges,
              winners,
              certificates: { issuedTo: regRows.filter((r) => r.opportunity_id === o.id && r.certificate_issued_at).map((r) => r.id) },
              communications: o.opportunity_communications.map((c) => ({ id: c.id, at: c.sent_at, subject: c.subject, body: c.body, audience: c.audience as "all" })),
            }
          : undefined,
    };
  });

  const registrations: Registration[] = regRows.map((r) => {
    const team = r.team_id ? teamMembers.filter((t) => t.team_id === r.team_id) : [];
    const lead = r.applicant_id === uid ? currentUser.name : (people.find((p) => p.id === r.applicant_id)?.name ?? "Applicant");
    return {
      id: r.id,
      opportunityId: r.opportunity_id,
      applicantId: me(r.applicant_id),
      mode: r.mode as Registration["mode"],
      teamName: r.team_name ?? undefined,
      members: [{ name: lead, role: "Lead", personId: me(r.applicant_id) }, ...team.filter((t) => t.user_id !== r.applicant_id).map((t) => ({ name: t.display_name, role: t.role, personId: t.user_id ? me(t.user_id) : undefined }))],
      statement: r.statement,
      status: r.status as Registration["status"],
      submissions: r.submissions.map((s) => ({ id: s.id, roundId: s.round_id ?? "", title: s.title, link: s.link ?? undefined, files: [], at: s.created_at })),
      scores: r.judging_scores.map((s) => ({ id: s.id, roundId: s.round_id ?? "", judgeId: me(s.judge_id), criterionId: s.criterion_id, score: s.score })),
      notes: regNotes.filter((n) => n.registration_id === r.id).map((n) => ({ id: n.id, at: n.created_at, by: n.author_id === uid ? currentUser.name : "Reviewer", text: n.body })),
      history: [...r.registration_events].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((e) => ({ id: String(e.id), at: e.created_at, by: e.actor_id === uid ? currentUser.name : e.actor_id === r.applicant_id ? lead : "TRUEVIX", text: e.text })),
      createdAt: r.created_at,
      demo: r.is_demo,
    };
  });

  // ---------------- Institutions ----------------
  const instMembers = check("institution members", instMembersRes) as Row<"institution_members">[];
  const programmes = check("programmes", programmesRes) as Row<"institution_programmes">[];
  const institutions: Institution[] = (check("institutions", institutionsRes) as Row<"institutions">[]).map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind as Institution["kind"],
    location: i.location,
    website: i.website ?? undefined,
    description: i.description,
    status: i.status as Institution["status"],
    relationship: i.relationship as Institution["relationship"],
    agreementRef: i.agreement_ref ?? undefined,
    representatives: instMembers.filter((m) => m.institution_id === i.id && m.status === "active" && m.member_role === "representative").map((m) => me(m.user_id)),
    administrators: [],
    logo: fileMeta(i.logo_file_id ? fileById.get(i.logo_file_id) : null),
    documents: [],
    programmes: programmes.filter((p) => p.institution_id === i.id).map((p) => ({ id: p.id, name: p.name, status: p.status, participants: p.participant_count })),
    members: instMembers.filter((m) => m.institution_id === i.id).map((m) => ({ personId: me(m.user_id), memberRole: m.member_role, status: m.status, joinedAt: m.joined_at })),
    createdAt: i.created_at,
    demo: i.is_demo,
  }));

  // ---------------- Studies, collaboration, talent ----------------
  const studies: Study[] = (check("studies", studiesRes) as Row<"studies">[]).map((st) => ({
    id: st.id,
    title: st.title,
    ownerId: me(st.owner_id),
    ideaId: st.venture_id ?? undefined,
    description: st.description,
    format: st.format,
    eligibility: st.eligibility,
    note: st.note,
    status: st.status as Study["status"],
    start: st.starts_on ?? "",
    end: st.ends_on ?? "",
    target: st.target_participants,
    consentText: st.consent_text,
    demo: st.is_demo,
  }));
  const participations: StudyParticipation[] = (check("participations", participationsRes) as Row<"study_participants">[]).map((p) => ({
    id: p.id,
    studyId: p.study_id,
    personId: me(p.user_id),
    status: p.status as StudyParticipation["status"],
    consent: p.consent as StudyParticipation["consent"],
    consentAt: p.consent_at ?? undefined,
    appliedAt: p.applied_at,
  }));
  const collaborations: Collaboration[] = (check("collaborations", collabRes) as Row<"collaboration_requests">[]).map((c) => ({
    id: c.id,
    kind: c.kind as Collaboration["kind"],
    fromId: me(c.from_id),
    toId: c.to_id ? me(c.to_id) : undefined,
    ideaId: c.venture_id ?? undefined,
    role: c.role,
    message: c.message,
    status: c.status as Collaboration["status"],
    flagged: c.flagged_reason ? { reason: c.flagged_reason, at: c.flagged_at ?? c.created_at } : undefined,
    createdAt: c.created_at,
    demo: c.is_demo,
  }));
  const talent: TalentProfile[] = (check("talent", talentRes) as Row<"talent_profiles">[]).map((t) => ({
    personId: me(t.user_id),
    kind: t.kind as TalentProfile["kind"],
    status: t.status as TalentProfile["status"],
    verification: t.verification as TalentProfile["verification"],
    yearsExperience: t.years_experience ?? undefined,
    availability: t.availability as TalentProfile["availability"],
    hoursPerMonth: t.hours_per_month,
    capacity: t.capacity,
    areas: t.areas,
    application: { submittedAt: t.submitted_at, statement: t.application_statement },
    reviewNote: t.review_note ?? undefined,
    demo: t.is_demo,
  }));
  const mentorships: Mentorship[] = (check("mentorships", mentorshipsRes) as Row<"mentorships">[]).map((m) => ({
    id: m.id,
    mentorId: me(m.mentor_id),
    menteeId: me(m.mentee_id),
    ideaId: m.venture_id ?? undefined,
    focus: m.focus,
    status: m.status as Mentorship["status"],
    startedAt: m.started_at,
    demo: m.is_demo,
  }));
  const expertReviews = (check("reviews", reviewsRes) as Row<"expert_reviews">[]).map((r) => ({
    id: r.id,
    ideaId: r.venture_id,
    ideaTitle: r.venture_title,
    reviewerId: me(r.reviewer_id),
    requestedBy: me(r.requested_by),
    note: r.request_note,
    status: r.status as "requested" | "accepted" | "declined" | "completed" | "cancelled",
    feedback: r.feedback ?? undefined,
    recommendation: (r.recommendation ?? undefined) as "proceed" | "revise" | "reconsider" | undefined,
    dueOn: r.due_on ?? undefined,
    createdAt: r.created_at,
  }));

  // ---------------- Announcements and CMS ----------------
  const announcements: Announcement[] = (check("announcements", annRes) as Row<"announcements">[]).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience as RoleId[],
    channels: a.channels as Announcement["channels"],
    status: a.status as Announcement["status"],
    scheduledFor: a.scheduled_for ?? undefined,
    publishedAt: a.published_at ?? undefined,
    createdAt: a.created_at,
    createdBy: a.created_by === uid ? currentUser.name : "Platform team",
    deliveries: [],
  }));
  const cmsRaw = check("cms", cmsRes as { data: unknown; error: { message: string } | null }) as Record<string, unknown>[];
  const cms: CmsEntry[] = cmsRaw.map((c) => {
    const isAdminRow = "draft" in c;
    const fields = (isAdminRow ? c.published : c.fields) as Record<string, string> | null;
    const versions = (isAdminRow ? ((c.cms_versions as Row<"cms_versions">[]) ?? []) : []).sort((a, b) => b.version - a.version);
    return {
      id: String(c.id),
      kind: c.kind as CmsEntry["kind"],
      label: String(c.label),
      draft: (isAdminRow ? c.draft : fields ?? {}) as Record<string, string>,
      published: fields,
      status: (isAdminRow ? c.status : "published") as CmsEntry["status"],
      versions: versions.map((v) => ({ version: v.version, fields: v.fields as Record<string, string>, publishedAt: v.published_at, by: "Platform team" })),
      order: Number(c.position ?? 0),
      updatedAt: String(c.updated_at ?? ""),
    };
  });

  // ---------------- Personal workspace ----------------
  const tasks = (check("tasks", tasksRes) as Row<"user_tasks">[]).map((t) => ({ id: t.id, text: t.text, done: t.done, createdAt: t.created_at }));
  const activity = (check("activity", activityRes) as Row<"user_activity">[]).map((a) => ({ id: a.id, text: a.text, href: a.href ?? undefined, createdAt: a.created_at }));
  const applications = (check("applications", appsRes) as Row<"applications">[]).map((a) => ({ opportunityId: a.opportunity_id, status: a.status as "interested", updatedAt: a.updated_at }));

  // ---------------- Administration (only what the operator's role may view) ----------------
  let platformExtra: Partial<PlatformState> = {};
  let audit: AuditEntry[] = [];
  let adminSettings = initialState().admin.settings;
  let config: PlatformConfig = defaultConfig();
  if (isAdmin) {
    const admin = await loadAdminData(sb, uid, currentUser, people, perm);
    platformExtra = admin.platform;
    audit = admin.audit;
    if (admin.settings) adminSettings = admin.settings;
    if (admin.config) config = admin.config;
  } else {
    adminSettings = { openRegistration: publicSettings.openRegistration, requireIdeaReview: publicSettings.requireIdeaReview, researchEnabled: publicSettings.researchEnabled };
  }

  const myResearch = reports.filter((r) => r.ownerId === "me");
  const otherResearch = [...reports.filter((r) => r.ownerId !== "me"), ...(platformExtra.research ?? [])];
  const ideaIndex = platformExtra.ideas ?? [];
  const knownIdeaIds = new Set([...myIdeas, ...otherIdeas].map((i) => i.id));

  const base = initialState();
  const platform: PlatformState = {
    ...emptyPlatform(),
    people: platformExtra.people ?? people,
    accounts: platformExtra.accounts ?? [],
    ideas: [...otherIdeas, ...ideaIndex.filter((i) => !knownIdeaIds.has(i.id))],
    posts: postRows.filter((p) => p.author_id !== uid).map(toPost),
    comments: commentRows.filter((c) => c.author_id !== uid).map(toComment),
    opportunities,
    registrations,
    institutions,
    reports: platformExtra.reports ?? [],
    talent,
    mentorships,
    studies,
    participations,
    collaborations,
    research: otherResearch,
    validations: { ...otherValidations, ...(platformExtra.validations ?? {}) },
    announcements: platformExtra.announcements ?? announcements,
    cms,
    adminTeam: platformExtra.adminTeam ?? [],
    myAdminRole: session?.adminRole ?? "analyst",
    rolePermissions: platformExtra.rolePermissions ?? defaultRolePermissions(),
    config,
    expertReviews,
    publicSettings,
    institutionRequests: platformExtra.institutionRequests ?? [],
  };

  return {
    ...base,
    signedIn: true,
    authUserId: uid,
    session,
    dataStatus: "ready",
    dataError: null,
    loadedAt: new Date().toISOString(),
    user: currentUser,
    ideas: myIdeas,
    posts: postRows.filter((p) => p.author_id === uid).map(toPost),
    comments: commentRows.filter((c) => c.author_id === uid).map(toComment),
    research: myResearch,
    validations: myValidations,
    saved: {
      ideas: saved.map((x) => x.venture_id).filter(Boolean) as string[],
      posts: saved.map((x) => x.post_id).filter(Boolean) as string[],
      opportunities: saved.map((x) => x.opportunity_id).filter(Boolean) as string[],
    },
    following: { ideas: [...myFollowedIdeas], people: follows.map((f) => f.followed_user_id).filter(Boolean) as string[] },
    connections: connections.map((c) => (c.requester_id === uid ? c.addressee_id : c.requester_id)),
    connectionStates: Object.fromEntries(connections.map((c) => [c.requester_id === uid ? c.addressee_id : c.requester_id, { status: c.status as "pending" | "accepted" | "declined", incoming: c.addressee_id === uid }])),
    liked: reactions.filter((r) => r.user_id === uid).map((r) => r.post_id),
    readNotifications: notifRows.filter((n) => n.read_at).map((n) => n.id),
    notifications,
    threads,
    messages,
    applications,
    decisions: {},
    tasks,
    activity,
    notificationPrefs: prefs
      ? { comments: prefs.notify_comments, follows: prefs.notify_follows, collaboration: prefs.notify_collaboration, opportunities: prefs.notify_opportunities, research: prefs.notify_research, weeklyDigest: prefs.weekly_digest }
      : base.notificationPrefs,
    privacy: {
      profileVisibility: (profile?.visibility ?? "members") as AppState["privacy"]["profileVisibility"],
      showOrganisation: profile?.show_organisation ?? true,
      allowMessages: (prefs?.allow_messages ?? "everyone") as AppState["privacy"]["allowMessages"],
      showActivity: prefs?.show_activity ?? true,
    },
    admin: { audit, settings: adminSettings },
    platform,
  };
}

function avatarUrl(sb: TypedClient, f: Row<"files"> | undefined) {
  if (!f || f.bucket !== "avatars" || f.deleted_at) return undefined;
  return sb.storage.from("avatars").getPublicUrl(f.object_path).data.publicUrl;
}

/* ================================================================================================
 * Administration read model. Each query is still subject to RLS: an operator only receives modules their
 * role may view. Confidential venture/research/validation content comes from metadata-only index functions.
 * ============================================================================================== */
async function loadAdminData(sb: TypedClient, uid: string, currentUser: CurrentUser, people: Person[], perm: (m: AdminModuleId) => boolean) {
  const me = (id: string | null | undefined) => (id && id === uid ? "me" : (id ?? ""));
  const empty = Promise.resolve({ data: [] as never[], error: null });
  const [privRes, statusRes, onboardRes, rolesRes, assignRes, permsRes, auditRes, reportsRes, ventureIdx, researchIdx, validationIdx, settingsRes, annRes, deliveriesRes] = await Promise.all([
    perm("users") ? sb.from("account_private").select("*") : empty,
    perm("users") ? sb.from("account_status").select("*") : empty,
    perm("onboarding") || perm("users") ? sb.from("onboarding_progress").select("user_id, profile_kind, step, total_steps, completed, completed_at, review_status") : empty,
    perm("users") || perm("access") ? sb.from("user_roles").select("*").is("revoked_at", null) : empty,
    perm("access") ? sb.from("admin_role_assignments").select("*") : empty,
    sb.from("admin_permissions").select("*"),
    perm("audit") ? sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(LIMITS.audit) : empty,
    perm("moderation") ? sb.from("moderation_reports").select("*").order("created_at", { ascending: false }) : empty,
    perm("ideas") ? sb.rpc("admin_venture_index") : empty,
    perm("research") ? sb.rpc("admin_research_index") : empty,
    perm("validation") ? sb.rpc("admin_validation_index") : empty,
    perm("settings") ? sb.from("platform_settings").select("*").maybeSingle() : Promise.resolve({ data: null, error: null }),
    perm("communications") ? sb.from("announcements").select("*").order("created_at", { ascending: false }) : empty,
    perm("communications") ? sb.from("announcement_deliveries").select("*").order("created_at", { ascending: false }) : empty,
  ]);
  const instReqRes = perm("institutions") ? await sb.from("institution_requests").select("*").order("created_at", { ascending: false }) : { data: [], error: null };
  const nameOf = (id: string | null) => (!id ? "System" : id === uid ? currentUser.name : (people.find((p) => p.id === id)?.name ?? "Member"));

  const privRows = check("accounts", privRes) as Row<"account_private">[];
  const statusRows = check("account status", statusRes) as Row<"account_status">[];
  const onboardRows = check("onboarding", onboardRes) as Pick<Row<"onboarding_progress">, "user_id" | "profile_kind" | "step" | "total_steps" | "completed">[];
  const accounts: MemberAccount[] = statusRows.map((st) => {
    const p = privRows.find((x) => x.user_id === st.user_id);
    const o = onboardRows.find((x) => x.user_id === st.user_id);
    return {
      personId: me(st.user_id),
      email: p?.email ?? "",
      phone: p?.phone ?? undefined,
      linkedin: p?.linkedin ?? undefined,
      registeredAt: st.changed_at,
      lastActiveAt: st.last_active_at ?? st.changed_at,
      onboarding: { completed: !!o?.completed, step: o?.step ?? 0, totalSteps: o?.total_steps ?? 0, profileKind: (o?.profile_kind ?? undefined) as OnboardingRole | undefined },
      education: p?.education_level ? { level: p.education_level, qualification: p.qualification ?? "", status: p.education_status ?? "", year: p.graduation_year ?? undefined } : undefined,
      designation: p?.designation ?? undefined,
      institutionId: p?.institution_id ?? undefined,
      emailVerification: "none",
      phoneVerification: "unverified",
      status: st.status as MemberAccount["status"],
      statusReason: st.reason ?? undefined,
      adminNote: p?.admin_note ?? undefined,
      demo: people.find((x) => x.id === st.user_id)?.demo ?? false,
    };
  });

  const perms = check("permissions", permsRes) as Row<"admin_permissions">[];
  const rolePermissions = defaultRolePermissions();
  (Object.keys(rolePermissions) as AdminRoleId[]).forEach((r) => (rolePermissions[r] = {}));
  perms.forEach((p) => {
    const role = rolePermissions[p.admin_role_id as AdminRoleId] ?? (rolePermissions[p.admin_role_id as AdminRoleId] = {});
    const mod = p.module as AdminModuleId;
    role[mod] = [...(role[mod] ?? []), p.permission as AdminPermission];
  });

  const roles = check("roles", rolesRes) as Row<"user_roles">[];
  const assignments = check("assignments", assignRes) as Row<"admin_role_assignments">[];
  const adminTeam: AdminAccount[] = roles
    .filter((r) => r.role === "platform_admin")
    .map((r) => ({
      id: r.user_id === uid ? "me" : r.user_id,
      name: nameOf(r.user_id),
      email: r.user_id === uid ? currentUser.email : (privRows.find((p) => p.user_id === r.user_id)?.email ?? ""),
      role: (assignments.find((a) => a.user_id === r.user_id)?.admin_role_id ?? "analyst") as AdminRoleId,
      status: "active",
      createdAt: r.granted_at,
      lastActiveAt: statusRows.find((s) => s.user_id === r.user_id)?.last_active_at ?? undefined,
      demo: false,
    }));

  const audit: AuditEntry[] = (check("audit", auditRes) as Row<"audit_logs">[]).map((a) => ({
    id: String(a.id),
    actor: a.actor_label || nameOf(a.actor_id),
    actorRole: a.actor_role ?? undefined,
    action: a.action,
    target: a.target_label,
    createdAt: a.created_at,
    entity: a.entity,
    targetId: a.target_id ?? undefined,
    before: a.before_value ?? undefined,
    after: a.after_value ?? undefined,
    reason: a.reason ?? undefined,
    sensitive: a.sensitive,
  }));

  const reports: ModerationReport[] = (check("reports", reportsRes) as Row<"moderation_reports">[]).map((r) => ({
    id: r.id,
    targetType: (r.target_type === "venture" ? "idea" : r.target_type) as ModerationReport["targetType"],
    targetId: r.target_id,
    targetLabel: r.target_label,
    reportedUserId: me(r.reported_user_id),
    reporterId: me(r.reporter_id),
    reason: r.reason,
    details: r.details,
    severity: r.severity as ModerationReport["severity"],
    status: r.status as ModerationReport["status"],
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewedBy: r.reviewed_by ? nameOf(r.reviewed_by) : undefined,
    resolution: r.resolution ?? undefined,
    demo: r.is_demo,
  }));

  type VIdx = { id: string; owner_id: string; title: string; summary: string; industry: string; stage: string; geography: string; visibility: string; status: string; review_status: string | null; review_note: string | null; reviewed_at: string | null; publication: string; featured: boolean; research_status: string; validation_status: string; is_demo: boolean; created_at: string; updated_at: string; member_count: number };
  const ideas: Idea[] = (check("venture index", ventureIdx) as unknown as VIdx[]).map((v) => ({
    id: v.id,
    title: v.title,
    summary: v.summary,
    problem: "",
    solution: "",
    industry: v.industry as IndustryId,
    targetUsers: "",
    geography: v.geography,
    stage: v.stage as Idea["stage"],
    existingResearch: "",
    requiredSkills: [],
    collaborationNeeds: "",
    visibility: v.visibility as Idea["visibility"],
    ownerId: me(v.owner_id),
    team: [{ personId: me(v.owner_id), role: "Founder" }],
    updates: [],
    researchStatus: v.research_status as Idea["researchStatus"],
    validationStatus: v.validation_status as Idea["validationStatus"],
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    status: v.status as Idea["status"],
    demo: v.is_demo,
    followers: 0,
    review: v.review_status ? { status: v.review_status as NonNullable<Idea["review"]>["status"], note: v.review_note ?? undefined, reviewedAt: v.reviewed_at ?? undefined } : undefined,
    publication: v.publication as Idea["publication"],
    featured: v.featured,
    access: "admin_index",
    memberCount: Number(v.member_count),
  }));

  type RIdx = { id: string; owner_id: string; venture_id: string | null; question: string; depth: string; archived: boolean; created_at: string; run_status: string | null; provenance: string | null; failure_reason: string | null; finding_count: number; source_count: number; is_demo: boolean };
  const research: ResearchReport[] = (check("research index", researchIdx) as unknown as RIdx[])
    .filter((r) => r.owner_id !== uid)
    .map((r) => ({
      id: r.id,
      question: r.question,
      ideaId: r.venture_id,
      categories: [],
      depth: r.depth as ResearchReport["depth"],
      createdAt: r.created_at,
      sections: [],
      sources: [],
      provenance: r.provenance === "live" ? "live" : "demo",
      saved: false,
      ownerId: me(r.owner_id),
      runStatus: r.run_status === "failed" || r.run_status === "provider_not_configured" ? "failed" : "completed",
      failureReason: r.failure_reason ?? undefined,
      archived: r.archived,
      adminIndexOnly: true,
      findingCount: Number(r.finding_count),
      sourceCount: Number(r.source_count),
    }));

  type WIdx = { workspace_id: string; venture_id: string; venture_title: string; owner_id: string; updated_at: string; sections_done: number; evidence_count: number; people_evidence: number; framework_evidence: number; downgraded: number };
  const validations: Record<string, ValidationWorkspace> = {};
  (check("validation index", validationIdx) as unknown as WIdx[]).forEach((w) => {
    validations[w.venture_id] = {
      ideaId: w.venture_id,
      workspaceId: w.workspace_id,
      sections: Object.fromEntries(VALIDATION_SECTIONS.map((v) => [v.id, { status: "not_started", notes: "" }])) as ValidationWorkspace["sections"],
      evidence: [],
      openQuestions: [],
      updatedAt: w.updated_at,
      adminIndexOnly: true,
      counts: { sectionsDone: Number(w.sections_done), evidence: Number(w.evidence_count), peopleEvidence: Number(w.people_evidence), frameworkEvidence: Number(w.framework_evidence), downgraded: Number(w.downgraded) },
    };
  });

  const settingsRow = check("platform settings", settingsRes) as Row<"platform_settings"> | null;
  const cfg = (settingsRow?.config ?? {}) as Partial<PlatformConfig>;
  const base = defaultConfig();
  const config: PlatformConfig | null = settingsRow
    ? {
        identity: { ...base.identity, ...cfg.identity },
        features: { communityPosting: settingsRow.community_posting, opportunityRegistration: settingsRow.opportunity_registration, studiesRecruiting: settingsRow.studies_recruiting },
        moderation: { ...base.moderation, ...cfg.moderation },
        notifications: { ...base.notifications, ...cfg.notifications },
        retention: { ...base.retention, ...cfg.retention },
        maintenance: { ...base.maintenance, ...cfg.maintenance },
        security: { ...base.security, ...cfg.security },
        taxonomy: { ...base.taxonomy, ...cfg.taxonomy },
      }
    : null;
  const settings = settingsRow ? { openRegistration: settingsRow.open_registration, requireIdeaReview: settingsRow.require_idea_review, researchEnabled: settingsRow.research_enabled } : null;

  const deliveries = check("deliveries", deliveriesRes) as Row<"announcement_deliveries">[];
  const annRows = check("announcements", annRes) as Row<"announcements">[];
  const announcements: Announcement[] | undefined = annRows.length || perm("communications")
    ? annRows.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        audience: a.audience as RoleId[],
        channels: a.channels as Announcement["channels"],
        status: a.status as Announcement["status"],
        scheduledFor: a.scheduled_for ?? undefined,
        publishedAt: a.published_at ?? undefined,
        createdAt: a.created_at,
        createdBy: nameOf(a.created_by),
        deliveries: deliveries.filter((d) => d.announcement_id === a.id).map((d) => ({ channel: d.channel as "in_app", status: d.status as "delivered_in_app", detail: d.detail, at: d.created_at })),
      }))
    : undefined;

  const institutionRequests: InstitutionRequest[] = (check("institution requests", instReqRes) as Row<"institution_requests">[]).map((r) => ({
    id: r.id,
    requestType: r.request_type as InstitutionRequest["requestType"],
    institutionId: r.institution_id ?? undefined,
    proposedName: r.proposed_name ?? undefined,
    proposedKind: r.proposed_kind ?? undefined,
    requesterId: me(r.requested_by),
    position: r.position_title ?? undefined,
    note: r.note,
    status: r.status as InstitutionRequest["status"],
    createdAt: r.created_at,
  }));

  const platform: Partial<PlatformState> = {
    institutionRequests,
    people: perm("users") ? people : undefined,
    accounts,
    reports,
    ideas,
    research,
    validations,
    adminTeam,
    rolePermissions,
    announcements,
  };
  return { platform, audit, settings, config };
}

export { strArr };
