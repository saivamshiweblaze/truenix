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
              <li>Your account, profile and work are stored in this browser only. They are not sent to our servers and are not available on other devices.</li>
              <li>Email addresses and phone numbers are not yet verified, and no email or text message is sent.</li>
              <li>Files you attach, such as a resume or photo, are held in the open browser tab only and are discarded when you reload or sign out.</li>
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
