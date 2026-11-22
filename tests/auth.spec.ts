import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

test("registration validates every field and leads to onboarding without faking email verification", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/register");

  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Confirm your password.")).toBeVisible();
  await expect(page.getByText("Accept the Terms of Service and Privacy Policy to continue.")).toBeVisible();

  await page.getByLabel("Full name").fill("Asha Verma");
  await page.getByLabel("Email").fill("asha@example");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Enter a valid email address/)).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

  await page.getByLabel("Email").fill("asha@example.com");
  await page.getByLabel("Password", { exact: true }).fill("goodpass123");
  await page.getByLabel("Confirm password").fill("goodpass124");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();

  await page.getByLabel("Confirm password").fill("goodpass123");
  await expect(page.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  // The password must never be persisted.
  const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(stored).not.toContain("goodpass123");

  // Email confirmation page never claims an email was sent.
  await page.goto("/verify-email");
  await expect(page.getByText("not yet confirmed")).toBeVisible();
  await expect(page.getByText(/no confirmation message has been sent/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("unknown email cannot sign in and protected routes redirect to login", async ({ page }) => {
  await page.goto("/discover");
  await expect(page).toHaveURL(/login\?next=%2Fdiscover/);
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("whatever1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/couldn’t find an account with that email/)).toBeVisible();
  // Developer persona sign-in is not exposed in customer builds.
  await expect(page.getByText(/sample persona/i)).toHaveCount(0);
});

test("forgot and reset password flow is clearly simulated", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("asha@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("No email was sent.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Open the reset step" }).click();
  await page.getByLabel("New password", { exact: true }).fill("newpass123");
  await page.getByLabel("Confirm new password").fill("different1");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await page.getByLabel("Confirm new password").fill("newpass123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
});
