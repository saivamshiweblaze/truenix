import { expect, test } from "@playwright/test";
import { signInAsPersona, trackErrors } from "./helpers";

const ROUTES = [
  ["/home", "Good to see you"],
  ["/discover", "Discover"],
  ["/ideas", "Ideas"],
  ["/ideas/new", "Submit an idea"],
  ["/ideas/i-neowarm", "NeoWarm"],
  ["/research", "AI Researcher"],
  ["/validate", "Validate my idea"],
  ["/community", "Community"],
  ["/people/p-amara", "Amara Okafor"],
  ["/opportunities", "Opportunities"],
  ["/opportunities/o-agri-hack", "Field to Data Agri Hackathon"],
  ["/workspace", "My workspace"],
  ["/notifications", "Notifications"],
  ["/messages", "Messages"],
  ["/search?q=water", "Search"],
  ["/settings", "Settings"],
  ["/profile", "Meera Krishnan"],
] as const;

test("every main route renders without console errors", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Student with an idea");
  await expect(page).toHaveURL(/\/home/);
  for (const [path, heading] of ROUTES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first(), path).toContainText(heading);
  }
  expect(errors).toEqual([]);
});

test("submit, then edit an idea; save and follow other ideas", async ({ page }) => {
  await signInAsPersona(page, "Student with an idea");
  await page.goto("/ideas/new");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/at least 8 characters/)).toBeVisible();
  await page.getByLabel("Idea title").fill("Grain moisture sensor for village stores");
  await page.getByLabel("Problem being solved").fill("Small grain stores lose stock to mould because moisture is checked by hand only a few times a season.");
  await page.getByLabel("Proposed solution").fill("A cheap probe that texts the store owner when moisture rises.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Target users").fill("Village grain store operators");
  await page.getByLabel("Geography").fill("Karnataka, India");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Public summary", { exact: true }).click();
  await page.getByRole("button", { name: "Submit idea" }).click();
  await expect(page.getByText("Confirm the ownership declaration to submit.")).toBeVisible();
  await page.getByRole("checkbox", { name: /I confirm this idea/ }).check();
  await page.getByRole("button", { name: "Submit idea" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit idea" }).click();
  await expect(page.getByRole("heading", { name: "Your idea is submitted" })).toBeVisible();
  await page.getByRole("link", { name: "View idea" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Grain moisture sensor for village stores" })).toBeVisible();

  await page.getByRole("link", { name: "Edit idea" }).click();
  await page.getByLabel("Idea title").fill("Grain moisture alerts for village stores");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await page.goto("/ideas");
  await page.getByRole("tab", { name: /My ideas/ }).click();
  await expect(page.getByRole("link", { name: "Grain moisture alerts for village stores" })).toBeVisible();

  // Save and follow a seeded idea
  await page.goto("/ideas/i-cauce");
  await page.getByRole("button", { name: "Follow project" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toBeVisible();
  await page.getByRole("button", { name: "Save idea" }).click();
  await page.goto("/workspace");
  await page.getByRole("tab", { name: /Saved/ }).click();
  await expect(page.getByRole("link", { name: /Cauce/ })).toBeVisible();
});

test("feed filters, search, appreciation, saving and comments", async ({ page }) => {
  await signInAsPersona(page, "Student exploring");
  await page.goto("/discover");
  await page.getByLabel("Search the feed").fill("mycelium");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByLabel("Search the feed").fill("");
  await page.getByLabel("Filter by post type").selectOption({ label: "Question" });
  await expect(page.locator("article").first()).toContainText("Question");
  await page.getByLabel("Filter by post type").selectOption({ label: "All post types" });

  const first = page.locator("article").first();
  await first.getByRole("button", { name: "Appreciate" }).click();
  await expect(first.getByRole("button", { name: "Remove appreciation" })).toBeVisible();
  await first.getByRole("button", { name: "Save" }).click();
  await first.getByRole("button", { name: /Comments/ }).click();
  await first.getByRole("textbox", { name: "Comment" }).fill("Useful perspective — thank you for sharing.");
  await first.getByRole("button", { name: "Post", exact: true }).click();
  await expect(first.getByText("Useful perspective — thank you for sharing.")).toBeVisible();
  await page.getByRole("tab", { name: /Saved/ }).click();
  await expect(page.locator("article")).toHaveCount(1);

  // Global search with suggestions
  await page.getByRole("combobox", { name: /Search ideas, people/ }).fill("Cauce");
  await expect(page.getByRole("option").first()).toContainText("Cauce");
  await page.getByRole("combobox", { name: /Search ideas, people/ }).press("Enter");
  await expect(page).toHaveURL(/search\?q=Cauce/);
  await expect(page.getByRole("link", { name: /Cauce/ }).first()).toBeVisible();
});

test("AI Researcher produces a clearly labelled research plan that can be saved", async ({ page }) => {
  await signInAsPersona(page, "Independent founder");
  await page.goto("/research");
  await page.getByRole("button", { name: "Run research" }).click();
  await expect(page.getByText("Write a research question of at least 10 characters.")).toBeVisible();
  await page.getByLabel("Research question").fill("Who buys cold-chain capacity for small exporters?");
  await page.getByRole("radio", { name: "Quick scan" }).click();
  await page.getByRole("button", { name: "Run research" }).click();
  await expect(page.getByLabel("Research progress")).toBeVisible();
  await expect(page.getByText("Research plan, not findings.", { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Executive summary" })).toBeVisible();
  await page.getByRole("button", { name: "Save research" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.getByRole("tab", { name: /Saved/ }).click();
  await expect(page.getByRole("link", { name: "Who buys cold-chain capacity for small exporters?" })).toBeVisible();
});

test("validation workspace keeps evidence types separate", async ({ page }) => {
  await signInAsPersona(page, "Student with an idea");
  await page.goto("/validate");
  await page.getByLabel("Working title").fill("Shared tool library for hostels");
  await page.getByLabel("The problem").fill("Students buy tools they use once a semester and then throw them away.");
  await page.getByRole("button", { name: "Start validating" }).click();
  await expect(page).toHaveURL(/\/validate\/idea-/);

  const panel = page.getByRole("region", { name: /Problem validation/ });
  await panel.getByRole("button", { name: /Draft analysis from template/ }).click();
  await expect(panel.getByText("AI analysis · template")).toBeVisible();

  await panel.getByLabel("Evidence type").selectOption({ label: "Customer response" });
  await panel.getByRole("textbox", { name: "Evidence", exact: true }).fill("Said she bought a drill for one weekend and has not used it since.");
  await panel.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByText("Add who or where this came from")).toBeVisible();
  await panel.getByLabel("Source").fill("Interview, hostel resident, 10 Nov");
  await panel.getByRole("button", { name: "Add evidence" }).click();
  await expect(panel.getByRole("list").getByText("Customer response", { exact: true })).toBeVisible();
  await panel.getByRole("radio", { name: "Done" }).click();

  await expect(page.getByText("1/12")).toBeVisible();
  await page.getByRole("tab", { name: "Final report" }).click();
  await expect(page.getByText(/does not score the idea/)).toBeVisible();
});

test("notifications can be read and messages sent", async ({ page }) => {
  await signInAsPersona(page, "Mentor");
  await page.goto("/notifications");
  await page.getByRole("tab", { name: /Unread/ }).click();
  const before = await page.locator("main li").count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByText("You are all caught up")).toBeVisible();

  await page.goto("/messages?thread=t-amara");
  await page.getByLabel("Write a message").fill("Thanks — I would love a slot.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Thanks — I would love a slot.")).toBeVisible();
});

test("role areas are gated, developer tools are hidden, and the admin console works", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Student exploring");
  await expect(page.getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin console" })).toHaveCount(0);
  // The role switcher is a developer tool and must not appear in customer builds.
  await expect(page.getByRole("button", { name: /Dev tools/ })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.getByText(/This area is for platform administrators/)).toBeVisible();

  await signInAsPersona(page, "Platform administrator");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();

  // Phase 1.8: reported content is handled from the moderation queue, one report at a time.
  await page.getByRole("link", { name: "Moderation queue", exact: true }).click();
  await page.getByRole("link", { name: /What should a two-person startup do about security/ }).click();
  const view = page.locator("[data-admin-page]:visible");
  await view.getByLabel("Content action").selectOption({ label: "Remove the content" });
  await view.getByLabel("Resolution").fill("Promotional link removed per community guidelines.");
  await page.getByRole("button", { name: "Resolve with action" }).click();
  await expect(page.getByText("Action taken").first()).toBeVisible();
  await page.getByRole("link", { name: "Audit log", exact: true }).click();
  await expect(page.locator("[data-admin-page]:visible tbody tr").first()).toContainText("Removed content");

  for (const label of ["Users", "Admin roles", "Ideas and projects", "Community content", "Institutions", "Opportunities", "Settings and data"]) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await signInAsPersona(page, "Institution administrator");
  await expect(page).toHaveURL(/\/institution/);
  await expect(page.getByText("Sample data", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
