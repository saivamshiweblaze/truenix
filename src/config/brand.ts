/**
 * Central brand configuration.
 * Every user-facing reference to the product, signature or parent company
 * must read from here so the identity can change without touching components.
 */
export const brand = {
  productName: "TRUEVIX",
  /** Display form used in running text, e.g. "Welcome to Truevix". */
  productNameDisplay: "Truevix",
  signature: "TRUEVIX, POWERED BY WEBLAZE",
  poweredBy: "Powered by Weblaze",
  parentCompany: "Weblaze Technologies India Private Limited",
  parentCompanyShort: "Weblaze",
  tagline: "Where startup ideas are found, tested and built.",
  description:
    "A startup discovery, research, validation and innovation ecosystem connecting students, founders, experts and institutions.",
  journey: ["Discover", "Explore", "Research", "Connect", "Validate", "Collaborate", "Build"] as const,
  logo: {
    /** The wordmark is rendered as text plus a mark; see components/shell/logo.tsx. */
    markLabel: "Truevix mark",
  },
  favicon: "/icon.svg",
  theme: {
    accent: "#D96B43",
  },
} as const;

/**
 * Feature switches. Phase 1 runs entirely on local demonstration state.
 * Set NEXT_PUBLIC_DEMO_TOOLS=false to hide the demo role switcher.
 */
export const features = {
  demoMode: true,
  demoTools: process.env.NEXT_PUBLIC_DEMO_TOOLS !== "false",
} as const;

export const STORAGE_KEY = "truevix.demo.state.v1";
