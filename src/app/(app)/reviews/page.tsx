"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { DemoMark, PageHeader, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { industryLabel, stageLabel } from "@/config/taxonomy";
import { addComment, setDecision } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { personById, publicIdeas } from "@/lib/store/selectors";

function Reviews() {
  const s = useAppState();
  const user = s.user!;
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const areas = user.industries.length ? user.industries : user.interests;
  const requests = publicIdeas(s)
    .filter((i) => i.ownerId !== "me")
    .sort((a, b) => Number(areas.includes(b.industry)) - Number(areas.includes(a.industry)))
    .slice(0, 6);
  const current = requests.find((r) => r.id === reviewing);

  return (
    <>
      <PageHeader
        title={user.role === "mentor" ? "Mentorship and review requests" : "Expert review requests"}
        description="Founders asking for an experienced view, ordered by how closely they match your industries. Your feedback is posted to the idea's discussion with your name."
      />
      <ul className="max-w-3xl">
        {requests.map((i) => {
          const d = s.decisions[`review-${i.id}`];
          const owner = personById(s, i.ownerId);
          return (
            <li key={i.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-center gap-3">
                <StatusDot tone={d === "completed" ? "ink" : d === "accepted" ? "accent" : "mute"} label={d === "completed" ? "Feedback given" : d === "accepted" ? "Accepted" : d === "declined" ? "Declined" : "Awaiting your answer"} />
                <span className="text-meta text-sub">
                  {industryLabel(i.industry)} · {stageLabel(i.stage)}
                </span>
                {areas.includes(i.industry) && <span className="text-meta text-ink">Matches your expertise</span>}
                <DemoMark>Demo request</DemoMark>
              </div>
              <Link href={`/ideas/${i.id}`} className="mt-1.5 block text-section font-semibold hover:underline">
                {i.title.split(":")[0]}
              </Link>
              <p className="mt-1 text-ui text-sub">
                {owner?.name} asks: “What would you test first, and what am I missing?”
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!d && (
                  <>
                    <Button size="sm" onClick={() => (setDecision(`review-${i.id}`, "accepted", i.title), toast("Request accepted"))}>
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => (setDecision(`review-${i.id}`, "declined", i.title), toast("Request declined"))}>
                      Decline
                    </Button>
                  </>
                )}
                {d === "accepted" && (
                  <Button size="sm" variant="accent" onClick={() => setReviewing(i.id)}>
                    Write feedback
                  </Button>
                )}
                {(d === "declined" || d === "completed") && (
                  <Button size="sm" variant="ghost" onClick={() => setDecision(`review-${i.id}`, null, i.title)}>
                    Undo
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Dialog
        open={!!current}
        onClose={() => setReviewing(null)}
        title="Write feedback"
        description={current ? `Posted publicly to the discussion on “${current.title.split(":")[0]}” under your name.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              disabled={text.trim().length < 20}
              onClick={() => {
                if (!current) return;
                addComment(current.id, text);
                setDecision(`review-${current.id}`, "completed", current.title);
                setText("");
                setReviewing(null);
                toast("Feedback posted");
              }}
            >
              Post feedback
            </Button>
          </>
        }
      >
        <TextArea label="Your feedback" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} hint="Be specific: the riskiest assumption, a test to run, and who to talk to. At least 20 characters." />
      </Dialog>
    </>
  );
}

export default function ReviewsPage() {
  return (
    <RoleGate roles={["expert", "mentor"]}>
      <Reviews />
    </RoleGate>
  );
}
