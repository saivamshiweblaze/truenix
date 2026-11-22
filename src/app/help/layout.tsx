import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help and FAQs" };

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
