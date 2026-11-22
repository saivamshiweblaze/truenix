import * as O from "@/config/profile-options";
import type { Option } from "@/config/profile-options";
import type { CurrentUser, IndustryId, OnboardingRole } from "@/lib/types";

/* ------------------------------------------------------------------
   User preferences — the single source of truth.

   Onboarding collects these as starting suggestions; Settings › Preferences
   edits the same values later. Both read and write through this module,
   so there is one definition per preference and one storage location:

   industries        → user.interests (mirrored to user.industries)
   skills            → user.skills
   collaboration     → user.collaboration
   technologies,
   areas, startupInterests,
   goals             → user.profile[key]

   Personalised screens (Home, Discover, people and project suggestions)
   read user.interests and user.skills, so an edit here changes them at once.
------------------------------------------------------------------- */

export type PreferenceKey = "industries" | "technologies" | "skills" | "areas" | "startupInterests" | "goals" | "collaboration";

export interface PreferenceDef {
  key: PreferenceKey;
  label: string;
  hint: string;
  options: Option[];
  /** Whether people can add their own entries beyond the suggestions. */
  allowCustom: boolean;
  /** Profile kinds this preference applies to. */
  kinds: OnboardingRole[];
  customPlaceholder?: string;
}

const ALL: OnboardingRole[] = ["student", "founder", "professional", "expert_mentor", "participant", "institution"];
const BUILDERS: OnboardingRole[] = ["student", "founder", "professional", "expert_mentor"];

export const PREFERENCES: Record<PreferenceKey, PreferenceDef> = {
  industries: {
    key: "industries",
    label: "Industries",
    hint: "Your home page and feed lead with these.",
    options: O.INDUSTRY_OPTIONS,
    allowCustom: false,
    kinds: ALL,
  },
  technologies: {
    key: "technologies",
    label: "Technologies",
    hint: "Technologies you want to follow or work with.",
    options: O.TECHNOLOGY_OPTIONS,
    allowCustom: true,
    kinds: ["student", "founder", "professional", "expert_mentor", "institution"],
    customPlaceholder: "e.g. Quantum sensing",
  },
  skills: {
    key: "skills",
    label: "Skills",
    hint: "Founders search by skill when they look for collaborators.",
    options: O.SKILL_OPTIONS,
    allowCustom: true,
    kinds: BUILDERS,
    customPlaceholder: "e.g. Embedded C",
  },
  areas: {
    key: "areas",
    label: "Areas of interest or expertise",
    hint: "The kind of work you want to do or can advise on.",
    options: O.AREAS_OF_INTEREST,
    allowCustom: true,
    kinds: BUILDERS,
    customPlaceholder: "e.g. Clinical trials",
  },
  startupInterests: {
    key: "startupInterests",
    label: "Startup interests",
    hint: "What draws you to startups.",
    options: O.STARTUP_INTERESTS,
    allowCustom: true,
    kinds: ["student", "founder", "professional"],
  },
  goals: {
    key: "goals",
    label: "Professional goals",
    hint: "What you want to get out of the next year.",
    options: O.GOAL_OPTIONS,
    allowCustom: true,
    kinds: BUILDERS,
  },
  collaboration: {
    key: "collaboration",
    label: "Collaboration preferences",
    hint: "How and how much you’d like to work with others.",
    options: O.COLLABORATION_PREFS,
    allowCustom: true,
    kinds: BUILDERS,
    customPlaceholder: "e.g. Weekends only",
  },
};

export const PREFERENCE_ORDER: PreferenceKey[] = ["industries", "technologies", "skills", "areas", "startupInterests", "goals", "collaboration"];

export const isPreferenceKey = (k: string): k is PreferenceKey => (PREFERENCE_ORDER as string[]).includes(k);

/** Preferences that apply to a profile kind, in display order. */
export function preferencesFor(kind: OnboardingRole | undefined): PreferenceDef[] {
  return PREFERENCE_ORDER.map((k) => PREFERENCES[k]).filter((p) => !kind || p.kinds.includes(kind));
}

export type Preferences = Record<PreferenceKey, string[]>;

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Reads every preference from its storage location. Older profiles stored "expertise" for areas. */
export function readPreferences(user: Pick<CurrentUser, "interests" | "skills" | "collaboration" | "profile">): Preferences {
  const p = user.profile ?? {};
  return {
    industries: [...user.interests],
    technologies: list(p.technologies),
    skills: [...user.skills],
    areas: list(p.areas).length ? list(p.areas) : list(p.expertise),
    startupInterests: list(p.startupInterests),
    goals: list(p.goals),
    collaboration: [...user.collaboration],
  };
}

/** Builds the user patch that stores the given preferences. Unlisted keys are left untouched. */
export function preferencePatch(user: Pick<CurrentUser, "profile">, prefs: Partial<Preferences>): Partial<Omit<CurrentUser, "id">> {
  const patch: Partial<Omit<CurrentUser, "id">> = {};
  const profile = { ...(user.profile ?? {}) };
  let profileChanged = false;
  for (const key of PREFERENCE_ORDER) {
    const v = prefs[key];
    if (!v) continue;
    const clean = Array.from(new Set(v.map((x) => x.trim()).filter(Boolean))).slice(0, 30);
    switch (key) {
      case "industries": {
        const ids = clean.filter((x) => O.INDUSTRY_OPTIONS.some((o) => o.value === x)) as IndustryId[];
        patch.interests = ids;
        patch.industries = ids;
        break;
      }
      case "skills":
        patch.skills = clean;
        break;
      case "collaboration":
        patch.collaboration = clean;
        break;
      default:
        profile[key] = clean;
        if (key === "areas") delete profile.expertise;
        profileChanged = true;
    }
  }
  if (profileChanged) patch.profile = profile;
  return patch;
}

/** Display label for a stored preference value (custom entries display as typed). */
export function preferenceLabel(key: PreferenceKey, value: string) {
  return PREFERENCES[key].options.find((o) => o.value === value)?.label ?? value;
}
