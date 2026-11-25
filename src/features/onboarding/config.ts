import { z } from "zod";
import * as O from "@/config/profile-options";
import type { Option } from "@/config/profile-options";
import type { CurrentUser, ExperienceLevel, FileMeta, IndustryId, OnboardingRole, ProfileValue, RoleId } from "@/lib/types";
import { emailSchema, linkedinSchema, nameSchema, normalisePhone, phoneSchema, pickOne, pickSome, urlSchema } from "@/lib/validation";
import { isPreferenceKey, PREFERENCES, preferencePatch, preferencesFor, type PreferenceKey, type Preferences } from "@/features/preferences/preferences";

/* ------------------------------------------------------------------
   Declarative, role-specific onboarding.
   Each role is a list of steps; each step is a list of fields. The same
   definitions drive rendering (onboarding page), validation (zod schemas
   built below) and — in Phase 2 — server-side validation of the profile.

   Fields can depend on earlier answers:
   - showIf      the field is shown (and validated) only when it returns true
   - optionsFor  options that depend on earlier answers (e.g. qualifications per level)
   - optionalIf  the field becomes optional in some situations
   Hidden fields are cleared, never validated and never saved.
------------------------------------------------------------------- */

export type Values = Record<string, ProfileValue | FileMeta | undefined>;

interface Base {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  /** Overrides the default "required" message. */
  msg?: string;
  showIf?: (v: Values) => boolean;
  optionalIf?: (v: Values) => boolean;
  /** Span both columns in a two-column step. */
  wide?: boolean;
}
export type FieldDef =
  | (Base & { kind: "text" | "textarea"; placeholder?: string; min?: number; max?: number; autoComplete?: string })
  | (Base & { kind: "name" | "email" | "phone" | "linkedin" | "url"; placeholder?: string })
  | (Base & { kind: "select" | "choice"; options: Option[]; optionsFor?: (v: Values) => Option[] })
  | (Base & { kind: "chips"; options: Option[]; min?: number; allowCustom?: boolean; customPlaceholder?: string; pref?: PreferenceKey })
  | (Base & { kind: "file"; file: "resume" | "photo" });

export interface StepDef {
  id: string;
  title: string;
  body: string;
  fields: FieldDef[];
  /** Two-column layout on wide screens for short text fields. */
  grid?: boolean;
}

export interface RoleFlow {
  id: OnboardingRole;
  label: string;
  description: string;
  steps: StepDef[];
}

export const isVisible = (f: FieldDef, v: Values) => !f.showIf || f.showIf(v);
export const isOptional = (f: FieldDef, v: Values) => !!f.optional || !!f.optionalIf?.(v);
export const optionsOf = (f: FieldDef, v: Values): Option[] => ("optionsFor" in f && f.optionsFor ? f.optionsFor(v) : "options" in f ? f.options : []);

/* ---------- Shared steps ---------- */

const personal = (photoRequired: boolean): StepDef => ({
  id: "personal",
  title: "Personal information",
  body: "How people on TRUEVIX will recognise and reach you.",
  fields: [
    { id: "fullName", kind: "name", label: "Full name", hint: "Your legal name or the name you use professionally." },
    { id: "email", kind: "email", label: "Email address" },
    { id: "phone", kind: "phone", label: "Phone number", hint: "Include your country code, e.g. +91 98765 43210." },
    { id: "photo", kind: "file", file: "photo", label: "Profile photo", optional: !photoRequired },
  ],
});

const linkedin: FieldDef = { id: "linkedin", kind: "linkedin", label: "LinkedIn profile URL", placeholder: "https://www.linkedin.com/in/your-name", wide: true };

/** A preference field. Always optional: suggestions are a starting point, not a requirement. */
function pref(key: PreferenceKey, overrides: Partial<Pick<FieldDef, "label" | "hint">> = {}): FieldDef {
  const p = PREFERENCES[key];
  return { id: key, kind: "chips", pref: key, label: overrides.label ?? p.label, hint: overrides.hint ?? p.hint, options: p.options, allowCustom: p.allowCustom, customPlaceholder: p.customPlaceholder, optional: true, wide: true };
}

/**
 * The shared "interests" step: every preference that applies to the role and isn’t asked
 * elsewhere in its flow. Edited later in Settings › Preferences.
 */
