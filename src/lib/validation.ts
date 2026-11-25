import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Enter your email address.").email("Enter a valid email address, like name@example.com.");
/** Mirrors the Supabase Auth password policy (min 10, lower + upper case letters and a digit). */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(72, "Keep your password under 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.");
export const PASSWORD_HINT = "At least 10 characters, with upper and lower case letters and a number.";

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(80, "Keep your name under 80 characters.")
  .regex(/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u, "Use letters, spaces, hyphens or apostrophes only.");

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm your password."),
    terms: z.literal(true, { error: "Accept the Terms of Service and Privacy Policy to continue." }),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
    // Report a mismatch even while other fields are still invalid.
    when: (payload) => {
      const v = payload.value as { password?: unknown; confirm?: unknown };
      return typeof v.password === "string" && typeof v.confirm === "string" && v.confirm.length > 0;
    },
  });

/* ---------------- Shared profile field validators (used by every onboarding role) ---------------- */

/**
 * International phone number: optional leading +, 8–15 digits (E.164 length),
 * spaces, dashes, dots and brackets allowed as separators.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .refine((v) => /^\+?[0-9 ().-]+$/.test(v), "Use digits only, with an optional leading + and country code.")
  .refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15;
  }, "Enter a complete number with country code, e.g. +91 98765 43210.");

/** Normalises a phone number to +digits for storage. */
export const normalisePhone = (v: string) => `+${v.replace(/\D/g, "")}`;

const httpUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
};

export const urlSchema = z.string().trim().min(1, "Enter a web address.").refine(httpUrl, "Enter a full web address starting with https://");

/** LinkedIn personal profile: https://www.linkedin.com/in/<handle> (country subdomains allowed). */
export const linkedinSchema = z
  .string()
  .trim()
  .min(1, "Add your LinkedIn profile URL.")
  .refine(
    (v) => /^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,100}\/?(\?.*)?$/i.test(v),
    "Enter your LinkedIn profile URL, like https://www.linkedin.com/in/your-name",
  );

export const requiredText = (label: string, min = 2, max = 120) =>
  z.string().trim().min(min, min <= 1 ? `Enter ${label}.` : `Enter ${label} (at least ${min} characters).`).max(max, `Keep this under ${max} characters.`);

export const pickOne = (what = "an option") => z.string().min(1, `Choose ${what}.`);
export const pickSome = (what = "option", min = 1) => z.array(z.string()).min(min, min === 1 ? `Choose at least one ${what}.` : `Choose at least ${min} ${what}s.`);

/* ---------------- File rules ---------------- */

export const FILE_RULES = {
  resume: { types: ["application/pdf"], extensions: [".pdf"], maxBytes: 5 * 1024 * 1024, label: "PDF" },
  photo: { types: ["image/jpeg", "image/png", "image/webp"], extensions: [".jpg", ".jpeg", ".png", ".webp"], maxBytes: 2 * 1024 * 1024, label: "JPG, PNG or WebP" },
  /** Admin uploads: logos, banners, certificate templates. SVG is excluded (it can carry script). */
  image: { types: ["image/jpeg", "image/png", "image/webp"], extensions: [".jpg", ".jpeg", ".png", ".webp"], maxBytes: 3 * 1024 * 1024, label: "JPG, PNG or WebP" },
  /** Admin uploads: briefs, supporting documents, agreements. */
  document: { types: ["application/pdf"], extensions: [".pdf"], maxBytes: 10 * 1024 * 1024, label: "PDF" },
} as const;
export type FileKind = keyof typeof FILE_RULES;

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Checks type, extension and size. Content signature is checked separately (see checkFileSignature). */
export function validateFileBasics(kind: FileKind, file: { name: string; type: string; size: number }): string | undefined {
  const rule = FILE_RULES[kind];
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!(rule.extensions as readonly string[]).includes(ext) || (file.type && !(rule.types as readonly string[]).includes(file.type))) {
    return kind === "resume" ? "Upload your resume as a PDF file." : kind === "document" ? "Upload a PDF document." : `Upload a ${rule.label} image.`;
  }
  if (file.size === 0) return "This file is empty. Choose another file.";
  if (file.size > rule.maxBytes) return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(rule.maxBytes)}.`;
  return undefined;
}

/** Verifies the first bytes match the declared format, so a renamed file is rejected. */
export function checkFileSignature(kind: FileKind, head: Uint8Array): string | undefined {
  const starts = (...b: number[]) => b.every((x, i) => head[i] === x);
  if (kind === "resume" || kind === "document") return starts(0x25, 0x50, 0x44, 0x46, 0x2d) ? undefined : kind === "resume" ? "This file isn’t a valid PDF. Export your resume as PDF and try again." : "This file isn’t a valid PDF.";
  const ok =
    starts(0xff, 0xd8, 0xff) || // JPEG
    starts(0x89, 0x50, 0x4e, 0x47) || // PNG
    (starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50); // WEBP
  return ok ? undefined : "This image couldn’t be read. Use a JPG, PNG or WebP file.";
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Enter your current password."), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match.", path: ["confirm"] })
  .refine((v) => v.password !== v.current, { message: "Choose a password you haven’t used here.", path: ["password"] });

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
