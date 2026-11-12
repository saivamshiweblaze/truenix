"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoMark, PageHeader, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { DEMO_STUDIES } from "@/lib/demo-data/institution";
import { setDecision } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { personById } from "@/lib/store/selectors";

function Studies() {
  const s = useAppState();
  return (
    <>
      <PageHeader
        title="Research studies"
        description="Founders looking to learn from people with first-hand experience. Taking part is always optional. In this demonstration, joining records your interest only; no one will contact you."
      />
      <ul className="max-w-3xl">
        {DEMO_STUDIES.map((st) => {
          const d = s.decisions[st.id];
          const founder = personById(s, st.founderId);
          return (
            <li key={st.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusDot tone={d === "accepted" ? "accent" : "mute"} label={d === "accepted" ? "You joined" : d === "declined" ? "Not for me" : "Open"} />
                <span className="text-meta text-sub">{st.format}</span>
                <DemoMark>Demo study</DemoMark>
              </div>
              <h2 className="mt-1.5 text-section font-semibold">{st.title}</h2>
              <p className="mt-1 text-ui text-charcoal">{st.note}</p>
              <p className="mt-2 text-meta text-sub">
                Who can take part: {st.eligibility}. Run by{" "}
                <Link href={`/people/${st.founderId}`} className="text-ink underline underline-offset-4">
                  {founder?.name}
                </Link>
                .
              </p>
              <div className="mt-3 flex gap-2">
                {d ? (
                  <Button size="sm" variant="ghost" onClick={() => setDecision(st.id, null, st.title)}>
                    {d === "accepted" ? "Leave study" : "Undo"}
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => (setDecision(st.id, "accepted", st.title), toast("Interest recorded", { body: "Demo — no one will contact you." }))}>
                      I can take part
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDecision(st.id, "declined", st.title)}>
                      Not for me
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
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
