/**
 * Real-authentication portal checks against a running TRUEVIX deployment (production by default).
 *
 *   npm run test:live                                   # https://truenix.vercel.app
 *   LIVE_BASE_URL=http://localhost:3100 npm run test:live
 *
 * Signs in through the real login form with the beta accounts created by scripts/bootstrap-beta.mjs. Credentials are
 * read at run time from .secrets/beta-credentials.local.md (git-ignored) and are never logged. Nothing here seeds
 * browser storage, mocks the network or bypasses Supabase Auth. Read-only: the tests create no records.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CREDENTIALS_FILE = join(process.cwd(), ".secrets", "beta-credentials.local.md");

function loadCredentials(): Record<string, { email: string; password: string }> {
  if (!existsSync(CREDENTIALS_FILE)) throw new Error("Run scripts/bootstrap-beta.mjs first: .secrets/beta-credentials.local.md is missing.");
  const out: Record<string, { email: string; password: string }> = {};
  for (const line of readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\| ([a-z]+) \| ([^|\s]+@[^|\s]+) \| ([^|\s]+) \|$/);
    if (m) out[m[1]] = { email: m[2], password: m[3] };
  }
  return out;
}
const creds = loadCredentials();

type Account = { key: string; firstName: string; landing: RegExp; portal: string; portalText: RegExp; tab?: RegExp };
const ACCOUNTS: Account[] = [
  { key: "admin", firstName: "Asha", landing: /\/admin$/, portal: "/admin/users", portalText: /student@truevix\.example/ },
  { key: "student", firstName: "Meera", landing: /\/home$/, portal: "/ideas", portalText: /Campus water-quality monitor/, tab: /My ideas/ },
  { key: "founder", firstName: "Lena", landing: /\/home$/, portal: "/ideas", portalText: /Private pricing experiment/, tab: /My ideas/ },
  { key: "professional", firstName: "Nadia", landing: /\/home$/, portal: "/community", portalText: /Community/ },
  { key: "mentor", firstName: "Grace", landing: /\/home$/, portal: "/reviews", portalText: /ColdTrace/ },
  { key: "researcher", firstName: "Ravi", landing: /\/home$/, portal: "/studies", portalText: /How do you store produce/ },
  { key: "institution", firstName: "Kofi", landing: /\/home$/, portal: "/institution", portalText: /approved representative/ },
];

/** Console errors and uncaught page errors. Failed requests the app handles (e.g. 4xx on a denied query) are not counted. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function signIn(page: Page, key: string) {
  const c = creds[key];
  if (!c?.password || c.password.startsWith("(")) throw new Error(`No password recorded for ${key}`);
  await page.goto("/login");
  await page.getByLabel("Email").fill(c.email);
  await page.getByLabel("Password").fill(c.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

async function signOutViaMenu(page: Page, admin: boolean) {
  await page.getByRole("button", { name: admin ? "Administrator account" : "Open account menu" }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test.describe.configure({ mode: "serial" });

test("homepage and login page load", async ({ page }) => {
  const errors = trackErrors(page);
  const res = await page.goto("/");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toContainText(/TRUEVIX/i);
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  expect(errors).toEqual([]);
});

test("signed-out visitors are sent to login from protected and admin routes", async ({ page }) => {
  for (const path of ["/home", "/admin", "/admin/users", "/ideas", "/institution"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[/]/g, "%2F")}`));
  }
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.student.email);
  await page.getByLabel("Password").fill("Definitely-Wrong-Passw0rd");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

for (const a of ACCOUNTS) {
  test(`${a.key}: logs in, reaches their portal, survives refresh, logs out`, async ({ page }) => {
    const errors = trackErrors(page);
    await signIn(page, a.key);
    await expect(page).toHaveURL(a.landing, { timeout: 20_000 });
    if (a.key === "admin") await expect(page.getByText("Platform overview").first()).toBeVisible({ timeout: 20_000 });
    else await expect(page.getByRole("heading", { name: `Good to see you, ${a.firstName}.` })).toBeVisible({ timeout: 20_000 });

    await page.goto(a.portal);
    if (a.tab) await page.getByRole("tab", { name: a.tab }).click();
    await expect(page.locator("main, [data-admin-page]").first()).toContainText(a.portalText, { timeout: 20_000 });

    // A full reload keeps the Supabase session (cookie based), so the portal renders again without signing in.
    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);
    if (a.tab) await page.getByRole("tab", { name: a.tab }).click();
    await expect(page.locator("main, [data-admin-page]").first()).toContainText(a.portalText, { timeout: 20_000 });

    await signOutViaMenu(page, a.key === "admin");
    await page.goto("/home");
    await expect(page).toHaveURL(/\/login\?next=%2Fhome/);
    expect(errors).toEqual([]);
  });
}

test("a student cannot use the admin portal or see another member's private venture", async ({ page }) => {
  await signIn(page, "student");
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /This area is for platform administrators/i })).toBeVisible({ timeout: 20_000 });
  await page.goto("/admin/users");
  await expect(page.locator("body")).not.toContainText("founder@truevix.example");

  // Founder's private venture: not listed, and not readable by guessing its id.
  await page.goto("/ideas");
  await expect(page.locator("main")).toContainText(/ColdTrace/, { timeout: 20_000 });
  await expect(page.locator("main")).not.toContainText(/Private pricing experiment/);
  await page.getByRole("tab", { name: /My ideas/ }).click();
  await expect(page.locator("main")).toContainText(/Campus water-quality monitor/);
  await expect(page.locator("main")).not.toContainText(/Private pricing experiment/);
  await page.goto("/ideas/0e7086a0-0000-4000-8000-000000000102");
  await expect(page.locator("body")).not.toContainText(/CONFIDENTIAL|tiered subscription/);
  // Direct database calls with a member's own session are covered by tests/db (RLS, real Supabase sessions).
  await signOutViaMenu(page, false);
});

test("the founder's public summary is visible while its confidential venture row is not exposed", async ({ page }) => {
  await signIn(page, "professional");
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  await page.goto("/ideas/0e7086a0-0000-4000-8000-000000000101");
  await expect(page.locator("main")).toContainText(/ColdTrace/, { timeout: 20_000 });
  await page.goto("/ideas/0e7086a0-0000-4000-8000-000000000102");
  await expect(page.locator("body")).not.toContainText(/CONFIDENTIAL|tiered subscription/);
  await signOutViaMenu(page, false);
});

test("admin server actions work: audited reveal of a demo research report", async ({ page }) => {
  // Exercises adminReveal → requireAdmin → service-role client on the server. Fails when SUPABASE_SERVICE_ROLE_KEY is
  // missing from the deployment. Writes one "Viewed research report" audit entry per run (that is the feature).
  const results: string[] = [];
  page.on("response", async (r) => {
    if (r.request().method() === "POST" && r.request().headers()["next-action"]) {
      const m = (await r.text().catch(() => "")).match(/"ok":false,"error":"([^"]{0,200})"/);
      if (m) results.push(m[1]);
    }
  });
  await signIn(page, "admin");
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  await page.goto("/admin/research/0e7086a0-0000-4000-8000-000000000301");
  await page.getByRole("button", { name: "Open with a reason" }).click({ timeout: 30_000 });
  await page.getByLabel("Why do you need to see it?").fill("Automated production check of the audited admin reveal (demo record).");
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect.poll(() => results, { timeout: 15_000 }).toEqual([]);
  await expect(page.getByText(/Demo research plan generated/).first()).toBeVisible({ timeout: 20_000 });
  expect(results, "admin server action errors").toEqual([]);
  await signOutViaMenu(page, true);
});

test("no server secret reaches the browser", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (r) => {
    const type = r.headers()["content-type"] ?? "";
    if (/javascript|json|html|text|x-component/.test(type)) bodies.push(await r.text().catch(() => ""));
  });
  await signIn(page, "admin");
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  await expect(page.getByText("Platform overview").first()).toBeVisible({ timeout: 20_000 });
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");

  // Every script the page loaded, plus source maps if the deployment serves them.
  const scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean));
  for (const src of scripts) {
    const r = await page.request.get(src);
    bodies.push(await r.text());
    const map = await page.request.get(`${src}.map`);
    if (map.ok()) bodies.push(await map.text());
  }

  const all = bodies.join("\n");
  expect(all.length).toBeGreaterThan(1000);
  expect(all).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/);
  expect(all).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
  // Also compare against the actual key when it is available locally (value never printed).
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) {
    const key = readFileSync(envFile, "utf8").match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
    if (key) expect(all.includes(key), "service-role key value found in browser traffic").toBe(false);
  }
  await signOutViaMenu(page, true);
});
