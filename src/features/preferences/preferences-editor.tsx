"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { updateUser } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { onboardingRoleFor } from "@/features/onboarding/config";
import { preferencePatch, preferencesFor, readPreferences, type PreferenceKey, type Preferences } from "./preferences";

/**
 * Settings › Preferences. Edits the same values onboarding collected, through the same
 * module, so there is one source of truth. Saving updates Home, Discover and suggestions immediately.
 */
export function PreferencesEditor() {
  const user = useAppState().user!;
  const kind = user.profileKind ?? onboardingRoleFor(user.role);
  const defs = preferencesFor(kind);
  const [draft, setDraft] = useState<Preferences>(() => readPreferences(user));
  const saved = readPreferences(user);
  const dirty = defs.some((d) => JSON.stringify([...draft[d.key]].sort()) !== JSON.stringify([...saved[d.key]].sort()));

  const set = (key: PreferenceKey, v: string[]) => setDraft((d) => ({ ...d, [key]: v }));

  const save = () => {
    const patch = preferencePatch(user, Object.fromEntries(defs.map((d) => [d.key, draft[d.key]])) as Partial<Preferences>);
    updateUser(patch);
    toast("Preferences saved", { body: "Your home page and feed now use them." });
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-[60ch] text-ui text-sub">
        These started as suggestions during sign-up. Change them whenever your interests change — nothing here is required.
      </p>
      {defs.map((d) => (
        <ChipGroup
          key={d.key}
          legend={d.label}
          hint={d.hint}
          optional
          options={d.options}
          value={draft[d.key]}
          onChange={(v) => set(d.key, v)}
          allowCustom={d.allowCustom}
          customPlaceholder={d.customPlaceholder}
        />
      ))}
      <div className="sticky bottom-20 z-10 -mx-2 flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper/95 p-2 shadow-lift backdrop-blur lg:bottom-4">
        <Button variant="accent" onClick={save} disabled={!dirty}>
          Save preferences
        </Button>
        <Button variant="ghost" onClick={() => setDraft(readPreferences(user))} disabled={!dirty}>
          Discard changes
        </Button>
        <span className="text-meta text-mute" aria-live="polite">
          {dirty ? "You have unsaved changes." : "All changes saved."}
        </span>
      </div>
    </div>
  );
}
