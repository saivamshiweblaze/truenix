import type { Comment, Notification, Message, Post, Thread } from "@/lib/types";

export const SEED_POSTS: Post[] = [
  {
    id: "f-1", kind: "founder_update", authorId: "p-tomas", ideaId: "i-cauce",
    title: "Two confirmed leaks in the first pilot week",
    body: "Our model flagged five pipe segments. Field crews confirmed leaks in two. The false alarm came from a valve schedule nobody had told us about, which is now an input feature. The lesson: talk to the night-shift operators before you train anything.",
    industries: ["water", "ai"], createdAt: "2026-11-11T09:10:00Z", likes: 86, demo: true,
    figure: { kind: "stat", value: "2 of 5", label: "flagged pipe segments confirmed as leaks by field crews" },
  },
  {
    id: "f-2", kind: "problem", authorId: "p-wanjiru",
    title: "Smallholders pay for soil tests and then never see the results explained",
    body: "In three counties I visited this month, farmers had paid for soil tests through a cooperative. Most received a sheet of numbers with no recommendation. A translation layer between lab results and next season's input purchase is an unsolved problem worth studying.",
    industries: ["agriculture"], createdAt: "2026-11-10T15:40:00Z", likes: 142, demo: true,
  },
  {
    id: "f-3", kind: "technology", authorId: "p-li",
    title: "Tactile skins are getting cheap enough for budget robot arms",
    body: "Printed tactile sensor arrays used to cost more than the arm. A few lab groups now report sensors under a tenth of earlier costs. If that holds in production, small warehouses could automate picking tasks they currently assume need people.",
    industries: ["robotics", "manufacturing", "logistics"], createdAt: "2026-11-10T07:05:00Z", likes: 97, demo: true,
  },
  {
    id: "f-4", kind: "collaboration", authorId: "p-ananya", ideaId: "i-neowarm",
    title: "Looking for a firmware engineer for a neonatal monitor",
    body: "NeoWarm's second prototype works on the bench. I need someone who has shipped low-power firmware on a microcontroller and wants to work on something that ends up in a hospital ward. Equity and a lot of learning on offer; I will be honest that there is no salary yet.",
    industries: ["healthcare", "biotech"], createdAt: "2026-11-09T12:00:00Z", likes: 64, demo: true,
  },
  {
    id: "f-5", kind: "trend", authorId: "p-amara",
    title: "Climate-finance founders: buyers are asking for measurement, not promises",
    body: "In the last six months, every corporate buyer I have spoken to asked how emissions reductions are measured before asking about price. If your product cannot produce an auditable number, expect long sales cycles.",
    industries: ["finance", "sustainability", "energy"], createdAt: "2026-11-08T18:30:00Z", likes: 121, demo: true,
  },
  {
    id: "f-6", kind: "challenge", authorId: "p-kofi",
    title: "Northfield student challenge: reduce food waste in campus kitchens",
    body: "Our institution's innovation cell is running a six-week challenge. Teams get kitchen access, a year of waste logs, and mentor hours. Open to Northfield students; projects are documented here so anyone can follow along.",
    industries: ["sustainability", "consumer"], createdAt: "2026-11-08T10:00:00Z", likes: 55, demo: true,
  },
  {
    id: "f-7", kind: "research", authorId: "p-hana", ideaId: "i-classpulse",
    title: "What 41 teachers told us about checking comprehension",
    body: "Teachers did not want another app. They wanted to know, before the bell, which five children to sit with tomorrow. That single sentence reshaped ClassPulse from a dashboard into a short list.",
    industries: ["education"], createdAt: "2026-11-07T08:15:00Z", likes: 178, demo: true,
    figure: { kind: "stat", value: "41", label: "teachers interviewed about checking comprehension" },
  },
  {
    id: "f-8", kind: "idea", authorId: "p-elena", ideaId: "i-mycoform",
    title: "Can mycelium packaging be dried fast enough to compete?",
    body: "Growing mycelium into a shape takes about five days. Drying it is the bottleneck. We have cut drying from 30 hours to 9 with a staged-temperature process. Next question: is that fast enough for a buyer shipping 20,000 units a month?",
    industries: ["sustainability", "biotech", "manufacturing"], createdAt: "2026-11-06T14:20:00Z", likes: 73, demo: true,
    figure: { kind: "bars", caption: "Drying time per batch", unit: "h", items: [{ label: "Before", value: 30 }, { label: "Staged temperature", value: 9, highlight: true }] },
  },
  {
    id: "f-9", kind: "question", authorId: "p-rohan",
    title: "How do campuses actually get billed for electricity?",
    body: "I want to test whether shared batteries could reduce evening peak charges on campus, but I do not understand demand charges yet. If you have worked in facilities or energy billing, I would love a 20-minute call.",
    industries: ["energy", "education"], createdAt: "2026-11-05T19:45:00Z", likes: 22, demo: true,
  },
  {
    id: "f-10", kind: "problem", authorId: "p-sofia",
    title: "Paediatric doses at community pharmacies are calculated without the child's weight",
    body: "Prescriptions for children are often weight-based, yet the pharmacy counter rarely knows the weight. Most errors are caught, but not all. This is a narrow, well-defined problem a small team could study properly.",
    industries: ["healthcare"], createdAt: "2026-11-05T09:00:00Z", likes: 88, demo: true,
  },
  {
    id: "f-11", kind: "project", authorId: "p-daniel", ideaId: "i-railyard",
    title: "Railyard is measuring produce loss on every shipment",
    body: "We attach a temperature logger to every pallet we move. Across four shipments, the worst losses happened during the wait at the port gate, not on the road. We are now negotiating cold-dock time rather than more trucks.",
    industries: ["logistics", "agriculture"], createdAt: "2026-11-04T11:30:00Z", likes: 69, demo: true,
  },
  {
    id: "f-12", kind: "technology", authorId: "p-isabel",
    title: "Free satellite revisits are now frequent enough for irrigation decisions",
    body: "Several public satellite programmes together give a usable view of most farmland every few days. The bottleneck has moved from data to trust: farmers need an explanation in their language, not a heat map.",
    industries: ["spacetech", "agriculture", "water"], createdAt: "2026-11-03T06:50:00Z", likes: 104, demo: true,
  },
  {
    id: "f-13", kind: "discussion", authorId: "p-marcus",
    title: "What should a two-person startup do about security in year one?",
    body: "My short list: enforce hardware keys for admin accounts, keep secrets out of the repository, log every admin action, and write down who to call when something breaks. What would you add or remove?",
    industries: ["cybersecurity"], createdAt: "2026-11-02T16:10:00Z", likes: 131, demo: true,
  },
  {
    id: "f-14", kind: "question", authorId: "p-priya",
    title: "Teachers: would you use a tool that needs one phone for the whole class?",
    body: "I am helping a design team understand classrooms like mine. Many of my colleagues share one smartphone between several teachers. Tell me how you would want such a tool to work.",
    industries: ["education"], createdAt: "2026-11-01T13:00:00Z", likes: 37, demo: true,
  },
];