function interestsStep(kind: OnboardingRole, exclude: PreferenceKey[] = []): StepDef {
  return {
    id: "interests",
    title: "Interests and preferences",
    body: "Starting suggestions to personalise TRUEVIX. Choose what fits, add your own, or skip — you can change all of this later in Settings.",
    fields: preferencesFor(kind)
      .filter((p) => !exclude.includes(p.key))
      .map((p) => pref(p.key)),
  };
}

/* ---------- Education ---------- */

const level = (v: Values) => (typeof v.educationLevel === "string" ? v.educationLevel : "");
const status = (v: Values) => (typeof v.academicStatus === "string" ? v.academicStatus : "");
const hasYears = (v: Values) => level(v) === "undergraduate" || level(v) === "postgraduate";

const academic: StepDef = {
  id: "academic",
  title: "Education",
  body: "Tell us what you study or studied. We only ask for details that apply to you.",
  grid: true,
  fields: [
    { id: "institution", kind: "text", label: "University or institution", autoComplete: "organization", wide: true },
    { id: "educationLevel", kind: "choice", label: "Education level", options: O.EDUCATION_LEVELS, msg: "your education level", wide: true },
    {
      id: "qualification",
      kind: "select",
      label: "Qualification",
      options: [],
      optionsFor: (v) => (level(v) && level(v) !== "other" ? O.QUALIFICATIONS[level(v) as "undergraduate" | "postgraduate" | "doctoral"] : []),
      showIf: (v) => !!level(v) && level(v) !== "other",
      msg: "your qualification",
    },
    {
      id: "qualificationName",
      kind: "text",
      label: "Qualification name",
      placeholder: "e.g. Chartered Accountancy, Diploma in Design",
      msg: "Enter the name of your qualification.",
      showIf: (v) => level(v) === "other" || v.qualification === "other",
    },
    { id: "fieldOfStudy", kind: "text", label: "Field of study or specialisation", placeholder: "e.g. Electronics and Communication", msg: "Enter your field of study." },
    { id: "academicStatus", kind: "choice", label: "Current status", options: O.ACADEMIC_STATUS, msg: "your current status", showIf: (v) => !!level(v), wide: true },
    {
      id: "studyYear",
      kind: "select",
      label: "Current year of study",
      options: [],
      optionsFor: (v) => (hasYears(v) ? O.STUDY_YEARS[level(v) as "undergraduate" | "postgraduate"] : []),
      showIf: (v) => status(v) === "studying" && hasYears(v),
      msg: "your current year",
    },
    {
      id: "doctoralStage",
      kind: "select",
      label: "Current stage",
      options: O.DOCTORAL_STAGES,
      showIf: (v) => level(v) === "doctoral" && (status(v) === "studying" || status(v) === "break"),
      optionalIf: (v) => status(v) === "break",
      msg: "your current stage",
    },
    {
      id: "expectedYear",
      kind: "select",
      label: "Expected completion year",
      options: [],
      optionsFor: () => O.expectedYears(),
      showIf: (v) => status(v) === "studying" || status(v) === "break",
      optionalIf: (v) => status(v) === "break",
      msg: "the year you expect to finish",
    },
    {
      id: "graduationYear",
      kind: "select",
      label: "Graduation year",
      options: [],
      optionsFor: () => O.completedYears(),
      showIf: (v) => status(v) === "graduated",
      msg: "the year you completed it",
    },
    { id: "statusNote", kind: "text", label: "Tell us briefly", placeholder: "e.g. Studying part-time while working", optional: true, showIf: (v) => status(v) === "other", wide: true },
  ],
};

/** "B.Tech / B.E." or the custom name, for headlines and summaries. */
export function qualificationLabel(v: Values) {
  const q = typeof v.qualification === "string" ? v.qualification : "";
  const custom = typeof v.qualificationName === "string" ? v.qualificationName.trim() : "";
  if (level(v) === "other" || q === "other") return custom;
  const options = level(v) && level(v) !== "other" ? O.QUALIFICATIONS[level(v) as "undergraduate"] : [];
  return options.find((o) => o.value === q)?.label ?? "";
}

