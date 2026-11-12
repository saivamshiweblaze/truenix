import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

test("register, verify email, complete onboarding and land on home", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/register");

  // Validation feedback
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your full name.")).toBeVisible();

  await page.getByLabel("Full name").fill("Asha Verma");
  await page.getByLabel("Email").fill("asha@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  await page.getByLabel("Password").fill("goodpass123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/verify-email/);
  await page.getByRole("button", { name: "Simulate verification and continue" }).click();

  await expect(page).toHaveURL(/onboarding/);
  await page.getByText("Student with an idea", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Add a short headline")).toBeVisible();
  await page.getByLabel("Headline").fill("Biotech student working on diagnostics");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Healthcare" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: "Biology lab work" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByRole("heading", { name: /You are set up, Asha/ })).toBeVisible();
  await page.getByRole("button", { name: "Go to your home page" }).click();

  await expect(page).toHaveURL(/\/home/);
  await expect(page.getByRole("heading", { name: "Good to see you, Asha." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Submit your idea/ })).toBeVisible();

  // Sign out and back in with the same email
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  // Next keeps previously visited routes mounted but hidden, so scope to visible fields.
  await page.locator("input[type=email]:visible").fill("asha@example.com");
  await page.locator("input[type=password]:visible").fill("anything1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/);
  expect(errors).toEqual([]);
});

test("unknown email cannot sign in and protected routes redirect to login", async ({ page }) => {
  await page.goto("/discover");
  await expect(page).toHaveURL(/login\?next=%2Fdiscover/);
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("whatever1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/No demonstration account with that email/)).toBeVisible();
});

test("forgot and reset password flow is clearly simulated", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("asha@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("No email was sent.")).toBeVisible();
  await page.getByRole("link", { name: "Open the reset step" }).click();
  await page.getByLabel("New password", { exact: true }).fill("newpass123");
  await page.getByLabel("Confirm new password").fill("different1");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await page.getByLabel("Confirm new password").fill("newpass123");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
});
