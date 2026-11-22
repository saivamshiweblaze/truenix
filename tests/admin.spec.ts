import { expect, test, type Page } from "@playwright/test";
import { pngBuffer, signInAsPersona, trackErrors } from "./helpers";

/**
 * Phase 1.8 admin portal: real browser workflows that change shared platform data
 * and verify the public product reflects them.
 */

const ADMIN_ROUTES: [string, string][] = [
  ["/admin", "Platform overview"],
  ["/admin/search?q=water", "Search"],
  ["/admin/analytics", "Analytics"],
  ["/admin/audit", "Audit log"],
  ["/admin/users", "Users"],
  ["/admin/users/p-ananya", "Ananya Iyer"],
  ["/admin/users/me", "Platform Operator"],
  ["/admin/onboarding", "Onboarding"],
  ["/admin/talent", "Mentors and experts"],
  ["/admin/talent/p-jonas", "Jonas Weber"],
  ["/admin/institutions", "Institutions and organisations"],
  ["/admin/institutions/new", "New organisation"],
  ["/admin/institutions/inst-northfield", "Northfield Institute of Technology"],
  ["/admin/institutions/inst-northfield/edit", "Edit Northfield Institute of Technology"],
  ["/admin/collaboration", "Collaboration and teams"],
  ["/admin/ideas", "Ideas and projects"],
  ["/admin/ideas/i-neowarm", "NeoWarm"],
  ["/admin/content", "Community content"],
  ["/admin/moderation", "Moderation queue"],
  ["/admin/moderation/rep-5", "Asked for unpaid full-time work"],
  ["/admin/cms", "Site content"],
  ["/admin/cms/home-hero", "Homepage hero"],
  ["/admin/communications", "Announcements and messaging"],
  ["/admin/opportunities", "Opportunities"],
  ["/admin/opportunities/new", "New opportunity"],
  ["/admin/opportunities/o-agri-hack", "Field to Data Agri Hackathon"],
  ["/admin/opportunities/o-agri-hack/edit", "Edit Field to Data Agri Hackathon"],
  ["/admin/opportunities/o-agri-hack/applications/reg-1", "Rain Ledger"],
  ["/admin/studies", "Research studies"],
  ["/admin/studies/new", "New study"],
  ["/admin/studies/st-neowarm", "Night shifts in neonatal wards"],
  ["/admin/research", "AI Researcher"],
  ["/admin/research/rs-grip-1", "Warehouse picking error rates"],
  ["/admin/validation", "Validation"],
  ["/admin/validation/i-neowarm", "NeoWarm"],
  ["/admin/access", "Admin roles and permissions"],
  ["/admin/settings", "Settings and data"],
];

/** The visible page: the current admin view (hidden, previously visited views stay mounted), or main on member pages. */
const main = (page: Page) => page.locator("[data-admin-page]:visible, main:visible:not(:has([data-admin-page]))");
const confirmDialog = (page: Page) => page.getByRole("dialog").last();
const isoInDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

