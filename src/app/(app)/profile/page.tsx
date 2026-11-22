"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { updateUser } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { feedPosts, meAsPerson } from "@/lib/store/selectors";
import { ProfileView } from "@/features/community/profile-view";
import { SectionHeading } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { useTransientFile } from "@/lib/store/transient-files";
import { displayValue, flowFor, isVisible, onboardingRoleFor } from "@/features/onboarding/config";
import { preferenceLabel, preferencesFor, readPreferences } from "@/features/preferences/preferences";
import { formatBytes } from "@/lib/validation";

export default function MyProfilePage() {
  const s = useAppState();
  const me = meAsPerson(s)!;
  const user = s.user!;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    headline: user.headline,
    organisation: user.organisation,
    location: user.location,
    bio: user.bio,
  });
  const [error, setError] = useState<string>();
  const photo = useTransientFile("photo");
  const resume = useTransientFile("resume");

  const openEdit = () => {
    setForm({ name: user.name, headline: user.headline, organisation: user.organisation, location: user.location, bio: user.bio });
    setOpen(true);
  };

  const save = () => {
    if (form.name.trim().length < 2) return setError("Enter your name.");
    updateUser({
      ...form,
      name: form.name.trim().slice(0, 80),
      headline: form.headline.trim().slice(0, 140),
    });
    setError(undefined);
    setOpen(false);
    toast("Profile updated");
  };

  return (
    <>
      <ProfileView
        me
        person={me}
        ideas={s.ideas.filter((i) => i.status === "submitted")}
        posts={feedPosts(s).filter((p) => p.authorId === "me")}
        photo={photo?.url}
        details={
          <>
            <PreferenceSummary />
            <RoleDetails resumeHeld={!!resume} />
          </>
        }
        actions={
          <Button variant="secondary" onClick={openEdit}>
            <Pencil size={15} aria-hidden /> Edit profile
          </Button>
        }
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit profile"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save profile</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error} maxLength={80} />
          <TextField label="Headline" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={140} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Institution or organisation" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} maxLength={100} />
            <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={80} />
          </div>
          <TextArea label="About" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={600} />
          <p className="rounded-sm bg-surface px-3 py-2.5 text-meta text-sub">
            Skills, industries, technologies and collaboration preferences are edited in one place:{" "}
            <Link href="/settings?tab=preferences" className="font-medium text-ink underline underline-offset-4">
              Settings › Interests and preferences
            </Link>
            .
          </p>
        </div>
      </Dialog>
    </>
  );
}

/** Private details collected during onboarding. Visible only to the signed-in person. */
function RoleDetails({ resumeHeld }: { resumeHeld: boolean }) {
  const user = useAppState().user!;
  const doc = user.documents?.resume;
  const flow = user.profileKind ? flowFor(user.profileKind) : undefined;
  const academic = flow?.steps.find((st) => st.id === "academic");
  const answers = user.profile ?? {};
  if (!user.profileKind) {
    return (
      <section>
        <SectionHeading title="Role profile" />
        <p className="text-meta text-sub">Add the details founders and institutions look for.</p>
        <ButtonLink href="/onboarding" variant="secondary" size="sm" className="mt-3">
          Complete your profile
        </ButtonLink>
      </section>
    );
  }
  return (
    <section aria-labelledby="private-details" className="rounded-md border border-line p-4">
      <SectionHeading title="Your details" id="private-details" action={<span className="eyebrow">Only you</span>} />
      <dl className="flex flex-col gap-2.5 text-meta">
        {user.phone && (
          <div>
            <dt className="text-sub">Phone</dt>
            <dd className="text-ink">
              {user.phone} <span className="text-mute">· {user.phoneVerified ? "verified" : "unverified"}</span>
            </dd>
          </div>
        )}
        {user.linkedin && (
          <div>
            <dt className="text-sub">LinkedIn</dt>
            <dd className="truncate">
              <a href={user.linkedin} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">
                {user.linkedin.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </dd>
          </div>
        )}
        {academic?.fields
          .filter((f) => isVisible(f, answers) && answers[f.id] !== undefined && answers[f.id] !== "")
          .map((f) => (
            <div key={f.id}>
              <dt className="text-sub">{f.label}</dt>
              <dd className="text-ink">{displayValue(f, answers[f.id], answers)}</dd>
            </div>
          ))}
        {doc && (
          <div>
            <dt className="text-sub">Resume</dt>
            <dd className="text-ink">
              {doc.name} <span className="text-mute">· {formatBytes(doc.size)}</span>
              <p className="mt-0.5 text-mute">
                {resumeHeld ? "Held in this tab only — it isn’t stored." : "Not stored. You’ll be asked to upload it again once secure storage is available."}
              </p>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/** Interests and preferences, read from the single source of truth, with a link to edit them. */
function PreferenceSummary() {
  const user = useAppState().user!;
  const prefs = readPreferences(user);
  const defs = preferencesFor(user.profileKind ?? onboardingRoleFor(user.role)).filter((d) => prefs[d.key].length);
  return (
    <section aria-labelledby="prefs-title">
      <SectionHeading
        title="Interests and preferences"
        id="prefs-title"
        action={
          <Link href="/settings?tab=preferences" className="text-meta font-medium text-sub underline-offset-4 hover:text-ink hover:underline">
            Edit
          </Link>
        }
      />
      {defs.length ? (
        <dl className="flex flex-col gap-3 text-meta">
          {defs.map((d) => (
            <div key={d.key}>
              <dt className="text-sub">{d.label}</dt>
              <dd className="mt-0.5 text-ink">{prefs[d.key].map((v) => preferenceLabel(d.key, v)).join(", ")}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-meta text-sub">Add industries, skills and technologies so we can suggest relevant people and projects.</p>
      )}
    </section>
  );
}
