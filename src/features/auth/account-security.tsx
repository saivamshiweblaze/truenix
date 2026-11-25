"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { SectionHeading } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { changeEmailAction, changePasswordAction, deleteAccountAction, signOutAction } from "@/features/auth/actions";
import { resetStore } from "@/lib/store/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PASSWORD_HINT } from "@/lib/validation";

export function EmailChange({ current }: { current: string }) {
  const [email, setEmail] = useState(current);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === current) return;
    setBusy(true);
    const res = await changeEmailAction(email);
    setBusy(false);
    if (!res.ok) return setError(res.fields?.email ?? res.error);
    setError(undefined);
    toast("Check your new inbox", { body: res.message });
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} hint="Changing it sends a confirmation link to the new address. Your current email stays active until you confirm." />
      <div>
        <Button type="submit" variant="secondary" disabled={busy || email.trim().toLowerCase() === current}>
          {busy ? "Sending…" : "Change email"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordChange() {
  const [f, setF] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await changePasswordAction(f);
    setBusy(false);
    if (!res.ok) return setErrors({ ...(res.fields ?? {}), form: res.error });
    setErrors({});
    setF({ current: "", password: "", confirm: "" });
    toast("Password changed", { body: res.message });
  };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <SectionHeading title="Password" />
      <TextField label="Current password" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} error={errors.current} />
      <TextField label="New password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} error={errors.password} hint={PASSWORD_HINT} />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} error={errors.confirm} />
      {errors.form && !errors.current && !errors.password && !errors.confirm && (
        <p role="alert" className="text-meta text-danger">
          {errors.form}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  const router = useRouter();
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title="Sessions" />
      <p className="text-ui text-sub">Signs you out on every device and browser, including this one.</p>
      <div>
        <Button
          variant="secondary"
          onClick={async () => {
            await signOutAction("global");
            await supabaseBrowser().auth.signOut({ scope: "local" });
            resetStore();
            router.push("/login");
          }}
        >
          Sign out everywhere
        </Button>
      </div>
    </section>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Dialog
        open={open}
        size="sm"
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="This permanently deletes your account, profile, ideas, research, validation work, posts and messages. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !password}
              onClick={async () => {
                setBusy(true);
                const res = await deleteAccountAction(password);
                setBusy(false);
                if (!res.ok) return setError(res.fields?.password ?? res.error);
                resetStore();
                router.push("/");
              }}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        <TextField label="Confirm with your password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
      </Dialog>
    </>
  );
}
