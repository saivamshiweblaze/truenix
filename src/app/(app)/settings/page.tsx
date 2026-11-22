"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectField, Switch, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { PageHeader, SectionHeading } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { SELF_SERVE_ROLES } from "@/config/taxonomy";
import { PreferencesEditor } from "@/features/preferences/preferences-editor";
import { updateNotificationPrefs, updatePrivacy, updateUser } from "@/lib/store/actions";
import { clearTransientFiles } from "@/lib/store/transient-files";
import { getState, resetStore, useAppState } from "@/lib/store/store";
import type { RoleId } from "@/lib/types";
import { emailSchema } from "@/lib/validation";

type Tab = "account" | "preferences" | "privacy" | "notifications" | "data";
const TABS: Tab[] = ["account", "preferences", "privacy", "notifications", "data"];

export default function SettingsPage() {
  const s = useAppState();
  const router = useRouter();
  const user = s.user!;
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const [tab, setTabState] = useState<Tab>(requested && TABS.includes(requested) ? requested : "account");
  const setTab = (t: Tab) => {
    setTabState(t);
    // Keep the section in the address so it can be linked to and survives a reload.
    window.history.replaceState(null, "", t === "account" ? "/settings" : `/settings?tab=${t}`);
  };
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetOpen, setResetOpen] = useState(false);

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Enter your name.";
    const em = emailSchema.safeParse(email);
    if (!em.success) errs.email = em.error.issues[0].message;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateUser({ name: name.trim(), email: email.trim().toLowerCase() });
    toast("Account details saved");
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "truevix-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Data exported");
  };

  return (
    <>
      <PageHeader title="Settings" description="Your account, interests and preferences, privacy and notifications. Settings are saved in this browser." />
      <Tabs
        label="Settings sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "account", label: "Account" },
          { value: "preferences", label: "Interests and preferences" },
          { value: "privacy", label: "Privacy" },
          { value: "notifications", label: "Notifications" },
          { value: "data", label: "Your data" },
        ]}
      />
      <div className="max-w-2xl pt-8">
        {tab === "account" && (
          <div className="flex flex-col gap-12">
            <form onSubmit={saveAccount} noValidate className="flex flex-col gap-4">
              <SectionHeading title="Account details" />
              <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="Email delivery isn’t connected yet, so no confirmation is sent when you change it." />
              <div>
                <Button type="submit">Save account details</Button>
              </div>
            </form>
            <section className="flex flex-col gap-4">
              <SectionHeading title="How you use the platform" />
              <SelectField
                label="Primary role"
                value={SELF_SERVE_ROLES.some((r) => r.id === user.role) ? user.role : ""}
                onChange={(e) => {
                  updateUser({ role: e.target.value as RoleId });
                  toast("Role updated", { body: "Your home page now reflects this role." });
                }}
                options={[...(SELF_SERVE_ROLES.some((r) => r.id === user.role) ? [] : [{ value: "", label: "Assigned role (administrator)" }]), ...SELF_SERVE_ROLES.map((r) => ({ value: r.id, label: r.label }))]}
                hint="Administrator roles are assigned, not chosen."
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setTab("preferences")}>
                  Edit interests and preferences
                </Button>
                <ButtonLink href="/profile" variant="secondary">
                  Edit public profile
                </ButtonLink>
                <ButtonLink href="/onboarding" variant="ghost">
                  Update role profile
                </ButtonLink>
              </div>
            </section>
          </div>
        )}

        {tab === "preferences" && <PreferencesEditor />}

        {tab === "privacy" && (
          <div className="flex flex-col gap-6">
            <SelectField
              label="Who can see your profile"
              value={s.privacy.profileVisibility}
              onChange={(e) => {
                updatePrivacy({ profileVisibility: e.target.value as typeof s.privacy.profileVisibility });
                toast("Privacy updated");
              }}
              options={[
                { value: "public", label: "Anyone, including people without an account" },
                { value: "members", label: "Signed-in members" },
                { value: "connections", label: "Only your connections" },
              ]}
            />
            <SelectField
              label="Who can message you"
              value={s.privacy.allowMessages}
              onChange={(e) => {
                updatePrivacy({ allowMessages: e.target.value as typeof s.privacy.allowMessages });
                toast("Privacy updated");
              }}
              options={[
                { value: "everyone", label: "Any member" },
                { value: "connections", label: "Only your connections" },
              ]}
            />
            <div className="divide-y divide-line border-y border-line">
              <Switch label="Show my organisation" description="Display your institution or company on your profile." checked={s.privacy.showOrganisation} onChange={(v) => updatePrivacy({ showOrganisation: v })} />
              <Switch label="Show my activity" description="Let others see ideas you follow and discussions you join." checked={s.privacy.showActivity} onChange={(v) => updatePrivacy({ showActivity: v })} />
            </div>
            <p className="text-meta text-mute">These preferences are saved now and will be enforced once accounts move to secure servers.</p>
          </div>
        )}

        {tab === "notifications" && (
          <div className="divide-y divide-line border-y border-line">
            <Switch label="Comments and replies" checked={s.notificationPrefs.comments} onChange={(v) => updateNotificationPrefs({ comments: v })} />
            <Switch label="New followers" checked={s.notificationPrefs.follows} onChange={(v) => updateNotificationPrefs({ follows: v })} />
            <Switch label="Collaboration requests" checked={s.notificationPrefs.collaboration} onChange={(v) => updateNotificationPrefs({ collaboration: v })} />
            <Switch label="Opportunity deadlines" description="Reminders for saved opportunities." checked={s.notificationPrefs.opportunities} onChange={(v) => updateNotificationPrefs({ opportunities: v })} />
            <Switch label="Research completed" checked={s.notificationPrefs.research} onChange={(v) => updateNotificationPrefs({ research: v })} />
            <Switch label="Weekly digest email" description="Email delivery isn’t connected yet." checked={s.notificationPrefs.weeklyDigest} onChange={(v) => updateNotificationPrefs({ weeklyDigest: v })} />
          </div>
        )}

        {tab === "data" && (
          <div className="flex flex-col gap-8">
            <section>
              <SectionHeading title="Where your data lives" />
              <p className="text-ui text-sub">Your account, profile, ideas, research and messages are stored in this browser&apos;s local storage — nothing is sent to a server yet. Attached files (resume, photo) are never stored; they are held in the open tab only. Clearing site data removes everything.</p>
            </section>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportData}>
                Export my data (JSON)
              </Button>
              <Button variant="secondary" onClick={() => setResetOpen(true)}>
                Delete all my data
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={resetOpen}
        size="sm"
        onClose={() => setResetOpen(false)}
        title="Delete all your data?"
        description="This removes your account, profile, ideas, research and settings from this browser. It cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                resetStore();
                clearTransientFiles();
                router.push("/");
              }}
            >
              Delete everything
            </Button>
          </>
        }
      />
    </>
  );
}
