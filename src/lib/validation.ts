import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address, like name@example.com.");
export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "Keep your name under 80 characters."),
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal(true, { error: "Confirm you understand this is a demonstration account." }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] });

export const ideaStepSchemas = {
  basics: z.object({
    title: z.string().trim().min(8, "Give the idea a title of at least 8 characters.").max(140, "Keep the title under 140 characters."),
    problem: z.string().trim().min(40, "Describe the problem in at least 40 characters, so reviewers understand who has it and why it matters."),
    solution: z.string().trim().min(20, "Describe the proposed solution in at least 20 characters."),
  }),
  market: z.object({
    targetUsers: z.string().trim().min(3, "Say who the target users are."),
    geography: z.string().trim().min(2, "Name a country, region or ‘Global’."),
  }),
  confirm: z.object({
    ownership: z.literal(true, { error: "Confirm the ownership declaration to submit." }),
  }),
};

/** Flattens a zod error into { field: message }. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/home") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
