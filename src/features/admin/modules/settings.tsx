"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { z } from "zod";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch, TextArea, TextField } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, OPPORTUNITY_KIND_LABEL, ROLES, SKILLS } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import {
  adminImportPlatform,
  adminRecordExport,
  adminResetDemoData,
  adminSetIdeaPublication,
  adminSetInstitutionStatus,
  adminSetOpportunityPublication,
  adminSetResearchArchived,
  adminUpdateConfig,
  adminUpdateSettings,
  platformSnapshot,
} from "@/lib/store/admin-actions";
import { SEED_VERSION, type PlatformState } from "@/lib/store/platform";
import { allIdeasAdmin } from "@/lib/store/selectors";
import { downloadJson } from "@/lib/admin/csv";
import { AdminHeader, Block } from "../kit/layout";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";
import { RecordTabs, useTabParam } from "../kit/record-tabs";

type Tab = "general" | "features" | "taxonomy" | "moderation" | "notifications" | "security" | "data";

const NotEnforced = () => <p className="mt-3 text-micro text-mute">Saved and logged. Enforcement needs the Phase 2 server.</p>;

function NumberSetting({ label, value, min, max, unit, onSave, disabled }: { label: string; value: number; min: number; max: number; unit: string; onSave: (n: number) => void; disabled?: boolean }) {
  const [v, setV] = useState(String(value));
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="w-56">
        <TextField label={`${label} (${unit})`} inputMode="numeric" value={v} onChange={(e) => (setV(e.target.value), setError(undefined))} error={error} disabled={disabled} />
      </div>
      <Button
        variant="secondary"
        disabled={disabled || Number(v) === value}
        onClick={() => {
          const n = Number(v);
          if (!Number.isInteger(n) || n < min || n > max) return setError(`Use a whole number from ${min} to ${max}.`);
          onSave(n);
          toast("Setting saved");
        }}
      >
        Save
      </Button>
    </div>
  );
}

const importSchema = z.object({
  format: z.literal("truevix-platform-v1"),
  platform: z
    .object({
      seedVersion: z.literal(SEED_VERSION),
      people: z.array(z.object({ id: z.string(), name: z.string().max(120) }).passthrough()).max(5000),
      accounts: z.array(z.object({ personId: z.string(), email: z.string().max(200) }).passthrough()).max(5000),
      ideas: z.array(z.object({ id: z.string(), title: z.string().max(200) }).passthrough()).max(5000),
      posts: z.array(z.object({ id: z.string() }).passthrough()).max(10000),
      comments: z.array(z.object({ id: z.string() }).passthrough()),
      opportunities: z.array(z.object({ id: z.string(), title: z.string().max(200), deadline: z.string() }).passthrough()),
      registrations: z.array(z.object({ id: z.string(), opportunityId: z.string() }).passthrough()),
      institutions: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
      reports: z.array(z.object({ id: z.string() }).passthrough()),
      talent: z.array(z.unknown()),
      mentorships: z.array(z.unknown()),
      studies: z.array(z.unknown()),
      participations: z.array(z.unknown()),
      collaborations: z.array(z.unknown()),
      research: z.array(z.unknown()),
      validations: z.record(z.string(), z.unknown()),
      announcements: z.array(z.unknown()),
      cms: z.array(z.object({ id: z.string(), kind: z.string(), draft: z.record(z.string(), z.string()) }).passthrough()),
      adminTeam: z.array(z.unknown()),
      myAdminRole: z.string(),
      rolePermissions: z.record(z.string(), z.unknown()),
      config: z.object({}).passthrough(),
    })
    .passthrough(),
});

