/* Core domain models. Shared by demo data, mock services and future real services. */

export type RoleId =
  | "student_idea"
  | "student_explorer"
  | "founder"
  | "professional"
  | "expert"
  | "mentor"
  | "participant"
  | "institution_rep"
  | "institution_admin"
  | "platform_admin";

export type IndustryId =
  | "ai"
  | "healthcare"
  | "agriculture"
  | "education"
  | "finance"
  | "manufacturing"
  | "robotics"
  | "sustainability"
  | "biotech"
  | "consumer"
  | "cybersecurity"
  | "energy"
  | "logistics"
  | "spacetech"
  | "mobility"
  | "water";

export type IdeaStage = "concept" | "research" | "validation" | "prototype" | "pilot" | "launched";
/**
 * Who can see a venture. Members always can. Explicit disclosures (collaborators, invited reviewers,
 * an institution) apply only while the venture is not private. Only public_summary creates a public listing,
 * and that listing is a separate summary record — never the confidential venture itself.
 */
export type Visibility = "private" | "collaborators" | "reviewers" | "institution" | "public_summary";
export type ExperienceLevel = "learning" | "early" | "mid" | "senior" | "leader";

export interface Person {
  id: string;
  name: string;
  headline: string;
  organisation: string;
  location: string;
  role: RoleId;
  skills: string[];
  interests: IndustryId[];
  experience: { title: string; org: string; period: string }[];
  collaboration: string[];
  bio: string;
  /** Seeded demonstration profile. */
  demo: boolean;
  avatarUrl?: string;
}

/** Profile family chosen during onboarding; each has its own required fields. */
export type OnboardingRole = "student" | "founder" | "professional" | "expert_mentor" | "participant" | "institution";

/**
 * Metadata for a file the person attached. The file itself is never persisted in Phase 1.5:
 * "session" means it was held in memory for the tab where it was attached.
 */
export interface FileMeta {
  name: string;
  size: number;
  type: string;
  addedAt: string;
  /** "session": held in memory for this tab only. "stored": uploaded to Supabase Storage. */
  storage: "session" | "stored";
  id?: string;
  bucket?: string;
  path?: string;
}

export type ProfileValue = string | string[];

export interface CurrentUser {
  id: "me";
  name: string;
  email: string;
  role: RoleId;
  headline: string;
  organisation: string;
  location: string;
  bio: string;
  interests: IndustryId[];
  skills: string[];
  industries: IndustryId[];
  experience: ExperienceLevel;
  collaboration: string[];
  emailVerified: boolean;
  onboarded: boolean;
  joinedAt: string;
  /** Normalised +digits. Unverified until an SMS provider is connected. */
  phone?: string;
  phoneVerified?: boolean;
  linkedin?: string;
  profileKind?: OnboardingRole;
  /** Role-specific onboarding answers, keyed by field id (see features/onboarding/config.ts). */
  profile?: Record<string, ProfileValue>;
  documents?: { resume?: FileMeta; photo?: FileMeta };
  /** Self-service persona chosen at onboarding (role may differ when a privileged role is granted). */
  persona?: RoleId;
  avatarUrl?: string;
}

export interface TeamMember {
  personId: string;
  role: string;
  memberRole?: "owner" | "editor" | "collaborator";
}

export interface IdeaUpdate {
  id: string;
  date: string;
  title: string;
  body: string;
  isPublic?: boolean;
}

export interface Idea {
  id: string;
  title: string;
  summary: string;
  problem: string;
  solution: string;
  industry: IndustryId;
  targetUsers: string;
  geography: string;
  stage: IdeaStage;
  existingResearch: string;
  requiredSkills: string[];
  collaborationNeeds: string;
  visibility: Visibility;
  ownerId: string;
  team: TeamMember[];
  updates: IdeaUpdate[];
  researchStatus: "none" | "in_progress" | "report_available";
  validationStatus: "not_started" | "in_progress" | "evidence_collected";
  createdAt: string;
  updatedAt: string;
  status: "draft" | "submitted";
  demo: boolean;
  followers: number;
  /** Platform review of a submitted idea. Absent = not yet reviewed. */
  review?: IdeaReview;
  /** Listing state set by administrators. Absent = published (when the owner made it public). */
  publication?: "published" | "unpublished" | "archived";
  featured?: boolean;
  history?: RecordEvent[];
  institutionId?: string;
  /**
   * How the viewer can see this record: as a member, through a disclosure, through the public summary only,
   * or (administrators) through the metadata index without confidential fields.
   */
  access?: "member" | "disclosed" | "public_summary" | "admin_index";
  memberCount?: number;
}

export interface RecordEvent {
  id: string;
  at: string;
  by: string;
  text: string;
}

