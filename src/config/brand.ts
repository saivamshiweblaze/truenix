/**
 * Central brand configuration.
 * Every user-facing reference to the product, signature or parent company
 * must read from here so the identity can change without touching components.
 *
 * Naming rules:
 * - The product is always written "TRUEVIX" (never "Truevix" or the repository name).
 * - The company is always written "Weblaze Technologies".
 */
export const brand = {
  productName: "TRUEVIX",
  signature: "TRUEVIX — A Weblaze Technologies product",
  poweredByPrefix: "Powered by",
  parentCompany: "Weblaze Technologies",
  /** Registered entity, used only in the copyright line. */
  parentCompanyLegal: "Weblaze Technologies India Private Limited",
  parentCompanyUrl: "https://weblaze.in",
  copyrightYear: 2026,
  /**
   * Path to the official Weblaze logo once the asset is supplied (e.g. "/brand/weblaze-logo.svg").
   * Left null on purpose: the attribution falls back to the company name in text.
   * Never draw or approximate the Weblaze logo.
   */
  parentCompanyLogo: null as string | null,
  tagline: "Discover problems. Research opportunities. Validate ideas. Build together.",
  description:
    "TRUEVIX is a startup discovery, research, validation and innovation ecosystem that connects students, founders, professionals, mentors and institutions.",
  journey: ["Discover", "Explore", "Research", "Connect", "Validate", "Collaborate", "Build"] as const,
  logo: { markLabel: "TRUEVIX mark" },
  favicon: "/icon.svg",
  /**
   * Mirror of the colour tokens in globals.css, for places that cannot read CSS variables
   * (metadata theme-color, generated icons). Components must use the Tailwind tokens instead.
   */
  theme: {
    /** TRUEVIX Petrol — the brand accent. White text on it is 5.7:1. */
    accent: "#0E7086",
    /** Petrol tint for marks on ink surfaces (logo node, focus on dark). */
    accentOnDark: "#7FC4D1",
    /** Functional positive states only (verified, validated). */
    positive: "#1F8A4C",
    ink: "#111111",
    paper: "#ffffff",
  },
} as const;

/**
 * Feature switches. Phase 1.5 still runs on browser-local state.
 *
 * Developer tools (sample-persona sign-in, role switcher) are hidden from customers.
 * They appear automatically in `next dev`, or in any build made with NEXT_PUBLIC_DEV_TOOLS=true
 * (useful for a preview deployment used by testers).
 */
export const features = {
  devTools: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_TOOLS === "true",
} as const;

/** Persisted key is unchanged so existing local sessions survive the refresh. */
export const STORAGE_KEY = "truevix.demo.state.v1";
