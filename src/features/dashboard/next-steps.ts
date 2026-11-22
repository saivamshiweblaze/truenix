import type { RoleId } from "@/lib/types";

export interface Step {
  title: string;
  body: string;
  href: string;
}

/** Priorities per role, in order. Every href is a working route. */
export const NEXT_STEPS: Record<RoleId, Step[]> = {
  student_idea: [
    { title: "Submit your idea", body: "Write the problem down. Keep it private until you are ready.", href: "/ideas/new" },
    { title: "Research the market", body: "Plan a market, competitor and customer research pass.", href: "/research" },
    { title: "Validate your assumptions", body: "Record what real users say, separately from guesses.", href: "/validate" },
    { title: "Find collaborators", body: "Search people by the skills your idea needs.", href: "/community?tab=people" },
    { title: "Get expert feedback", body: "Ask a question in the community or message an expert.", href: "/community?tab=questions" },
    { title: "Find incubation programmes", body: "Pre-incubation, grants and challenges for early ideas.", href: "/opportunities" },
  ],
  student_explorer: [
    { title: "Read industry problems", body: "Real problems people have noticed in sixteen industries.", href: "/discover" },
    { title: "Explore startup ideas", body: "See what others are building and how far they have got.", href: "/ideas" },
    { title: "Follow founders", body: "Their updates become your education.", href: "/community?tab=people" },
    { title: "Contribute to a project", body: "Many teams list the skills they are missing.", href: "/community?tab=collaboration" },
    { title: "Join a hackathon", body: "A weekend is often enough to find an idea worth keeping.", href: "/opportunities" },
  ],
  founder: [
    { title: "Update your project", body: "Post progress so followers and collaborators stay close.", href: "/workspace" },
    { title: "Run research", body: "Competitors, customers, business model.", href: "/research" },
    { title: "Strengthen validation", body: "Close open questions with real evidence.", href: "/validate" },
    { title: "Find talent or a co-founder", body: "Filter people by skill and availability.", href: "/community?tab=people" },
    { title: "Accelerators and pilots", body: "Programmes that fit your stage.", href: "/opportunities" },
  ],
  professional: [
    { title: "Read problems in your industry", body: "See what founders and students are noticing in your field.", href: "/discover" },
    { title: "Find a venture to join", body: "Projects looking for people with your experience.", href: "/community?tab=collaboration" },
    { title: "Answer industry questions", body: "Your first-hand view saves founders months.", href: "/community?tab=questions" },
    { title: "Industry programmes", body: "Pilots and challenges run by companies.", href: "/opportunities" },
  ],
  expert: [
    { title: "Answer review requests", body: "Founders asked for your view.", href: "/reviews" },
    { title: "Complete your expertise profile", body: "Founders search by industry and skill.", href: "/profile" },
    { title: "Join industry discussions", body: "Questions in your areas are waiting.", href: "/community?tab=questions" },
    { title: "Find collaboration", body: "Projects looking for advisors.", href: "/community?tab=collaboration" },
  ],
  mentor: [
    { title: "Review mentorship requests", body: "Founders who asked for guidance.", href: "/reviews" },
    { title: "Share what you know", body: "Start a discussion on a mistake you see founders make.", href: "/community" },
    { title: "Browse early ideas", body: "Spot founders who would benefit from your time.", href: "/ideas" },
    { title: "Mentorship programmes", body: "Structured programmes looking for mentors.", href: "/opportunities" },
  ],
  participant: [
    { title: "See study invitations", body: "Founders want to learn from your experience.", href: "/studies" },
    { title: "Explore the problems being studied", body: "Understand what founders are trying to solve.", href: "/discover" },
    { title: "Set your availability", body: "Tell founders when and how you can help.", href: "/profile" },
  ],
  institution_admin: [
    { title: "Open the institution dashboard", body: "Student participation, ideas and pipeline.", href: "/institution" },
    { title: "Review student ideas", body: "Ideas submitted by your students.", href: "/ideas" },
    { title: "Programmes and challenges", body: "Opportunities you can share with students.", href: "/opportunities" },
  ],
  platform_admin: [
    { title: "Open the admin console", body: "Moderation, users, institutions and audit log.", href: "/admin" },
    { title: "Review reported content", body: "Items waiting for a decision.", href: "/admin/moderation" },
  ],
};