export interface IdeaReview {
  status: "pending" | "approved" | "changes_requested" | "rejected";
  note?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

/** Moderation state for member-generated content. Absent = visible and never reviewed. */
export interface ContentModeration {
  status: "visible" | "pending_review" | "hidden" | "removed";
  reason?: string;
  pinned?: boolean;
  featured?: boolean;
  updatedAt: string;
  by: string;
}

export type PostKind =
  | "idea"
  | "technology"
  | "problem"
  | "project"
  | "founder_update"
  | "research"
  | "trend"
  | "collaboration"
  | "challenge"
  | "question"
  | "discussion";

/**
 * A small data figure drawn from numbers stated in the post itself.
 * Rendered as an inline chart; no image or media hosting is involved.
 */
export type PostFigure =
  | { kind: "bars"; caption: string; unit: string; items: { label: string; value: number; highlight?: boolean }[] }
  | { kind: "stat"; value: string; label: string };

export interface Post {
  id: string;
  kind: PostKind;
  authorId: string;
  title: string;
  body: string;
  industries: IndustryId[];
  ideaId?: string;
  /** Optional figure; only for numbers the post's own text states. */
  figure?: PostFigure;
  createdAt: string;
  likes: number;
  demo: boolean;
  moderation?: ContentModeration;
}

export interface Comment {
  id: string;
  targetId: string;
  targetType?: "post" | "idea";
  authorId: string;
  body: string;
  createdAt: string;
  demo: boolean;
  moderation?: ContentModeration;
}

export type OpportunityKind =
  | "incubator"
  | "accelerator"
  | "hackathon"
  | "competition"
  | "grant"
  | "challenge"
  | "mentorship"
  | "university"
  | "event"
  | "industry"
  | "internship"
  | "scholarship"
  | "workshop"
  | "startup_programme";

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  organisation: string;
  description: string;
  eligibility: string;
  industries: IndustryId[];
  location: string;
  deadline: string;
  stage: IdeaStage[];
  officialUrl: string | null;
  demo: boolean;
  /* ---- Managed in the admin portal. All optional so older records stay valid. ---- */
  /** Absent = published. */
  publication?: OpportunityPublication;
  featured?: boolean;
  /** "weblaze": run on TRUEVIX by Weblaze. "external": listed from another organiser's own channel. */
  source?: "weblaze" | "external";
  /** The original organiser's page, for external listings. */
  sourceUrl?: string | null;
  sourceVerification?: "unverified" | "verified" | "needs_recheck";
  lastCheckedAt?: string;
  organiserId?: string;
  education?: string;
  format?: "online" | "offline" | "hybrid";
  registrationOpens?: string;
  eventStart?: string;
  eventEnd?: string;
  teamMin?: number;
  teamMax?: number;
  prizes?: string;
  instructions?: string;
  contact?: string;
  /** "on_platform": members register through TRUEVIX. "external": they apply on the organiser's site. */
  registrationMode?: "on_platform" | "external" | "none";
  banner?: FileMeta;
  documents?: FileMeta[];
  hackathon?: HackathonConfig;
  resultsPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  history?: RecordEvent[];
}

export type OpportunityPublication = "draft" | "published" | "unpublished" | "archived";

export interface HackathonRound {
  id: string;
  name: string;
  deadline: string;
  description: string;
}

export interface HackathonConfig {
  rounds: HackathonRound[];
  criteria: { id: string; label: string; weight: number }[];
  /** Person ids of assigned judges. */
  judges: string[];
  winners: { registrationId: string; place: string }[];
  certificates: { template?: FileMeta; issuedTo: string[] };
  communications: { id: string; at: string; subject: string; body: string; audience: "all" | "shortlisted" | "selected" }[];
}

export type RegistrationStatus = "submitted" | "under_review" | "info_requested" | "shortlisted" | "rejected" | "selected" | "withdrawn";

export interface Registration {
  id: string;
  opportunityId: string;
  /** Person id of the lead applicant ("me" for the signed-in member). */
  applicantId: string;
  mode: "individual" | "team";
  teamName?: string;
  members: { name: string; role: string; personId?: string }[];
  statement: string;
  status: RegistrationStatus;
  submissions: { id: string; roundId: string; title: string; link?: string; files: FileMeta[]; at: string }[];
  scores: { id: string; roundId: string; judgeId: string; criterionId: string; score: number }[];
  /** Internal reviewer notes. Never shown to the applicant. */
  notes: { id: string; at: string; by: string; text: string }[];
  history: RecordEvent[];
  createdAt: string;
  demo: boolean;
}

export type ResearchCategory =
  | "market"
  | "competitor"
  | "industry"
  | "customer"
  | "technology"
  | "business_model"
  | "opportunity"
  | "regulatory"
  | "trends";

export type ResearchDepth = "scan" | "standard" | "deep";

export interface ResearchSource {
  id: string;
  title: string;
  kind: string;
  note: string;
  url: string | null;
}

