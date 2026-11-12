"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { requestPasswordReset } from "@/lib/store/actions";
import { emailSchema } from "@/lib/validation";
import { DemoAuthNotice } from "@/features/auth/demo-notice";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(undefined);
    requestPasswordReset(parsed.data);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title font-semibold">Check your inbox</h1>
          <p className="mt-2 text-body text-sub">
            If an account exists for <span className="font-medium text-ink">{email}</span>, the live product would email a reset link. In this demonstration, open the reset step directly.
          </p>
        </div>
        <ButtonLink href="/reset-password" size="lg">
          Open the reset step
        </ButtonLink>
        <DemoAuthNotice>No email was sent. Password reset is simulated in this phase.</DemoAuthNotice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-semibold">Reset your password</h1>
        <p className="mt-2 text-body text-sub">Enter the email you signed up with.</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" size="lg">
          Send reset link
        </Button>
      </form>
      <p className="text-ui text-sub">
        Remembered it? <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </div>
  );
}
