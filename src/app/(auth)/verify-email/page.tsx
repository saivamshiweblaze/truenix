"use client";

import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextLink } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { resendVerificationAction } from "@/features/auth/actions";
import { ServiceNotice } from "@/features/auth/service-notice";
import { useAppSnapshot } from "@/lib/store/store";

/**
 * Shown after registration (email confirmation is required before the first sign-in) and to signed-in members
 * who want to check their status. It reports what Supabase Auth says, and never claims delivery it can't confirm.
 */
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmail() {
  const { state, hydrated } = useAppSnapshot();
  const email = useSearchParams().get("email") ?? "";
  const [busy, setBusy] = useState(false);

  const user = state.user;
  if (hydrated && user) {
    return (
      <div className="flex flex-col gap-6">
        <MailCheck size={28} strokeWidth={1.5} aria-hidden />
        <div>
          <h1 className="text-title font-bold">Email confirmation</h1>
          <p className="mt-2 text-body text-sub">
            <span className="font-medium text-ink">{user.email}</span> is <span className="font-medium text-ink">{user.emailVerified ? "confirmed" : "not yet confirmed"}</span>.
          </p>
        </div>
        <ButtonLink href={user.onboarded ? "/home" : "/onboarding"} size="lg">
          {user.onboarded ? "Back to home" : "Continue to profile setup"}
        </ButtonLink>
      </div>
    );
  }

  const resend = async () => {
    setBusy(true);
    const res = await resendVerificationAction(email);
    setBusy(false);
    toast(res.ok ? "Confirmation link requested" : "Couldn’t send the link", { body: res.ok ? "If the address has an unconfirmed account, a new link is on its way." : res.error });
  };

  return (
    <div className="flex flex-col gap-6">
      <MailCheck size={28} strokeWidth={1.5} aria-hidden />
      <div>
        <h1 className="text-title font-bold">Confirm your email</h1>
        <p className="mt-2 text-body text-sub">
          {email ? (
            <>
              We’ve asked our email service to send a confirmation link to <span className="font-medium text-ink">{email}</span>.
            </>
          ) : (
            "We’ve asked our email service to send you a confirmation link."
          )}{" "}
          Open it to confirm your address, then sign in to set up your profile.
        </p>
      </div>
      <ServiceNotice>If the message doesn’t arrive within a few minutes, check your spam folder or request a new link. Email delivery is limited while TRUEVIX is in beta; contact support if it still doesn’t arrive.</ServiceNotice>
      {email && (
        <Button variant="secondary" onClick={resend} disabled={busy}>
          {busy ? "Requesting…" : "Send the link again"}
        </Button>
      )}
      <p className="text-ui text-sub">
        Already confirmed? <TextLink href="/login">Sign in</TextLink>
      </p>
    </div>
  );
}
