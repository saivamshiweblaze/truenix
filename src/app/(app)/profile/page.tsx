"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, SKILLS } from "@/config/taxonomy";
import { updateUser } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { feedPosts, meAsPerson } from "@/lib/store/selectors";
import type { IndustryId } from "@/lib/types";
import { ProfileView } from "@/features/community/profile-view";

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
    skills: user.skills,
    interests: user.interests,
    collaboration: user.collaboration.join("\n"),
  });
  const [error, setError] = useState<string>();

  const openEdit = () => {
    setForm({ name: user.name, headline: user.headline, organisation: user.organisation, location: user.location, bio: user.bio, skills: user.skills, interests: user.interests, collaboration: user.collaboration.join("\n") });
    setOpen(true);
  };

  const save = () => {
    if (form.name.trim().length < 2) return setError("Enter your name.");
    updateUser({
      ...form,
      name: form.name.trim().slice(0, 80),
      headline: form.headline.trim().slice(0, 140),
      collaboration: form.collaboration.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6),
    });
    setError(undefined);
    setOpen(false);
    toast("Profile updated");
  };

  const toggle = <T,>(l: T[], v: T) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]);

  return (
    <>
      <ProfileView
        me
        person={me}
        ideas={s.ideas.filter((i) => i.status === "submitted")}
        posts={feedPosts(s).filter((p) => p.authorId === "me")}
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
          <TextArea label="Collaboration preferences" hint="One per line, e.g. ‘Open to frontend work, 10 hours a week’." rows={3} value={form.collaboration} onChange={(e) => setForm({ ...form, collaboration: e.target.value })} maxLength={600} />
          <fieldset>
            <legend className="mb-2 text-ui font-medium text-charcoal">Skills</legend>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((k) => (
                <ChoiceChip key={k} selected={form.skills.includes(k)} onToggle={() => setForm({ ...form, skills: toggle(form.skills, k) })}>
                  {k}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-ui font-medium text-charcoal">Interests</legend>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <ChoiceChip key={i.id} selected={form.interests.includes(i.id)} onToggle={() => setForm({ ...form, interests: toggle<IndustryId>(form.interests, i.id) })}>
                  {i.label}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        </div>
      </Dialog>
    </>
  );
}
