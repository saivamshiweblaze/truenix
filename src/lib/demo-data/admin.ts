import type {
  AdminAccount,
  Announcement,
  CmsEntry,
  Collaboration,
  Idea,
  Institution,
  MemberAccount,
  Mentorship,
  ModerationReport,
  Opportunity,
  Person,
  Registration,
  ResearchReport,
  Study,
  StudyParticipation,
  TalentProfile,
  ValidationWorkspace,
} from "@/lib/types";

/**
 * Demonstration data for the platform administration portal (Phase 1.8).
 *
 * Everything here is fictional: people, emails (on the reserved .example domain),
 * phone numbers (reserved +91 00000 range), organisations and records. Remove this file
 * and the seeding in lib/store/platform.ts before launch; no application logic lives here.
 */

/* ---------------- Additional members (graduate, professional, incomplete onboarding) ---------------- */

export const ADMIN_EXTRA_PEOPLE: Person[] = [
  {
    id: "p-farah",
    name: "Farah Siddiqui",
    headline: "Recent data-science graduate looking for a health or climate team",
    organisation: "Savanna Polytechnic",
    location: "Nairobi, Kenya",
    role: "student_explorer",
    skills: ["Data analysis", "Machine learning", "Writing"],
    interests: ["healthcare", "sustainability"],
    experience: [{ title: "Graduate research assistant", org: "Savanna Polytechnic", period: "2025–2026" }],
    collaboration: ["Available full-time from January"],
    bio: "Final project on predicting clinic stock-outs from order history.",
    demo: true,
  },
  {
    id: "p-jonas",
    name: "Jonas Weber",
    headline: "Plant operations manager · food processing and packaging lines",
    organisation: "Mid-size food processor",
    location: "Hamburg, Germany",
    role: "professional",
    skills: ["Operations", "Supply chain", "Mechanical design"],
    interests: ["manufacturing", "sustainability", "logistics"],
    experience: [{ title: "Operations manager", org: "Food processing plant", period: "2015–present" }],
    collaboration: ["Applying to mentor packaging and manufacturing teams"],
    bio: "Twenty production lines, one question: what actually breaks on a Tuesday night shift.",
    demo: true,
  },
  {
    id: "p-ines",
    name: "Inês Duarte",
    headline: "New member",
    organisation: "Harbour College of Design",
    location: "Lisbon, Portugal",
    role: "student_idea",
    skills: [],
    interests: [],
    experience: [],
    collaboration: [],
    bio: "",
    demo: true,
  },
];

/* ---------------- Private account records ---------------- */

const acct = (personId: string, email: string, registeredAt: string, lastActiveAt: string, extra: Partial<MemberAccount> = {}): MemberAccount => ({
  personId,
  email,
  registeredAt,
  lastActiveAt,
  onboarding: { completed: true, step: 6, totalSteps: 6 },
  emailVerification: "simulated",
  phoneVerification: "unverified",
  status: "active",
  demo: true,
  ...extra,
});

