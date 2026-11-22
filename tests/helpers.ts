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

const STORAGE_KEY = "truevix.demo.state.v1";

/** Mirrors the developer-tools personas in lib/store/actions.ts. */
const PERSONAS: Record<string, { role: string; name: string; headline: string; org: string; interests: string[]; home: string }> = {
  "Student with an idea": { role: "student_idea", name: "Meera Krishnan", headline: "Electronics student working on a crop-storage sensor", org: "Northfield Institute of Technology", interests: ["agriculture", "ai", "logistics"], home: "/home" },
  "Student exploring": { role: "student_explorer", name: "Arjun Nair", headline: "First-year student exploring climate and health", org: "Northfield Institute of Technology", interests: ["sustainability", "healthcare", "energy"], home: "/home" },
  "Independent founder": { role: "founder", name: "Lena Brandt", headline: "Founder exploring energy software for small factories", org: "Independent", interests: ["energy", "manufacturing", "ai"], home: "/home" },
  Mentor: { role: "mentor", name: "Grace Liu", headline: "Product mentor", org: "Independent", interests: ["consumer", "education"], home: "/home" },
  "Institution administrator": { role: "institution_admin", name: "Kofi Asante", headline: "Innovation cell coordinator", org: "Northfield Institute of Technology", interests: ["education", "ai"], home: "/institution" },
  "Platform administrator": { role: "platform_admin", name: "Platform Operator", headline: "Platform operations", org: "Platform team", interests: ["ai"], home: "/admin" },
};

/**
 * Signs in by seeding browser-local state directly. Customer builds hide the
 * persona picker (developer tools), so tests must not depend on it.
 */
export async function signInAsPersona(page: Page, roleLabel: keyof typeof PERSONAS | string) {
  const p = PERSONAS[roleLabel];
  if (!p) throw new Error(`Unknown persona ${roleLabel}`);
  const state = {
    version: 1,
    signedIn: true,
    user: {
      id: "me",
      name: p.name,
      email: `${p.role}@sample.local`,
      role: p.role,
      headline: p.headline,
      organisation: p.org,
      location: "",
      bio: "",
      interests: p.interests,
      skills: [],
      industries: p.interests,
      experience: p.role.startsWith("student") ? "learning" : "senior",
      collaboration: [],
      emailVerified: true,
      onboarded: true,
      joinedAt: "2026-11-01T00:00:00.000Z",
    },
    pendingResetEmail: null,
    ideas: [],
    posts: [],
    comments: [],
    research: [],
    validations: {},
    saved: { ideas: [], posts: [], opportunities: [] },
    following: { ideas: [], people: [] },
    tasks: [],
    admin: { audit: [] },
  };
  // Any same-origin page works for writing storage; /terms is static and light.
  if (!page.url().startsWith("http")) await page.goto("/terms");
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)] as const);
  await page.goto(p.home);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}

/** Minimal valid PDF bytes (header + EOF) for upload tests. */
export function pdfBuffer(extraBytes = 0) {
  const body = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";
  return Buffer.concat([Buffer.from(body), Buffer.alloc(extraBytes, 0x20)]);
}

/** 1×1 PNG. */
export function pngBuffer() {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
}

/** Scrolls through the page like a visitor so scroll-triggered reveals run before a full-page capture. */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}
