import { expect, test, type Page } from "@playwright/test";
import { resolveDevTools } from "../src/config/brand";
import { signInAsPersona as seedPersona, trackErrors } from "./helpers";

/**
 * Developer tools are switched on or off at build time, so the UI half of this file
 * runs against whichever build is being served. Tell the tests which build that is by
 * running Playwright with the same NEXT_PUBLIC_DEV_TOOLS value used for `next build`:
 *
 *   Preview-equivalent:  NEXT_PUBLIC_DEV_TOOLS=true  next build && NEXT_PUBLIC_DEV_TOOLS=true  playwright test
 *   Production:                                        next build &&                             playwright test
 */
const DEV_TOOLS_BUILD = process.env.NEXT_PUBLIC_DEV_TOOLS === "true";
const STORAGE_KEY = "truevix.demo.state.v1";

test.describe("resolveDevTools (build-time switch)", () => {
  test("local development is on without the flag", () => {
    expect(resolveDevTools({ nodeEnv: "development" })).toBe(true);
    expect(resolveDevTools({ nodeEnv: "development", deployEnv: "" })).toBe(true);
  });

  test("Vercel Preview is on only when NEXT_PUBLIC_DEV_TOOLS=true", () => {
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "preview", flag: "true" })).toBe(true);
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "preview" })).toBe(false);
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "preview", flag: "1" })).toBe(false);
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "preview", flag: "false" })).toBe(false);
  });

  test("Vercel Production is always off, even if the flag is set", () => {
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "production" })).toBe(false);
    expect(resolveDevTools({ nodeEnv: "production", deployEnv: "production", flag: "true" })).toBe(false);
    expect(resolveDevTools({ nodeEnv: "development", deployEnv: "production", flag: "true" })).toBe(false);
  });

  test("a non-Vercel production build is off unless explicitly flagged", () => {
    expect(resolveDevTools({ nodeEnv: "production" })).toBe(false);
    expect(resolveDevTools({ nodeEnv: "production", flag: "true" })).toBe(true);
  });
});

/** Every persona the login picker offers today (ROLES in src/config/taxonomy.ts) and where it lands. */
const PERSONAS = [
  { label: "Student with an idea", role: "student_idea", name: "Meera Krishnan", home: "/home" },
  { label: "Student exploring", role: "student_explorer", name: "Arjun Nair", home: "/home" },
  { label: "Independent founder", role: "founder", name: "Lena Brandt", home: "/home" },
  { label: "Industry professional", role: "professional", name: "Nadia Rahman", home: "/home" },
  { label: "Domain expert", role: "expert", name: "Dr. Samuel Osei", home: "/home" },
  { label: "Mentor", role: "mentor", name: "Grace Liu", home: "/home" },
  { label: "Research participant", role: "participant", name: "Ravi Shankar", home: "/home" },
  { label: "Institution administrator", role: "institution_admin", name: "Kofi Asante", home: "/institution" },
  { label: "Platform administrator", role: "platform_admin", name: "Platform Operator", home: "/admin" },
] as const;

const storedUser = (page: Page) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return { signedIn: s.signedIn as boolean, role: s.user?.role as string, email: s.user?.email as string, name: s.user?.name as string };
  }, STORAGE_KEY);

async function pickPersona(page: Page, label: string) {
  await page.goto("/login");
  await page.getByLabel("Sign in as a sample persona").selectOption({ label });
  await page.getByRole("button", { name: "Continue" }).click();
}

const urlFor = (path: string) => new RegExp(`${path.replace(/\//g, "\\/")}(\\?|$)`);

/** Signs out the way a person would at the current width: account menu on desktop, More drawer on phones. */
async function signOutViaUi(page: Page, admin: boolean) {
  const menu = page.getByRole("button", { name: admin ? "Administrator account" : "Open account menu" }).filter({ visible: true }).first();
  const more = page.getByRole("button", { name: "More", exact: true }).filter({ visible: true }).first();
  await expect(menu.or(more).first()).toBeVisible();
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
  } else {
    await more.click();
    await page.getByRole("dialog", { name: "Navigation" }).getByRole("button", { name: "Sign out" }).click();
  }
  await expect(page).toHaveURL(/\/login/);
}

