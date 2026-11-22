"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField, TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { createAccount } from "@/lib/store/actions";
import { fieldErrors, registerSchema } from "@/lib/validation";
import { ServiceNotice } from "@/features/auth/service-notice";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: "name" | "email" | "password" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    // The password is validated for strength and then discarded. Nothing secret is persisted.
    createAccount({ name: parsed.data.name, email: parsed.data.email });
    router.push("/onboarding");
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
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} maxLength={80} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} maxLength={160} />
        <TextField label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} hint="At least 8 characters, with a letter and a number." />
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
        <Button type="submit" variant="accent" size="lg" className="mt-1">
          Create account
        </Button>
      </form>
      <ServiceNotice>Your account is saved in this browser until secure sign-in is connected. Your password is checked for strength, then discarded — it isn’t stored.</ServiceNotice>
    </div>
  );
}