/** One-line education summary, e.g. "B.Tech / B.E. graduate (2026), Electronics". */
export function educationSummary(v: Values) {
  const q = qualificationLabel(v);
  const field = typeof v.fieldOfStudy === "string" ? v.fieldOfStudy.trim() : "";
  const st = status(v);
  const who = st === "studying" ? `${q} student` : st === "graduated" ? `${q} graduate${typeof v.graduationYear === "string" && v.graduationYear ? ` (${v.graduationYear})` : ""}` : q;
  return [who.trim(), field].filter(Boolean).join(", ");
}

/* ---------- Role flows ---------- */

export const ROLE_FLOWS: RoleFlow[] = [
  {
    id: "student",
    label: "Student or graduate",
    description: "You’re studying or recently graduated, and want to explore problems, join projects or build your own idea.",
    steps: [
      personal(true),
      academic,
      {
        id: "presence",
        title: "Professional presence",
        body: "Where people can learn more about your work.",
        fields: [linkedin, { id: "resume", kind: "file", file: "resume", label: "Resume" }],
      },
      {
        id: "innovation",
        title: "What you want to do",
        body: "Shapes the projects, people and opportunities we put in front of you.",
        fields: [
          { id: "hasIdea", kind: "choice", label: "Do you have an idea you want to work on?", options: O.HAS_IDEA },
          { id: "joinProject", kind: "choice", label: "Are you looking to join another project?", options: O.LOOKING_TO_JOIN },
          { id: "contribution", kind: "chips", label: "Where you want to contribute", options: O.CONTRIBUTION_AREAS, optional: true, allowCustom: true },
        ],
      },
      interestsStep("student"),
    ],
  },
  {
    id: "founder",
    label: "Founder",
    description: "You’re building a venture and need research, talent and feedback.",
    steps: [
      personal(false),
      {
        id: "venture",
        title: "Your venture",
        body: "A short description helps collaborators and reviewers understand what you’re building.",
        grid: true,
        fields: [
          { id: "ventureName", kind: "text", label: "Venture or project name" },
          { id: "ventureStage", kind: "select", label: "Stage", options: O.STAGE_OPTIONS },
          { id: "ventureIndustry", kind: "select", label: "Primary industry", options: O.INDUSTRY_OPTIONS },
          { id: "location", kind: "text", label: "Location", placeholder: "City, country", autoComplete: "address-level2" },
          { id: "website", kind: "url", label: "Website", optional: true, placeholder: "https://" },
          { id: "ventureSummary", kind: "textarea", label: "What are you building?", msg: "Describe what you’re building.", min: 30, max: 600, hint: "Who has the problem, and what you’re doing about it.", wide: true },
        ],
      },
      {
        id: "presence",
        title: "Professional presence",
        body: "Your background, so people know who they’re working with.",
        grid: true,
        fields: [
          { id: "title", kind: "text", label: "Your role", placeholder: "e.g. Co-founder and CEO" },
          { id: "experience", kind: "select", label: "Professional experience", options: O.EXPERIENCE_OPTIONS },
          linkedin,
        ],
      },
      {
        id: "needs",
        title: "What you’re looking for",
        body: "We use this to suggest people and programmes.",
        fields: [{ id: "lookingFor", kind: "chips", label: "You’re looking for", options: O.FOUNDER_NEEDS, allowCustom: true }],
      },
      interestsStep("founder"),
    ],
  },
  {
    id: "professional",
    label: "Industry professional",
    description: "You work in an industry and want to contribute, advise or join a venture.",
    steps: [
      personal(false),
      {
        id: "presence",
        title: "Professional background",
        body: "Founders and students look for first-hand industry experience.",
        grid: true,
        fields: [
          { id: "title", kind: "text", label: "Job title" },
          { id: "organisation", kind: "text", label: "Organisation", autoComplete: "organization" },
          { id: "experience", kind: "select", label: "Professional experience", options: O.EXPERIENCE_OPTIONS },
          { id: "location", kind: "text", label: "Location", placeholder: "City, country" },
          linkedin,
        ],
      },
      {
        id: "contribution",
        title: "How you’d like to contribute",
        body: "Choose everything that applies.",
        fields: [{ id: "contribution", kind: "chips", label: "Ways to contribute", options: O.PROFESSIONAL_CONTRIBUTIONS, allowCustom: true }],
      },
      interestsStep("professional"),
    ],
  },
  {
    id: "expert_mentor",
    label: "Expert or mentor",
    description: "You review ideas or guide founders with knowledge from your field.",
    steps: [
      personal(false),
      {
        id: "expertise",
        title: "Your expertise",
        body: "Founders request reviews and mentoring by domain and industry.",
        grid: true,
        fields: [
          { id: "title", kind: "text", label: "Job title" },
          { id: "organisation", kind: "text", label: "Organisation", autoComplete: "organization" },
          { id: "experience", kind: "select", label: "Professional experience", options: O.EXPERIENCE_OPTIONS },
          { id: "location", kind: "text", label: "Location", placeholder: "City, country" },
          linkedin,
        ],
      },
      {
        id: "mentoring",
        title: "How you’ll help",
        body: "You can change any of this later.",
        fields: [
          { id: "mode", kind: "choice", label: "Primary role", options: O.EXPERT_MODES },
          { id: "focus", kind: "chips", label: "Topics you can help with", options: O.MENTOR_FOCUS, allowCustom: true },
          { id: "availability", kind: "select", label: "Availability", options: O.AVAILABILITY },
          { id: "bio", kind: "textarea", label: "What founders should know about you", msg: "Tell founders a little about your background.", min: 40, max: 600 },
        ],
      },
      interestsStep("expert_mentor"),
    ],
  },
  {
    id: "participant",
    label: "Research participant",
    description: "You take part in interviews and studies that help founders learn.",
    steps: [
      personal(false),
      {
        id: "background",
        title: "Your background",
        body: "Founders invite participants whose first-hand experience matches their research.",
        grid: true,
        fields: [
          { id: "occupation", kind: "text", label: "Occupation", placeholder: "e.g. Small-farm owner, nurse, logistics coordinator" },
          { id: "location", kind: "text", label: "Location", placeholder: "City, country" },
          { id: "languages", kind: "text", label: "Languages you’re comfortable with", placeholder: "e.g. English, Hindi, Kannada", msg: "Enter at least one language.", wide: true },
          pref("industries", { label: "Sectors you know first-hand", hint: "Founders researching these sectors can invite you." }),
        ],
      },
      {
        id: "participation",
        title: "How you’d like to take part",
        body: "Taking part is always optional. You choose each study.",
        fields: [
          { id: "formats", kind: "chips", label: "Study formats", options: O.STUDY_FORMATS },
          { id: "availability", kind: "select", label: "Availability", options: O.AVAILABILITY },
          { id: "contactPreference", kind: "choice", label: "Preferred contact method", options: O.CONTACT_PREFS },
        ],
      },
    ],
  },
  {
    id: "institution",
    label: "Institution representative",
    description: "You run innovation or entrepreneurship programmes for an institution.",
    steps: [
      personal(false),
      {
        id: "institution",
        title: "Your institution",
        body: "Institution profiles are reviewed before they can publish on an institution’s behalf.",
        grid: true,
        fields: [
          { id: "institutionName", kind: "text", label: "Institution name", autoComplete: "organization" },
          { id: "institutionType", kind: "select", label: "Institution type", options: O.INSTITUTION_TYPES },
          { id: "position", kind: "text", label: "Your position", placeholder: "e.g. Innovation cell coordinator" },
          { id: "department", kind: "text", label: "Department or office" },
          { id: "website", kind: "url", label: "Official website", placeholder: "https://" },
          { id: "location", kind: "text", label: "Location", placeholder: "City, country" },
        ],
      },
      {
        id: "programmes",
        title: "Programmes and goals",
        body: "What your institution runs, and what you want from TRUEVIX.",
        fields: [
          linkedin,
          { id: "programmes", kind: "chips", label: "Programmes you run", options: O.INSTITUTION_PROGRAMMES, allowCustom: true },
          { id: "institutionGoals", kind: "chips", label: "What you want to do here", options: O.INSTITUTION_GOALS, allowCustom: true },
        ],
      },
      interestsStep("institution"),
    ],
  },
];

