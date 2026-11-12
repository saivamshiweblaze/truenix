import type { Opportunity } from "@/lib/types";

/**
 * Fictional demonstration opportunities. Organisations are invented;
 * no partnership with any real organisation is implied.
 */
export const SEED_OPPORTUNITIES: Opportunity[] = [
  {
    id: "o-health-challenge", kind: "challenge", title: "Coastal Health Innovation Challenge",
    organisation: "Coastal Health Foundation (demo)", demo: true,
    description: "Twelve-week challenge for teams improving maternal and newborn care in low-resource hospitals. Finalists get clinical mentor hours and a ward observation placement.",
    eligibility: "Teams of 2–5; at least one member enrolled in a university or under 30.",
    industries: ["healthcare", "biotech"], location: "Hybrid · India", deadline: "2026-12-15",
    stage: ["concept", "research", "prototype"], officialUrl: null,
  },
  {
    id: "o-greenhatch", kind: "incubator", title: "GreenHatch Pre-incubation Cohort",
    organisation: "GreenHatch Climate Incubator (demo)", demo: true,
    description: "Six-month residency for climate hardware teams with shared lab space and procurement help.",
    eligibility: "Founding team with a working prototype; hardware or materials focus.",
    industries: ["sustainability", "energy", "manufacturing"], location: "Lisbon, Portugal", deadline: "2027-01-20",
    stage: ["prototype", "pilot"], officialUrl: null,
  },
  {
    id: "o-agri-hack", kind: "hackathon", title: "Field to Data Agri Hackathon",
    organisation: "Open Agriculture Network (demo)", demo: true,
    description: "48-hour hackathon using public satellite and weather datasets to build tools for smallholders.",
    eligibility: "Open to anyone; solo or teams up to 4.",
    industries: ["agriculture", "spacetech", "ai"], location: "Online", deadline: "2026-12-02",
    stage: ["concept"], officialUrl: null,
  },
  {
    id: "o-seed-grant", kind: "grant", title: "Early Research Seed Grant",
    organisation: "Innovation Research Trust (demo)", demo: true,
    description: "Non-dilutive grants for student teams to run customer research and early experiments.",
    eligibility: "Student teams at accredited institutions; idea must be at concept or research stage.",
    industries: ["education", "healthcare", "agriculture", "water"], location: "India", deadline: "2027-02-28",
    stage: ["concept", "research"], officialUrl: null,
  },
  {
    id: "o-logistics-acc", kind: "accelerator", title: "Port and Corridor Logistics Accelerator",
    organisation: "Gulf of Guinea Trade Lab (demo)", demo: true,
    description: "Accelerator for startups reducing friction in West African trade corridors, with access to pilot partners.",
    eligibility: "Incorporated startups with at least one paying or piloting customer.",
    industries: ["logistics", "finance"], location: "Accra, Ghana", deadline: "2027-01-10",
    stage: ["pilot", "launched"], officialUrl: null,
  },
  {
    id: "o-robotics-comp", kind: "competition", title: "Small Warehouse Robotics Cup",
    organisation: "Asia Automation Society (demo)", demo: true,
    description: "Teams compete to pick a mixed basket of 50 irregular items with budget hardware.",
    eligibility: "University teams; hardware cost under a fixed cap.",
    industries: ["robotics", "logistics"], location: "Singapore", deadline: "2027-03-05",
    stage: ["prototype"], officialUrl: null,
  },
  {
    id: "o-mentor-circle", kind: "mentorship", title: "Founder Mentor Circles",
    organisation: "Mentor Collective (demo)", demo: true,
    description: "Monthly small-group sessions pairing four first-time founders with one experienced operator.",
    eligibility: "First-time founders at any stage.",
    industries: ["finance", "consumer", "education", "healthcare"], location: "Online", deadline: "2026-12-20",
    stage: ["concept", "research", "validation", "prototype"], officialUrl: null,
  },
  {
    id: "o-northfield-preinc", kind: "university", title: "Northfield Pre-incubation Programme",
    organisation: "Northfield Institute of Technology (demo institution)", demo: true,
    description: "Semester programme for student ventures: weekly clinics, a small prototype budget, and demo day.",
    eligibility: "Enrolled Northfield students.",
    industries: ["ai", "healthcare", "energy", "education"], location: "Chennai, India", deadline: "2026-12-10",
    stage: ["concept", "research", "validation"], officialUrl: null,
  },
  {
    id: "o-security-week", kind: "event", title: "Security for Early Teams — workshop week",
    organisation: "Open Security Guild (demo)", demo: true,
    description: "Five evening workshops on threat modelling, secrets management and incident basics.",
    eligibility: "Open to all; seats limited.",
    industries: ["cybersecurity"], location: "Berlin, Germany", deadline: "2026-11-30",
    stage: ["concept", "prototype", "pilot", "launched"], officialUrl: null,
  },
  {
    id: "o-water-industry", kind: "industry", title: "Utility Innovation Pilot Scheme",
    organisation: "Iberian Water Operators Forum (demo)", demo: true,
    description: "Utilities host paid pilots for software that reduces non-revenue water.",
    eligibility: "Startups with a deployable product and data-protection plan.",
    industries: ["water", "ai"], location: "Spain and Portugal", deadline: "2027-01-31",
    stage: ["pilot", "launched"], officialUrl: null,
  },
  {
    id: "o-bio-challenge", kind: "challenge", title: "Packaging Without Plastic Challenge",
    organisation: "Circular Materials Council (demo)", demo: true,
    description: "Prize challenge for packaging alternatives that pass drop and humidity tests at scale.",
    eligibility: "Teams with lab-scale samples.",
    industries: ["sustainability", "biotech", "manufacturing"], location: "European Union", deadline: "2027-02-14",
    stage: ["research", "prototype"], officialUrl: null,
  },
  {
    id: "o-edtech-fellow", kind: "university", title: "Classroom Research Fellowship",
    organisation: "Learning Futures Lab (demo)", demo: true,
    description: "Fellowship pairing designers with teachers to co-design classroom tools over one term.",
    eligibility: "Designers, researchers or students with an education focus.",
    industries: ["education"], location: "Hybrid", deadline: "2027-01-15",
    stage: ["concept", "research", "validation"], officialUrl: null,
  },
];
