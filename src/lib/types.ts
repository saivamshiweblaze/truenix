/* Core domain models. Shared by demo data, mock services and future real services. */

export type RoleId =
  | "student_idea"
  | "student_explorer"
  | "founder"
  | "expert"
  | "mentor"
  | "participant"
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
export type Visibility = "private" | "reviewers" | "public_summary";
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
}

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
}

export interface TeamMember {
  personId: string;
  role: string;
}

export interface IdeaUpdate {
  id: string;
  date: string;
  title: string;
  body: string;
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

export interface Post {
  id: string;
  kind: PostKind;
  authorId: string;
  title: string;
  body: string;
  industries: IndustryId[];
  ideaId?: string;
  createdAt: string;
  likes: number;
  demo: boolean;
}

export interface Comment {
  id: string;
  targetId: string;
  authorId: string;
  body: string;
  createdAt: string;
  demo: boolean;
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
  | "industry";

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
  target: string;
  createdAt: string;
}