export const flowFor = (id: OnboardingRole) => ROLE_FLOWS.find((f) => f.id === id)!;

/* ---------- Validation ---------- */

const fileRequired = (kind: "resume" | "photo") =>
  z.custom<FileMeta>((v) => !!v && typeof v === "object" && "name" in (v as object), {
    message: kind === "resume" ? "Upload your resume as a PDF." : "Add a profile photo.",
  });

function fieldSchema(f: FieldDef, values: Values): z.ZodType {
  let s: z.ZodType;
  switch (f.kind) {
    case "name":
      s = nameSchema;
      break;
    case "email":
      s = emailSchema;
      break;
    case "phone":
      s = phoneSchema;
      break;
    case "linkedin":
      s = linkedinSchema;
      break;
    case "url":
      s = urlSchema;
      break;
    case "text":
    case "textarea": {
      const min = f.min ?? 2;
      const max = f.max ?? (f.kind === "text" ? 120 : 600);
      s = z
        .string()
        .trim()
        .min(1, f.msg ?? `Enter your ${f.label.toLowerCase()}.`)
        .min(min, `Write at least ${min} characters.`)
        .max(max, `Keep this under ${max} characters.`);
      break;
    }
    case "select":
    case "choice": {
      // The answer must be one of the options that apply now (they can depend on earlier answers).
      const allowed = optionsOf(f, values).map((o) => o.value);
      s = pickOne(f.msg ?? "an option").refine((v) => allowed.includes(v), `Choose ${f.msg ?? "an option"}.`);
      break;
    }
    case "chips":
      s = pickSome(f.msg ?? "option", f.min ?? 1);
      break;
    case "file":
      s = fileRequired(f.file);
      break;
  }
  // Untouched fields arrive as undefined; give them an empty value so the field's own message is shown.
  if (f.kind !== "file") {
    const empty = f.kind === "chips" ? [] : "";
    s = z.preprocess((v) => (v === undefined || v === null ? empty : v), s);
  }
  if (!isOptional(f, values)) return s;
  // Optional fields accept empty values but are still validated (with the field's own message) when filled in.
  const inner = s;
  return z
    .custom<unknown>((v) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || inner.safeParse(v).success, {
      error: (iss) => inner.safeParse(iss.input).error?.issues[0]?.message ?? "Check this field.",
    })
    .optional();
}

