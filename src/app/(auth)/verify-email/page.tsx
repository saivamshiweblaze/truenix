"use client";

import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { markEmailVerified } from "@/lib/store/actions";
import { useAppSnapshot } from "@/lib/store/store";
import { DemoAuthNotice } from "@/features/auth/demo-notice";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { state, hydrated } = useAppSnapshot();
  const email = state.user?.email;

  if (hydrated && !state.user) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-semibold">No account to verify</h1>
        <p className="text-body text-sub">Create an account first, then come back to this step.</p>
        <TextLink href="/register">Create an account</TextLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MailCheck size={28} strokeWidth={1.5} aria-hidden />
      <div>
        <h1 className="text-title font-semibold">Verify your email</h1>
        <p className="mt-2 text-body text-sub">
          In the live product we would send a verification link to <span className="font-medium text-ink">{email ?? "your address"}</span>. This
          demonstration cannot send email, so you can mark the address as verified here.
        </p>
      </div>
      <Button
        variant="primary"
        size="lg"
        onClick={() => {
          markEmailVerified();
          toast("Email marked as verified", { body: "Simulated step — no email was sent." });
          router.push("/onboarding");
        }}
      >
        Simulate verification and continue
      </Button>
      <button type="button" onClick={() => router.push("/onboarding")} className="self-start text-ui text-sub underline-offset-4 hover:text-ink hover:underline">
        Skip for now
      </button>
      <DemoAuthNotice>Verification is simulated. A real email provider will be connected in a later phase.</DemoAuthNotice>
    </div>
  );
}
