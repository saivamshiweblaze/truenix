import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="November 2026"
      intro={
        <>
          These preview terms describe how {brand.productName} works today, before accounts are connected to {brand.parentCompany} servers. Full terms will be published, and you will be asked to accept them again, before that change.
        </>
      }
      sections={[
        {
          heading: "Who provides the service",
          body: <p>{brand.productName} is a product of {brand.parentCompanyLegal} (“{brand.parentCompany}”, “we”).</p>,
        },
        {
          heading: "How accounts work in this release",
          body: (
            <ul>
              <li>Your account, profile and work are stored in {brand.productName}’s database and are available wherever you sign in.</li>
              <li>You confirm your email address when you register. Phone numbers are not verified, and no text messages are sent.</li>
              <li>{brand.productName} is in beta. Features, limits and these terms may change before public launch.</li>
            </ul>
          ),
        },
        {
          heading: "Your content",
          body: <p>You keep ownership of the ideas, research and other content you create. Only submit ideas you have the right to share, and do not upload other people’s personal information without their permission.</p>,
        },
        {
          heading: "Research and analysis",
          body: <p>Research reports and analysis in {brand.productName} are aids to thinking, not professional, legal, financial or investment advice. Verify anything important before acting on it.</p>,
        },
        {
          heading: "Acceptable use",
          body: <p>Do not use {brand.productName} to harass people, impersonate others, post unlawful content or attempt to disrupt the service.</p>,
        },
        {
          heading: "Changes",
          body: <p>We will update these terms as {brand.productName} connects to secure server-side services, and will ask for your agreement to material changes.</p>,
        },
      ]}
    />
  );
}