/** Schema for the fields of a step that apply to the current answers. */
export function stepSchema(step: StepDef, values: Values) {
  return z.object(Object.fromEntries(step.fields.filter((f) => isVisible(f, values)).map((f) => [f.id, fieldSchema(f, values)])));
}

/** Full profile schema for a role and set of answers — the contract a Phase 2 API should enforce server-side. */
export function profileSchema(role: OnboardingRole, values: Values) {
  return flowFor(role).steps.reduce((acc, st) => acc.extend(stepSchema(st, values).shape), z.object({}));
}

/**
 * Removes answers that no longer apply: hidden fields, and select answers that are not among
 * the options for the current answers (e.g. a postgraduate qualification after switching to
 * undergraduate). Runs after every change so stale answers are never validated or saved.
 */
export function pruneValues(role: OnboardingRole, values: Values): Values {
  const next: Values = { ...values };
  // Two passes: clearing one answer can hide a field that depends on it.
  for (let pass = 0; pass < 2; pass++) {
    for (const st of flowFor(role).steps) {
      for (const f of st.fields) {
        if (!isVisible(f, next)) {
          if (f.showIf) delete next[f.id];
          continue;
        }
        if ((f.kind === "select" || f.kind === "choice") && "optionsFor" in f && f.optionsFor) {
          const v = next[f.id];
          if (typeof v === "string" && v && !f.optionsFor(next).some((o) => o.value === v)) delete next[f.id];
        }
      }
    }
  }
  return next;
}

/* ---------- Mapping onto the existing user model ---------- */

const str = (v: Values[string]) => (typeof v === "string" ? v.trim() : "");
const arr = (v: Values[string]) => (Array.isArray(v) ? v : []);
const isMeta = (v: Values[string]): v is FileMeta => !!v && typeof v === "object" && !Array.isArray(v);

export function resolvedRole(role: OnboardingRole, v: Values): RoleId {
  switch (role) {
    case "student":
      return v.hasIdea === "yes" ? "student_idea" : "student_explorer";
    case "founder":
      return "founder";
    case "professional":
      return "professional";
    case "expert_mentor":
      return v.mode === "mentor" ? "mentor" : "expert";
    case "participant":
      return "participant";
    case "institution":
      // Self-service gives the representative persona only. Institution administrator access is granted by the
      // platform team after an institution request is approved (see institution_requests).
      return "institution_rep";
  }
}