export const ADMIN_ACCOUNTS_SEED: MemberAccount[] = [
  acct("p-ananya", "ananya.iyer@student.example", "2026-09-02T09:10:00Z", "2026-11-16T18:20:00Z", {
    phone: "+910000000101",
    linkedin: "https://www.linkedin.com/in/example-ananya",
    institutionId: "inst-northfield",
    education: { level: "Undergraduate", qualification: "B.E. Biomedical Engineering", status: "Studying", year: "Final year" },
    onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "student" },
    resume: { name: "ananya-iyer-resume.pdf", size: 182_000, type: "application/pdf", addedAt: "2026-09-02T09:20:00Z", storage: "session" },
  }),
  acct("p-tomas", "tomas@cauce.example", "2026-09-05T11:00:00Z", "2026-11-17T08:05:00Z", { designation: "Founder, Cauce", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "founder" } }),
  acct("p-wanjiru", "wanjiru.k@mail.example", "2026-09-09T07:30:00Z", "2026-11-12T10:00:00Z", { designation: "Agritech product lead", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-li", "li.wei@eastgate.example", "2026-09-14T03:00:00Z", "2026-11-10T06:40:00Z", { designation: "Postdoctoral researcher", institutionId: "inst-eastgate", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-amara", "amara.o@mail.example", "2026-09-18T12:00:00Z", "2026-11-17T21:30:00Z", { designation: "Mentor and angel investor", linkedin: "https://www.linkedin.com/in/example-amara", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-rohan", "rohan.m@student.example", "2026-09-21T14:15:00Z", "2026-11-15T16:45:00Z", {
    phone: "+910000000102",
    institutionId: "inst-northfield",
    education: { level: "Undergraduate", qualification: "B.Tech Computer Science", status: "Studying", year: "Second year" },
    onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "student" },
  }),
  acct("p-sofia", "sofia.l@hospital.example", "2026-09-26T08:00:00Z", "2026-11-06T09:30:00Z", { designation: "Clinical pharmacist", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-daniel", "daniel@railyard.example", "2026-10-01T10:00:00Z", "2026-11-14T12:10:00Z", { designation: "Founder, Railyard", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "founder" } }),
  acct("p-hana", "hana.sato@mail.example", "2026-10-04T01:00:00Z", "2026-11-13T02:00:00Z", { designation: "Product designer", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-marcus", "marcus.f@mail.example", "2026-10-09T17:00:00Z", "2026-11-02T18:00:00Z", {
    designation: "Security consultant",
    status: "restricted",
    statusReason: "Posting limited while a promotion report is reviewed.",
    onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" },
  }),
  acct("p-priya", "priya.r@school.example", "2026-10-14T05:00:00Z", "2026-11-07T11:00:00Z", { phone: "+910000000103", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "participant" } }),
  acct("p-elena", "elena.p@lab.example", "2026-10-20T09:00:00Z", "2026-11-11T15:00:00Z", { designation: "Materials scientist", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "founder" } }),
  acct("p-kofi", "kofi.asante@northfield.example", "2026-10-24T06:00:00Z", "2026-11-17T07:00:00Z", { designation: "Innovation cell coordinator", institutionId: "inst-northfield", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "institution" } }),
  acct("p-isabel", "isabel.c@orbital.example", "2026-10-30T02:00:00Z", "2026-11-09T04:00:00Z", { designation: "Payload engineer", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "expert_mentor" } }),
  acct("p-farah", "farah.s@graduate.example", "2026-11-04T10:00:00Z", "2026-11-16T10:30:00Z", {
    institutionId: "inst-savanna",
    education: { level: "Undergraduate", qualification: "B.Sc. Data Science", status: "Graduated", year: "2026" },
    onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "student" },
  }),
  acct("p-jonas", "jonas.weber@mail.example", "2026-11-09T08:00:00Z", "2026-11-16T19:00:00Z", { designation: "Operations manager", onboarding: { completed: true, step: 6, totalSteps: 6, profileKind: "professional" } }),
  acct("p-ines", "ines.d@student.example", "2026-11-15T13:00:00Z", "2026-11-15T13:12:00Z", {
    institutionId: "inst-harbour",
    emailVerification: "none",
    onboarding: { completed: false, step: 2, totalSteps: 6, profileKind: "student" },
  }),
];

/* ---------------- Institutions and organisations ---------------- */

export const ADMIN_INSTITUTIONS: Institution[] = [
  {
    id: "inst-northfield", name: "Northfield Institute of Technology", kind: "university", location: "Chennai, India",
    description: "Engineering institute running a pre-incubation programme and student challenges.",
    status: "verified", relationship: "registered", representatives: ["p-kofi"], administrators: ["p-kofi"], documents: [],
    programmes: [
      { id: "prog-1", name: "Pre-incubation programme, winter cohort", status: "Applications open", participants: 38 },
      { id: "prog-2", name: "Campus food-waste challenge", status: "Running", participants: 46 },
    ],
    createdAt: "2026-09-01T00:00:00Z", demo: true,
  },
  {
    id: "inst-eastgate", name: "Eastgate University", kind: "university", location: "Shenzhen, China",
    description: "University with a robotics lab whose researchers review automation ideas.",
    status: "verified", relationship: "listed", representatives: ["p-li"], administrators: [], documents: [], programmes: [],
    createdAt: "2026-09-12T00:00:00Z", demo: true,
  },
  {
    id: "inst-harbour", name: "Harbour College of Design", kind: "college", location: "Lisbon, Portugal",
    description: "Design college. Requested an institution account for its product-design students.",
    status: "pending", relationship: "listed", representatives: [], administrators: [], documents: [], programmes: [],
    request: { submittedAt: "2026-11-12T10:00:00Z", submittedBy: "Programme office (sample)", note: "We would like to run a spring design challenge for 60 students." },
    createdAt: "2026-11-12T10:00:00Z", demo: true,
  },
  {
    id: "inst-savanna", name: "Savanna Polytechnic", kind: "college", location: "Nairobi, Kenya",
    description: "Polytechnic with applied data-science and agriculture programmes.",
    status: "pending", relationship: "listed", representatives: [], administrators: [], documents: [], programmes: [],
    request: { submittedAt: "2026-11-14T08:30:00Z", submittedBy: "Industry liaison office (sample)", note: "Linking graduates to agritech teams." },
    createdAt: "2026-11-14T08:30:00Z", demo: true,
  },
  {
    id: "inst-greenhatch", name: "GreenHatch Climate Incubator", kind: "incubator", location: "Lisbon, Portugal",
    description: "Climate-hardware incubator. Listed because it runs a public cohort; no agreement with TRUEVIX.",
    status: "verified", relationship: "listed", representatives: [], administrators: [], documents: [], programmes: [],
    createdAt: "2026-10-02T00:00:00Z", demo: true,
  },
];

