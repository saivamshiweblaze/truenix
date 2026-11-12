"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { completePasswordReset } from "@/lib/store/actions";
import { fieldErrors, resetSchema } from "@/lib/validation";
import { DemoAuthNotice } from "@/features/auth/demo-notice";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    completePasswordReset();
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-title font-semibold">Password updated</h1>
          <p className="mt-2 text-body text-sub">In the demonstration, sign-in only checks your email, so you can sign in straight away.</p>
        </div>
        <ButtonLink href="/login" size="lg">
          Sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-semibold">Choose a new password</h1>
        <p className="mt-2 text-body text-sub">Use at least 8 characters with a letter and a number.</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
        <Button type="submit" size="lg">
          Update password
        </Button>
      </form>
      <DemoAuthNotice>Reset is simulated. The new password is validated and then discarded; nothing is stored.</DemoAuthNotice>
    </div>
  );
}
