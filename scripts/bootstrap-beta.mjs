#!/usr/bin/env node
/**
 * TRUEVIX internal-beta bootstrap (run locally by an operator; never in CI or on Vercel).
 *
 *   node scripts/bootstrap-beta.mjs                 create the 7 beta accounts + small demo data set
 *   node scripts/bootstrap-beta.mjs --reset-passwords   also rotate passwords of accounts that already exist
 *   node scripts/bootstrap-beta.mjs --remove-demo   delete demo records and the 7 demo accounts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or from .env.local.
 * The service-role key is never printed. Accounts are created with the Supabase Auth Admin API (never by inserting
 * into auth.users). Generated passwords are written only to .secrets/beta-credentials.local.md (git-ignored).
 * Every seeded row has is_demo = true and a fixed id, so the script is safe to re-run and the data is removable.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(join(root, process.env.BOOTSTRAP_ENV_FILE ?? ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set them in .env.local).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
console.log(`Target project: ${new URL(url).host}`);

/** 20 characters, guaranteed upper, lower, digit and symbol; unambiguous alphabet. */
function strongPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!#%+=?@^_-"];
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < 20) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const ACCOUNTS = [
  { key: "admin", email: "admin@truevix.example", name: "Asha Verma (Test admin)", persona: "professional", kind: "professional", headline: "Platform operations · internal test account", org: "TRUEVIX beta team" },
  { key: "student", email: "student@truevix.example", name: "Meera Krishnan (Test student)", persona: "student_idea", kind: "student", headline: "Electronics student · internal test account", org: "Northfield Institute of Technology (demo)" },
  { key: "founder", email: "founder@truevix.example", name: "Lena Brandt (Test founder)", persona: "founder", kind: "founder", headline: "Founder, ColdTrace (demo venture) · internal test account", org: "ColdTrace (demo)" },
  { key: "professional", email: "professional@truevix.example", name: "Nadia Rahman (Test professional)", persona: "professional", kind: "professional", headline: "Operations manager, food processing · internal test account", org: "Independent" },
  { key: "mentor", email: "mentor@truevix.example", name: "Grace Liu (Test mentor)", persona: "mentor", kind: "expert_mentor", headline: "Product mentor · internal test account", org: "Independent" },
  { key: "researcher", email: "researcher@truevix.example", name: "Ravi Shankar (Test research participant)", persona: "participant", kind: "participant", headline: "Small-farm owner and research participant · internal test account", org: "Farmer producer organisation (demo)" },
  { key: "institution", email: "institution@truevix.example", name: "Kofi Asante (Test institution rep)", persona: "institution_rep", kind: "institution", headline: "Innovation cell coordinator · internal test account", org: "Northfield Institute of Technology (demo)" },
];

// Fixed ids keep the seed idempotent and easy to remove.
const ID = {
  institution: "0e7086a0-0000-4000-8000-000000000001",
  ventureColdChain: "0e7086a0-0000-4000-8000-000000000101",
  venturePrivate: "0e7086a0-0000-4000-8000-000000000102",
  ventureStudent: "0e7086a0-0000-4000-8000-000000000103",
  workspace: "0e7086a0-0000-4000-8000-000000000201",
  research: "0e7086a0-0000-4000-8000-000000000301",
  researchRun: "0e7086a0-0000-4000-8000-000000000302",
  post1: "0e7086a0-0000-4000-8000-000000000401",
  post2: "0e7086a0-0000-4000-8000-000000000402",
  post3: "0e7086a0-0000-4000-8000-000000000403",
  oppHack: "0e7086a0-0000-4000-8000-000000000501",
  oppExternal: "0e7086a0-0000-4000-8000-000000000502",
  oppDraft: "0e7086a0-0000-4000-8000-000000000503",
  round1: "0e7086a0-0000-4000-8000-000000000511",
  crit1: "0e7086a0-0000-4000-8000-000000000521",
  crit2: "0e7086a0-0000-4000-8000-000000000522",
  study: "0e7086a0-0000-4000-8000-000000000601",
  review: "0e7086a0-0000-4000-8000-000000000701",
  announcement: "0e7086a0-0000-4000-8000-000000000801",
  instRequest: "0e7086a0-0000-4000-8000-000000000901",
};