/* ---------------- Opportunity enrichment (applied over the public seed listings) ---------------- */

export const OPPORTUNITY_ADMIN_FIELDS: Record<string, Partial<Opportunity>> = {
  "o-agri-hack": {
    source: "weblaze", registrationMode: "on_platform", format: "online", featured: true,
    registrationOpens: "2026-11-01", eventStart: "2026-12-05", eventEnd: "2026-12-07", teamMin: 1, teamMax: 4,
    prizes: "Mentor hours and showcase slots for the top three teams. No cash prizes.",
    instructions: "Register as an individual or a team. Submit a problem statement in round one and a working demo link in round two.",
    contact: "hackathons@truevix.example", education: "Open to students, graduates and professionals.",
    hackathon: {
      rounds: [
        { id: "r1", name: "Problem statement", deadline: "2026-12-02", description: "One page: the farmer decision you will improve and the public data you will use." },
        { id: "r2", name: "Build and demo", deadline: "2026-12-07", description: "A working demo link and a three-minute walkthrough." },
      ],
      criteria: [
        { id: "c-impact", label: "Usefulness to smallholders", weight: 40 },
        { id: "c-data", label: "Sound use of public data", weight: 35 },
        { id: "c-clarity", label: "Clarity of the demo", weight: 25 },
      ],
      judges: ["p-wanjiru", "p-isabel"],
      winners: [],
      certificates: { issuedTo: [] },
      communications: [{ id: "com-1", at: "2026-11-10T09:00:00Z", subject: "Round one brief published", body: "The problem-statement template is now on the hackathon page.", audience: "all" }],
    },
    createdAt: "2026-10-20T00:00:00Z",
  },
  "o-health-challenge": { source: "external", sourceUrl: null, sourceVerification: "unverified", lastCheckedAt: "2026-11-10", registrationMode: "external", format: "hybrid", teamMin: 2, teamMax: 5, createdAt: "2026-10-05T00:00:00Z" },
  "o-greenhatch": { source: "external", sourceUrl: null, sourceVerification: "needs_recheck", lastCheckedAt: "2026-10-01", registrationMode: "external", organiserId: "inst-greenhatch", format: "offline", createdAt: "2026-10-02T00:00:00Z" },
  "o-northfield-preinc": { source: "external", sourceUrl: null, sourceVerification: "verified", lastCheckedAt: "2026-11-15", registrationMode: "external", organiserId: "inst-northfield", format: "offline", createdAt: "2026-10-10T00:00:00Z" },
  "o-seed-grant": { source: "external", sourceUrl: null, sourceVerification: "unverified", lastCheckedAt: "2026-11-01", registrationMode: "external", createdAt: "2026-10-12T00:00:00Z" },
};

/** Review state for seeded ideas: one waits in the review queue so the approval flow has a real record. */
export const IDEA_ADMIN_FIELDS: Record<string, Partial<Idea>> = {
  "i-gridpeer": { review: { status: "pending" } },
  "i-neowarm": { featured: true, review: { status: "approved", reviewedAt: "2026-10-01T00:00:00Z", reviewedBy: "Seed content" } },
};

