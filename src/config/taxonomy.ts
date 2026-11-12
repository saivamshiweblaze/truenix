import type {
  EvidenceType,
  ExperienceLevel,
  IdeaStage,
  IndustryId,
  OpportunityKind,
  PostKind,
  ResearchCategory,
  RoleId,
  ValidationSectionId,
  Visibility,
} from "@/lib/types";

export const INDUSTRIES: { id: IndustryId; label: string }[] = [
  { id: "ai", label: "Artificial intelligence" },
  { id: "healthcare", label: "Healthcare" },
  { id: "agriculture", label: "Agriculture" },
  { id: "education", label: "Education" },
  { id: "finance", label: "Finance" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "robotics", label: "Robotics" },
  { id: "sustainability", label: "Sustainability" },
  { id: "biotech", label: "Biotechnology" },
  { id: "consumer", label: "Consumer technology" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "energy", label: "Energy" },
  { id: "logistics", label: "Logistics" },
  { id: "spacetech", label: "Space technology" },
  { id: "mobility", label: "Mobility" },
  { id: "water", label: "Water and sanitation" },
];

export const industryLabel = (id: IndustryId) => INDUSTRIES.find((i) => i.id === id)?.label ?? id;

export interface RoleDef {
  id: RoleId;
  label: string;
  short: string;
  description: string;
}

export const ROLES: RoleDef[] = [
  { id: "student_idea", label: "Student with an idea", short: "Student founder", description: "You have an idea and want to research, test and build it." },
  { id: "student_explorer", label: "Student exploring", short: "Explorer", description: "No idea yet. You want to discover problems, people and projects." },
  { id: "founder", label: "Independent founder", short: "Founder", description: "You are building a venture and need research, talent and feedback." },
  { id: "expert", label: "Professional or industry expert", short: "Expert", description: "You review ideas and share knowledge from your field." },
  { id: "mentor", label: "Mentor", short: "Mentor", description: "You guide founders and students through their early decisions." },
  { id: "participant", label: "Research participant", short: "Participant", description: "You take part in interviews and studies that help founders learn." },
  { id: "institution_admin", label: "Institution administrator", short: "Institution", description: "You run innovation programmes for a university or institution." },
  { id: "platform_admin", label: "Platform administrator", short: "Platform admin", description: "You operate and moderate the platform." },
];

/** Roles offered during self-service onboarding. Admin roles are assigned, not chosen. */
export const SELF_SERVE_ROLES = ROLES.filter((r) => r.id !== "platform_admin" && r.id !== "institution_admin");

export const roleLabel = (id: RoleId) => ROLES.find((r) => r.id === id)?.label ?? id;
export const roleShort = (id: RoleId) => ROLES.find((r) => r.id === id)?.short ?? id;

export const STAGES: { id: IdeaStage; label: string; hint: string }[] = [
  { id: "concept", label: "Concept", hint: "A problem and a direction" },
  { id: "research", label: "Researching", hint: "Studying the market and users" },
  { id: "validation", label: "Validating", hint: "Testing assumptions with evidence" },
  { id: "prototype", label: "Prototype", hint: "Something people can try" },
  { id: "pilot", label: "Pilot", hint: "Running with real users" },
  { id: "launched", label: "Launched", hint: "Available to customers" },
];
export const stageLabel = (id: IdeaStage) => STAGES.find((s) => s.id === id)?.label ?? id;

export const VISIBILITY: { id: Visibility; label: string; explanation: string }[] = [
  { id: "private", label: "Private", explanation: "Only you and team members you add can see this idea. It is not listed anywhere." },
  { id: "reviewers", label: "Selected reviewers", explanation: "Only you, your team, and reviewers you invite can read the full idea." },
  { id: "public_summary", label: "Public summary", explanation: "The title, summary, industry and stage are listed publicly. Problem and solution details stay visible to signed-in members." },
];

export const EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "learning", label: "Still studying" },
  { id: "early", label: "0–2 years working" },
  { id: "mid", label: "3–7 years" },
  { id: "senior", label: "8–15 years" },
  { id: "leader", label: "15+ years or leading teams" },
];

