import type { Idea, ResearchCategory, ResearchDepth, ResearchReport, ResearchSection, ResearchSource } from "@/lib/types";
import { industryLabel, RESEARCH_CATEGORIES } from "@/config/taxonomy";
import { uid } from "@/lib/utils";

export interface ResearchRequest {
  question: string;
  idea: Idea | null;
  categories: ResearchCategory[];
  depth: ResearchDepth;
}

export const RESEARCH_STEPS = [
  "Framing the question",
  "Mapping the market",
  "Reviewing the competitive landscape",
  "Identifying customer segments",
  "Listing risks and assumptions",
  "Assembling the report",
] as const;

/**
 * Contract for research providers. A future implementation can call an AI model
 * and a web-search API from a server route; the UI only depends on this interface.
 */
export interface ResearchProvider {
  readonly kind: "demo" | "live";
  run(req: ResearchRequest, onStep: (index: number) => void, signal?: AbortSignal): Promise<ResearchReport>;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

function subject(req: ResearchRequest) {
  return req.idea ? req.idea.title.split(":")[0] : req.question.replace(/\?$/, "");
}

function buildSections(req: ResearchRequest): ResearchSection[] {
  const s = subject(req);
  const industry = req.idea ? industryLabel(req.idea.industry) : "the relevant industry";
  const users = req.idea?.targetUsers ?? "the people who experience this problem";
  const geo = req.idea?.geography ?? "your initial geography";
  const cats = req.categories.map((c) => RESEARCH_CATEGORIES.find((x) => x.id === c)?.label.toLowerCase()).filter(Boolean).join(", ");

  return [
    {
      id: "summary",
      heading: "Executive summary",
      body: `This demonstration report outlines how a research pass on “${s}” would be structured, with a focus on ${cats || "market and customers"}. It shows where evidence is needed rather than providing evidence. Treat every statement below as a prompt to verify, not a finding.`,
    },
    {
      id: "market",
      heading: "Market overview",
      body: `Size the market bottom-up: count ${users} in ${geo}, estimate how many feel the problem weekly, and multiply by a price they have accepted elsewhere. Top-down market-size figures from reports are useful context but rarely decide early strategy.`,
      bullets: ["Find a public dataset that counts your target users.", "Identify one comparable product and what customers pay for it.", "Note whether budgets sit with users or with a separate buyer."],
    },
    {
      id: "landscape",
      heading: "Industry landscape",
      body: `In ${industry}, map who influences a purchase: regulators, distributors, incumbents and professional bodies. Early ventures usually stall on one of these rather than on the product itself.`,
    },
    {
      id: "competitors",
      heading: "Competitor analysis",
      body: "List direct competitors, indirect substitutes and the status quo. The status quo — spreadsheets, manual work or doing nothing — is usually the strongest competitor.",
      bullets: ["Direct: products solving the same problem for the same user.", "Indirect: different approach to the same outcome.", "Status quo: what people do today, and what it costs them."],
    },
    {
      id: "segments",
      heading: "Customer segments",
      body: `Split ${users} by urgency and ability to decide. Pick the segment where the problem is frequent, costly, and owned by someone who can say yes.`,
    },
    {
      id: "opportunities",
      heading: "Opportunities",
      body: "Opportunities worth testing come from changes: new regulation, falling technology costs, shifts in buyer behaviour. Write down which change makes this idea possible now.",
    },
    {
      id: "risks",
      heading: "Risks",
      body: "Separate risks you can test cheaply from those you cannot.",
      bullets: ["Adoption risk: will users change their routine?", "Distribution risk: can you reach buyers affordably?", "Regulatory risk: does any approval stand between you and a pilot?", "Technical risk: what is the hardest component to build?"],
    },
    {
      id: "assumptions",
      heading: "Assumptions",
      body: "These assumptions are implied by the idea as written. Each needs evidence before it can be relied on.",
      bullets: [`${users} experience the problem often enough to want a solution.`, "The proposed solution fits into their existing workflow.", "Someone with budget authority will pay for it."],
    },
    {
      id: "questions",
      heading: "Unanswered questions",
      body: "Answer these through interviews and small experiments, then record the results in Validate My Idea.",
      bullets: ["Who has tried to solve this before, and why did they stop?", "What would a user stop doing if they adopted this?", "What would convince a sceptical buyer in the first meeting?"],
    },
  ];
}

const DEMO_SOURCES: ResearchSource[] = [
  { id: "s1", title: "Public statistics office dataset for your geography", kind: "Suggested source", note: "Placeholder — a live provider would cite a specific dataset here.", url: null },
  { id: "s2", title: "Industry association annual report", kind: "Suggested source", note: "Placeholder — not retrieved.", url: null },
  { id: "s3", title: "Competitor websites and pricing pages", kind: "Suggested source", note: "Placeholder — collect manually and add to your validation evidence.", url: null },
  { id: "s4", title: "Interviews with five target users", kind: "Primary research", note: "Only you can collect this. Record notes as customer responses.", url: null },
];

export class DemoResearchProvider implements ResearchProvider {
  readonly kind = "demo" as const;

  async run(req: ResearchRequest, onStep: (index: number) => void, signal?: AbortSignal): Promise<ResearchReport> {
    const perStep = req.depth === "scan" ? 280 : req.depth === "standard" ? 420 : 600;
    for (let i = 0; i < RESEARCH_STEPS.length; i++) {
      onStep(i);
      await wait(perStep, signal);
    }
    return {
      id: uid("r"),
      question: req.question.trim(),
      ideaId: req.idea?.id ?? null,
      categories: req.categories,
      depth: req.depth,
      createdAt: new Date().toISOString(),
      sections: buildSections(req),
      sources: DEMO_SOURCES,
      provenance: "demo",
      saved: false,
    };
  }
}

/** Swap this binding when a real provider is connected. */
export const researchProvider: ResearchProvider = new DemoResearchProvider();

/** Plain-text export of a report. */
export function reportToMarkdown(r: ResearchReport): string {
  const lines = [
    `# ${r.question}`,
    "",
    r.provenance === "demo" ? "> Demonstration report generated locally. No live AI model or web search was used." : "",
    "",
  ];
  for (const s of r.sections) {
    lines.push(`## ${s.heading}`, "", s.body, "");
    s.bullets?.forEach((b) => lines.push(`- ${b}`));
    if (s.bullets) lines.push("");
  }
  lines.push("## Sources", "");
  r.sources.forEach((s) => lines.push(`- ${s.title} (${s.kind}) — ${s.note}`));
  return lines.join("\n");
}
