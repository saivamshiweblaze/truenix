import { expect, test, type Page } from "@playwright/test";
import { pdfBuffer, pngBuffer, signInAsPersona, trackErrors } from "./helpers";

async function register(page: Page, name = "Asha Verma", email = "asha@example.com") {
  await page.goto("/register");
  await page.locator("main:visible").first().getByLabel("Full name").fill(name);
  await page.locator("main:visible").first().getByLabel("Email").fill(email);
  await page.locator("main:visible").first().getByLabel("Password", { exact: true }).fill("goodpass123");
  await page.locator("main:visible").first().getByLabel("Confirm password").fill("goodpass123");
  await page.locator("main:visible").first().getByRole("checkbox", { name: /I agree to the/ }).check();
  await page.locator("main:visible").first().getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
}

/** Previously visited routes stay mounted but hidden, so always scope to the visible page. */
const vis = (page: Page) => page.locator("main:visible").first();
const cont = (page: Page) => vis(page).getByRole("button", { name: "Continue", exact: true }).click();
const chip = (page: Page, group: string, option: string) => vis(page).getByRole("group", { name: group }).getByRole("checkbox", { name: option, exact: true }).click();
const resumeInput = (page: Page) => vis(page).locator("[data-testid=upload-resume] input[type=file]");
const photoInput = (page: Page) => vis(page).locator("[data-testid=upload-photo] input[type=file]");

async function choose(page: Page, role: string) {
  await vis(page).locator("label").filter({ hasText: role }).first().click();
  await cont(page);
}