/** A Weblaze-run programme still being prepared, so the draft workflow has a real record. */
export const ADMIN_DRAFT_OPPORTUNITY: Opportunity = {
  id: "o-campus-sprint", kind: "challenge", title: "Campus Problem Sprint",
  organisation: "Weblaze Technologies", demo: true,
  description: "A two-week sprint where student teams pick a problem from Discover and return with five customer conversations and a one-page brief.",
  eligibility: "Teams of 2–4 students from any institution.",
  industries: ["education", "sustainability", "healthcare"], location: "Online", deadline: "2027-01-25",
  stage: ["concept", "research"], officialUrl: null,
  publication: "draft", source: "weblaze", registrationMode: "on_platform", format: "online",
  registrationOpens: "2027-01-05", eventStart: "2027-02-01", eventEnd: "2027-02-14", teamMin: 2, teamMax: 4,
  prizes: "Certificates of participation and mentor feedback for every complete brief.",
  instructions: "Register your team, choose a problem in week one, and upload your brief before the final deadline.",
  contact: "sprint@truevix.example",
  createdAt: "2026-11-16T09:00:00Z",
};

/* ---------------- Registrations and applications ---------------- */

const ev = (id: string, at: string, by: string, text: string) => ({ id, at, by, text });

export const ADMIN_REGISTRATIONS: Registration[] = [
  {
    id: "reg-1", opportunityId: "o-agri-hack", applicantId: "p-rohan", mode: "team", teamName: "Rain Ledger",
    members: [
      { name: "Rohan Mehta", role: "Lead · frontend", personId: "p-rohan" },
      { name: "Farah Siddiqui", role: "Data", personId: "p-farah" },
      { name: "Sample teammate", role: "Field research" },
    ],
    statement: "SMS rainfall alerts that turn public forecasts into a sow-or-wait recommendation.",
    status: "shortlisted",
    submissions: [{ id: "sub-1", roundId: "r1", title: "Problem statement: sowing decisions after late rain", files: [{ name: "rain-ledger-brief.pdf", size: 240_000, type: "application/pdf", addedAt: "2026-11-12T10:00:00Z", storage: "session" }], at: "2026-11-12T10:00:00Z" }],
    scores: [
      { id: "sc-1", roundId: "r1", judgeId: "p-wanjiru", criterionId: "c-impact", score: 8 },
      { id: "sc-2", roundId: "r1", judgeId: "p-wanjiru", criterionId: "c-data", score: 7 },
      { id: "sc-3", roundId: "r1", judgeId: "p-wanjiru", criterionId: "c-clarity", score: 8 },
    ],
    notes: [{ id: "n-1", at: "2026-11-13T09:00:00Z", by: "Platform Operator", text: "Strong problem framing. Check they have field access for round two." }],
    history: [ev("h-1", "2026-11-08T08:00:00Z", "Rohan Mehta", "Registered as a team"), ev("h-2", "2026-11-13T09:05:00Z", "Platform Operator", "Status changed to Shortlisted")],
    createdAt: "2026-11-08T08:00:00Z", demo: true,
  },
  {
    id: "reg-2", opportunityId: "o-agri-hack", applicantId: "p-ananya", mode: "individual",
    members: [{ name: "Ananya Iyer", role: "Solo", personId: "p-ananya" }],
    statement: "Cold-storage humidity alerts for farmer producer organisations.",
    status: "under_review", submissions: [], scores: [], notes: [],
    history: [ev("h-3", "2026-11-11T12:00:00Z", "Ananya Iyer", "Registered individually")],
    createdAt: "2026-11-11T12:00:00Z", demo: true,
  },
  {
    id: "reg-3", opportunityId: "o-agri-hack", applicantId: "p-farah", mode: "team", teamName: "Plot Signals",
    members: [{ name: "Farah Siddiqui", role: "Lead", personId: "p-farah" }, { name: "Sample teammate", role: "Agronomy" }],
    statement: "Field-level vegetation index summaries in plain language.",
    status: "info_requested", submissions: [], scores: [],
    notes: [{ id: "n-2", at: "2026-11-14T15:00:00Z", by: "Platform Operator", text: "Farah is also listed on Rain Ledger. Asked which team she will compete with." }],
    history: [ev("h-4", "2026-11-10T07:00:00Z", "Farah Siddiqui", "Registered as a team"), ev("h-5", "2026-11-14T15:02:00Z", "Platform Operator", "Requested more information")],
    createdAt: "2026-11-10T07:00:00Z", demo: true,
  },
  {
    id: "reg-4", opportunityId: "o-campus-sprint", applicantId: "p-rohan", mode: "team", teamName: "Northfield Energy Club",
    members: [{ name: "Rohan Mehta", role: "Lead", personId: "p-rohan" }, { name: "Sample teammate", role: "Research" }],
    statement: "Hostel electricity demand charges.", status: "submitted", submissions: [], scores: [], notes: [],
    history: [ev("h-6", "2026-11-16T10:00:00Z", "Platform Operator", "Test registration added while drafting the listing")],
    createdAt: "2026-11-16T10:00:00Z", demo: true,
  },
];

