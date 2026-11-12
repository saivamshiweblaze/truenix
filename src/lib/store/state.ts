import { z } from "zod";
import type {
  Activity,
  Application,
  AuditEntry,
  Comment,
  CurrentUser,
  Idea,
  Message,
  Notification,
  Post,
  ResearchReport,
  RoleId,
  Task,
  Thread,
  ValidationWorkspace,
} from "@/lib/types";

export interface NotificationPrefs {
  comments: boolean;
  follows: boolean;
  collaboration: boolean;
  opportunities: boolean;
  research: boolean;
  weeklyDigest: boolean;
}

export interface PrivacyPrefs {
  profileVisibility: "public" | "members" | "connections";
  showOrganisation: boolean;
  allowMessages: "everyone" | "connections";
  showActivity: boolean;
}

export interface AppState {
  version: 1;
  signedIn: boolean;
  user: CurrentUser | null;
  /** Email awaiting the (simulated) reset-password step. */
  pendingResetEmail: string | null;
  ideas: Idea[];
  posts: Post[];
  comments: Comment[];
  research: ResearchReport[];
  validations: Record<string, ValidationWorkspace>;
  saved: { ideas: string[]; posts: string[]; opportunities: string[] };
  following: { ideas: string[]; people: string[] };
  connections: string[];
  liked: string[];
  readNotifications: string[];
  notifications: Notification[];
  threads: Thread[];
  messages: Message[];
  applications: Application[];
  /** Accept/decline decisions for review requests, studies, etc. */
  decisions: Record<string, "accepted" | "declined" | "completed">;
  tasks: Task[];
  activity: Activity[];
  notificationPrefs: NotificationPrefs;
  privacy: PrivacyPrefs;
  admin: {
    userStatus: Record<string, "active" | "suspended">;
    roleOverrides: Record<string, RoleId>;
    moderation: Record<string, "pending" | "approved" | "removed">;
    institutionStatus: Record<string, "verified" | "pending" | "rejected">;
    opportunityStatus: Record<string, "published" | "hidden">;
    audit: AuditEntry[];
    settings: { openRegistration: boolean; requireIdeaReview: boolean; researchEnabled: boolean };
  };
}

export const initialState = (): AppState => ({
  version: 1,
  signedIn: false,
  user: null,
  pendingResetEmail: null,
  ideas: [],
  posts: [],
  comments: [],
  research: [],
  validations: {},
  saved: { ideas: [], posts: [], opportunities: [] },
  following: { ideas: [], people: [] },
  connections: [],
  liked: [],
  readNotifications: [],
  notifications: [],
  threads: [],
  messages: [],
  applications: [],
  decisions: {},
  tasks: [
    { id: "task-seed-1", text: "Read three industry problems on Discover", done: false, createdAt: "2026-11-01T00:00:00Z" },
    { id: "task-seed-2", text: "Complete your profile headline", done: false, createdAt: "2026-11-01T00:00:00Z" },
  ],
  activity: [],
  notificationPrefs: { comments: true, follows: true, collaboration: true, opportunities: true, research: true, weeklyDigest: false },
  privacy: { profileVisibility: "members", showOrganisation: true, allowMessages: "everyone", showActivity: true },
  admin: {
    userStatus: {},
    roleOverrides: {},
    moderation: {},
    institutionStatus: {},
    opportunityStatus: {},
    audit: [],
    settings: { openRegistration: true, requireIdeaReview: true, researchEnabled: true },
  },
});

/**
 * Shape check for data loaded from localStorage. Local storage is user-controlled,
 * so anything that does not match is discarded rather than trusted.
 */
const arr = z.array(z.unknown());
export const persistedSchema = z
  .object({
    version: z.literal(1),
    signedIn: z.boolean(),
    user: z
      .object({
        id: z.literal("me"),
        name: z.string().max(120),
        email: z.string().max(200),
        role: z.enum(["student_idea", "student_explorer", "founder", "expert", "mentor", "participant", "institution_admin", "platform_admin"]),
        onboarded: z.boolean(),
      })
      .passthrough()
      .nullable(),
    ideas: arr,
    posts: arr,
    comments: arr,
    research: arr,
    validations: z.record(z.string(), z.unknown()),
    saved: z.object({ ideas: z.array(z.string()), posts: z.array(z.string()), opportunities: z.array(z.string()) }),
    following: z.object({ ideas: z.array(z.string()), people: z.array(z.string()) }),
    tasks: arr,
    admin: z.object({ audit: arr }).passthrough(),
  })
  .passthrough();
