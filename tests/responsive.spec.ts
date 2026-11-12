import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, signInAsPersona, trackErrors } from "./helpers";

const SCREENS = ["/home", "/discover", "/ideas", "/ideas/i-neowarm", "/ideas/new", "/research", "/validate", "/community", "/opportunities", "/workspace", "/messages", "/settings", "/notifications"];

test("welcome and auth pages fit the viewport", async ({ page }) => {
  for (const p of ["/", "/login", "/register"]) {
    await page.goto(p);
    await expectNoHorizontalOverflow(page);
  }
  await page.goto("/");
  await page.screenshot({ path: `test-results/screens/${test.info().project.name}-welcome.png`, fullPage: true });
});

test("app screens fit the viewport and navigation works", async ({ page }, info) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Student with an idea");
  await expect(page).toHaveURL(/\/home/);
  for (const p of SCREENS) {
    await page.goto(p);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `test-results/screens/${info.project.name}${p.replaceAll("/", "-")}.png`, fullPage: false });
  }

  if (info.project.name === "mobile") {
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
