import { expect, type Page } from "@playwright/test";

/** Collects console errors and page errors so tests can assert none occurred. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

export async function signInAsPersona(page: Page, roleLabel: string) {
  await page.goto("/login");
  await page.getByLabel("Continue as a demo persona").selectOption({ label: roleLabel });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}
