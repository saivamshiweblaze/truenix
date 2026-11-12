/**
 * Demonstration institution data. "Northfield Institute of Technology" is fictional.
 * It does not represent a real or partner institution.
 */
export const DEMO_INSTITUTION = {
  id: "inst-northfield",
  name: "Northfield Institute of Technology",
  city: "Chennai, India",
  studentsRegistered: 412,
  activeThisMonth: 168,
  ideasSubmitted: 57,
  projectsActive: 19,
  mentorsEngaged: 11,
  participationByIndustry: [
    { label: "Healthcare", value: 14 },
    { label: "Energy", value: 11 },
    { label: "Artificial intelligence", value: 10 },
    { label: "Education", value: 8 },
    { label: "Agriculture", value: 7 },
    { label: "Sustainability", value: 7 },
  ],
  pipeline: [
    { stage: "Concept", count: 24 },
    { stage: "Researching", count: 15 },
    { stage: "Validating", count: 9 },
    { stage: "Prototype", count: 6 },
    { stage: "Pilot", count: 2 },
    { stage: "Incubated", count: 1 },
  ],
  monthlyActivity: [42, 58, 61, 74, 97, 121, 168],
  months: ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
  programmes: [
    { id: "prog-1", name: "Pre-incubation programme, winter cohort", status: "Applications open", participants: 38 },
    { id: "prog-2", name: "Campus food-waste challenge", status: "Running · week 2 of 6", participants: 46 },
    { id: "prog-3", name: "Healthcare design sprint", status: "Planned for January", participants: 0 },
  ],
};

export const OTHER_INSTITUTIONS = [
  { id: "inst-northfield", name: "Northfield Institute of Technology", location: "Chennai, India", students: 412 },
  { id: "inst-eastgate", name: "Eastgate University", location: "Shenzhen, China", students: 236 },
  { id: "inst-harbour", name: "Harbour College of Design", location: "Lisbon, Portugal", students: 91 },
  { id: "inst-savanna", name: "Savanna Polytechnic", location: "Nairobi, Kenya", students: 154 },
];

export const DEMO_STUDIES = [
  {
    id: "st-classpulse",
    title: "How do you check whether a class understood today's lesson?",
    founderId: "p-hana",
    format: "30-minute video call",
    eligibility: "Primary or middle-school teachers with classes of 40+ students",
    note: "We want to understand your routine, not test a product.",
  },
  {
    id: "st-irrigation",
    title: "Deciding when to irrigate: a short phone interview",
    founderId: "p-isabel",
    format: "20-minute phone call, in English, Filipino or Cebuano",
    eligibility: "Farmers or farm managers who irrigate at least one field",
    note: "Your answers help us decide whether text-message advice is useful.",
  },
  {
    id: "st-neowarm",
    title: "Night shifts in neonatal wards",
    founderId: "p-ananya",
    format: "45-minute interview",
    eligibility: "Nurses who have worked night shifts in neonatal or paediatric wards",
    note: "We are studying how temperature checks fit into a busy shift.",
  },
  {
    id: "st-cold",
    title: "Moving fresh produce to port",
    founderId: "p-daniel",
    format: "Short online questionnaire (10 minutes)",
    eligibility: "Exporters, transporters or farm aggregators handling fresh produce",
    note: "Anonymous unless you choose to leave contact details.",
  },
];

export const REPORTED_CONTENT = [
  { id: "rep-1", targetId: "f-13", targetLabel: "Post: “What should a two-person startup do about security…”", reason: "Off-topic promotion", reporter: "Member (demo)", createdAt: "2026-11-10T12:00:00Z" },
  { id: "rep-2", targetId: "c-3", targetLabel: "Comment on “Smallholders pay for soil tests…”", reason: "Possible misinformation", reporter: "Member (demo)", createdAt: "2026-11-09T09:00:00Z" },
  { id: "rep-3", targetId: "i-phishdrill", targetLabel: "Idea: “Phishing drills designed for small clinics”", reason: "Duplicate of an existing idea", reporter: "Member (demo)", createdAt: "2026-11-08T15:30:00Z" },
];
