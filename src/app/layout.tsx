import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Manrope } from "next/font/google";
import { brand } from "@/config/brand";
import { Providers } from "@/components/shell/providers";
import "./globals.css";

/** Display: headings, hero, page titles. */
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
/** Interface and body text, navigation, buttons, forms. */
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
/** Labels, metadata, step counters. */
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: `${brand.productName} — ${brand.tagline}`, template: `%s · ${brand.productName}` },
  description: brand.description,
  applicationName: brand.productName,
  authors: [{ name: brand.parentCompany, url: brand.parentCompanyUrl }],
  creator: brand.parentCompany,
  publisher: brand.parentCompany,
  icons: { icon: brand.favicon },
  openGraph: {
    title: brand.productName,
    description: brand.description,
    siteName: brand.productName,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: brand.theme.paper,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