test("every admin route loads directly, with sidebar and breadcrumb navigation", async ({ page }) => {
  // ~40 cold full-page loads in one test: allow more than the 45s default under parallel load.
  test.setTimeout(120_000);
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  for (const [path, heading] of ADMIN_ROUTES) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first(), path).toContainText(heading);
  }
  await page.goto("/admin/does-not-exist");
  await expect(page.getByRole("heading", { name: "This admin page doesn’t exist" })).toBeVisible();

  // Sidebar
  await page.goto("/admin");
  const nav = page.getByRole("navigation", { name: "Admin" });
  await nav.getByRole("link", { name: "Opportunities", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/opportunities$/);
  await expect(nav.getByRole("link", { name: "Opportunities", exact: true })).toHaveAttribute("aria-current", "page");

  // Breadcrumbs
  await page.goto("/admin/users/p-ananya");
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Users" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Global search, by keyboard
  const search = page.getByRole("combobox", { name: "Search all admin records" });
  await search.fill("Railyard");
  await expect(page.getByRole("listbox", { name: "Search results" })).toContainText("Railyard");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/admin\/search\?q=Railyard/);
  await expect(main(page).getByRole("link", { name: /Railyard/ }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("user management: search, filter, edit a profile, suspend, and the shared record updates", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/users");
  await main(page).getByLabel("Search members").fill("Ananya");
  await expect(page.getByText("1 record match")).toBeVisible();
  await main(page).getByLabel("Search members").fill("");
  await main(page).getByLabel("Role", { exact: true }).selectOption({ label: "Domain expert" });
  await expect(main(page).locator("tbody tr")).toHaveCount(5);
  await main(page).getByLabel("Role", { exact: true }).selectOption({ label: "Role: all" });

  // Sorting by name
  await main(page).getByRole("button", { name: "Member" }).click();
  await expect(main(page).locator("tbody tr").first()).toContainText("Amara Okafor");

  await page.goto("/admin/users/p-ananya");
  // Private values are masked until revealed, and revealing is logged.
  await expect(main(page).getByText("ananya.iyer@student.example")).toHaveCount(0);
  await main(page).getByRole("button", { name: "Reveal email" }).click();
  await expect(main(page).getByText("ananya.iyer@student.example")).toBeVisible();

  await main(page).getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Headline").fill("Biomedical engineering graduate building neonatal monitors");
  await dialog.getByLabel("LinkedIn profile URL").fill("not a url");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByText(/Enter a LinkedIn profile URL/)).toBeVisible();
  await dialog.getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/example-ananya");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Member record saved")).toBeVisible();

  await page.goto("/people/p-ananya");
  await expect(main(page).getByText("Biomedical engineering graduate building neonatal monitors", { exact: true })).toBeVisible();

  await page.goto("/admin/users/p-ananya");
  await main(page).getByLabel("Change account status").selectOption({ label: "Suspend" });
  await confirmDialog(page).getByRole("button", { name: "Suspend" }).click();
  await expect(confirmDialog(page).getByText(/Give a reason/)).toBeVisible();
  await confirmDialog(page).getByLabel("Reason").fill("Repeated spam reported by three members.");
  await confirmDialog(page).getByRole("button", { name: "Suspend" }).click();
  await expect(main(page).getByText("Suspended", { exact: true }).first()).toBeVisible();

  await page.goto("/people/p-ananya");
  await expect(page.getByRole("heading", { name: "Profile not available" })).toBeVisible();

  await page.goto("/admin/audit");
  await expect(main(page).locator("tbody tr").first()).toContainText("Account suspended");
  await expect(main(page).locator("tbody")).toContainText("Viewed private information");
  expect(errors).toEqual([]);
});

