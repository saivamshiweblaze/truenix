"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { TextLink } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { ROLES } from "@/config/taxonomy";
import { signIn, signInAsPersona } from "@/lib/store/actions";
import { fieldErrors, loginSchema, safeNext } from "@/lib/validation";
import { ServiceNotice } from "@/features/auth/service-notice";
import { features } from "@/config/brand";
import type { RoleId } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [persona, setPersona] = useState<RoleId>("student_explorer");

  const next = () => safeNext(new URLSearchParams(window.location.search).get("next"));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    const res = signIn(parsed.data.email);
    if (!res.ok) return setErrors({ form: res.reason });
    setErrors({});
    toast("Signed in");
    router.push(next());
  };

  const usePersona = () => {
    signInAsPersona(persona);
    toast("Signed in with a sample persona", { body: ROLES.find((r) => r.id === persona)?.label });
    router.push(persona === "platform_admin" ? "/admin" : persona === "institution_admin" ? "/institution" : "/home");
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-title font-bold">Sign in</h1>
        <p className="mt-2 text-body text-sub">
          New here? <TextLink href="/register" className="text-ink underline">Create an account</TextLink>
        </p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
        <Button type="submit" variant="accent" size="lg">
          Sign in
        </Button>
      </form>

      {features.devTools && (
        <>
      <div className="flex items-center gap-3 text-meta text-mute">
        <span className="h-px flex-1 bg-line" /> developer tools <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-dashed border-line-strong p-3.5">
        <label htmlFor="persona" className="text-ui font-medium text-charcoal">
          Sign in as a sample persona
        </label>
        <div className="flex gap-2">
          <select
            id="persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value as RoleId)}
            className="h-10 min-w-0 flex-1 rounded-sm border border-line-strong bg-paper px-3 text-ui focus:border-ink focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={usePersona}>
            Continue
          </Button>
        </div>
      </div>

        </>
      )}

      <ServiceNotice>Sign-in is local to this browser while secure accounts are being connected: your email is matched on this device, and passwords aren’t stored or checked yet.</ServiceNotice>
    </div>
  );
}