function DataPanel() {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const file = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string>();
  const ideas = allIdeasAdmin(s);
  const archived = [
    ...s.platform.opportunities.filter((o) => o.publication === "archived").map((o) => ({ id: o.id, kind: "Opportunity", title: o.title, href: `/admin/opportunities/${o.id}`, restore: () => adminSetOpportunityPublication([o.id], "draft", "Restored from archive") })),
    ...ideas.filter((i) => i.publication === "archived").map((i) => ({ id: i.id, kind: "Idea", title: i.title, href: `/admin/ideas/${i.id}`, restore: () => adminSetIdeaPublication(i.id, "published", "Restored from archive") })),
    ...s.platform.institutions.filter((i) => i.status === "archived").map((i) => ({ id: i.id, kind: "Organisation", title: i.name, href: `/admin/institutions/${i.id}`, restore: () => adminSetInstitutionStatus(i.id, "verified", "Restored from archive") })),
    ...[...s.research, ...s.platform.research].filter((r) => r.archived).map((r) => ({ id: r.id, kind: "Research run", title: r.question, href: `/admin/research/${r.id}`, restore: () => adminSetResearchArchived(r.id, false, "Restored from archive") })),
  ];

  const onImport = async (f: File | undefined) => {
    setImportError(undefined);
    if (!f) return;
    if (!f.name.endsWith(".json") || f.size > 5 * 1024 * 1024) return setImportError("Choose a TRUEVIX export (.json, up to 5 MB).");
    try {
      const parsed = importSchema.safeParse(JSON.parse(await f.text()));
      if (!parsed.success) return setImportError("This file isn’t a TRUEVIX platform export for this version. Nothing was changed.");
      confirm.ask({
        title: "Replace the platform data with this file?",
        description: f.name,
        consequences: [
          `Members, ideas, opportunities, content and settings are replaced by the ${parsed.data.platform.people.length} members and other records in the file.`,
          "Your own account, drafts and the audit log are kept. Export the current data first if you may need it.",
        ],
        confirmLabel: "Import and replace",
        danger: true,
        reason: "required",
        typeToConfirm: "IMPORT",
        onConfirm: () => {
          adminImportPlatform(parsed.data.platform as unknown as PlatformState, f.name);
          toast("Data imported");
        },
      });
    } catch {
      setImportError("The file couldn’t be read as JSON. Nothing was changed.");
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Block title="Export" description="Downloads the platform data set as JSON, created in your browser. It contains private account details: store it securely.">
        <Button
          variant="secondary"
          disabled={!can("settings", "export")}
          onClick={() =>
            confirm.ask({
              title: "Export all platform data?",
              consequences: ["The file includes members’ private contact details.", "The export is recorded in the audit log as sensitive."],
              confirmLabel: "Export JSON",
              reason: "required",
              onConfirm: () => {
                const snap = platformSnapshot();
                downloadJson(`truevix-platform-${new Date().toISOString().slice(0, 10)}.json`, snap);
                adminRecordExport("Full platform data (JSON)", snap.platform.people.length);
                toast("Export created");
              },
            })
          }
        >
          <Download size={15} aria-hidden /> Export platform data
        </Button>
      </Block>
      <Block title="Import" description="Replaces the platform data set with a previous TRUEVIX export. The file is validated before anything changes.">
        <input ref={file} type="file" accept=".json,application/json" className="sr-only" id="import-file" onChange={(e) => onImport(e.target.files?.[0])} />
        <Button variant="secondary" disabled={!can("settings", "edit")} onClick={() => file.current?.click()}>
          <Upload size={15} aria-hidden /> Choose export file
        </Button>
        {importError && (
          <p role="alert" className="mt-2 text-meta text-danger">
            {importError}
          </p>
        )}
      </Block>
      <Block title="Archive" description="Archived records are hidden everywhere but kept. Restore them here or from their own pages.">
        {archived.length ? (
          <ul>
            {archived.map((a) => (
              <li key={`${a.kind}-${a.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                <span className="min-w-0 text-ui">
                  <span className="mr-2 text-micro text-mute">{a.kind}</span>
                  <Link href={a.href} className="hover:underline">
                    {a.title}
                  </Link>
                </span>
                {can("settings", "archive") && (
                  <Button size="sm" variant="ghost" onClick={() => (a.restore(), toast(`${a.kind} restored`))}>
                    Restore
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-meta text-sub">Nothing is archived.</p>
        )}
      </Block>
      <Block title="Reset demonstration data" description="For testing. Rebuilds every seeded record from the seed files.">
        <p className="mb-3 max-w-2xl text-ui text-charcoal">
          Members, ideas, posts, opportunities, applications, organisations, content and settings return to their seeded state. Your own signed-in account, drafts and the audit log are kept, and the reset is recorded. There is
          intentionally no option to delete all member data.
        </p>
        <Button
          variant="secondary"
          disabled={!can("settings", "delete")}
          onClick={() =>
            confirm.ask({
              title: "Reset demonstration data?",
              consequences: ["Every change made to seeded records in this browser is undone.", "Records you created in the admin portal (opportunities, organisations, announcements) are removed.", "The audit log is kept."],
              confirmLabel: "Reset data",
              danger: true,
              reason: "required",
              typeToConfirm: "RESET",
              onConfirm: (reason) => {
                adminResetDemoData(reason);
                toast("Demonstration data reset");
              },
            })
          }
        >
          Reset to seed data
        </Button>
      </Block>
      {confirm.dialog}
    </div>
  );
}

export function SettingsPage() {
  const s = useAppState();
  const can = useCan();
  const [tab, setTab] = useTabParam<Tab>(["general", "features", "taxonomy", "moderation", "notifications", "security", "data"], "general");
  const c = s.platform.config;
  const edit = can("settings", "edit");
  const [identity, setIdentity] = useState(c.identity);
  const [maint, setMaint] = useState(c.maintenance.message);
  const [skill, setSkill] = useState("");
  const [allowlist, setAllowlist] = useState(c.security.adminIpAllowlist);
  const sw = (fn: () => void) => () => {
    if (!edit) return toast("Your role can’t change settings");
    fn();
    toast("Setting saved");
  };
  return (
    <>
      <AdminHeader title="Settings and data" description="Platform-wide configuration. Every change is recorded in the audit log." />
      <RecordTabs
        label="Settings sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "general", label: "General" },
          { value: "features", label: "Features" },
          { value: "taxonomy", label: "Taxonomy" },
          { value: "moderation", label: "Moderation" },
          { value: "notifications", label: "Notifications and retention" },
          { value: "security", label: "Security" },
          { value: "data", label: "Data management" },
        ]}
      />
      {tab === "general" && (
        <div className="flex max-w-3xl flex-col gap-8">
          <Block title="Platform identity" description="Used in administrative messages. The product name, logo and Weblaze attribution are fixed in the brand configuration.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Display name" value={identity.displayName} onChange={(e) => setIdentity({ ...identity, displayName: e.target.value })} disabled={!edit} maxLength={40} />
              <TextField label="Support email" type="email" value={identity.supportEmail} onChange={(e) => setIdentity({ ...identity, supportEmail: e.target.value })} disabled={!edit} />
              <div className="md:col-span-2">
                <TextField label="Tagline" value={identity.tagline} onChange={(e) => setIdentity({ ...identity, tagline: e.target.value })} disabled={!edit} maxLength={140} />
              </div>
            </div>
            <Button
              className="mt-4"
              variant="secondary"
              disabled={!edit || JSON.stringify(identity) === JSON.stringify(c.identity)}
              onClick={() => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.supportEmail)) return toast("Enter a valid support email");
                if (identity.displayName.trim().length < 2) return toast("Enter a display name");
                adminUpdateConfig("identity", identity);
                toast("Identity saved");
              }}
            >
              Save identity
            </Button>
          </Block>
          <Block title="Maintenance mode" description="Shows a notice on every public and member page. Sign-in and data stay available in this phase.">
            <div className="divide-y divide-line border-y border-line">
              <Switch label="Maintenance notice" description="Turn on before planned work." checked={c.maintenance.enabled} onChange={(v) => sw(() => adminUpdateConfig("maintenance", { enabled: v }))()} />
            </div>
            <div className="mt-4">
              <TextArea label="Notice text" rows={2} value={maint} onChange={(e) => setMaint(e.target.value)} maxLength={200} disabled={!edit} />
              <Button className="mt-2" variant="secondary" size="sm" disabled={!edit || maint === c.maintenance.message || maint.trim().length < 10} onClick={sw(() => adminUpdateConfig("maintenance", { message: maint.trim() }))}>
                Save notice text
              </Button>
            </div>
          </Block>
        </div>
      )}
      {tab === "features" && (
        <Block title="Feature settings" className="max-w-3xl">
          <div className="divide-y divide-line border-y border-line">
            <Switch label="Open registration" description="Allow anyone to create an account." checked={s.admin.settings.openRegistration} onChange={(v) => sw(() => adminUpdateSettings({ openRegistration: v }))()} />
            <Switch label="Review public ideas before listing" description="New public ideas wait in the review queue until approved. Enforced in this browser." checked={s.admin.settings.requireIdeaReview} onChange={(v) => sw(() => adminUpdateSettings({ requireIdeaReview: v }))()} />
            <Switch label="AI Researcher available" description="Show the research workspace to members." checked={s.admin.settings.researchEnabled} onChange={(v) => sw(() => adminUpdateSettings({ researchEnabled: v }))()} />
            <Switch label="Community posting" description="Members can publish posts in Discover." checked={c.features.communityPosting} onChange={(v) => sw(() => adminUpdateConfig("features", { communityPosting: v }))()} />
            <Switch label="Registration for opportunities on TRUEVIX" description="Members can register for listings run on TRUEVIX." checked={c.features.opportunityRegistration} onChange={(v) => sw(() => adminUpdateConfig("features", { opportunityRegistration: v }))()} />
            <Switch label="Research study recruiting" description="Participants can volunteer for studies." checked={c.features.studiesRecruiting} onChange={(v) => sw(() => adminUpdateConfig("features", { studiesRecruiting: v }))()} />
          </div>
          <p className="mt-3 text-micro text-mute">Feature flags for developer tools stay in the build configuration (config/brand.ts) and are not editable here.</p>
        </Block>
      )}
      {tab === "taxonomy" && (
        <div className="grid gap-8 lg:grid-cols-2">
          <Block title="Skills" description="Offered when members describe themselves and when ideas list the skills they need.">
            <ul className="flex flex-wrap gap-1.5">
              {[...SKILLS, ...c.taxonomy.customSkills].map((k) => {
                const hidden = c.taxonomy.hiddenSkills.includes(k);
                return (
                  <li key={k}>
                    <button
                      type="button"
                      disabled={!edit}
                      onClick={sw(() => adminUpdateConfig("taxonomy", { hiddenSkills: hidden ? c.taxonomy.hiddenSkills.filter((x) => x !== k) : [...c.taxonomy.hiddenSkills, k] }))}
                      aria-pressed={!hidden}
                      title={hidden ? "Hidden — select to offer it again" : "Offered — select to hide it"}
                      className={hidden ? "rounded-xs border border-dashed border-line-strong px-2 py-0.5 text-meta text-mute line-through" : "rounded-xs border border-line-strong px-2 py-0.5 text-meta text-charcoal hover:border-ink"}
                    >
                      {k}
                    </button>
                  </li>
                );
              })}
            </ul>
            {edit && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div className="w-64">
                  <TextField label="Add a skill" value={skill} onChange={(e) => setSkill(e.target.value)} maxLength={40} />
                </div>
                <Button
                  variant="secondary"
                  disabled={skill.trim().length < 2}
                  onClick={() => {
                    const k = skill.trim().replace(/\s+/g, " ");
                    if ([...SKILLS, ...c.taxonomy.customSkills].some((x) => x.toLowerCase() === k.toLowerCase())) return toast("That skill already exists");
                    adminUpdateConfig("taxonomy", { customSkills: [...c.taxonomy.customSkills, k] });
                    setSkill("");
                    toast("Skill added");
                  }}
                >
                  Add skill
                </Button>
              </div>
            )}
            <p className="mt-3 text-micro text-mute">Hiding a skill removes it from suggestions; members who already list it keep it.</p>
          </Block>
          <Block title="Fixed lists" description="These lists are part of the data model. Changing them needs a code release in this phase; Phase 2 moves them to the database.">
            <div className="flex flex-col gap-4 text-meta">
              <div>
                <p className="font-medium text-ink">Industries ({INDUSTRIES.length})</p>
                <p className="text-sub">{INDUSTRIES.map((i) => i.label).join(", ")}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Member roles ({ROLES.length})</p>
                <p className="text-sub">{ROLES.map((r) => r.label).join(", ")}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Opportunity categories ({Object.keys(OPPORTUNITY_KIND_LABEL).length})</p>
                <p className="text-sub">{Object.values(OPPORTUNITY_KIND_LABEL).join(", ")}</p>
              </div>
            </div>
          </Block>
        </div>
      )}
      {tab === "moderation" && (
        <Block title="Moderation" className="max-w-3xl">
          <NumberSetting label="Hold content for review after this many open reports" unit="reports" value={c.moderation.autoHideAfterReports} min={1} max={20} disabled={!edit} onSave={(n) => adminUpdateConfig("moderation", { autoHideAfterReports: n })} />
          <div className="mt-4 divide-y divide-line border-y border-line">
            <Switch label="Tell reporters when a report is resolved" checked={c.moderation.notifyReporter} onChange={(v) => sw(() => adminUpdateConfig("moderation", { notifyReporter: v }))()} />
          </div>
          <p className="mt-3 text-meta text-sub">Removing content always requires a recorded reason. This can’t be switched off.</p>
          <NotEnforced />
        </Block>
      )}
      {tab === "notifications" && (
        <div className="flex max-w-3xl flex-col gap-8">
          <Block title="Notification defaults">
            <div className="divide-y divide-line border-y border-line">
              <Switch label="Weekly digest on by default for new members" checked={c.notifications.weeklyDigestDefault} onChange={(v) => sw(() => adminUpdateConfig("notifications", { weeklyDigestDefault: v }))()} />
              <Switch label="Deadline reminders for saved opportunities" checked={c.notifications.deadlineReminders} onChange={(v) => sw(() => adminUpdateConfig("notifications", { deadlineReminders: v }))()} />
            </div>
            <NotEnforced />
          </Block>
          <Block title="Data retention" description="How long records are kept before permanent deletion in production.">
            <div className="flex flex-col gap-4">
              <NumberSetting label="Audit log" unit="days" value={c.retention.auditDays} min={365} max={3650} disabled={!edit} onSave={(n) => adminUpdateConfig("retention", { auditDays: n })} />
              <NumberSetting label="Removed content" unit="days" value={c.retention.removedContentDays} min={30} max={730} disabled={!edit} onSave={(n) => adminUpdateConfig("retention", { removedContentDays: n })} />
              <NumberSetting label="Inactive accounts" unit="months" value={c.retention.inactiveAccountMonths} min={6} max={120} disabled={!edit} onSave={(n) => adminUpdateConfig("retention", { inactiveAccountMonths: n })} />
            </div>
            <NotEnforced />
          </Block>
        </div>
      )}
      {tab === "security" && (
        <Block title="Administrative security" className="max-w-3xl">
          <NumberSetting label="Admin session timeout" unit="minutes" value={c.security.sessionTimeoutMinutes} min={5} max={480} disabled={!edit} onSave={(n) => adminUpdateConfig("security", { sessionTimeoutMinutes: n })} />
          <div className="mt-4">
            <TextArea label="Admin IP allowlist" rows={3} value={allowlist} onChange={(e) => setAllowlist(e.target.value)} disabled={!edit} optional hint="One address or CIDR range per line. Leave empty to allow any address." />
            <Button
              className="mt-2"
              size="sm"
              variant="secondary"
              disabled={!edit || allowlist === c.security.adminIpAllowlist}
              onClick={() => {
                const bad = allowlist.split("\n").map((l) => l.trim()).filter(Boolean).find((l) => !/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[0-9a-f:]+(\/\d{1,3})?$/i.test(l));
                if (bad) return toast(`“${bad}” isn’t an IP address or range`);
                adminUpdateConfig("security", { adminIpAllowlist: allowlist.trim() });
                toast("Allowlist saved");
              }}
            >
              Save allowlist
            </Button>
          </div>
          <dl className="mt-6 flex flex-col gap-3 text-ui">
            <div>
              <dt className="font-medium">Multi-factor sign-in for administrators</dt>
              <dd className="text-meta text-sub">Not available yet. Requires the Phase 2 identity provider. It will be mandatory for every admin role.</dd>
            </div>
            <div>
              <dt className="font-medium">Passwords and tokens</dt>
              <dd className="text-meta text-sub">Never stored in this browser and never shown in the admin portal.</dd>
            </div>
          </dl>
          <NotEnforced />
        </Block>
      )}
      {tab === "data" && <DataPanel />}
    </>
  );
}
