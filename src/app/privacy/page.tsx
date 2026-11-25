import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { LegalPage } from "@/features/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 2026"
      intro={<>This policy describes how the {brand.productName} beta handles your information. A full policy will be published before public launch.</>}
      sections={[
        {
          heading: "What we store",
          body: (
            <p>
              Your account and the content you create — name, email, profile and academic details, ideas, research, validation notes, posts and messages — are stored in {brand.productName}’s database, hosted on Supabase. Passwords are handled by the account service and stored only as secure hashes; {brand.parentCompany} never sees them.
            </p>
          ),
        },
        {
          heading: "Who can see it",
          body: (
            <p>
              Ideas are private unless you choose otherwise. You decide whether an idea is shared with selected collaborators, invited reviewers, your institution, or listed as a public summary — and you can withdraw that access at any time. Access rules are enforced by the database for every request. Platform administrators can open confidential records only for a stated reason, and each access is recorded in an audit log.
            </p>
          ),
        },
        {
          heading: "Files you attach",
          body: <p>Profile photos are stored so other members can see them. Resumes and confidential documents are stored privately and are shown only to you and the people you allow, through short-lived links.</p>,
        },
        {
          heading: "Verification",
          body: <p>Your email address is confirmed through a link sent when you register. Phone numbers are not verified: no text-message service is connected.</p>,
        },
        {
          heading: "Your control",
          body: <p>You can edit your profile and privacy settings, export your data from Settings → Your data, and ask us to delete your account.</p>,
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
