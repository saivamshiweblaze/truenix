import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, scrollThrough, signInAsPersona, trackErrors } from "./helpers";

const SCREENS = ["/home", "/profile", "/discover", "/ideas", "/ideas/i-neowarm", "/ideas/new", "/research", "/validate", "/community", "/opportunities", "/opportunities/o-agri-hack", "/workspace", "/messages", "/settings", "/settings?tab=preferences", "/notifications"];

test("public, auth and onboarding pages fit the viewport", async ({ page }, info) => {
  // Seven scroll-throughs plus full-page screenshots, then a sign-up: allow more than the 45s default under parallel load.
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  for (const p of ["/", "/about", "/terms", "/privacy", "/login", "/register", "/forgot-password"]) {
    await page.goto(p);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await scrollThrough(page);
    await page.screenshot({ path: `test-results/screens/${info.project.name}-public${p === "/" ? "-home" : p.replaceAll("/", "-")}.png`, fullPage: true });
  }
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Mobile Tester");
  await page.getByLabel("Email").fill("mobile@example.com");
  await page.getByLabel("Password", { exact: true }).fill("goodpass123");
  await page.getByLabel("Confirm password").fill("goodpass123");
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-onboarding-role.png`, fullPage: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Enter your phone number.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-onboarding-personal.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("app screens fit the viewport and navigation works", async ({ page }, info) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Student with an idea");
  await expect(page).toHaveURL(/\/home/);
  for (const p of SCREENS) {
    await page.goto(p);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/screens/${info.project.name}${p.replaceAll("/", "-").replace("?tab=", "-")}.png`, fullPage: true });
  }

  if (info.project.name !== "desktop") {
    // Submitting an idea is one tap away from any screen.
    await page.goto("/discover");
    await page.getByRole("banner").getByRole("link", { name: "Submit an idea" }).click();
    await expect(page).toHaveURL(/\/ideas\/new$/);

    await page.goto("/home");
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Opportunities" }).click();
    await expect(page).toHaveURL(/opportunities/);
    await expect(page.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
    await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Ideas" }).click();
    await expect(page).toHaveURL(/\/ideas$/);
  }
  expect(errors).toEqual([]);
});

test("institution and admin dashboards fit the viewport", async ({ page }, info) => {
  await signInAsPersona(page, "Institution administrator");
  await page.goto("/institution");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-institution.png`, fullPage: true });
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/users");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-admin-users.png` });
});

const ADMIN_SCREENS = [
  "/admin",
  "/admin/users",
  "/admin/users/p-ananya",
  "/admin/onboarding",
  "/admin/ideas",
  "/admin/ideas/i-neowarm",
  "/admin/content",
  "/admin/moderation",
  "/admin/moderation/rep-5",
  "/admin/opportunities",
  "/admin/opportunities/new",
  "/admin/opportunities/o-agri-hack",
  "/admin/opportunities/o-agri-hack?tab=hackathon",
  "/admin/opportunities/o-agri-hack/applications/reg-1",
  "/admin/institutions",
  "/admin/institutions/inst-northfield",
  "/admin/talent",
  "/admin/studies/st-neowarm",
  "/admin/research",
  "/admin/validation/i-neowarm",
  "/admin/collaboration",
  "/admin/communications",
  "/admin/cms",
  "/admin/cms/home-hero",
  "/admin/analytics",
  "/admin/access",
  "/admin/audit",
  "/admin/settings",
];

test("admin portal fits every viewport and its navigation works", async ({ page }, info) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  for (const p of ADMIN_SCREENS) {
    await page.goto(p);
    await expect(page.getByRole("heading", { level: 1 }).first(), p).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/screens/${info.project.name}${p.replaceAll("/", "-").replace("?tab=", "-")}.png`, fullPage: true });
  }
  if (info.project.name !== "desktop") {
    // Sidebar becomes a drawer below the lg breakpoint.
    await page.goto("/admin");
    await page.getByRole("button", { name: "Open admin menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Admin navigation" });
    await drawer.getByRole("link", { name: "Moderation queue" }).click();
    await expect(page).toHaveURL(/\/admin\/moderation$/);
    await expect(drawer).toHaveCount(0);
    // Tables become cards; the primary column stays a link.
    await page.goto("/admin/users");
    const view = page.locator("[data-admin-page]:visible");
    await view.getByLabel("Search members").fill("Ananya");
    await view.getByRole("link", { name: /Ananya Iyer/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/users\/p-ananya/);
  }
  expect(errors).toEqual([]);
});
