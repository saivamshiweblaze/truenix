"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { createAccount } from "@/lib/store/actions";
import { fieldErrors, registerSchema } from "@/lib/validation";
import { DemoAuthNotice } from "@/features/auth/demo-notice";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    // The password is validated for UX and then discarded. Nothing secret is persisted.
    createAccount({ name: parsed.data.name, email: parsed.data.email });
    router.push("/verify-email");
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-semibold">Create your account</h1>
        <p className="mt-2 text-body text-sub">
          Already have one? <TextLink href="/login" className="text-ink underline">Sign in</TextLink>
        </p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        />
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2.5 text-ui text-charcoal">
            <input type="checkbox" checked={form.terms} onChange={set("terms")} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" aria-invalid={!!errors.terms} />
            I understand this is a demonstration account stored only in this browser.
          </label>
          {errors.terms && (
            <p role="alert" className="text-meta text-accent-ink">
              {errors.terms}
            </p>
          )}
        </div>
        <Button type="submit" variant="accent" size="lg">
          Create account
        </Button>
      </form>
      <DemoAuthNotice />
    </div>
  );
}
