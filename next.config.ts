import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  env: {
    // Vercel sets VERCEL_ENV ("production" | "preview" | "development") during the build.
    // Inlined so src/config/brand.ts can force developer tools off in Production builds.
    TRUEVIX_DEPLOY_ENV: process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? "",
  },
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
