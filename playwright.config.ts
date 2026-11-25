import { defineConfig, devices } from "@playwright/test";

/**
 * Real-authentication browser tests (tests/live). They sign in through the actual login form with the beta accounts
 * and run against production by default:
 *
 *   npm run test:live                                    # https://truenix.vercel.app
 *   LIVE_BASE_URL=http://localhost:3100 npm run test:live   # local production build (started automatically)
 *
 * The Phase 1 specs in tests/*.spec.ts signed in by seeding browser-local state, which no longer reflects how the app
 * authenticates (Supabase Auth), and several of them would send real email from the hosted project. They are kept
 * for reference but are not part of this suite.
 */
const BASE_URL = process.env.LIVE_BASE_URL ?? "https://truenix.vercel.app";
const local = /localhost|127\.0\.0\.1/.test(BASE_URL);

export default defineConfig({
  testDir: "./tests/live",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // One browser at a time: every test signs in, and Supabase rate-limits sign-ins per IP.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: local
    ? { command: `npm run start -- -p ${new URL(BASE_URL).port || 3100}`, url: BASE_URL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