test.describe("Preview build: developer tools enabled", () => {
  test.skip(!DEV_TOOLS_BUILD, "Runs against a build made with NEXT_PUBLIC_DEV_TOOLS=true");

  test("login shows the persona picker with every existing persona", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByText("developer tools", { exact: true })).toBeVisible();
    const select = page.getByLabel("Sign in as a sample persona");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveText(PERSONAS.map((p) => p.label));
    // The normal sign-in form is still there and still the primary action.
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const p of PERSONAS) {
    test(`${p.label} signs in, survives refresh, and signs out and back in`, async ({ page }) => {
      const errors = trackErrors(page);
      await pickPersona(page, p.label);
      await expect(page).toHaveURL(urlFor(p.home));
      expect(await storedUser(page)).toEqual({ signedIn: true, role: p.role, email: `${p.role}@sample.local`, name: p.name });

      if (p.role === "platform_admin") await expect(page.locator("[data-admin-page]:visible")).toBeVisible();
      if (p.role === "institution_admin") await expect(page.getByText(/This area is for/)).toHaveCount(0);

      await page.reload();
      await expect(page).toHaveURL(urlFor(p.home));
      expect(await storedUser(page)).toMatchObject({ signedIn: true, role: p.role });

      await signOutViaUi(page, p.role === "platform_admin");
      expect(await storedUser(page)).toMatchObject({ signedIn: false, role: p.role });
      await page.goto(p.home);
      await expect(page).toHaveURL(/\/login/);

      // Signing back in with the same sample email uses the existing local sign-in.
      await page.getByLabel("Email").fill(`${p.role}@sample.local`);
      await page.getByLabel("Password").fill("whatever1");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).not.toHaveURL(/\/login/);
      expect(await storedUser(page)).toMatchObject({ signedIn: true, role: p.role });
      expect(errors).toEqual([]);
    });
  }

  test("switching persona replaces identity and role; admin access does not carry over", async ({ page }) => {
    await pickPersona(page, "Platform administrator");
    await expect(page).toHaveURL(urlFor("/admin"));
    await signOutViaUi(page, true);

    await pickPersona(page, "Independent founder");
    await expect(page).toHaveURL(urlFor("/home"));
    expect(await storedUser(page)).toEqual({ signedIn: true, role: "founder", email: "founder@sample.local", name: "Lena Brandt" });
    // The previous persona's email no longer signs in on this browser.
    await signOutViaUi(page, false);
    await page.getByLabel("Email").fill("platform_admin@sample.local");
    await page.getByLabel("Password").fill("whatever1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/couldn’t find an account with that email/)).toBeVisible();
    // A founder reaching /admin gets the role notice, not the console.
    await pickPersona(page, "Independent founder");
    await expect(page).toHaveURL(urlFor("/home"));
    await page.goto("/admin");
    await expect(page.locator("[data-admin-page]:visible")).toHaveCount(0);
  });
});

test.describe("Production build: developer tools disabled", () => {
  test.skip(DEV_TOOLS_BUILD, "Runs against a build made without NEXT_PUBLIC_DEV_TOOLS");

  test("login hides the developer tools and persona picker", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByText(/developer tools/i)).toHaveCount(0);
    await expect(page.getByText(/sample persona/i)).toHaveCount(0);
    await expect(page.locator("select#persona")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a signed-out visitor cannot reach /admin or the persona picker", async ({ page }) => {
    await page.goto("/terms");
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    await page.goto("/admin");
    await expect(page.locator("[data-admin-page]:visible")).toHaveCount(0);
    await page.goto("/login?next=%2Fadmin");
    await expect(page.locator("select#persona")).toHaveCount(0);
    expect((await storedUser(page))?.signedIn ?? false).toBe(false);
  });

  test("signed-in shells offer no role switcher or admin role preview", async ({ page }) => {
    await seedPersona(page, "Independent founder");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByText(/Dev tools · role/)).toHaveCount(0);
    await seedPersona(page, "Platform administrator");
    await expect(page.locator("[data-admin-page]:visible")).toBeVisible();
    await page.getByRole("button", { name: "Administrator account" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    await expect(page.getByText(/Preview another admin role/)).toHaveCount(0);
  });
});
