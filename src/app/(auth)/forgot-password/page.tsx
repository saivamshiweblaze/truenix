"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { ServiceNotice } from "@/features/auth/service-notice";
import { emailSchema } from "@/lib/validation";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const linkProblem = useSearchParams().get("error") === "link";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(undefined);
    setBusy(true);
    const res = await requestPasswordResetAction(parsed.data);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title font-bold">Check your email</h1>
          <p className="mt-2 text-body text-sub">
            If an account exists for <span className="font-medium text-ink">{email}</span>, we’ve asked our email service to send a reset link. Open it in this browser to choose a new password.
          </p>
        </div>
        <ServiceNotice>The link expires after a short time. If nothing arrives within a few minutes, check your spam folder, or contact support — email delivery is limited while the platform is in beta.</ServiceNotice>
        <p className="text-ui text-sub">
          <TextLink href="/login">Back to sign in</TextLink>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-bold">Reset your password</h1>
        <p className="mt-2 text-body text-sub">Enter the email you signed up with.</p>
      </div>
      {linkProblem && (
        <p role="status" className="rounded-sm border border-line bg-surface px-3.5 py-3 text-meta text-charcoal">
          That reset link has expired, was already used, or was opened in a different browser. Request a new one below.
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-ui text-sub">
        Remembered it? <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </div>
  );
}