export interface ResearchSection {
  id: string;
  heading: string;
  body: string;
  bullets?: string[];
}

export interface ResearchReport {
  id: string;
  question: string;
  ideaId: string | null;
  categories: ResearchCategory[];
  depth: ResearchDepth;
  createdAt: string;
  sections: ResearchSection[];
  sources: ResearchSource[];
  /** "demo" means generated locally without a live model or search provider. */
  provenance: "demo" | "live";
  saved: boolean;
  /** Requesting member. Absent = the signed-in member. */
  ownerId?: string;
  runStatus?: "completed" | "failed";
  failureReason?: string;
  archived?: boolean;
  /** Administrators see metadata only until they open the report with a recorded reason. */
  adminIndexOnly?: boolean;
  findingCount?: number;
  sourceCount?: number;
}

export type EvidenceType =
  | "ai_analysis"
  | "public_research"
  | "expert_opinion"
  | "customer_response"
  | "experiment_result"
  | "assumption";

export interface EvidenceItem {
  id: string;
  sectionId: ValidationSectionId;
  type: EvidenceType;
  text: string;
  source: string;
  createdAt: string;
  /** Generated locally without a real model/provider. */
  demoGenerated: boolean;
}

export type ValidationSectionId =
  | "problem"
  | "solution"
  | "market"
  | "competitors"
  | "segments"
  | "business_model"
  | "feasibility"
  | "risks"
  | "differentiation"
  | "customer_validation"
  | "expert_feedback"
  | "experiments";

export type SectionStatus = "not_started" | "in_progress" | "done";

export interface ValidationWorkspace {
  ideaId: string;
  sections: Record<ValidationSectionId, { status: SectionStatus; notes: string }>;
  evidence: EvidenceItem[];
  openQuestions: { id: string; text: string; resolved: boolean }[];
  updatedAt: string;
  workspaceId?: string;
  adminIndexOnly?: boolean;
  counts?: { sectionsDone: number; evidence: number; peopleEvidence: number; frameworkEvidence: number; downgraded: number };
}

export interface Notification {
  id: string;
  kind: "comment" | "follow" | "collaboration" | "opportunity" | "research" | "review" | "system" | "message";
  title: string;
  body: string;
  href: string;
  createdAt: string;
  demo: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  participantId: string;
  subject: string;
  kind: "direct" | "collaboration_request" | "review_request";
  demo: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  text: string;
  href?: string;
  createdAt: string;
}

export interface Application {
  opportunityId: string;
  status: "interested" | "preparing" | "submitted";
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  /** Human-readable label of the record acted on. */
  target: string;
  createdAt: string;
  actorRole?: string;
  /** Entity type, e.g. "user" or "opportunity". */
  entity?: string;
  targetId?: string;
  before?: string;
  after?: string;
  reason?: string;
  /** Marks access to private or confidential information. */
  sensitive?: boolean;
}

/* ---------------- Platform administration ---------------- */

export type AccountStatus = "active" | "restricted" | "suspended" | "deactivated";

/**
 * Private account record for a member, kept apart from the public Person profile so
 * contact details and account status never travel with profile data.
 */
export interface MemberAccount {
  personId: string;
  email: string;
  phone?: string;
  linkedin?: string;
  registeredAt: string;
  lastActiveAt: string;
  onboarding: { completed: boolean; step: number; totalSteps: number; profileKind?: OnboardingRole };
  education?: { level: string; qualification: string; status: string; year?: string };
  designation?: string;
  institutionId?: string;
  /** "simulated": the member completed the on-screen step. No email was sent. */
  emailVerification: "none" | "simulated";
  /** No SMS provider is connected, so phone numbers are never verified in Phase 1. */
  phoneVerification: "unverified";
  resume?: FileMeta;
  status: AccountStatus;
  statusReason?: string;
  /** Internal note, visible to administrators only. */
  adminNote?: string;
  demo: boolean;
}

export type OrgKind = "university" | "college" | "incubator" | "accelerator" | "company" | "industry_partner" | "research_org";

export interface Institution {
  id: string;
  name: string;
  kind: OrgKind;
  location: string;
  website?: string;
  description: string;
  status: "pending" | "verified" | "rejected" | "archived";
  /**
   * "listed": appears on TRUEVIX with no agreement. "registered": the organisation has an account.
   * "partner_confirmed": a signed agreement is on file (reference required). Only the last may be called a partner.
   */
  relationship: "listed" | "registered" | "partner_confirmed";
  agreementRef?: string;
  representatives: string[];
  administrators: string[];
  logo?: FileMeta;
  documents: FileMeta[];
  programmes: { id: string; name: string; status: string; participants: number }[];
  request?: { submittedAt: string; submittedBy: string; note: string };
  members?: { personId: string; memberRole: string; status: string; joinedAt: string }[];
  createdAt: string;
  demo: boolean;
}