test("student onboarding enforces every mandatory field and completes", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page);
  await choose(page, "Student");

  // Personal — everything missing
  await expect(vis(page).getByRole("heading", { name: "Personal information" })).toBeVisible();
  await expect(vis(page).getByLabel("Full name")).toHaveValue("Asha Verma");
  await expect(vis(page).getByLabel("Email address")).toHaveValue("asha@example.com");
  await cont(page);
  await expect(vis(page).getByText("Enter your phone number.")).toBeVisible();
  await expect(vis(page).getByText("Add a profile photo.")).toBeVisible();

  // Invalid phone numbers
  await vis(page).getByLabel("Phone number").fill("98ab76");
  await cont(page);
  await expect(vis(page).getByText("Use digits only, with an optional leading + and country code.")).toBeVisible();
  await vis(page).getByLabel("Phone number").fill("+91 123");
  await cont(page);
  await expect(vis(page).getByText(/Enter a complete number with country code/)).toBeVisible();
  await vis(page).getByLabel("Phone number").fill("+91 98765 43210");

  // Verification is an integration point only — it must not claim a code was sent.
  await vis(page).getByRole("button", { name: "Verify", exact: true }).click();
  await expect(vis(page).getByText(/Text-message verification isn’t connected yet/)).toBeVisible();

  // Photo: unsupported type, then a valid PNG
  await photoInput(page).setInputFiles({ name: "me.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(vis(page).getByText("Upload a JPG, PNG or WebP image.")).toBeVisible();
  await photoInput(page).setInputFiles({ name: "me.png", mimeType: "image/png", buffer: pngBuffer() });
  await expect(vis(page).getByText("me.png")).toBeVisible();
  await cont(page);

  // Education — currently studying an undergraduate degree
  await expect(vis(page).getByRole("heading", { name: "Education" })).toBeVisible();
  await cont(page);
  await expect(vis(page).getByText("Enter your university or institution.")).toBeVisible();
  await expect(vis(page).getByText("Choose your education level.")).toBeVisible();
  await vis(page).getByLabel("University or institution").fill("Northfield Institute of Technology");
  await vis(page).getByText("Undergraduate", { exact: true }).click();
  await vis(page).getByLabel("Qualification", { exact: true }).selectOption({ label: "B.Tech / B.E." });
  await vis(page).getByLabel("Field of study or specialisation").fill("Biotechnology");
  await vis(page).getByText("Currently studying", { exact: true }).click();
  await cont(page);
  await expect(vis(page).getByText("Choose your current year.")).toBeVisible();
  await vis(page).getByLabel("Current year of study").selectOption("Third year");
  await vis(page).getByLabel("Expected completion year").selectOption("2028");
  await cont(page);

  // Professional presence
  await expect(vis(page).getByRole("heading", { name: "Professional presence" })).toBeVisible();
  await cont(page);
  await expect(vis(page).getByText("Add your LinkedIn profile URL.")).toBeVisible();
  await expect(vis(page).getByText("Upload your resume as a PDF.")).toBeVisible();

  await vis(page).getByLabel("LinkedIn profile URL").fill("https://example.com/in/asha");
  await cont(page);
  await expect(vis(page).getByText(/Enter your LinkedIn profile URL, like/)).toBeVisible();
  await vis(page).getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/asha-verma");

  // Resume: unsupported format, renamed non-PDF, oversized, then valid
  await resumeInput(page).setInputFiles({ name: "resume.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("PK..") });
  await expect(vis(page).getByText("Upload your resume as a PDF file.")).toBeVisible();
  await resumeInput(page).setInputFiles({ name: "resume.pdf", mimeType: "application/pdf", buffer: Buffer.from("this is not really a pdf") });
  await expect(vis(page).getByText(/isn’t a valid PDF/)).toBeVisible();
  await resumeInput(page).setInputFiles({ name: "big.pdf", mimeType: "application/pdf", buffer: pdfBuffer(6 * 1024 * 1024) });
  await expect(vis(page).getByText(/The limit is 5\.0 MB/)).toBeVisible();
  await resumeInput(page).setInputFiles({ name: "Asha-Verma-Resume.pdf", mimeType: "application/pdf", buffer: pdfBuffer() });
  await expect(vis(page).getByText("Asha-Verma-Resume.pdf")).toBeVisible();

  // Replace and remove before submission
  await vis(page).getByRole("button", { name: "Remove resume" }).click();
  await expect(vis(page).getByText("Asha-Verma-Resume.pdf")).toHaveCount(0);
  await resumeInput(page).setInputFiles({ name: "Asha-Verma-CV.pdf", mimeType: "application/pdf", buffer: pdfBuffer() });
  await expect(vis(page).getByText("Asha-Verma-CV.pdf")).toBeVisible();

  await cont(page);

  // What you want to do
  await expect(vis(page).getByRole("heading", { name: "What you want to do" })).toBeVisible();
  await cont(page);
  await expect(vis(page).getByText("Choose an option.").first()).toBeVisible();
  await chip(page, "Where you want to contribute", "Research and validation");
  await vis(page).getByText("Yes, I have an idea").click();
  await vis(page).getByText(/I’d like to join a project/).click();
  await cont(page);

  // Interests and preferences — optional suggestions, with custom entries
  await expect(vis(page).getByRole("heading", { name: "Interests and preferences" })).toBeVisible();
  await chip(page, "Skills", "Biology lab work");
  await vis(page).getByLabel("Add your own skills").fill("Tissue culture");
  await vis(page).getByLabel("Add your own skills").press("Enter");
  await expect(vis(page).getByRole("group", { name: "Skills" }).getByRole("checkbox", { name: "Tissue culture" })).toHaveAttribute("aria-checked", "true");
  await chip(page, "Industries", "Healthcare");
  await chip(page, "Collaboration preferences", "Hybrid");
  await cont(page);

  // Review
  await expect(vis(page).getByRole("heading", { name: "Review your profile" })).toBeVisible();
  await expect(vis(page).getByText("Asha-Verma-CV.pdf")).toBeVisible();
  await expect(vis(page).getByText("· unverified")).toBeVisible();
  await vis(page).getByRole("button", { name: "Complete profile" }).click();
  await expect(vis(page).getByRole("heading", { name: /You’re all set, Asha/ })).toBeVisible();

  // No file contents in browser storage — metadata only.
  const stored = await page.evaluate(() => window.localStorage.getItem("truevix.demo.state.v1") ?? "");
  expect(stored).toContain("Asha-Verma-CV.pdf");
  expect(stored).not.toContain("%PDF");
  expect(stored).not.toContain("data:");
  expect(stored).toContain('"phoneVerified":false');
  expect(stored).toContain('"role":"student_idea"');

  await vis(page).getByRole("button", { name: "Go to your home page" }).click();
  await expect(page).toHaveURL(/\/home/);
  await expect(vis(page).getByRole("heading", { name: "Good to see you, Asha." })).toBeVisible();

  await page.goto("/profile");
  await expect(vis(page).getByRole("link", { name: "linkedin.com/in/asha-verma" })).toBeVisible();
  await expect(vis(page).getByText("+919876543210")).toBeVisible();
  await expect(vis(page).getByText("Biotechnology", { exact: true })).toBeVisible();
  await expect(vis(page).getByText("B.Tech / B.E. student, Biotechnology · Northfield Institute of Technology")).toBeVisible();
  await expect(vis(page).getByText("Biology lab work, Tissue culture")).toBeVisible();
  expect(errors).toEqual([]);
});

test("founder onboarding asks for venture details, not academic ones", async ({ page }) => {
  await register(page, "Lena Brandt", "lena@example.com");
  await choose(page, "Founder");
  await vis(page).getByLabel("Phone number").fill("+49 30 1234 5678");
  await cont(page);

  await expect(vis(page).getByRole("heading", { name: "Your venture" })).toBeVisible();
  await expect(vis(page).getByLabel("University or institution")).toHaveCount(0);
  await cont(page);
  await expect(vis(page).getByText("Enter your venture or project name.")).toBeVisible();
  await vis(page).getByLabel("Venture or project name").fill("Kiln Energy");
  await vis(page).getByLabel("Stage").selectOption({ label: "Prototype" });
  await vis(page).getByLabel("Primary industry").selectOption({ label: "Energy" });
  await vis(page).getByLabel("Location").fill("Berlin, Germany");
  await vis(page).getByLabel(/^Website/).fill("not a url");
  await vis(page).getByLabel("What are you building?").fill("Energy monitoring for small factories that cannot afford an energy manager.");
  await cont(page);
  await expect(vis(page).getByText("Enter a full web address starting with https://")).toBeVisible();
  await vis(page).getByLabel(/^Website/).fill("");
  await cont(page);

  await expect(vis(page).getByRole("heading", { name: "Professional presence" })).toBeVisible();
  await expect(vis(page).locator("[data-testid=upload-resume]")).toHaveCount(0);
  await vis(page).getByLabel("Your role").fill("Co-founder and CEO");
  await vis(page).getByLabel("LinkedIn profile URL").fill("https://de.linkedin.com/in/lena-brandt");
  await vis(page).getByLabel("Professional experience").selectOption({ label: "8–15 years" });
  await cont(page);

  await chip(page, "You’re looking for", "Engineers");
  await cont(page);

  // Preferences are optional: skipping keeps the venture industry as a starting interest.
  await expect(vis(page).getByRole("heading", { name: "Interests and preferences" })).toBeVisible();
  await vis(page).getByRole("button", { name: "Skip for now" }).click();
  await vis(page).getByRole("button", { name: "Complete profile" }).click();
  await expect(vis(page).getByRole("heading", { name: /You’re all set, Lena/ })).toBeVisible();
  const stored = await page.evaluate(() => window.localStorage.getItem("truevix.demo.state.v1") ?? "");
  expect(stored).toContain('"role":"founder"');
  expect(stored).toContain('"profileKind":"founder"');
  expect(stored).toContain('"interests":["energy"]');
});

test("participant onboarding does not require LinkedIn; institution onboarding opens the institution portal", async ({ page }) => {
  await register(page, "Ravi Shankar", "ravi@example.com");
  await choose(page, "Research participant");
  await vis(page).getByLabel("Phone number").fill("+91 99887 76655");
  await cont(page);
  await expect(vis(page).getByRole("heading", { name: "Your background" })).toBeVisible();
  await expect(vis(page).getByLabel("LinkedIn profile URL")).toHaveCount(0);
  await vis(page).getByLabel("Occupation").fill("Small-farm owner");
  await vis(page).getByLabel("Location").fill("Mandya, India");
  await vis(page).getByLabel("Languages you’re comfortable with").fill("Kannada, English");
  await chip(page, "Sectors you know first-hand", "Agriculture");
  await cont(page);
  await chip(page, "Study formats", "Surveys");
  await vis(page).getByLabel("Availability").selectOption({ label: "1–2 hours a month" });
  await vis(page).locator("label").filter({ hasText: "Phone" }).last().click();
  await cont(page);
  await vis(page).getByRole("button", { name: "Complete profile" }).click();
  await expect(vis(page).getByRole("heading", { name: /You’re all set, Ravi/ })).toBeVisible();

  // Institution representative
  await register(page, "Kofi Asante", "kofi@example.com");
  await choose(page, "Institution representative");
  await vis(page).getByLabel("Phone number").fill("+233 24 123 4567");
  await cont(page);
  await vis(page).getByLabel("Institution name").fill("Coastal University");
  await vis(page).getByLabel("Institution type").selectOption({ label: "University" });
  await vis(page).getByLabel("Your position").fill("Innovation cell coordinator");
  await vis(page).getByLabel("Department or office").fill("Office of Innovation");
  await vis(page).getByLabel("Official website").fill("https://coastal.example.edu");
  await vis(page).getByLabel("Location").fill("Accra, Ghana");
  await cont(page);
  await vis(page).getByLabel("LinkedIn profile URL").fill("https://www.linkedin.com/in/kofi-asante");
  await chip(page, "Programmes you run", "Incubation");
  await chip(page, "What you want to do here", "Publish opportunities");
  await cont(page);
  await vis(page).getByRole("button", { name: "Skip for now" }).click();
  await vis(page).getByRole("button", { name: "Complete profile" }).click();
  await vis(page).getByRole("button", { name: "Go to your home page" }).click();
  await expect(page).toHaveURL(/\/institution/);
  await expect(vis(page).getByRole("heading", { level: 1, name: "Coastal University" })).toBeVisible();
  await expect(vis(page).getByText(/are not Coastal University’s records/)).toBeVisible();
});

/** Fills the personal step for a student so the education step can be tested on its own. */
async function toEducation(page: Page, name: string, email: string) {
  await register(page, name, email);
  await choose(page, "Student");
  await vis(page).getByLabel("Phone number").fill("+91 98765 43210");
  await photoInput(page).setInputFiles({ name: "me.png", mimeType: "image/png", buffer: pngBuffer() });
  await expect(vis(page).getByText("me.png")).toBeVisible();
  await cont(page);
  await expect(vis(page).getByRole("heading", { name: "Education" })).toBeVisible();
  await vis(page).getByLabel("University or institution").fill("Coastal University");
  await vis(page).getByLabel("Field of study or specialisation").fill("Computer Science");
}

test("a graduated student is never asked for a year of study", async ({ page }) => {
  await toEducation(page, "Priya Das", "priya@example.com");
  await vis(page).getByText("Undergraduate", { exact: true }).click();
  await vis(page).getByLabel("Qualification", { exact: true }).selectOption({ label: "B.Tech / B.E." });

  // While studying, year of study and expected completion are asked…
  await vis(page).getByText("Currently studying", { exact: true }).click();
  await expect(vis(page).getByLabel("Current year of study")).toBeVisible();
  await vis(page).getByLabel("Current year of study").selectOption("Fourth year");

  // …but after choosing "Graduated" they disappear, and the graduation year is asked instead.
  await vis(page).getByText("Graduated", { exact: true }).click();
  await expect(vis(page).getByLabel("Current year of study")).toHaveCount(0);
  await expect(vis(page).getByLabel("Expected completion year")).toHaveCount(0);
  await cont(page);
  await expect(vis(page).getByText("Choose the year you completed it.")).toBeVisible();
  const thisYear = String(new Date().getFullYear());
  await vis(page).getByLabel("Graduation year").selectOption(thisYear);
  await cont(page);
  await expect(vis(page).getByRole("heading", { name: "Professional presence" })).toBeVisible();

  // The stale year of study is not kept.
  await vis(page).getByRole("button", { name: "Back" }).click();
  await expect(vis(page).getByLabel("Graduation year")).toHaveValue(thisYear);
  await expect(vis(page).getByLabel("Current year of study")).toHaveCount(0);
});

test("postgraduate, doctoral and professional qualifications show the right fields", async ({ page }) => {
  await toEducation(page, "Kwame Boateng", "kwame@example.com");

  // Postgraduate: postgraduate qualifications only, and postgraduate years.
  await vis(page).getByText("Postgraduate", { exact: true }).click();
  const qual = vis(page).getByLabel("Qualification", { exact: true });
  await expect(qual.locator("option", { hasText: "MBA" })).toHaveCount(1);
  await expect(qual.locator("option", { hasText: "B.Sc." })).toHaveCount(0);
  await qual.selectOption({ label: "MBA" });
  await vis(page).getByText("Currently studying", { exact: true }).click();
  const years = vis(page).getByLabel("Current year of study").locator("option");
  await expect(years).toHaveText(["Select…", "First year", "Second year", "Third year"]);
  await page.screenshot({ path: "test-results/screens/desktop-onboarding-education.png", fullPage: true });

  // Switching to doctoral clears the MBA and replaces years with research stages.
  await vis(page).getByText("Doctoral", { exact: true }).click();
  await expect(vis(page).getByLabel("Qualification", { exact: true })).toHaveValue("");
  await expect(vis(page).getByLabel("Current year of study")).toHaveCount(0);
  await expect(vis(page).getByLabel("Current stage")).toBeVisible();
  await vis(page).getByLabel("Qualification", { exact: true }).selectOption({ label: "PhD" });
  await vis(page).getByLabel("Current stage").selectOption("Research");
  await vis(page).getByLabel("Expected completion year").selectOption({ index: 3 });
  await cont(page);
  await expect(vis(page).getByRole("heading", { name: "Professional presence" })).toBeVisible();
  await vis(page).getByRole("button", { name: "Back" }).click();

  // Other / professional qualification: a free-text qualification, no undergraduate years.
  await vis(page).getByText("Other / professional qualification", { exact: true }).click();
  await expect(vis(page).getByLabel("Qualification", { exact: true })).toHaveCount(0);
  await expect(vis(page).getByLabel("Current stage")).toHaveCount(0);
  await vis(page).getByText("Graduated", { exact: true }).click();
  await cont(page);
  await expect(vis(page).getByText("Enter the name of your qualification.")).toBeVisible();
  await vis(page).getByLabel("Qualification name").fill("Chartered Accountancy");
  await vis(page).getByLabel("Graduation year").selectOption({ index: 2 });
  await cont(page);
  await expect(vis(page).getByRole("heading", { name: "Professional presence" })).toBeVisible();
});

test("preferences chosen in onboarding can be edited later and change the home page", async ({ page }) => {
  const errors = trackErrors(page);
  await signInAsPersona(page, "Student with an idea");
  await expect(vis(page).getByRole("heading", { name: /Good to see you/ })).toBeVisible();
  await expect(vis(page).getByRole("region", { name: "Personalised for" }).or(vis(page).locator("section[aria-labelledby=interests]"))).toContainText("Agriculture");

  await vis(page).getByRole("link", { name: "Edit" }).last().click();
  await expect(page).toHaveURL(/\/settings\?tab=preferences/);
  await expect(vis(page).getByRole("tab", { name: "Interests and preferences" })).toHaveAttribute("aria-selected", "true");
  const save = vis(page).getByRole("button", { name: "Save preferences" });
  await expect(save).toBeDisabled();

  await chip(page, "Industries", "Agriculture"); // deselect
  await chip(page, "Industries", "Healthcare");
  await chip(page, "Technologies", "Robotics");
  await vis(page).getByLabel("Add your own technologies").fill("Quantum sensing");
  await vis(page).getByRole("button", { name: "Add to technologies" }).click();
  await chip(page, "Skills", "Hardware");
  await save.click();
  await expect(page.getByText("Preferences saved")).toBeVisible();
  await expect(save).toBeDisabled();

  // Persisted in one place and reflected everywhere that personalises.
  const stored = JSON.parse(await page.evaluate(() => window.localStorage.getItem("truevix.demo.state.v1") ?? "{}"));
  expect(stored.user.interests).toEqual(["ai", "logistics", "healthcare"]);
  expect(stored.user.industries).toEqual(stored.user.interests);
  expect(stored.user.skills).toContain("Hardware");
  expect(stored.user.profile.technologies).toEqual(["Robotics", "Quantum sensing"]);

  await page.reload();
  await expect(vis(page).getByRole("group", { name: "Technologies" }).getByRole("checkbox", { name: "Quantum sensing" })).toHaveAttribute("aria-checked", "true");

  await page.goto("/home");
  const personal = vis(page).locator("section[aria-labelledby=interests]");
  await expect(personal).toContainText("Healthcare");
  await expect(personal).not.toContainText("Agriculture");
  await expect(vis(page).getByRole("heading", { name: "Projects that need your skills" })).toBeVisible();

  await page.goto("/profile");
  await expect(vis(page).locator("section[aria-labelledby=prefs-title]")).toContainText("Quantum sensing");
  expect(errors).toEqual([]);
});
