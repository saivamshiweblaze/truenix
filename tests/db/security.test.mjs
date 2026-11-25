/**
 * TRUEVIX database security tests — RLS, auth, storage and admin isolation, run against a real Supabase API with
 * real Auth users (local stack by default).
 *
 *   npm run db:start && npm run db:reset      # local stack with all migrations
 *   npm run test:rls
 *
 * Environment: SUPABASE_TEST_URL / SUPABASE_TEST_ANON_KEY / SUPABASE_TEST_SERVICE_KEY, or the values printed by
 * `supabase status -o env` (API_URL / ANON_KEY / SERVICE_ROLE_KEY). Running against a hosted project requires
 * SUPABASE_TEST_ALLOW_REMOTE=1; every user and row created here is deleted at the end.
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function localEnv() {
  try {
    const out = execSync("npx supabase status -o env", { stdio: ["ignore", "pipe", "ignore"] }).toString();
    return Object.fromEntries(out.split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  } catch {
    return {};
  }
}
const env = process.env.SUPABASE_TEST_URL ? {} : localEnv();
const URL_ = process.env.SUPABASE_TEST_URL ?? env.API_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY ?? env.ANON_KEY ?? env.PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_TEST_SERVICE_KEY ?? env.SERVICE_ROLE_KEY ?? env.SECRET_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("No Supabase test target. Start the local stack (npm run db:start) or set SUPABASE_TEST_* variables.");
const REMOTE = !/127\.0\.0\.1|localhost/.test(URL_);
if (REMOTE && process.env.SUPABASE_TEST_ALLOW_REMOTE !== "1") throw new Error(`Refusing to run against ${URL_} without SUPABASE_TEST_ALLOW_REMOTE=1.`);

const service = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const run = randomBytes(4).toString("hex");
const users = {};
const clients = {};
const password = `Rls-${randomBytes(9).toString("base64url")}9a`;

async function makeUser(key, opts = {}) {
  const email = `rls-${key}-${run}@truevix.test`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `RLS ${key}` } });
  if (error) throw error;
  users[key] = data.user.id;
  await service.from("onboarding_progress").update({ completed: true }).eq("user_id", data.user.id);
  if (opts.persona) await service.from("profiles").update({ persona: opts.persona }).eq("id", data.user.id);
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await c.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  clients[key] = c;
  return c;
}

const ok = (res, msg) => assert.equal(res.error, null, `${msg}: ${res.error?.message}`);
const denied = (res, msg) => assert.ok(res.error, `${msg}: expected an error, got ${JSON.stringify(res.data)}`);
const none = (res, msg) => {
  ok(res, msg);
  assert.equal((res.data ?? []).length, 0, `${msg}: expected no rows, got ${(res.data ?? []).length}`);
};

let ventureId;
let publicVentureId;

before(async () => {
  await makeUser("founder", { persona: "founder" });
  await makeUser("student", { persona: "student_idea" });
  await makeUser("collab", { persona: "professional" });
  await makeUser("mentor", { persona: "mentor" });
  await makeUser("admin", { persona: "professional" });
  await service.from("user_roles").insert({ user_id: users.admin, role: "platform_admin", grant_reason: "RLS test" });
  await service.from("admin_role_assignments").insert({ user_id: users.admin, admin_role_id: "super_admin" });
  // Admin's permissions are read at sign-in time of each request, no re-login needed.
});

after(async () => {
  // Deleting the users cascades to every row they own. Failures are reported, never silently left behind.
  const failures = [];
  // Storage objects are not removed by deleting their owner, so remove this run's uploads explicitly.
  const uploads = [
    ["resumes", `${users.student}/cv-${run}.pdf`],
    ["venture-documents", `${ventureId}/doc-${run}.pdf`],
  ];
  for (const [bucket, path] of uploads) {
    const { error } = await service.storage.from(bucket).remove([path]);
    if (error) failures.push(`${bucket}/${path}: ${error.message}`);
  }
  for (const [key, id] of Object.entries(users)) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) failures.push(`${key}: ${error.message}`);
  }
  if (failures.length) throw new Error(`Test users not cleaned up (run ${run}): ${failures.join("; ")}`);
});

describe("authentication", () => {
  test("wrong password is rejected", async () => {
    const c = createClient(URL_, ANON, { auth: { persistSession: false } });
    const res = await c.auth.signInWithPassword({ email: `rls-founder-${run}@truevix.test`, password: "WrongPassword123" });
    assert.ok(res.error);
  });
  test("sign-up does not create a session before email confirmation", async () => {
    const email = `rls-signup-${run}@truevix.test`;
    if (REMOTE) {
      // Hosted projects: public signUp would make the mailer send to an undeliverable address (bounces can get the
      // project's email sending restricted), so create the same unconfirmed account without sending mail.
      const created = await service.auth.admin.createUser({ email, password, email_confirm: false });
      ok(created, "create unconfirmed user");
      users.signup = created.data.user.id;
    } else {
      const res = await anon.auth.signUp({ email, password });
      ok(res, "signUp");
      assert.equal(res.data.session, null, "email confirmation must be required");
      if (res.data.user) users.signup = res.data.user.id;
    }
    const login = await createClient(URL_, ANON, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password });
    assert.ok(login.error, "unconfirmed account must not sign in");
  });
  test("signup trigger provisions profile, account and member defaults (no roles)", async () => {
    const ctx = await clients.student.rpc("my_session_context");
    ok(ctx, "session context");
    assert.equal(ctx.data.account_status, "active");
    assert.deepEqual(ctx.data.roles, []);
    assert.equal(ctx.data.admin_role, null);
  });
  test("role metadata in sign-up cannot grant privileges", async () => {
    const email = `rls-meta-${run}@truevix.test`;
    const claims = { role: "platform_admin", roles: ["platform_admin"], admin_role: "super_admin" };
    // Hosted: same user-controlled metadata, created without sending mail (see above). The signup trigger is identical.
    const res = REMOTE
      ? await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: claims })
      : await anon.auth.signUp({ email, password, options: { data: claims } });
    ok(res, "signUp");
    if (res.data.user) {
      users.meta = res.data.user.id;
      const roles = await service.from("user_roles").select("*").eq("user_id", res.data.user.id);
      assert.equal(roles.data.length, 0);
      const assigned = await service.from("admin_role_assignments").select("*").eq("user_id", res.data.user.id);
      assert.equal(assigned.data.length, 0);
      if (REMOTE) {
        const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
        ok(await c.auth.signInWithPassword({ email, password }), "sign in");
        const ctx = await c.rpc("my_session_context");
        assert.deepEqual(ctx.data.roles, []);
        assert.equal(ctx.data.admin_role, null);
        denied(await c.rpc("admin_venture_index"), "admin index with forged metadata");
      }
    }
  });
  test("signing out ends the session", async () => {
    const c = createClient(URL_, ANON, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: `rls-collab-${run}@truevix.test`, password });
    await c.auth.signOut();
    const res = await c.from("profiles").select("id").eq("id", users.collab);
    // Signed out = anonymous: the members-only profile is not visible.
    assert.equal((res.data ?? []).length, 0);
  });
});

describe("privilege escalation", () => {
  test("member cannot grant themselves platform_admin", async () => denied(await clients.founder.from("user_roles").insert({ user_id: users.founder, role: "platform_admin" }), "insert role"));
  test("member cannot assign an admin role", async () => denied(await clients.founder.from("admin_role_assignments").insert({ user_id: users.founder, admin_role_id: "super_admin" }), "assign"));
  test("member cannot set a privileged persona", async () => denied(await clients.founder.from("profiles").update({ persona: "platform_admin" }).eq("id", users.founder), "persona"));
  test("member cannot change account status", async () => denied(await clients.founder.from("account_status").update({ status: "active" }).eq("user_id", users.founder), "status"));
  test("member cannot edit admin permission matrix", async () => denied(await clients.founder.from("admin_permissions").insert({ admin_role_id: "analyst", module: "settings", permission: "edit" }), "permissions"));
  test("member cannot call admin index functions", async () => denied(await clients.founder.rpc("admin_venture_index"), "admin index"));
  test("member cannot read the audit log", async () => none(await clients.founder.from("audit_logs").select("id"), "audit"));
  test("member cannot write the audit log", async () => denied(await clients.founder.from("audit_logs").insert({ action: "x", entity: "y" }), "audit insert"));
  test("member cannot purge demo data", async () => denied(await clients.founder.rpc("purge_demo_data"), "purge"));
  test("platform admin has admin context", async () => {
    const ctx = await clients.admin.rpc("my_session_context");
    assert.equal(ctx.data.admin_role, "super_admin");
    ok(await clients.admin.rpc("admin_venture_index"), "admin index");
  });
});

describe("private ventures and controlled disclosure", () => {
  test("founder creates a private venture", async () => {
    const res = await clients.founder.from("ventures").insert({ owner_id: users.founder, title: "Secret venture", problem: "secret problem", solution: "secret solution", visibility: "private" }).select("id").single();
    ok(res, "insert");
    ventureId = res.data.id;
  });
  test("student cannot read another user's private venture (guessed id)", async () => none(await clients.student.from("ventures").select("*").eq("id", ventureId), "read"));
  test("student cannot update it", async () => {
    const res = await clients.student.from("ventures").update({ title: "hijack" }).eq("id", ventureId).select("id");
    none(res, "update");
  });
  test("anonymous visitors cannot read ventures", async () => denied(await anon.from("ventures").select("id"), "anon"));
  test("founder cannot self-approve or feature", async () => denied(await clients.founder.from("ventures").update({ review_status: "approved", featured: true }).eq("id", ventureId), "self approve"));
  test("grant to collaborator is ignored while private", async () => {
    ok(await clients.founder.from("venture_disclosures").insert({ venture_id: ventureId, grantee_user_id: users.collab, access_level: "collaborator", scope: "full", granted_by: users.founder }), "grant");
    none(await clients.collab.from("ventures").select("id").eq("id", ventureId), "private still hidden");
  });
  test("collaborator gains access when the founder shares with collaborators", async () => {
    ok(await clients.founder.from("ventures").update({ visibility: "collaborators" }).eq("id", ventureId), "visibility");
    const res = await clients.collab.from("ventures").select("id").eq("id", ventureId);
    ok(res, "read");
    assert.equal(res.data.length, 1);
  });
  test("other members still cannot see it", async () => none(await clients.student.from("ventures").select("id").eq("id", ventureId), "student"));
  test("collaborator cannot change visibility or edit", async () => {
    const res = await clients.collab.from("ventures").update({ visibility: "public_summary" }).eq("id", ventureId).select("id");
    none(res, "visibility change");
  });
  test("revocation stops access immediately", async () => {
    ok(await clients.founder.from("venture_disclosures").update({ revoked_at: new Date().toISOString(), revoked_by: users.founder }).eq("venture_id", ventureId).eq("grantee_user_id", users.collab), "revoke");
    none(await clients.collab.from("ventures").select("id").eq("id", ventureId), "after revoke");
  });
  test("revocation is audited", async () => {
    const res = await service.from("audit_logs").select("id").eq("target_id", ventureId).eq("action", "Revoked venture access");
    assert.ok(res.data.length >= 1);
  });
  test("research linked to the venture is private to its team", async () => {
    const p = await clients.founder.from("research_projects").insert({ owner_id: users.founder, venture_id: ventureId, question: "Who pays?" }).select("id").single();
    ok(p, "insert research");
    none(await clients.student.from("research_projects").select("id").eq("id", p.data.id), "student research");
    denied(await clients.founder.from("research_runs").insert({ project_id: p.data.id, provenance: "live" }), "live run must be server-only");
  });
  test("validation evidence is private to its team", async () => {
    const ws = await clients.founder.from("validation_workspaces").insert({ venture_id: ventureId, created_by: users.founder }).select("id").single();
    ok(ws, "workspace");
    ok(await clients.founder.from("evidence").insert({ workspace_id: ws.data.id, section_id: "problem", evidence_type: "customer_response", body: "Interview note", created_by: users.founder }), "evidence");
    none(await clients.student.from("evidence").select("id").eq("workspace_id", ws.data.id), "student evidence");
  });
});

describe("public summaries", () => {
  test("submitted public idea waits for review and is not listed", async () => {
    const res = await clients.founder.from("ventures").insert({ owner_id: users.founder, title: "Public idea", summary: "Short", problem: "p", solution: "s", visibility: "public_summary", status: "submitted" }).select("id, review_status").single();
    ok(res, "insert");
    publicVentureId = res.data.id;
    assert.equal(res.data.review_status, "pending");
    none(await clients.student.from("venture_public_summaries").select("venture_id").eq("venture_id", publicVentureId), "not listed");
  });
  test("after server-side approval the summary is listed, the venture row stays confidential", async () => {
    ok(await service.from("ventures").update({ review_status: "approved" }).eq("id", publicVentureId), "approve");
    const s = await clients.student.from("venture_public_summaries").select("title").eq("venture_id", publicVentureId);
    assert.equal(s.data.length, 1);
    none(await clients.student.from("ventures").select("id").eq("id", publicVentureId), "confidential row");
  });
  test("anonymous visitors see listing fields only", async () => {
    const ok1 = await anon.from("venture_public_summaries").select("title").eq("venture_id", publicVentureId);
    assert.equal(ok1.data?.length, 1);
    denied(await anon.from("venture_public_summaries").select("problem").eq("venture_id", publicVentureId), "problem column");
  });
  test("unpublishing removes it from public listing", async () => {
    ok(await service.from("ventures").update({ publication: "unpublished" }).eq("id", publicVentureId), "unpublish");
    none(await clients.student.from("venture_public_summaries").select("venture_id").eq("venture_id", publicVentureId), "removed");
  });
});

describe("expert review access lifecycle", () => {
  test("reviewer gets access only while the review is accepted", async () => {
    ok(await clients.founder.from("ventures").update({ visibility: "reviewers" }).eq("id", ventureId), "visibility");
    const r = await clients.founder.from("expert_reviews").insert({ venture_id: ventureId, reviewer_id: users.mentor, requested_by: users.founder, request_note: "Please review" }).select("id").single();
    ok(r, "request");
    none(await clients.mentor.from("ventures").select("id").eq("id", ventureId), "before accept");
    denied(await clients.founder.from("expert_reviews").update({ status: "accepted" }).eq("id", r.data.id), "requester cannot accept");
    ok(await clients.mentor.from("expert_reviews").update({ status: "accepted" }).eq("id", r.data.id), "accept");
    assert.equal((await clients.mentor.from("ventures").select("id").eq("id", ventureId)).data.length, 1);
    ok(await clients.mentor.from("expert_reviews").update({ status: "completed", feedback: "Test the riskiest assumption first." }).eq("id", r.data.id), "complete");
    none(await clients.mentor.from("ventures").select("id").eq("id", ventureId), "after completion");
  });
});

describe("community and account isolation", () => {
  test("members cannot read others' contact details", async () => none(await clients.student.from("account_private").select("*").eq("user_id", users.founder), "contact"));
  test("members cannot pin or moderate posts", async () => {
    const p = await clients.student.from("posts").insert({ author_id: users.student, kind: "question", title: "Hello" }).select("id").single();
    ok(p, "post");
    denied(await clients.student.from("posts").update({ pinned: true, moderation_status: "visible" }).eq("id", p.data.id), "pin");
  });
  test("hidden posts disappear for others", async () => {
    const p = await clients.student.from("posts").insert({ author_id: users.student, kind: "question", title: "Hidden soon" }).select("id").single();
    ok(await service.from("posts").update({ moderation_status: "hidden" }).eq("id", p.data.id), "hide");
    none(await clients.founder.from("posts").select("id").eq("id", p.data.id), "others");
    assert.equal((await clients.student.from("posts").select("id").eq("id", p.data.id)).data.length, 1);
  });
  test("suspended members cannot write", async () => {
    await service.from("account_status").update({ status: "suspended" }).eq("user_id", users.collab);
    denied(await clients.collab.from("posts").insert({ author_id: users.collab, kind: "question", title: "x" }), "suspended post");
    await service.from("account_status").update({ status: "active" }).eq("user_id", users.collab);
  });
  test("messages are visible to participants only", async () => {
    const t = await clients.founder.rpc("start_thread", { p_recipient: users.collab, p_subject: "Hi", p_body: "Private hello" });
    ok(t, "thread");
    assert.equal((await clients.collab.from("messages").select("id").eq("thread_id", t.data)).data.length, 1);
    none(await clients.student.from("messages").select("id").eq("thread_id", t.data), "outsider");
  });
});

describe("storage", () => {
  const pdf = new Blob(["%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"], { type: "application/pdf" });
  test("members can only upload resumes into their own folder", async () => {
    ok(await clients.student.storage.from("resumes").upload(`${users.student}/cv-${run}.pdf`, pdf, { contentType: "application/pdf" }), "own folder");
    denied(await clients.student.storage.from("resumes").upload(`${users.founder}/cv-${run}.pdf`, pdf, { contentType: "application/pdf" }), "other folder");
  });
  test("other members cannot read a private resume or sign a URL for it", async () => {
    denied(await clients.founder.storage.from("resumes").download(`${users.student}/cv-${run}.pdf`), "download");
    denied(await clients.founder.storage.from("resumes").createSignedUrl(`${users.student}/cv-${run}.pdf`, 60), "signed url");
  });
  test("venture documents: team uploads, outsiders cannot read", async () => {
    const path = `${ventureId}/doc-${run}.pdf`;
    ok(await clients.founder.storage.from("venture-documents").upload(path, pdf, { contentType: "application/pdf" }), "founder upload");
    denied(await clients.student.storage.from("venture-documents").upload(`${ventureId}/x-${run}.pdf`, pdf, { contentType: "application/pdf" }), "outsider upload");
    denied(await clients.student.storage.from("venture-documents").download(path), "outsider download");
  });
  test("bucket rejects disallowed file types", async () => {
    denied(await clients.student.storage.from("resumes").upload(`${users.student}/x-${run}.html`, new Blob(["<script>"], { type: "text/html" }), { contentType: "text/html" }), "html");
  });
});
