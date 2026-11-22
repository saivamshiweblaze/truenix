import { expect, test } from "@playwright/test";
import { signInAsPersona, trackErrors } from "./helpers";

const OLD_ACCENT = "rgb(217, 107, 67)";
const COBALT = "rgb(47, 63, 208)";
const LIME = "rgb(204, 255, 0)";
/** Phase 1.6 emerald, replaced by the functional positive green. */
const OLD_EMERALD = "rgb(16, 185, 129)";
const PETROL = "rgb(14, 112, 134)";

test("homepage leads to About, and Weblaze attribution links to weblaze.in", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From a problem worth solving");
  await expect(page).toHaveTitle(/^TRUEVIX/);

  // The product logo stays a product link; it never redirects to the company.
  await expect(page.getByRole("link", { name: "TRUEVIX home" }).first()).toHaveAttribute("href", "/");

  // Footer attribution: only the company name is a link, opening in a new tab.
  const footerLink = page.locator("footer").getByRole("link", { name: /Weblaze Technologies/ });
  await expect(footerLink).toHaveAttribute("href", "https://weblaze.in");
  await expect(footerLink).toHaveAttribute("target", "_blank");
  await expect(footerLink).toHaveAttribute("rel", /noopener/);

  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("startup ideas are found, tested and built");
  for (const h of ["What it is", "The problem it addresses", "Who it serves, and how they use it", "How the pieces work together", "The broader vision"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  const aboutLink = page.locator("main:visible").getByRole("link", { name: /Weblaze Technologies/ }).first();
  await expect(aboutLink).toHaveAttribute("href", "https://weblaze.in");
  await expect(aboutLink).toHaveAttribute("target", "_blank");
  await expect(page.locator("main:visible")).toContainText("TRUEVIX — Powered by Weblaze Technologies");

  // Clicking opens weblaze.in in a new tab (the request is fulfilled locally so the test stays offline).
  await page.context().route("https://weblaze.in/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>Weblaze</title>" }));
  const [popup] = await Promise.all([page.waitForEvent("popup"), aboutLink.click()]);
  await expect(popup).toHaveURL(/^https:\/\/weblaze\.in\/?$/);
  await popup.close();

  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "About TRUEVIX" }).click();
  await expect(page).toHaveURL(/\/about$/);
  expect(errors).toEqual([]);
});

test("TRUEVIX Petrol accent and typography, with no lime, legacy orange or cobalt on key screens", async ({ page }) => {
  await page.goto("/");
  // Resolve the token to a computed colour (the build may rewrite the hex).
  const accent = await page.evaluate(() => {
    const el = document.createElement("span");
    el.style.color = "var(--color-accent)";
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  });
  expect(accent).toBe(PETROL);
  const cta = page.getByRole("link", { name: /Create your account/ }).first();
  await expect(cta).toHaveCSS("background-color", PETROL);
  // White text on petrol (5.7:1).
  await expect(cta).toHaveCSS("color", "rgb(255, 255, 255)");

  const h1Font = await page.locator("h1").first().evaluate((el) => getComputedStyle(el).fontFamily);
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(h1Font).toMatch(/Manrope/i);
  expect(bodyFont).toMatch(/IBM Plex Sans/i);

  const scan = () =>
    page.evaluate((banned) => {
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const cs = getComputedStyle(el);
        for (const v of [cs.color, cs.backgroundColor, cs.borderTopColor, cs.fill, cs.stroke]) if (banned.includes(v)) hits.push(`${el.tagName} ${v}`);
      }
      return hits;
    }, [OLD_ACCENT, COBALT, LIME, OLD_EMERALD]);

  for (const path of ["/", "/about", "/login", "/register"]) {
    await page.goto(path);
    expect(await scan(), path).toEqual([]);
  }
  await signInAsPersona(page, "Student with an idea");
  for (const path of ["/home", "/discover", "/ideas", "/ideas/new", "/research", "/validate", "/community", "/opportunities", "/workspace", "/settings", "/notifications", "/messages", "/profile"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    expect(await scan(), path).toEqual([]);
  }

  const favicon = await (await page.request.get("/icon.svg")).text();
  expect(favicon.toLowerCase()).not.toContain("d96b43");
  expect(favicon.toLowerCase()).not.toContain("8c95f5");
  expect(favicon.toLowerCase()).not.toContain("ccff00");
  expect(favicon.toLowerCase()).toContain("7fc4d1");
});

test("customer-facing screens do not announce demo mode", async ({ page }) => {
  for (const path of ["/", "/about", "/login", "/register"]) {
    await page.goto(path);
    await expect(page.locator("body"), path).not.toContainText(/\bdemo(nstration)?\b/i);
  }
  await signInAsPersona(page, "Student with an idea");
  for (const path of ["/home", "/discover", "/ideas", "/community", "/opportunities", "/workspace", "/notifications", "/messages", "/settings"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator("main:visible").first(), path).not.toContainText(/\bdemo(nstration)?\b/i);
  }
});

test("the accent stays a finishing detail: under 5% of the first screen", async ({ page }) => {
  await signInAsPersona(page, "Student with an idea");
  for (const path of ["/home", "/discover", "/ideas", "/workspace", "/opportunities"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Area of visible elements filled with the accent, clipped to the viewport.
    const share = await page.evaluate((accent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let area = 0;
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        if (getComputedStyle(el).backgroundColor !== accent) continue;
        const r = el.getBoundingClientRect();
        const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        area += w * h;
      }
      return area / (vw * vh);
    }, PETROL);
    expect(share, `${path} accent coverage`).toBeLessThan(0.05);
  }
});
