"use client";

import { MailCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { TextLink } from "@/components/ui/primitives";
import { useAppSnapshot } from "@/lib/store/store";
import { ServiceNotice } from "@/features/auth/service-notice";

/**
 * Email confirmation status. No email provider is connected, so this page never claims
 * a message was sent and never marks an address as verified.
 * Phase 2 integration point: send the confirmation link here and handle its callback.
 */
export default function VerifyEmailPage() {
  const { state, hydrated } = useAppSnapshot();
  const user = state.user;

  if (hydrated && !user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-bold">No account to confirm</h1>
        <p className="text-body text-sub">Create an account first, then come back to this step.</p>
        <TextLink href="/register">Create an account</TextLink>
      </div>
    );
  }

  const next = user?.onboarded ? "/home" : "/onboarding";
  return (
    <div className="flex flex-col gap-6">
      <MailCheck size={28} strokeWidth={1.5} aria-hidden />
      <div>
        <h1 className="text-title font-bold">Email confirmation</h1>
        <p className="mt-2 text-body text-sub">
          <span className="font-medium text-ink">{user?.email ?? "Your address"}</span> is saved as{" "}
          <span className="font-medium text-ink">{user?.emailVerified ? "confirmed" : "not yet confirmed"}</span>.
        </p>
      </div>
      <ServiceNotice>Email delivery isn’t connected yet, so no confirmation message has been sent. You’ll be asked to confirm your address once it is.</ServiceNotice>
      <ButtonLink href={next} size="lg">
        {user?.onboarded ? "Back to home" : "Continue to profile setup"}
      </ButtonLink>
    </div>
  );
}