/** A member's request to register an institution or to be its representative/administrator. */
export interface InstitutionRequest {
  id: string;
  requestType: "register_institution" | "representative_access" | "administrator_access";
  institutionId?: string;
  proposedName?: string;
  proposedKind?: string;
  requesterId: string;
  position?: string;
  note: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  createdAt: string;
}

/** An invited expert review of a venture. Accepting grants the reviewer access; finishing revokes it. */
export interface ExpertReview {
  id: string;
  ideaId: string;
  ideaTitle: string;
  reviewerId: string;
  requestedBy: string;
  note: string;
  status: "requested" | "accepted" | "declined" | "completed" | "cancelled";
  feedback?: string;
  recommendation?: "proceed" | "revise" | "reconsider";
  dueOn?: string;
  createdAt: string;
}

export interface ModerationReport {
  id: string;
  targetType: "post" | "comment" | "idea" | "user" | "collaboration";
  targetId: string;
  targetLabel: string;
  reportedUserId: string;
  reporterId: string;
  reason: string;
  details: string;
  severity: "low" | "medium" | "high";
  status: "open" | "in_review" | "actioned" | "dismissed";
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: string;
  demo: boolean;
}

export interface TalentProfile {
  personId: string;
  kind: "expert" | "mentor";
  status: "applied" | "approved" | "rejected" | "paused";
  /**
   * What an administrator actually checked. Credentials stay self-declared until a reference
   * or document check is recorded; TRUEVIX never claims more than that.
   */
  verification: "self_declared" | "references_requested" | "admin_reviewed";
  yearsExperience?: number;
  availability: "available" | "limited" | "unavailable";
  hoursPerMonth: number;
  capacity: number;
  areas: string[];
  application?: { submittedAt: string; statement: string };
  reviewNote?: string;
  demo: boolean;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  ideaId?: string;
  focus: string;
  status: "proposed" | "active" | "completed" | "ended";
  startedAt: string;
  demo: boolean;
}

export interface Study {
  id: string;
  title: string;
  ownerId: string;
  ideaId?: string;
  description: string;
  format: string;
  eligibility: string;
  note: string;
  status: "draft" | "recruiting" | "in_progress" | "completed" | "closed";
  start: string;
  end: string;
  target: number;
  consentText: string;
  demo: boolean;
}

export interface StudyParticipation {
  id: string;
  studyId: string;
  personId: string;
  status: "applied" | "selected" | "not_selected" | "completed" | "withdrawn";
  consent: "not_recorded" | "given" | "withdrawn";
  consentAt?: string;
  appliedAt: string;
}

export interface Collaboration {
  id: string;
  kind: "request" | "invitation" | "cofounder_match" | "open_role";
  fromId: string;
  toId?: string;
  ideaId?: string;
  role: string;
  message: string;
  status: "open" | "pending" | "accepted" | "declined" | "closed";
  flagged?: { reason: string; at: string };
  createdAt: string;
  demo: boolean;
}

export type AnnouncementChannel = "in_app" | "banner" | "email";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  /** Empty = everyone. */
  audience: RoleId[];
  channels: AnnouncementChannel[];
  status: "draft" | "scheduled" | "published" | "archived";
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
  createdBy: string;
  deliveries: { channel: AnnouncementChannel; status: "delivered_in_app" | "shown_as_banner" | "not_sent"; detail: string; at: string }[];
}

export type CmsKind = "hero" | "banner" | "faq" | "help" | "footer_links" | "about_intro";

export interface CmsEntry {
  id: string;
  kind: CmsKind;
  label: string;
  /** Working copy edited in the admin portal. */
  draft: Record<string, string>;
  /** What the public site shows. Null = never published. */
  published: Record<string, string> | null;
  status: "draft" | "published" | "unpublished";
  versions: { version: number; fields: Record<string, string>; publishedAt: string; by: string }[];
  order: number;
  updatedAt: string;
}

export type AdminRoleId = "super_admin" | "platform_admin" | "user_manager" | "content_manager" | "opportunity_manager" | "institution_manager" | "moderator" | "analyst";
export type AdminPermission = "view" | "create" | "edit" | "approve" | "publish" | "suspend" | "archive" | "delete" | "export" | "manage_permissions";
export type AdminModuleId =
  | "overview"
  | "users"
  | "onboarding"
  | "ideas"
  | "content"
  | "moderation"
  | "research"
  | "validation"
  | "opportunities"
  | "institutions"
  | "talent"
  | "studies"
  | "collaboration"
  | "communications"
  | "cms"
  | "analytics"
  | "access"
  | "audit"
  | "settings";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRoleId;
  status: "active" | "deactivated";
  createdAt: string;
  lastActiveAt?: string;
  demo: boolean;
}
