import { EXPERIENCE, INDUSTRIES, SKILLS, STAGES } from "./taxonomy";

export interface Option {
  value: string;
  label: string;
  description?: string;
}

const list = (items: readonly string[]): Option[] => items.map((v) => ({ value: v, label: v }));

export const INDUSTRY_OPTIONS: Option[] = INDUSTRIES.map((i) => ({ value: i.id, label: i.label }));
export const SKILL_OPTIONS = list(SKILLS);
export const EXPERIENCE_OPTIONS: Option[] = EXPERIENCE.map((e) => ({ value: e.id, label: e.label }));
export const STAGE_OPTIONS: Option[] = STAGES.map((s) => ({ value: s.id, label: s.label }));

export const AREAS_OF_INTEREST = list([
  "Product management",
  "Software engineering",
  "Hardware and electronics",
  "Data and AI",
  "Design and user experience",
  "Scientific research",
  "Marketing and growth",
  "Sales and partnerships",
  "Operations",
  "Finance",
  "Policy and law",
  "Social impact",
]);

/* ---------- Education ----------
   Level → qualification → status → only the details that apply.
   Nobody is assumed to be a current student because of the qualification they chose. */

export type EducationLevel = "undergraduate" | "postgraduate" | "doctoral" | "other";

export const EDUCATION_LEVELS: Option[] = [
  { value: "undergraduate", label: "Undergraduate", description: "Bachelor’s degree or equivalent" },
  { value: "postgraduate", label: "Postgraduate", description: "Master’s degree, MBA or equivalent" },
  { value: "doctoral", label: "Doctoral", description: "PhD or another doctorate" },
  { value: "other", label: "Other / professional qualification", description: "Diploma, certification or professional exam" },
];

export const QUALIFICATIONS: Record<Exclude<EducationLevel, "other">, Option[]> = {
  undergraduate: [
    { value: "btech", label: "B.Tech / B.E." },
    { value: "bsc", label: "B.Sc." },
    { value: "bcom", label: "B.Com." },
    { value: "bba", label: "BBA" },
    { value: "ba", label: "BA" },
    { value: "other", label: "Other (enter it)" },
  ],
  postgraduate: [
    { value: "mtech", label: "M.Tech / M.E." },
    { value: "msc", label: "M.Sc." },
    { value: "mba", label: "MBA" },
    { value: "mca", label: "MCA" },
    { value: "ma", label: "MA" },
    { value: "other", label: "Other (enter it)" },
  ],
  doctoral: [
    { value: "phd", label: "PhD" },
    { value: "other", label: "Other doctoral qualification (enter it)" },
  ],
};

export const ACADEMIC_STATUS: Option[] = [
  { value: "studying", label: "Currently studying" },
  { value: "graduated", label: "Graduated" },
  { value: "break", label: "On a break" },
  { value: "other", label: "Other" },
];

/** Year of study, where a year applies. Doctoral study uses stages instead. */
export const STUDY_YEARS: Record<"undergraduate" | "postgraduate", Option[]> = {
  undergraduate: list(["First year", "Second year", "Third year", "Fourth year", "Fifth year"]),
  postgraduate: list(["First year", "Second year", "Third year"]),
};

export const DOCTORAL_STAGES = list(["Coursework", "Research", "Writing the thesis", "Thesis submitted"]);

/** The current calendar year, read once on the client (onboarding is client-rendered). */
const thisYear = () => new Date().getFullYear();

/** Expected completion: this year to eight years ahead. */
export const expectedYears = (): Option[] => list(Array.from({ length: 9 }, (_, i) => String(thisYear() + i)));

/** Completed: this year back forty-five years. */
export const completedYears = (): Option[] => list(Array.from({ length: 46 }, (_, i) => String(thisYear() - i)));

/* ---------- Preferences (see features/preferences/preferences.ts) ---------- */

export const TECHNOLOGY_OPTIONS = list([
  "Artificial intelligence",
  "Machine learning",
  "Internet of things",
  "Robotics",
  "Biotechnology",
  "Clean energy technology",
  "Cloud and SaaS",
  "Cybersecurity",
  "Blockchain",
  "AR and VR",
  "Drones",
  "Semiconductors",
  "Advanced materials",
  "Space technology",
]);

export const GOAL_OPTIONS = list([
  "Start a company",
  "Join a startup",
  "Find a co-founder",
  "Build a portfolio of projects",
  "Learn how startups work",
  "Commercialise research",
  "Raise funding",
  "Hire people",
  "Mentor others",
  "Grow my network",
]);

export const STARTUP_INTERESTS = list([
  "Starting my own venture",
  "Joining an early-stage team",
  "Social enterprise",
  "Deep technology",
  "Commercialising research",
  "Project-based work",
]);

export const CONTRIBUTION_AREAS = list([
  "Building the product",
  "Engineering",
  "Design",
  "Research and validation",
  "Marketing",
  "Sales",
  "Operations",
  "Fundraising support",
]);

export const COLLABORATION_PREFS = list(["Remote", "In person", "Hybrid", "A few hours a week", "Part-time", "Full-time", "Paid roles", "Equity or volunteer"]);

export const YES_NO: Option[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export const HAS_IDEA: Option[] = [
  { value: "yes", label: "Yes, I have an idea", description: "You’ll start with tools to research and validate it." },
  { value: "no", label: "Not yet", description: "You’ll start by discovering problems and projects." },
];

export const LOOKING_TO_JOIN: Option[] = [
  { value: "yes", label: "Yes, I’d like to join a project", description: "Founders can find you when they search by skill." },
  { value: "no", label: "Not right now", description: "You can change this later in your profile." },
];

export const FOUNDER_NEEDS = list(["Co-founders", "Engineers", "Designers", "Mentors", "Expert reviewers", "Research participants", "Incubation", "Funding"]);

export const PROFESSIONAL_CONTRIBUTIONS = list([
  "Review ideas in my field",
  "Advise founders",
  "Join an early-stage team",
  "Hire from the community",
  "Take part in research",
  "Speak or run workshops",
]);

export const EXPERT_MODES: Option[] = [
  { value: "expert", label: "Expert reviewer", description: "Review ideas and answer questions in your domain." },
  { value: "mentor", label: "Mentor", description: "Guide founders and students over several conversations." },
];

export const MENTOR_FOCUS = list([
  "Problem discovery",
  "Market research",
  "Validation and experiments",
  "Product",
  "Go-to-market",
  "Fundraising",
  "Technical architecture",
  "Regulation",
]);

export const AVAILABILITY = list(["1–2 hours a month", "3–5 hours a month", "6–10 hours a month", "More than 10 hours a month"]);

export const STUDY_FORMATS = list(["Video interviews", "In-person interviews", "Surveys", "Prototype testing", "Diary studies"]);

export const CONTACT_PREFS: Option[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

export const INSTITUTION_TYPES = list(["University", "College", "Research institute", "Incubator", "Accelerator", "Government body", "Industry association", "Other"]);

export const INSTITUTION_PROGRAMMES = list([
  "Pre-incubation",
  "Incubation",
  "Hackathons",
  "Innovation challenges",
  "Entrepreneurship courses",
  "Mentorship",
  "Research commercialisation",
  "Grants or seed funding",
]);

export const INSTITUTION_GOALS = list(["Follow student projects", "Publish opportunities", "Find mentors", "Partner with industry", "Run challenges"]);
