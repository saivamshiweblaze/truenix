"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { resendVerificationAction, signInAction } from "@/features/auth/actions";
import { ServiceNotice } from "@/features/auth/service-notice";
import { reloadAppData } from "@/lib/data/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fieldErrors, loginSchema } from "@/lib/validation";

const LINK_MESSAGES: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or request a new link.",
  missing_code: "That sign-in link was incomplete. Sign in with your email and password.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const err = params.get("error");
  const notice = err ? (LINK_MESSAGES[err] ?? err.slice(0, 200)) : params.get("verified") === "1" ? "Your email is confirmed. Sign in to continue." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setBusy(true);
    setUnconfirmed(false);
    const res = await signInAction({ ...parsed.data, next: params.get("next") });
    if (!res.ok) {
      setBusy(false);
      setUnconfirmed(/confirm your email/i.test(res.error));
      return setErrors({ ...(res.fields ?? {}), form: res.error });
    }
    setErrors({});
    await reloadAppData();
    toast("Signed in");
    router.replace(res.next ?? "/home");
  };

  const resend = async () => {
    const res = await resendVerificationAction(email);
    toast(res.ok ? "Confirmation link requested" : "Couldn’t send the link", { body: res.ok ? `If ${email} has an unconfirmed account, a new link is on its way.` : res.error });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-bold">Sign in</h1>
        <p className="mt-2 text-body text-sub">
          New here? <TextLink href="/register" className="text-ink underline">Create an account</TextLink>
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-sm border border-line bg-surface px-3.5 py-3 text-meta text-charcoal">
          {notice}
        </p>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-4" aria-busy={busy}>
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-meta text-sub underline-offset-4 hover:text-ink hover:underline">
            Forgot password?
          </Link>
        </div>
        {errors.form && (
          <p role="alert" className="text-meta text-danger">
            {errors.form}
          </p>
        )}
        {unconfirmed && (
          <Button type="button" variant="secondary" onClick={resend}>
            Resend confirmation link
          </Button>
        )}
        <Button type="submit" variant="accent" size="lg" disabled={busy || !isSupabaseConfigured()}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {!isSupabaseConfigured() && <ServiceNotice>Sign-in isn’t available in this build: the account service is not configured.</ServiceNotice>}
      <ServiceNotice>Google sign-in isn’t available yet. Use your email and password.</ServiceNotice>
    </div>
  );
}