/* ---------------- Moderation reports ---------------- */

export const ADMIN_REPORTS: ModerationReport[] = [
  { id: "rep-1", targetType: "post", targetId: "f-13", targetLabel: "Post: “What should a two-person startup do about security…”", reportedUserId: "p-marcus", reporterId: "p-rohan", reason: "Off-topic promotion", details: "Ends with a link to a paid consultation.", severity: "medium", status: "open", createdAt: "2026-11-10T12:00:00Z", demo: true },
  { id: "rep-2", targetType: "comment", targetId: "c-3", targetLabel: "Comment on “Smallholders pay for soil tests…”", reportedUserId: "p-isabel", reporterId: "p-wanjiru", reason: "Possible misinformation", details: "Claims about satellite advice adoption with no source.", severity: "low", status: "open", createdAt: "2026-11-09T09:00:00Z", demo: true },
  { id: "rep-3", targetType: "idea", targetId: "i-phishdrill", targetLabel: "Idea: “Phishing drills designed for small clinics”", reportedUserId: "p-marcus", reporterId: "p-sofia", reason: "Duplicate of an existing idea", details: "Very similar to another submission from a clinic network.", severity: "low", status: "open", createdAt: "2026-11-08T15:30:00Z", demo: true },
  { id: "rep-4", targetType: "user", targetId: "p-marcus", targetLabel: "Member: Marcus Feld", reportedUserId: "p-marcus", reporterId: "p-hana", reason: "Repeated promotion", details: "Second report about consultation links this month.", severity: "medium", status: "in_review", createdAt: "2026-11-11T16:00:00Z", demo: true },
  { id: "rep-5", targetType: "collaboration", targetId: "col-3", targetLabel: "Collaboration request to Elena Petrova", reportedUserId: "p-jonas", reporterId: "p-elena", reason: "Asked for unpaid full-time work", details: "Request described a full-time role with equity only and a same-week start.", severity: "high", status: "open", createdAt: "2026-11-15T11:00:00Z", demo: true },
];

/* ---------------- Mentors, experts and assignments ---------------- */

const tp = (personId: string, kind: TalentProfile["kind"], extra: Partial<TalentProfile>): TalentProfile => ({
  personId, kind, status: "approved", verification: "self_declared", availability: "available", hoursPerMonth: 4, capacity: 2, areas: [], demo: true, ...extra,
});

export const ADMIN_TALENT: TalentProfile[] = [
  tp("p-amara", "mentor", { verification: "admin_reviewed", yearsExperience: 12, hoursPerMonth: 6, capacity: 2, areas: ["Fundraising", "B2B sales", "Fintech"] }),
  tp("p-hana", "mentor", { availability: "limited", yearsExperience: 9, capacity: 3, areas: ["Product design", "Education", "User research"] }),
  tp("p-wanjiru", "expert", { verification: "references_requested", yearsExperience: 10, areas: ["Agritech", "Smallholder credit"] }),
  tp("p-li", "expert", { yearsExperience: 4, hoursPerMonth: 2, capacity: 1, areas: ["Robotics", "Grasping"] }),
  tp("p-sofia", "expert", { yearsExperience: 11, areas: ["Medication safety", "Clinical workflow"] }),
  tp("p-marcus", "expert", { status: "paused", availability: "unavailable", yearsExperience: 8, areas: ["Threat modelling"], reviewNote: "Paused while a member report is reviewed." }),
  tp("p-isabel", "expert", { yearsExperience: 6, areas: ["Earth observation", "Satellite data"] }),
  tp("p-jonas", "mentor", {
    status: "applied", availability: "limited", yearsExperience: 11, hoursPerMonth: 3, capacity: 1, areas: ["Manufacturing operations", "Packaging lines"],
    application: { submittedAt: "2026-11-13T09:00:00Z", statement: "I run production lines and can help hardware and packaging teams plan pilots inside real plants." },
  }),
];

