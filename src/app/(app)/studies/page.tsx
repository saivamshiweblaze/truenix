"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/field";
import { PageHeader, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { joinStudy, leaveStudy } from "@/lib/store/admin-actions";
import { setDecision } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { personById } from "@/lib/store/selectors";
import type { Study } from "@/lib/types";

function StudyItem({ st }: { st: Study }) {
  const s = useAppState();
  const [joining, setJoining] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string>();
  const mine = s.platform.participations.find((p) => p.studyId === st.id && p.personId === "me" && p.status !== "withdrawn");
  const declined = s.decisions[st.id] === "declined";
  const founder = personById(s, st.ownerId);
  const recruiting = st.status === "recruiting" && s.platform.config.features.studiesRecruiting;
  return (
    <li className="border-b border-line py-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusDot tone={mine ? "ink" : "mute"} label={mine ? (mine.status === "selected" ? "You were selected" : mine.status === "completed" ? "Completed" : "You volunteered") : declined ? "Not for me" : recruiting ? "Open" : "Not recruiting"} />
        <span className="text-meta text-sub">{st.format}</span>
      </div>
      <h2 className="mt-1.5 text-section font-semibold">{st.title}</h2>
      <p className="mt-1 text-ui text-charcoal">{st.note}</p>
      <p className="mt-2 text-meta text-sub">
        Who can take part: {st.eligibility}. Run by{" "}
        <Link href={`/people/${st.ownerId}`} className="text-ink underline underline-offset-4">
          {founder?.name}
        </Link>
        .
      </p>
      {joining && !mine && (
        <div className="mt-3 max-w-xl rounded-md bg-surface p-4">
          <p className="text-meta text-charcoal">{st.consentText}</p>
          <div className="mt-3">
            <CheckboxField checked={consent} onChange={(v) => (setConsent(v), setError(undefined))} label="I have read this and agree to take part." error={error} />
          </div>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        {mine ? (
          <Button size="sm" variant="ghost" onClick={() => (leaveStudy(st.id), setDecision(st.id, null, st.title), toast("You left the study", { body: "Your consent is recorded as withdrawn." }))}>
            Leave study
          </Button>
        ) : declined ? (
          <Button size="sm" variant="ghost" onClick={() => setDecision(st.id, null, st.title)}>
            Undo
          </Button>
        ) : recruiting ? (
          joining ? (
            <>
              <Button
                size="sm"
                onClick={() => {
                  if (!consent) return setError("Confirm the consent statement to volunteer.");
                  joinStudy(st.id, true);
                  setDecision(st.id, "accepted", st.title);
                  setJoining(false);
                  toast("Interest recorded", { body: "The study team will see that you volunteered." });
                }}
              >
                Volunteer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setJoining(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => setJoining(true)}>
                I can take part
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDecision(st.id, "declined", st.title)}>
                Not for me
              </Button>
            </>
          )
        ) : null}
      </div>
    </li>
  );
}

function Studies() {
  const s = useAppState();
  const studies = s.platform.studies.filter((st) => st.status === "recruiting" || st.status === "in_progress");
  return (
    <>
      <PageHeader
        title="Research studies"
        description="Founders looking to learn from people with first-hand experience. Taking part is always optional, and you can leave at any time. Organisers will be able to contact you once messaging is connected."
      />
      <ul className="max-w-3xl">
        {studies.map((st) => (
          <StudyItem key={st.id} st={st} />
        ))}
      </ul>
      {!studies.length && <p className="text-ui text-sub">No studies are recruiting right now.</p>}
    </>
  );
}

export default function StudiesPage() {
  return (
    <RoleGate roles={["participant"]}>
      <Studies />
    </RoleGate>
  );
}