test("ideas and content: approve and edit an idea, hide and restore a post, dismiss a report", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");

  // A pending idea is not listed for members until approved.
  await page.goto("/ideas");
  await expect(main(page).getByRole("link", { name: /Campus battery sharing/ })).toHaveCount(0);

  await page.goto("/admin/ideas");
  await main(page).getByLabel("Review", { exact: true }).selectOption({ label: "Pending" });
  await main(page).getByRole("link", { name: /Campus battery sharing/ }).click();
  await main(page).getByRole("button", { name: "Approve" }).click();
  await confirmDialog(page).getByRole("button", { name: "Approve" }).click();
  await expect(main(page).getByText("Approved").first()).toBeVisible();

  await main(page).getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill("Campus battery sharing for evening peak demand charges");
  await page.getByRole("dialog").getByLabel("Reason for editing").fill("Owner asked us to clarify the title.");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Campus battery sharing for evening peak demand charges");

  await page.goto("/ideas");
  await expect(main(page).getByRole("link", { name: /Campus battery sharing for evening peak demand charges/ })).toBeVisible();

  // Hide a post, check Discover, then restore it.
  await page.goto("/admin/content");
  await main(page).getByRole("button", { name: "Can mycelium packaging be dried fast enough to compete?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hide" }).click();
  await confirmDialog(page).getByLabel("Reason").fill("Duplicate of a pinned discussion.");
  await confirmDialog(page).getByRole("button", { name: "Hide" }).click();
  await page.goto("/discover");
  await main(page).getByLabel("Search the feed").fill("mycelium");
  await expect(page.locator("main:visible article")).toHaveCount(0);

  await page.goto("/admin/content");
  await main(page).getByLabel("Status", { exact: true }).selectOption({ label: "Hidden" });
  await main(page).getByRole("button", { name: "Can mycelium packaging be dried fast enough to compete?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await confirmDialog(page).getByRole("button", { name: "Restore" }).click();
  await page.goto("/discover");
  await main(page).getByLabel("Search the feed").fill("mycelium");
  await expect(page.locator("main:visible article")).toHaveCount(1);

  // Dismiss a report.
  await page.goto("/admin/moderation/rep-2");
  await main(page).getByLabel("Resolution").fill("Opinion, not misinformation. Keeping the comment.");
  await page.getByRole("button", { name: "Dismiss report" }).click();
  await expect(main(page).getByText("Dismissed").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("opportunities: create, edit and publish a hackathon, register applicants and change status", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/opportunities");
  await main(page).getByRole("link", { name: "New hackathon" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New hackathon");

  // Validation
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByText("Give the opportunity a title of at least 5 characters.")).toBeVisible();

  await main(page).getByLabel("Opportunity title").fill("Water Data Weekend Hackathon");
  await main(page).getByLabel("Description").fill("A weekend hackathon building tools that help small utilities find water losses using open data.");
  await page.getByRole("checkbox", { name: "Water and sanitation" }).click();
  await main(page).getByLabel("Who can apply").fill("Students and graduates, solo or in teams of up to four.");
  await main(page).getByLabel("Registration deadline").fill(isoInDays(20));
  await main(page).getByLabel("Event starts").fill(isoInDays(25));
  await main(page).getByLabel("Event ends").fill(isoInDays(26));
  await main(page).getByLabel("Prizes or benefits").fill("Mentor hours for the top three teams.");
  await main(page).locator('input[type="file"]').first().setInputFiles({ name: "banner.png", mimeType: "image/png", buffer: pngBuffer() });
  await expect(page.getByText("banner.png")).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("dialog", { name: "Preview" })).toContainText("Water Data Weekend Hackathon");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Save and publish" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Data Weekend Hackathon");
  await expect(main(page).getByText("Open", { exact: true }).first()).toBeVisible();

  // Edit
  await main(page).getByRole("button", { name: "Edit" }).click();
  await main(page).getByLabel("Opportunity title").fill("Water Data Weekend Hackathon 2026");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Data Weekend Hackathon 2026");

  // Visible in public Opportunities
  await page.goto("/opportunities");
  await main(page).getByLabel("Search opportunities").fill("Water Data Weekend");
  await main(page).getByRole("link", { name: "Water Data Weekend Hackathon 2026" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Water Data Weekend Hackathon 2026");
  await expect(main(page).getByText("Mentor hours for the top three teams.")).toBeVisible();

  // A member registers on the public page...
  await main(page).getByRole("button", { name: "Register" }).click();
  await main(page).getByLabel("Team name").fill("Leak Finders");
  await main(page).getByLabel("Teammates").fill("Sample teammate — data");
  await main(page).getByLabel("What you plan to work on").fill("Flagging pipe segments with unusual night-time flow.");
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(main(page).getByText(/You registered as Leak Finders/)).toBeVisible();

  // ...and the organiser sees it, adds a demonstration applicant and changes a status.
  await page.goto("/admin/opportunities");
  await main(page).getByRole("link", { name: "Water Data Weekend Hackathon 2026" }).click();
  await main(page).getByRole("tab", { name: /Applications/ }).click();
  await expect(main(page).getByRole("link", { name: "Leak Finders" })).toBeVisible();
  await main(page).getByRole("button", { name: "Add registration" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lead applicant").selectOption({ label: "Rohan Mehta" });
  await dialog.getByLabel("Registration type").selectOption({ label: "Individual" });
  await dialog.getByLabel("What they will work on").fill("Dashboard for district water engineers.");
  await dialog.getByRole("button", { name: "Add registration" }).click();
  await main(page).getByRole("link", { name: "Rohan Mehta" }).click();
  await main(page).getByLabel("Change application status").selectOption({ label: "Shortlisted" });
  await confirmDialog(page).getByRole("button", { name: "Shortlisted" }).click();
  await expect(main(page).getByText("Shortlisted").first()).toBeVisible();
  await main(page).getByLabel("Add a note").fill("Strong fit; confirm availability for the weekend.");
  await main(page).getByRole("button", { name: "Add note" }).click();
  await expect(main(page).getByText("Strong fit; confirm availability for the weekend.")).toBeVisible();

  // Hackathon judging tools
  await page.goto("/admin/opportunities/o-agri-hack?tab=hackathon");
  await expect(main(page).getByRole("heading", { name: "Scoring" })).toBeVisible();
  await expect(main(page).getByText("Weights total 100 of 100.")).toBeVisible();

  await page.goto("/admin/audit");
  await expect(main(page).locator("tbody")).toContainText("Created opportunity");
  await expect(main(page).locator("tbody")).toContainText("Changed application status");
  expect(errors).toEqual([]);
});

test("institutions and mentors: create and edit an organisation, approve a mentor", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/institutions/new");
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByText("Enter the organisation’s full name.")).toBeVisible();
  await main(page).getByLabel("Organisation name").fill("Riverside Innovation Hub");
  await main(page).getByLabel("Type").selectOption({ label: "Incubator" });
  await main(page).getByLabel("Location").fill("Kochi, India");
  await main(page).getByLabel("Relationship").selectOption({ label: "Partner — signed agreement on file" });
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByText("A partner label needs the reference of the signed agreement.")).toBeVisible();
  await main(page).getByLabel("Relationship").selectOption({ label: "Listed only (no agreement)" });
  await page.getByRole("button", { name: "Create organisation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Riverside Innovation Hub");

  // Edit
  await main(page).getByRole("button", { name: "Edit" }).click();
  await main(page).getByLabel("Location").fill("Kochi, Kerala, India");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(main(page).getByText("Kochi, Kerala, India").first()).toBeVisible();

  // Available in organisation selectors
  await page.goto("/admin/opportunities/new");
  await expect(main(page).getByLabel("Organiser on TRUEVIX").locator("option", { hasText: "Riverside Innovation Hub" })).toHaveCount(1);

  // Approve a pending organisation request
  await page.goto("/admin/institutions");
  await main(page).getByRole("button", { name: "Approve" }).first().click();
  await confirmDialog(page).getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Approved:/)).toBeVisible();

  // Mentor application
  await page.goto("/admin/talent");
  await main(page).getByRole("tab", { name: /Applications/ }).click();
  await main(page).getByRole("link", { name: "Jonas Weber" }).click();
  await main(page).getByRole("button", { name: "Approve" }).click();
  await confirmDialog(page).getByRole("button", { name: "Approve" }).click();
  await expect(main(page).getByText("Approved").first()).toBeVisible();
  await page.goto("/admin/users/p-jonas");
  await expect(main(page).getByText("Mentor").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("CMS: edit, preview and publish homepage and FAQ content", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/cms/home-hero");
  await main(page).getByLabel("Headline", { exact: true }).fill("Find the problem. Test the idea. Build the team.");
  await expect(main(page).getByText("Find the problem. Test the idea. Build the team.").last()).toBeVisible();
  await main(page).getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved")).toBeVisible();

  // The draft is not live yet.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From a problem worth solving");

  await page.goto("/admin/cms/home-hero");
  await main(page).getByRole("button", { name: "Publish", exact: true }).click();
  await confirmDialog(page).getByRole("button", { name: "Publish" }).click();
  await expect(main(page).getByText("Version 2")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the problem. Test the idea. Build the team.");

  // New FAQ, published to the Help page
  await page.goto("/admin/cms");
  await main(page).getByRole("button", { name: "FAQ" }).click();
  await main(page).getByLabel("Question").fill("Can I delete my account?");
  await main(page).getByLabel("Answer").fill("Yes. Write to support and we will delete it within 30 days.");
  await main(page).getByRole("button", { name: "Publish", exact: true }).click();
  await confirmDialog(page).getByRole("button", { name: "Publish" }).click();
  await page.goto("/help");
  await page.getByRole("button", { name: "Can I delete my account?" }).click();
  await expect(page.getByText("Yes. Write to support and we will delete it within 30 days.")).toBeVisible();

  // Site banner
  await page.goto("/admin/cms/site-banner");
  await main(page).getByLabel("Banner text").fill("Applications for the Agri Hackathon close soon.");
  await main(page).getByRole("textbox", { name: /^Link\s*optional$/ }).fill("javascript:alert(1)");
  await main(page).getByLabel("Link label").fill("See details");
  await main(page).getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Use a path starting with / or a full https:// address.")).toBeVisible();
  await main(page).getByRole("textbox", { name: /^Link\s*optional$/ }).fill("/opportunities/o-agri-hack");
  await main(page).getByRole("button", { name: "Publish", exact: true }).click();
  await confirmDialog(page).getByRole("button", { name: "Publish" }).click();
  await page.goto("/about");
  await expect(page.getByText("Applications for the Agri Hackathon close soon.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("audit, permissions, announcements and settings are recorded and cannot be erased", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Platform administrator");
  await page.goto("/admin/settings?tab=features");
  await page.getByRole("switch", { name: "Community posting" }).click();
  await page.goto("/admin/access");
  await main(page).getByRole("tab", { name: "Permission matrix" }).click();
  await main(page).getByRole("checkbox", { name: "Community moderator: export Moderation queue" }).check();

  await page.goto("/admin/communications");
  await main(page).getByRole("button", { name: "New announcement" }).click();
  await page.getByRole("dialog").getByLabel("Title").fill("Mentor office hours in January");
  await page.getByRole("dialog").getByLabel("Message").fill("Mentors hold open office hours every Thursday in January.");
  await page.getByRole("checkbox", { name: /Email — not connected/ }).check();
  await page.getByRole("button", { name: "Publish now" }).click();
  await main(page).getByRole("tab", { name: /Delivery log/ }).click();
  await expect(main(page).getByRole("cell", { name: "Not sent", exact: true })).toBeVisible();
  await page.goto("/notifications");
  await expect(main(page).getByText("Mentor office hours in January")).toBeVisible();

  await page.goto("/admin/audit");
  const body = main(page).locator("tbody");
  await expect(body).toContainText("Published announcement");
  await expect(body).toContainText("Granted permission");
  await expect(body).toContainText("Changed platform settings");
  // Append-only: no edit or delete controls exist for entries.
  await expect(main(page).getByRole("button", { name: /Delete|Clear log/i })).toHaveCount(0);
  await main(page).getByRole("button", { name: "Published announcement" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Platform Operator");

  // Reset to seed keeps the audit log and records the reset.
  await page.goto("/admin/settings?tab=data");
  await main(page).getByRole("button", { name: "Reset to seed data" }).click();
  await confirmDialog(page).getByLabel("Reason").fill("Preparing a clean demonstration.");
  await confirmDialog(page).getByLabel("Type RESET to confirm").fill("RESET");
  await confirmDialog(page).getByRole("button", { name: "Reset data" }).click();
  await page.goto("/admin/audit");
  await expect(main(page).locator("tbody tr").first()).toContainText("Reset demonstration data to seed");
  await expect(main(page).locator("tbody")).toContainText("Published announcement");
  expect(errors).toEqual([]);
});
