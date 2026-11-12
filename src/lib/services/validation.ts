import type { EvidenceType, Idea, ValidationSectionId, ValidationWorkspace } from "@/lib/types";
import { VALIDATION_SECTIONS } from "@/config/taxonomy";

/**
 * Contract for an analysis provider used by Validate My Idea.
 * Only produces "ai_analysis" items. It must never create customer responses,
 * expert opinions or experiment results — those are recorded by people.
 */
export interface AnalysisProvider {
  readonly kind: "demo" | "live";
  draft(idea: Idea, section: ValidationSectionId): Promise<string>;
}

const PROMPTS: Partial<Record<ValidationSectionId, (i: Idea) => string>> = {
  problem: (i) => `The idea assumes ${i.targetUsers.toLowerCase()} experience this problem often enough to change behaviour. Evidence needed: how often it occurs and what it costs them. Suggested test: five interviews asking about the last time it happened.`,
  solution: (i) => `The proposed solution should remove the specific cost described in the problem. Check whether ${i.targetUsers.toLowerCase()} would need to change an existing routine to use it, and what they would stop doing.`,
  market: (i) => `Estimate bottom-up: count of ${i.targetUsers.toLowerCase()} in ${i.geography}, the share who feel the problem weekly, and a price accepted for a comparable tool. Treat any top-down figure as context only.`,
  competitors: () => "List what people do today, including manual workarounds and doing nothing. The status quo is usually the strongest competitor. For each alternative, note what it costs and why users tolerate it.",
  segments: () => "Rank segments by urgency of the problem and ability to make a purchase decision. Start with the segment where both are highest, even if it is small.",
  business_model: () => "Identify who pays and who uses — they may differ. Note the payment trigger (per seat, per use, per outcome) and the cost to deliver the first ten customers.",
  feasibility: () => "Name the single hardest component to build and whether a working example exists anywhere. A short prototype of only that component reduces most of the technical risk.",
  risks: () => "Separate risks into adoption, distribution, regulation and technology. For each, note the cheapest test that would reveal it early.",
  differentiation: () => "State in one sentence why a user would switch from their current approach. If the reason is ‘cheaper’ or ‘easier’, quantify how much and check it with users.",
  experiments: () => "Choose the riskiest assumption and design a test that could prove it wrong within two weeks: a landing page with a clear ask, a concierge pilot, or a pre-order.",
};

export class DemoAnalysisProvider implements AnalysisProvider {
  readonly kind = "demo" as const;
  async draft(idea: Idea, section: ValidationSectionId) {
    await new Promise((r) => setTimeout(r, 500));
    return PROMPTS[section]?.(idea) ?? "No automated analysis for this section. Record evidence collected from people directly.";
  }
}

export const analysisProvider: AnalysisProvider = new DemoAnalysisProvider();

/** Sections where AI drafting is allowed. Customer validation and expert feedback must come from people. */
export const AI_ALLOWED: ValidationSectionId[] = VALIDATION_SECTIONS.map((s) => s.id).filter((id) => id !== "customer_validation" && id !== "expert_feedback");

/** Evidence types a user may record in each section. */
export function allowedEvidence(section: ValidationSectionId): EvidenceType[] {
  if (section === "customer_validation") return ["customer_response", "experiment_result", "assumption"];
  if (section === "expert_feedback") return ["expert_opinion"];
  if (section === "experiments") return ["experiment_result", "assumption", "customer_response"];
  return ["assumption", "public_research", "customer_response", "expert_opinion", "experiment_result"];
}

export function summarise(ws: ValidationWorkspace) {
  const done = Object.values(ws.sections).filter((x) => x.status === "done").length;
  const started = Object.values(ws.sections).filter((x) => x.status !== "not_started").length;
  const byType = ws.evidence.reduce<Record<string, number>>((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {});
  const realEvidence = (byType.customer_response ?? 0) + (byType.experiment_result ?? 0) + (byType.expert_opinion ?? 0);
  return { done, started, total: VALIDATION_SECTIONS.length, byType, realEvidence };
}