export function onboardingRoleFor(role: RoleId): OnboardingRole {
  if (role === "student_idea" || role === "student_explorer") return "student";
  if (role === "expert" || role === "mentor") return "expert_mentor";
  if (role === "institution_admin" || role === "institution_rep") return "institution";
  if (role === "founder" || role === "professional" || role === "participant") return role;
  return "student";
}

/** Onboarding answers to prefill from an existing user (role fields plus preferences). */
export function initialValues(user: CurrentUser): Values {
  const profile = { ...(user.profile ?? {}) };
  return {
    ...profile,
    industries: user.interests,
    skills: user.skills,
    collaboration: user.collaboration,
    areas: Array.isArray(profile.areas) ? profile.areas : Array.isArray(profile.expertise) ? profile.expertise : [],
    fullName: user.name,
    email: user.email,
    phone: user.phone ?? "",
    linkedin: user.linkedin ?? "",
  };
}

const labelOf = (options: Option[], value: string) => options.find((o) => o.value === value)?.label ?? value;

/** Converts validated onboarding values into the CurrentUser patch the rest of the app reads. */
export function toUserPatch(role: OnboardingRole, raw: Values, current?: Pick<CurrentUser, "profile">): Partial<Omit<CurrentUser, "id">> {
  const v = pruneValues(role, raw);
  const visibleIds = new Set(flowFor(role).steps.flatMap((st) => st.fields.filter((f) => isVisible(f, v)).map((f) => f.id)));
  const ventureIndustry = str(v.ventureIndustry);
  const prefs: Partial<Preferences> = {};
  for (const id of visibleIds) if (isPreferenceKey(id)) prefs[id] = arr(v[id]);
  // A founder who skipped industries still gets their venture's industry as a starting point.
  if (!prefs.industries?.length && ventureIndustry) prefs.industries = [ventureIndustry];

  const headline =
    role === "student"
      ? [educationSummary(v), str(v.institution)].filter(Boolean).join(" · ")
      : role === "founder"
        ? `${str(v.title)}, ${str(v.ventureName)}`
        : role === "participant"
          ? str(v.occupation)
          : role === "institution"
            ? `${str(v.position)}, ${str(v.institutionName)}`
            : `${str(v.title)}, ${str(v.organisation)}`;
  const organisation = str(v.institution) || str(v.ventureName) || str(v.organisation) || str(v.institutionName);

  // Role-specific answers. Preferences are stored through the preferences module instead.
  const profile: Record<string, ProfileValue> = {};
  for (const [k, val] of Object.entries(v)) {
    if (!visibleIds.has(k) || isPreferenceKey(k)) continue;
    if (k === "photo" || k === "resume" || k === "fullName" || k === "email" || k === "phone" || k === "linkedin") continue;
    if (typeof val === "string" || Array.isArray(val)) profile[k] = val;
  }
  const prefPatch = preferencePatch({ profile: { ...(current?.profile ?? {}), ...profile } }, prefs);
  const industries = (prefPatch.interests ?? []) as IndustryId[];

  return {
    name: str(v.fullName),
    email: str(v.email).toLowerCase(),
    role: resolvedRole(role, v),
    profileKind: role,
    headline: headline.slice(0, 140),
    organisation: organisation.slice(0, 100),
    location: str(v.location).slice(0, 80),
    bio: (str(v.bio) || str(v.ventureSummary)).slice(0, 600),
    interests: industries,
    industries,
    skills: prefPatch.skills ?? [],
    experience: (str(v.experience) || "learning") as ExperienceLevel,
    collaboration: prefPatch.collaboration ?? [],
    phone: str(v.phone) ? normalisePhone(str(v.phone)) : undefined,
    phoneVerified: false,
    linkedin: str(v.linkedin) || undefined,
    // Role answers plus preference lists stored on the profile (technologies, areas, goals…).
    profile: { ...profile, ...Object.fromEntries(Object.entries(prefPatch.profile ?? {}).filter(([k]) => isPreferenceKey(k))) },
    documents: { resume: isMeta(v.resume) ? v.resume : undefined, photo: isMeta(v.photo) ? v.photo : undefined },
  };
}

/** Human-readable value for the review step and profile page. */
export function displayValue(f: FieldDef, value: Values[string], values: Values = {}): string {
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  if (isMeta(value)) return value.name;
  const options = optionsOf(f, values);
  if (Array.isArray(value)) return value.map((x) => labelOf(options, x)).join(", ");
  return options.length ? labelOf(options, value) : value;
}