export const ADMIN_MENTORSHIPS: Mentorship[] = [
  { id: "ms-1", mentorId: "p-amara", menteeId: "p-daniel", ideaId: "i-railyard", focus: "Pricing pallet-level cold storage", status: "active", startedAt: "2026-10-15", demo: true },
  { id: "ms-2", mentorId: "p-hana", menteeId: "p-ananya", ideaId: "i-neowarm", focus: "Nurse interview script", status: "proposed", startedAt: "2026-11-14", demo: true },
];

/* ---------------- Research studies ---------------- */

const CONSENT = "Taking part is voluntary. You can stop at any time. Your answers are reported without your name unless you agree otherwise.";

export const ADMIN_STUDIES: Study[] = [
  { id: "st-classpulse", title: "How do you check whether a class understood today's lesson?", ownerId: "p-hana", ideaId: "i-classpulse", description: "Interviews about end-of-lesson comprehension checks.", format: "30-minute video call", eligibility: "Primary or middle-school teachers with classes of 40+ students", note: "We want to understand your routine, not test a product.", status: "recruiting", start: "2026-11-01", end: "2026-12-20", target: 12, consentText: CONSENT, demo: true },
  { id: "st-irrigation", title: "Deciding when to irrigate: a short phone interview", ownerId: "p-isabel", ideaId: "i-cropsat", description: "Phone interviews on irrigation timing decisions.", format: "20-minute phone call, in English, Filipino or Cebuano", eligibility: "Farmers or farm managers who irrigate at least one field", note: "Your answers help us decide whether text-message advice is useful.", status: "recruiting", start: "2026-11-05", end: "2027-01-15", target: 20, consentText: CONSENT, demo: true },
  { id: "st-neowarm", title: "Night shifts in neonatal wards", ownerId: "p-ananya", ideaId: "i-neowarm", description: "Interviews with neonatal night-shift nurses.", format: "45-minute interview", eligibility: "Nurses who have worked night shifts in neonatal or paediatric wards", note: "We are studying how temperature checks fit into a busy shift.", status: "in_progress", start: "2026-10-01", end: "2026-12-01", target: 8, consentText: CONSENT, demo: true },
  { id: "st-cold", title: "Moving fresh produce to port", ownerId: "p-daniel", ideaId: "i-railyard", description: "Questionnaire for exporters and transporters.", format: "Short online questionnaire (10 minutes)", eligibility: "Exporters, transporters or farm aggregators handling fresh produce", note: "Anonymous unless you choose to leave contact details.", status: "recruiting", start: "2026-11-10", end: "2027-02-01", target: 30, consentText: CONSENT, demo: true },
];

export const ADMIN_PARTICIPATIONS: StudyParticipation[] = [
  { id: "sp-1", studyId: "st-classpulse", personId: "p-priya", status: "completed", consent: "given", consentAt: "2026-11-03T10:00:00Z", appliedAt: "2026-11-02T10:00:00Z" },
  { id: "sp-2", studyId: "st-irrigation", personId: "p-priya", status: "applied", consent: "not_recorded", appliedAt: "2026-11-12T08:00:00Z" },
  { id: "sp-3", studyId: "st-neowarm", personId: "p-sofia", status: "selected", consent: "given", consentAt: "2026-11-05T09:00:00Z", appliedAt: "2026-11-04T09:00:00Z" },
];

/* ---------------- Collaboration ---------------- */

export const ADMIN_COLLABORATIONS: Collaboration[] = [
  { id: "col-1", kind: "request", fromId: "p-rohan", toId: "p-tomas", ideaId: "i-cauce", role: "Frontend developer", message: "I can give ten hours a week to the utility dashboard.", status: "pending", createdAt: "2026-11-08T19:00:00Z", demo: true },
  { id: "col-2", kind: "open_role", fromId: "p-ananya", ideaId: "i-neowarm", role: "Firmware co-founder", message: "Looking for someone who has shipped low-power firmware.", status: "open", createdAt: "2026-10-30T09:00:00Z", demo: true },
  { id: "col-3", kind: "request", fromId: "p-jonas", toId: "p-elena", ideaId: "i-mycoform", role: "Operations lead", message: "Full-time role, equity only, start this week.", status: "pending", flagged: { reason: "Reported by recipient", at: "2026-11-15T11:00:00Z" }, createdAt: "2026-11-14T18:00:00Z", demo: true },
  { id: "col-4", kind: "cofounder_match", fromId: "p-daniel", toId: "p-li", ideaId: "i-railyard", role: "Hardware co-founder", message: "Suggested match: refrigeration sensors and robotics experience.", status: "declined", createdAt: "2026-10-22T10:00:00Z", demo: true },
];