export const SKILLS = [
  "Product design", "Frontend", "Backend", "Mobile", "Machine learning", "Data analysis",
  "Hardware", "Embedded systems", "Mechanical design", "Biology lab work", "Clinical knowledge",
  "Sales", "Marketing", "Finance", "Operations", "Supply chain", "Policy and regulation",
  "User research", "Writing", "Community building", "Fundraising", "Legal",
];

export const POST_KIND_LABEL: Record<PostKind, string> = {
  idea: "Startup idea",
  technology: "Emerging technology",
  problem: "Industry problem",
  project: "Project",
  founder_update: "Founder update",
  research: "Research finding",
  trend: "Industry trend",
  collaboration: "Looking for collaborators",
  challenge: "Innovation challenge",
  question: "Question",
  discussion: "Discussion",
};

export const OPPORTUNITY_KIND_LABEL: Record<OpportunityKind, string> = {
  incubator: "Incubator",
  accelerator: "Accelerator",
  hackathon: "Hackathon",
  competition: "Startup competition",
  grant: "Grant",
  challenge: "Innovation challenge",
  mentorship: "Mentorship programme",
  university: "University programme",
  event: "Event",
  industry: "Industry programme",
};

export const RESEARCH_CATEGORIES: { id: ResearchCategory; label: string }[] = [
  { id: "market", label: "Market" },
  { id: "competitor", label: "Competitors" },
  { id: "industry", label: "Industry" },
  { id: "customer", label: "Customers" },
  { id: "technology", label: "Technology" },
  { id: "business_model", label: "Business model" },
  { id: "opportunity", label: "Market opportunity" },
  { id: "regulatory", label: "Regulation" },
  { id: "trends", label: "Emerging trends" },
];

export const VALIDATION_SECTIONS: { id: ValidationSectionId; label: string; prompt: string }[] = [
  { id: "problem", label: "Problem validation", prompt: "Who has this problem, how often, and what does it cost them today?" },
  { id: "solution", label: "Solution assessment", prompt: "Does the proposed solution remove the cost you described? What must be true?" },
  { id: "market", label: "Market opportunity", prompt: "How many people or organisations have this problem, and how do they buy?" },
  { id: "competitors", label: "Competitor landscape", prompt: "What do people use today, including spreadsheets and doing nothing?" },
  { id: "segments", label: "Customer segments", prompt: "Which segment feels the problem most and can decide to pay?" },
  { id: "business_model", label: "Business model", prompt: "Who pays, how much, and how often? What does it cost to serve them?" },
  { id: "feasibility", label: "Technical feasibility", prompt: "What is the hardest part to build, and has anyone built it before?" },
  { id: "risks", label: "Market risks", prompt: "What could stop adoption: regulation, trust, timing, distribution?" },
  { id: "differentiation", label: "Differentiation", prompt: "Why would someone switch from what they do today?" },
  { id: "customer_validation", label: "Customer validation", prompt: "Record what real people said and did. Only add responses you actually collected." },
  { id: "expert_feedback", label: "Expert feedback", prompt: "Record reviews from people with domain experience, with their name or role." },
  { id: "experiments", label: "Experiment planning", prompt: "Design the smallest test that could prove a key assumption wrong." },
];

export const EVIDENCE_TYPES: { id: EvidenceType; label: string; explanation: string }[] = [
  { id: "assumption", label: "Assumption", explanation: "Something you believe but have not tested yet." },
  { id: "ai_analysis", label: "AI analysis", explanation: "Generated reasoning. Useful for direction, not proof." },
  { id: "public_research", label: "Public research", explanation: "Published reports, datasets or articles you can cite." },
  { id: "expert_opinion", label: "Expert opinion", explanation: "A view from someone with domain experience." },
  { id: "customer_response", label: "Customer response", explanation: "Something a real potential customer said or did." },
  { id: "experiment_result", label: "Experiment result", explanation: "Measured outcome from a test you ran." },
];
export const evidenceLabel = (id: EvidenceType) => EVIDENCE_TYPES.find((e) => e.id === id)?.label ?? id;