async function must(label, p) {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function removeDemo() {
  await must("purge demo data", admin.rpc("purge_demo_data"));
  for (const a of ACCOUNTS) {
    const u = await findUserByEmail(a.email);
    if (u) {
      await must(`delete ${a.email}`, admin.auth.admin.deleteUser(u.id));
      console.log(`deleted ${a.email}`);
    }
  }
  console.log("Demo records and demo accounts removed.");
}

/** Written before any seeding, so a later seed failure can never lose the passwords set in this run. */
function writeCredentials(credentials) {
  // Credentials file (git-ignored). Passwords set in this run replace earlier ones; accounts left unchanged keep the
  // password already recorded in the file, so a plain re-run never discards the only copy of a credential.
  const dir = join(root, ".secrets");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "beta-credentials.local.md");
  const previous = new Map();
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\| [^|]+ \| ([^|\s]+) \| ([^|\s]+) \|$/);
      if (m && m[2] !== "Temporary") previous.set(m[1].toLowerCase(), m[2]);
    }
  }
  for (const c of credentials) if (!c.password) c.password = previous.get(c.email) ?? null;
  const lines = [
    "# TRUEVIX internal beta — TEMPORARY test credentials",
    "",
    `Generated ${new Date().toISOString()} for ${new URL(url).host}. Do not commit or share outside the test team.`,
    "Change these passwords (or delete these accounts with --remove-demo) before public launch.",
    "",
    "| Role | Email | Temporary password |",
    "| --- | --- | --- |",
    ...credentials.map((c) => `| ${c.key} | ${c.email} | ${c.password ?? "(unknown — run with --reset-passwords to set a new one)"} |`),
    "",
  ];
  writeFileSync(file, lines.join("\n"), { mode: 0o600 });
  if (process.platform === "win32") {
    // POSIX modes are ignored on Windows: remove inherited ACLs and grant only the current user.
    try {
      execFileSync("icacls", [file, "/inheritance:r", "/grant:r", `${process.env.USERNAME}:F`], { stdio: "ignore" });
    } catch {
      console.warn("Could not restrict the credentials file ACL; restrict it manually.");
    }
  }
  console.log(`\nCredentials written to .secrets/beta-credentials.local.md (git-ignored, owner-only). Passwords are not printed here.`);
}