/* ---------------- Research runs by other members ---------------- */

export const ADMIN_RESEARCH: ResearchReport[] = [
  {
    id: "rs-cauce-1", question: "How do European water utilities budget for leak-detection software?", ideaId: "i-cauce", categories: ["market", "customer", "regulatory"], depth: "standard",
    createdAt: "2026-11-03T10:00:00Z", provenance: "demo", saved: true, ownerId: "p-tomas", runStatus: "completed",
    sections: [{ id: "s1", heading: "Executive summary", body: "Template research plan. Questions to answer: who signs, which budget line, how long procurement takes." }],
    sources: [{ id: "src1", title: "Utility annual reports (suggested)", kind: "Public filing", note: "Suggested source; not retrieved.", url: null }],
  },
  {
    id: "rs-soil-1", question: "Will smallholders pay for soil tests bundled with credit?", ideaId: "i-soilscore", categories: ["customer", "business_model"], depth: "deep",
    createdAt: "2026-11-09T07:00:00Z", provenance: "demo", saved: false, ownerId: "p-wanjiru", runStatus: "completed",
    sections: [{ id: "s1", heading: "Executive summary", body: "Template research plan covering willingness to pay and lender incentives." }], sources: [],
  },
  {
    id: "rs-grip-1", question: "Warehouse picking error rates for irregular items", ideaId: "i-gripkit", categories: ["industry", "technology"], depth: "scan",
    createdAt: "2026-11-15T03:00:00Z", provenance: "demo", saved: false, ownerId: "p-li", runStatus: "failed",
    failureReason: "The run stopped before a plan was produced (local template error). Nothing was sent to a provider.", sections: [], sources: [],
  },
];

/* ---------------- Validation workspace for a seeded idea ---------------- */

const sections = (done: string[], progress: string[]) =>
  Object.fromEntries(
    ["problem", "solution", "market", "competitors", "segments", "business_model", "feasibility", "risks", "differentiation", "customer_validation", "expert_feedback", "experiments"].map((id) => [
      id,
      { status: done.includes(id) ? "done" : progress.includes(id) ? "in_progress" : "not_started", notes: "" },
    ]),
  ) as ValidationWorkspace["sections"];

export const ADMIN_VALIDATIONS: Record<string, ValidationWorkspace> = {
  "i-neowarm": {
    ideaId: "i-neowarm",
    sections: sections(["problem"], ["customer_validation", "expert_feedback", "feasibility"]),
    evidence: [
      { id: "ev-n1", sectionId: "problem", type: "customer_response", text: "Night-shift nurse: temperature is checked every three to four hours when the ward is full.", source: "Interview, district hospital nurse (sample), 12 Sep", createdAt: "2026-09-12T00:00:00Z", demoGenerated: false },
      { id: "ev-n2", sectionId: "expert_feedback", type: "expert_opinion", text: "Alarm fatigue is the main adoption risk; silent alerts at the nurse station are preferable.", source: "Sofia Lindqvist, clinical pharmacist (sample)", createdAt: "2026-10-29T00:00:00Z", demoGenerated: false },
      { id: "ev-n3", sectionId: "feasibility", type: "experiment_result", text: "Bench test: drift under 0.2 °C across 72 hours on the second prototype.", source: "Bench log, 28 Oct", createdAt: "2026-10-28T00:00:00Z", demoGenerated: false },
      { id: "ev-n4", sectionId: "market", type: "ai_analysis", text: "Template analysis: district hospitals buy through state procurement; check tender cycles.", source: "Template analysis (no model connected)", createdAt: "2026-10-30T00:00:00Z", demoGenerated: true },
      { id: "ev-n5", sectionId: "segments", type: "assumption", text: "Sub-district hospitals feel the staffing gap most.", source: "Founder assumption", createdAt: "2026-10-30T00:00:00Z", demoGenerated: false },
    ],
    openQuestions: [{ id: "oq-1", text: "Who approves medical-device pilots at district level?", resolved: false }],
    updatedAt: "2026-10-30T00:00:00Z",
  },
};

