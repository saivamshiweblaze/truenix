"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField, TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { registerAction } from "@/features/auth/actions";
import { ServiceNotice } from "@/features/auth/service-notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fieldErrors, PASSWORD_HINT, registerSchema } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: "name" | "email" | "password" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    const res = await registerAction(form);
    setBusy(false);
    if (!res.ok) return setErrors({ ...(res.fields ?? {}), form: res.error });
    router.push(res.next ?? "/verify-email");
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow">Step 1 of 2 · Account</p>
        <h1 className="mt-2 text-title font-bold">Create your account</h1>
        <p className="mt-2 text-body text-sub">
          Already have one?{" "}
          <TextLink href="/login" className="text-ink underline">
            Sign in
          </TextLink>
        </p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} maxLength={80} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} maxLength={160} />
        <TextField label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint={PASSWORD_HINT} />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <CheckboxField
          checked={form.terms}
          onChange={(v) => setForm((f) => ({ ...f, terms: v }))}
          error={errors.terms}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-ink underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-ink underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
        {errors.form && (
          <p role="alert" className="text-meta text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" variant="accent" size="lg" className="mt-1" disabled={busy || !isSupabaseConfigured()}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <ServiceNotice>You’ll confirm your email before signing in. Your password is handled by our account service and is never stored by TRUEVIX itself.</ServiceNotice>
    </div>
  );
}
