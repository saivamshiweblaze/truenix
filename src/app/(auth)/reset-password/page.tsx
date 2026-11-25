"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { completePasswordResetAction } from "@/features/auth/actions";
import { useAppSnapshot } from "@/lib/store/store";
import { fieldErrors, PASSWORD_HINT, resetSchema } from "@/lib/validation";

/**
 * Reached from the password-reset email (via /auth/confirm or /auth/callback, which establish a short recovery
 * session). Without that session there is nothing to reset, so the page says so instead of pretending.
 */
export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { state, hydrated } = useAppSnapshot();
  // The recovery link signs the member in for this purpose; SessionSync resolves it into the store.
  const hasSession: boolean | null = !hydrated ? null : state.signedIn;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const res = await completePasswordResetAction(form);
    setBusy(false);
    if (!res.ok) return setErrors({ ...(res.fields ?? {}), form: res.error });
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title font-bold">Password updated</h1>
          <p className="mt-2 text-body text-sub">You’re signed in on this device. Other devices that were signed in have been signed out.</p>
        </div>
        <ButtonLink href="/home" size="lg">
          Continue
        </ButtonLink>
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-bold">Open your reset link first</h1>
        <p className="text-body text-sub">To choose a new password, open the link from your password-reset email in this browser. Links expire after a short time.</p>
        <TextLink href="/forgot-password">Request a new link</TextLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-bold">Choose a new password</h1>
        <p className="mt-2 text-body text-sub">{PASSWORD_HINT}</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <TextField label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
        {errors.form && (
          <p role="alert" className="text-meta text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy || hasSession === null}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