/* ---------------- Administrator accounts ---------------- */

export const ADMIN_TEAM: AdminAccount[] = [
  { id: "adm-content", name: "Content desk (sample)", email: "content@truevix.example", role: "content_manager", status: "active", createdAt: "2026-10-01T00:00:00Z", lastActiveAt: "2026-11-16T10:00:00Z", demo: true },
  { id: "adm-mod", name: "Community moderator (sample)", email: "moderation@truevix.example", role: "moderator", status: "active", createdAt: "2026-10-01T00:00:00Z", lastActiveAt: "2026-11-17T08:00:00Z", demo: true },
  { id: "adm-analyst", name: "Insights analyst (sample)", email: "insights@truevix.example", role: "analyst", status: "deactivated", createdAt: "2026-10-05T00:00:00Z", demo: true },
];

/* ---------------- Announcements ---------------- */

export const ADMIN_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1", title: "Field to Data Agri Hackathon registration is open", body: "Register as an individual or team before 2 December. Round one is a one-page problem statement.",
    audience: ["student_idea", "student_explorer", "founder"], channels: ["in_app"], status: "published", publishedAt: "2026-11-01T09:00:00Z",
    createdAt: "2026-10-31T16:00:00Z", createdBy: "Content desk (sample)",
    deliveries: [{ channel: "in_app", status: "delivered_in_app", detail: "Added to matching members' notifications in this browser.", at: "2026-11-01T09:00:00Z" }],
  },
  {
    id: "ann-2", title: "Mentor office hours in December", body: "Mentors will hold open office hours on Thursdays in December.", audience: [], channels: ["in_app", "email"], status: "draft",
    createdAt: "2026-11-16T12:00:00Z", createdBy: "Content desk (sample)", deliveries: [],
  },
];

/* ---------------- Public site content (CMS) ---------------- */

const cms = (id: string, kind: CmsEntry["kind"], label: string, fields: Record<string, string>, order: number, published = true): CmsEntry => ({
  id, kind, label, draft: fields, published: published ? fields : null, status: published ? "published" : "draft",
  versions: published ? [{ version: 1, fields, publishedAt: "2026-11-12T00:00:00Z", by: "Seed content" }] : [], order, updatedAt: "2026-11-12T00:00:00Z",
});

export const ADMIN_CMS: CmsEntry[] = [
  cms("home-hero", "hero", "Homepage hero", {
    eyebrow: "For students, founders, experts and institutions",
    headline: "From a problem worth solving to a project worth building.",
    subheading: "TRUEVIX brings startup discovery, market research, idea validation and collaboration into one workspace — for students, founders, professionals and the institutions that support them.",
    footnote: "Arrive with an idea, or with nothing but curiosity.",
  }, 1),
  cms("site-banner", "banner", "Site announcement banner", { text: "", linkLabel: "", linkHref: "" }, 2, false),
  cms("about-intro", "about_intro", "About page introduction", {
    lead: "TRUEVIX is where startup ideas are found, tested and built — with the people and evidence each step needs.",
  }, 3),
  cms("footer-links", "footer_links", "Footer resource links", { links: "Help and FAQs | /help" }, 4),
  cms("faq-1", "faq", "FAQ: Is my idea visible to everyone?", { question: "Is my idea visible to everyone?", answer: "Only if you choose Public summary. Private ideas are visible to you and the team members you add." }, 10),
  cms("faq-2", "faq", "FAQ: Are opportunity listings partnerships?", { question: "Are opportunities on TRUEVIX partnerships?", answer: "No. Listing an opportunity does not mean TRUEVIX or Weblaze Technologies has a partnership with its organiser unless the listing says so." }, 11),
  cms("faq-3", "faq", "FAQ: Does the AI Researcher use live data?", { question: "Does the AI Researcher use live data?", answer: "Not yet. Reports are research plans generated from templates and are labelled as such." }, 12),
  cms("help-1", "help", "Help: Submitting an idea", { title: "Submitting an idea", body: "Open Submit an idea from the sidebar. You can save a draft at any step. Submitting requires the ownership declaration." }, 20),
];