async function main() {
  if (args.has("--remove-demo")) return removeDemo();

  const users = {};
  const credentials = [];
  for (const a of ACCOUNTS) {
    const existing = await findUserByEmail(a.email);
    if (existing && !args.has("--reset-passwords")) {
      users[a.key] = existing.id;
      credentials.push({ ...a, password: null, created: false });
      console.log(`exists   ${a.email} (password unchanged)`);
      continue;
    }
    const password = strongPassword();
    if (existing) {
      await must(`reset ${a.email}`, admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true }));
      users[a.key] = existing.id;
      credentials.push({ ...a, password, created: false });
      console.log(`rotated  ${a.email}`);
    } else {
      const data = await must(
        `create ${a.email}`,
        admin.auth.admin.createUser({
          email: a.email,
          password,
          // Reserved example.* addresses can't receive mail, so these test accounts are confirmed by the operator.
          // Email confirmation stays required for everyone who registers.
          email_confirm: true,
          user_metadata: { full_name: a.name, accepted_terms_version: "2026-11" },
          app_metadata: { truevix_demo: true },
        }),
      );
      users[a.key] = data.user.id;
      credentials.push({ ...a, password, created: true });
      console.log(`created  ${a.email}`);
    }
  }
  writeCredentials(credentials);

  // Profiles and onboarding (the signup trigger created the rows).
  for (const a of ACCOUNTS) {
    const uid = users[a.key];
    await must(`profile ${a.key}`, admin.from("profiles").update({ display_name: a.name, persona: a.persona, profile_kind: a.kind, headline: a.headline, organisation: a.org, is_demo: true, interests: ["agriculture", "logistics", "ai"], skills: [] }).eq("id", uid));
    await must(`onboarding ${a.key}`, admin.from("onboarding_progress").update({ profile_kind: a.kind, completed: true, completed_at: new Date().toISOString(), step: 1, total_steps: 1 }).eq("user_id", uid));
  }

  // Platform administrator: protected tables only (never user metadata). Super administrator operator role.
  const adminId = users.admin;
  const roles = await must("roles", admin.from("user_roles").select("id").eq("user_id", adminId).eq("role", "platform_admin").is("revoked_at", null));
  await must("admin assignment", admin.from("admin_role_assignments").upsert({ user_id: adminId, admin_role_id: "super_admin" }));
  if (!roles.length) {
    await must("grant platform_admin", admin.from("user_roles").insert({ user_id: adminId, role: "platform_admin", grant_reason: "Beta bootstrap (scripts/bootstrap-beta.mjs)" }));
    // Audit only the run that actually granted access, so re-runs don't add duplicate entries.
    await must("audit grant", admin.from("audit_logs").insert({ actor_id: null, actor_label: "Bootstrap script", action: "Granted platform administrator access", entity: "admin_account", target_id: adminId, target_label: "admin@truevix.example", after_value: "super_admin", reason: "Internal beta bootstrap" }));
  }

  // Institution (demo) + representative membership + a pending administrator-access request to test approvals.
  await must("institution", admin.from("institutions").upsert({ id: ID.institution, name: "Northfield Institute of Technology (demo)", kind: "university", location: "Chennai, India", description: "Fictional institution used for internal beta testing.", status: "verified", relationship: "listed", is_demo: true }));
  await must("rep membership", admin.from("institution_members").upsert({ institution_id: ID.institution, user_id: users.institution, member_role: "representative", status: "active" }, { onConflict: "institution_id,user_id" }));
  await must("student membership", admin.from("institution_members").upsert({ institution_id: ID.institution, user_id: users.student, member_role: "member", status: "active" }, { onConflict: "institution_id,user_id" }));
  const pendingReq = await must("existing request", admin.from("institution_requests").select("id").eq("id", ID.instRequest));
  if (!pendingReq.length) await must("institution request", admin.from("institution_requests").insert({ id: ID.instRequest, request_type: "administrator_access", institution_id: ID.institution, requested_by: users.institution, position_title: "Innovation cell coordinator", note: "Demo request: approve it from Admin → Institutions to test the approval flow.", is_demo: true }));

  // Mentor talent profile (approved) so founders can invite a review.
  await must("talent", admin.from("talent_profiles").upsert({ user_id: users.mentor, kind: "mentor", status: "approved", verification: "self_declared", availability: "available", hours_per_month: 6, capacity: 3, areas: ["Product strategy", "Customer discovery"], application_statement: "Demo mentor profile for internal testing.", is_demo: true }));

  // Ventures.
  const v = (row) => ({ ...row, is_demo: true });
  await must("venture public", admin.from("ventures").upsert(v({ id: ID.ventureColdChain, owner_id: users.founder, title: "ColdTrace: low-cost cold-chain sensors for smallholder farms (demo)", summary: "Battery-powered temperature tags that warn farmers before stored produce spoils.", problem: "Smallholder farmers lose produce in storage because they cannot see temperature excursions until spoilage is visible.", solution: "A cheap sensor tag with SMS alerts and a shared dashboard for producer organisations.", industry: "agriculture", target_users: "Smallholder farmers and farmer producer organisations", geography: "India", stage: "validation", required_skills: ["Embedded systems", "Field research"], collaboration_needs: "Looking for an embedded engineer and access to two pilot cold rooms.", visibility: "public_summary", status: "submitted", review_status: "approved", publication: "published" })));
  await must("venture private", admin.from("ventures").upsert(v({ id: ID.venturePrivate, owner_id: users.founder, title: "Private pricing experiment (demo, confidential)", summary: "Confidential pricing hypotheses.", problem: "CONFIDENTIAL: willingness-to-pay notes from producer organisations.", solution: "CONFIDENTIAL: tiered subscription model.", industry: "agriculture", target_users: "Producer organisations", geography: "India", stage: "research", visibility: "private", status: "draft" })));
  await must("venture student", admin.from("ventures").upsert(v({ id: ID.ventureStudent, owner_id: users.student, title: "Campus water-quality monitor (demo, private)", summary: "Student project to monitor hostel water tanks.", problem: "Hostel water tanks are cleaned on a fixed schedule regardless of actual contamination.", solution: "Low-cost turbidity and TDS sensors reporting to the hostel office.", industry: "water", target_users: "Hostel administrators", geography: "Chennai", stage: "concept", visibility: "private", status: "draft" })));

  // Validation workspace + evidence on the founder's public venture.
  await must("workspace", admin.from("validation_workspaces").upsert({ id: ID.workspace, venture_id: ID.ventureColdChain, created_by: users.founder, is_demo: true }));
  await must("sections", admin.from("validation_sections").upsert([
    { workspace_id: ID.workspace, section_id: "problem", status: "done", notes: "Five interviews confirmed storage losses (demo notes)." },
    { workspace_id: ID.workspace, section_id: "customer_validation", status: "in_progress", notes: "" },
  ], { onConflict: "workspace_id,section_id" }));
  const ev = await must("evidence check", admin.from("evidence").select("id").eq("workspace_id", ID.workspace));
  if (!ev.length) {
    await must("evidence", admin.from("evidence").insert([
      { workspace_id: ID.workspace, section_id: "problem", evidence_type: "customer_response", body: "Demo record: 4 of 5 farmers interviewed reported losing produce in storage last season.", source: "Demo interviews (fictional)", created_by: users.founder, is_demo: true },
      { workspace_id: ID.workspace, section_id: "market", evidence_type: "assumption", body: "Demo record: producer organisations will pay for a shared dashboard.", source: "Founder assumption", created_by: users.founder, is_demo: true },
    ]));
    await must("assumption", admin.from("assumptions").insert({ workspace_id: ID.workspace, statement: "Will producer organisations pay monthly? (demo)", created_by: users.founder }));
  }

  // A research project (template plan, honestly labelled) on the founder's venture.
  await must("research", admin.from("research_projects").upsert({ id: ID.research, owner_id: users.founder, venture_id: ID.ventureColdChain, question: "Who pays for cold-chain monitoring in smallholder agriculture? (demo)", categories: ["market", "customer"], depth: "scan", saved: true, is_demo: true }));
  await must("research run", admin.from("research_runs").upsert({ id: ID.researchRun, project_id: ID.research, status: "completed", provenance: "framework", completed_at: new Date().toISOString() }));
  const findings = await must("findings check", admin.from("research_findings").select("id").eq("run_id", ID.researchRun));
  if (!findings.length) await must("findings", admin.from("research_findings").insert([{ run_id: ID.researchRun, section_key: "summary", heading: "Executive summary", body: "Demo research plan generated from the built-in template. It lists questions to verify, not findings.", position: 0 }]));

  // A pending expert review request from the founder to the mentor.
  const rv = await must("review check", admin.from("expert_reviews").select("id").eq("id", ID.review));
  if (!rv.length) await must("review", admin.from("expert_reviews").insert({ id: ID.review, venture_id: ID.ventureColdChain, reviewer_id: users.mentor, requested_by: users.founder, request_note: "Demo request: what would you test first?", is_demo: true }));

  // Posts.
  await must("posts", admin.from("posts").upsert([
    { id: ID.post1, author_id: users.founder, kind: "founder_update", title: "Demo: first cold-room pilot agreed", body: "Internal beta demo post. We agreed a two-week pilot with a producer organisation's cold room.", industries: ["agriculture"], venture_id: ID.ventureColdChain, is_demo: true },
    { id: ID.post2, author_id: users.professional, kind: "problem", title: "Demo: line changeover wastes 40 minutes a shift", body: "Internal beta demo post. Anyone working on changeover scheduling for small food plants?", industries: ["manufacturing"], is_demo: true },
    { id: ID.post3, author_id: users.mentor, kind: "discussion", title: "Demo: talk to five customers before you build", body: "Internal beta demo post from a mentor account.", industries: ["consumer"], is_demo: true },
  ]));

  // Opportunities.
  await must("opportunities", admin.from("opportunities").upsert([
    { id: ID.oppHack, kind: "hackathon", title: "TRUEVIX Agri-Tech Build Weekend (demo)", organisation: "TRUEVIX beta team", description: "Fictional hackathon for testing on-platform registration, rounds and judging.", eligibility: "Students and early-stage founders.", industries: ["agriculture", "ai"], stages: ["concept", "prototype"], location: "Online", deadline: "2027-01-31", publication: "published", source: "weblaze", registration_mode: "on_platform", team_min: 1, team_max: 4, format: "online", is_demo: true },
    { id: ID.oppExternal, kind: "grant", title: "Example Innovation Grant (demo listing)", organisation: "Example Foundation (fictional)", description: "Fictional external listing used to test the application tracker.", eligibility: "Registered startups.", industries: ["sustainability"], stages: ["prototype", "pilot"], location: "India", deadline: "2027-02-28", publication: "published", source: "external", registration_mode: "external", official_url: "https://example.org/grant", is_demo: true },
    { id: ID.oppDraft, kind: "workshop", title: "Customer interviews workshop (demo draft)", organisation: "TRUEVIX beta team", description: "Draft listing visible only to administrators.", publication: "draft", source: "weblaze", registration_mode: "none", is_demo: true },
  ], { defaultToNull: false }));
  await must("rounds", admin.from("opportunity_rounds").upsert([{ id: ID.round1, opportunity_id: ID.oppHack, name: "Prototype submission", description: "Submit a short demo video link.", deadline: "2027-01-31T18:00:00Z", position: 0 }]));
  await must("criteria", admin.from("opportunity_criteria").upsert([
    { id: ID.crit1, opportunity_id: ID.oppHack, label: "Problem evidence", weight: 40, position: 0 },
    { id: ID.crit2, opportunity_id: ID.oppHack, label: "Working prototype", weight: 60, position: 1 },
  ]));

  // A study recruiting participants, with the research participant applied and consenting.
  await must("study", admin.from("studies").upsert({ id: ID.study, owner_id: users.founder, venture_id: ID.ventureColdChain, title: "How do you store produce after harvest? (demo study)", description: "Fictional 20-minute interview study for internal testing.", format: "Video call, 20 minutes", eligibility: "Farmers who store produce for more than a week.", status: "recruiting", target_participants: 8, consent_text: "I agree to a 20-minute recorded interview. I can withdraw at any time.", is_demo: true }));
  const part = await must("participation check", admin.from("study_participants").select("id").eq("study_id", ID.study).eq("user_id", users.researcher));
  if (!part.length) await must("participation", admin.from("study_participants").insert({ study_id: ID.study, user_id: users.researcher, consent: "given", consent_at: new Date().toISOString(), is_demo: true }));

  // A published announcement.
  await must("announcement", admin.from("announcements").upsert({ id: ID.announcement, title: "Welcome to the TRUEVIX beta", body: "This is an internal beta. Demo records are labelled “demo”.", audience: [], channels: ["in_app"], status: "published", published_at: new Date().toISOString(), created_by: adminId }));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
