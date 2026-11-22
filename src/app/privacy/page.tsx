import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 2026"
      intro={<>This policy describes what happens to your information in the current release of {brand.productName}. It will be replaced by a full policy before any information is stored on {brand.parentCompany} servers.</>}
      sections={[
        {
          heading: "What we collect today",
          body: (
            <p>
              Nothing is transmitted to {brand.parentCompany}. The details you enter — name, email, phone number, profile and academic information, and the content you create — are saved in your browser’s local storage on this device.
            </p>
          ),
        },
        {
          heading: "Files you attach",
          body: (
            <p>
              Resumes and profile photos are never written to local storage. They are held in memory for the open tab only, so you can review them during onboarding, and are discarded when the tab is reloaded or closed or you sign out. Only the file name, type and size are kept.
            </p>
          ),
        },
        {
          heading: "Verification",
          body: <p>Email and phone verification are not yet connected. Your email address and phone number are recorded as unverified until a verification service is enabled.</p>,
        },
        {
          heading: "Your control",
          body: <p>You can delete everything stored by {brand.productName} in this browser from Settings → Data, or by clearing your browser’s site data.</p>,
        },
        {
          heading: "Contact",
          body: (
            <p>
              {brand.productName} is a product of {brand.parentCompanyLegal}. Visit{" "}
              <a href={brand.parentCompanyUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                weblaze.in
              </a>{" "}
              for company contact details.
            </p>
          ),
        },
      ]}
    />
  );
}
