import type {
  Activity,
  AdminModuleId,
  AdminPermission,
  AdminRoleId,
  Application,
  AuditEntry,
  Comment,
  CurrentUser,
  Idea,
  Message,
  Notification,
  Post,
  ResearchReport,
  Task,
  Thread,
  ValidationWorkspace,
} from "@/lib/types";
import { emptyPlatform, type PlatformState } from "./platform";

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

/** What the server says about the signed-in account (from public.my_session_context()). */
export interface SessionInfo {
  userId: string;
  accountStatus: "active" | "restricted" | "suspended" | "deactivated";
  accountStatusReason: string | null;
  onboardingCompleted: boolean;
  /** Privileged roles granted on the server (never self-assigned). */
  roles: { role: "platform_admin" | "institution_admin"; institutionId: string | null }[];
  adminRole: AdminRoleId | null;
  adminPermissions: { module: AdminModuleId; permission: AdminPermission }[];
  institutions: { institutionId: string; memberRole: string; status: string }[];
}

export interface PublicSettings {
  openRegistration: boolean;
  requireIdeaReview: boolean;
  researchEnabled: boolean;
  communityPosting: boolean;
  opportunityRegistration: boolean;
  studiesRecruiting: boolean;
}

export type DataStatus = "idle" | "loading" | "ready" | "error";

export interface AppState {
  version: 1;
  signedIn: boolean;
  user: CurrentUser | null;
  /** Supabase Auth user id of the signed-in member. Records owned by them are mapped to "me" in the store. */
  authUserId: string | null;
  session: SessionInfo | null;
  dataStatus: DataStatus;
  dataError: string | null;
  loadedAt: string | null;
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
  /** Connection state per person (pending requests vs accepted). */
  connectionStates: Record<string, { status: "pending" | "accepted" | "declined"; incoming: boolean }>;
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
    /** Append-only record of administrative actions (newest first). */
    audit: AuditEntry[];
    settings: { openRegistration: boolean; requireIdeaReview: boolean; researchEnabled: boolean };
  };
  /** Shared platform data: other members and everything operators manage. See platform.ts. */
  platform: PlatformState;
}

export const initialState = (): AppState => ({
  version: 1,
  signedIn: false,
  user: null,
  authUserId: null,
  session: null,
  dataStatus: "idle",
  dataError: null,
  loadedAt: null,
  pendingResetEmail: null,
  ideas: [],
  posts: [],
  comments: [],
  research: [],
  validations: {},
  saved: { ideas: [], posts: [], opportunities: [] },
  following: { ideas: [], people: [] },
  connections: [],
  connectionStates: {},
  liked: [],
  readNotifications: [],
  notifications: [],
  threads: [],
  messages: [],
  applications: [],
  decisions: {},
  tasks: [],
  activity: [],
  notificationPrefs: { comments: true, follows: true, collaboration: true, opportunities: true, research: true, weeklyDigest: false },
  privacy: { profileVisibility: "members", showOrganisation: true, allowMessages: "everyone", showActivity: true },
  admin: {
    audit: [],
    settings: { openRegistration: true, requireIdeaReview: true, researchEnabled: true },
  },
  platform: emptyPlatform(),
});
