import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { brand } from "@/config/brand";
import { Providers } from "@/components/shell/providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: `${brand.productNameDisplay} — ${brand.tagline}`, template: `%s · ${brand.productNameDisplay}` },
  description: brand.description,
  applicationName: brand.productNameDisplay,
  authors: [{ name: brand.parentCompany }],
  icons: { icon: brand.favicon },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
