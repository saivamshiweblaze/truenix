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