export const SEED_COMMENTS: Comment[] = [
  { id: "c-1", targetId: "f-1", authorId: "p-li", body: "Was the valve schedule available digitally, or did someone have to type it in?", createdAt: "2026-11-11T10:02:00Z", demo: true },
  { id: "c-2", targetId: "f-1", authorId: "p-tomas", body: "Typed in from a laminated sheet in the control room. Which tells you something about the market.", createdAt: "2026-11-11T10:20:00Z", demo: true },
  { id: "c-3", targetId: "f-2", authorId: "p-isabel", body: "We see the same with satellite advice. Numbers without a recommendation get ignored.", createdAt: "2026-11-10T17:12:00Z", demo: true },
  { id: "c-4", targetId: "f-7", authorId: "p-priya", body: "This matches my classroom exactly. A short list is what I would actually use.", createdAt: "2026-11-07T11:00:00Z", demo: true },
  { id: "c-5", targetId: "f-9", authorId: "p-amara", body: "Ask the estates office for twelve months of bills. The demand charge line will tell you if this is worth pursuing.", createdAt: "2026-11-06T08:30:00Z", demo: true },
  { id: "c-6", targetId: "i-neowarm", authorId: "p-sofia", body: "Have you looked at how alarms are acknowledged? Alarm fatigue is real in neonatal units.", createdAt: "2026-10-29T09:00:00Z", demo: true },
  { id: "c-7", targetId: "i-cauce", authorId: "p-wanjiru", body: "How do utilities budget for software like this? Capital or operating expense?", createdAt: "2026-11-04T07:45:00Z", demo: true },
  { id: "c-8", targetId: "f-13", authorId: "p-hana", body: "Add: a shared password manager from day one. It saves the painful offboarding later.", createdAt: "2026-11-02T18:00:00Z", demo: true },
];

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: "n-1", kind: "comment", title: "Li Wei replied in a discussion you follow", body: "“Was the valve schedule available digitally…”", href: "/discover#f-1", createdAt: "2026-11-11T10:02:00Z", demo: true },
  { id: "n-2", kind: "opportunity", title: "A deadline is approaching", body: "Coastal Health Innovation Challenge closes on 15 December.", href: "/opportunities/o-health-challenge", createdAt: "2026-11-10T08:00:00Z", demo: true },
  { id: "n-3", kind: "follow", title: "Amara Okafor started following you", body: "Mentor · two exits in B2B payments", href: "/people/p-amara", createdAt: "2026-11-09T14:00:00Z", demo: true },
  { id: "n-4", kind: "collaboration", title: "New collaboration request", body: "Rohan Mehta wants to contribute frontend work.", href: "/messages?thread=t-rohan", createdAt: "2026-11-08T19:00:00Z", demo: true },
  { id: "n-5", kind: "system", title: "Welcome to TRUEVIX", body: "Some of the people, ideas and programmes you’ll see are illustrative samples while the community grows.", href: "/workspace", createdAt: "2026-11-01T00:00:00Z", demo: true },
];

export const SEED_THREADS: Thread[] = [
  { id: "t-amara", participantId: "p-amara", subject: "Mentorship availability", kind: "direct", demo: true },
  { id: "t-rohan", participantId: "p-rohan", subject: "Contributing to your project", kind: "collaboration_request", demo: true },
  { id: "t-sofia", participantId: "p-sofia", subject: "Review request: clinical assumptions", kind: "review_request", demo: true },
];

export const SEED_MESSAGES: Message[] = [
  { id: "m-1", threadId: "t-amara", authorId: "p-amara", body: "Hi — saw your profile. I have two mentorship slots this quarter. What are you working on?", createdAt: "2026-11-09T14:05:00Z" },
  { id: "m-2", threadId: "t-rohan", authorId: "p-rohan", body: "Hello! I am a second-year CS student. I can give about 10 hours a week to frontend work if you need help.", createdAt: "2026-11-08T19:00:00Z" },
  { id: "m-3", threadId: "t-sofia", authorId: "p-sofia", body: "Happy to review the clinical assumptions. Please share the problem statement and who you have spoken to so far.", createdAt: "2026-11-06T09:30:00Z" },
];
