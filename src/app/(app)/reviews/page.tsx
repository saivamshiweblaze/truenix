"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextArea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState, PageHeader, StatusDot } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { RoleGate } from "@/components/shell/role-gate";
import { respondToReview } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { personById } from "@/lib/store/selectors";
import type { ExpertReview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STATUS: Record<ExpertReview["status"], { label: string; tone: "positive" | "attention" | "mute" }> = {
  requested: { label: "Awaiting your answer", tone: "mute" },
  accepted: { label: "Accepted — access granted", tone: "attention" },
  completed: { label: "Feedback given", tone: "positive" },
  declined: { label: "Declined", tone: "mute" },
  cancelled: { label: "Cancelled by the founder", tone: "mute" },
};

/**
 * Review requests sent to this expert or mentor by founders. Accepting grants read access to the idea (recorded as a
 * reviewer disclosure); completing or declining ends it. Feedback goes privately to the founder.
 */
function Reviews() {
  const s = useAppState();
  const user = s.user!;
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [rec, setRec] = useState<"proceed" | "revise" | "reconsider">("revise");
  const requests = (s.platform.expertReviews ?? []).filter((r) => r.reviewerId === "me");
  const current = requests.find((r) => r.id === reviewing);

  return (
    <>
      <PageHeader
        title={user.role === "mentor" ? "Mentorship and review requests" : "Expert review requests"}
        description="Founders who invited you to review their idea. Accepting lets you read it until you finish; your feedback goes privately to the founder."
      />
      {requests.length ? (
        <ul className="max-w-3xl">
          {requests.map((r) => {
            const owner = personById(s, r.requestedBy);
            const st = STATUS[r.status];
            return (
              <li key={r.id} className="border-b border-line py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusDot tone={st.tone} label={st.label} />
                  <span className="text-meta text-sub">Requested {formatDate(r.createdAt)}</span>
                </div>
                {r.status === "accepted" ? (
                  <Link href={`/ideas/${r.ideaId}`} className="mt-1.5 block text-section font-semibold hover:underline">
                    {r.ideaTitle || "Untitled idea"}
                  </Link>
                ) : (
                  <p className="mt-1.5 text-section font-semibold">{r.ideaTitle || "Untitled idea"}</p>
                )}
                <p className="mt-1 text-ui text-sub">
                  {owner?.name ?? "A founder"}
                  {r.note ? ` asks: “${r.note}”` : " asked for your review."}
                </p>
                {r.feedback && <p className="mt-2 whitespace-pre-line text-ui text-charcoal">Your feedback: {r.feedback}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "requested" && (
                    <>
                      <Button size="sm" onClick={() => void respondToReview(r.id, "accepted").then((ok) => ok && toast("Request accepted", { body: "You can now open the idea." }))}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void respondToReview(r.id, "declined").then((ok) => ok && toast("Request declined"))}>
                        Decline
                      </Button>
                    </>
                  )}
                  {r.status === "accepted" && (
                    <Button size="sm" variant="accent" onClick={() => setReviewing(r.id)}>
                      Write feedback
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No review requests yet" body="When a founder invites you to review their idea, it appears here. Make sure your expertise areas are up to date on your profile." />
      )}
      <Dialog
        open={!!current}
        onClose={() => setReviewing(null)}
        title="Write feedback"
        description={current ? `Sent privately to the founder of “${current.ideaTitle}”. Your access to the idea ends when you submit.` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(null)}>
              Cancel
            </Button>
            <Button
              disabled={text.trim().length < 20}
              onClick={async () => {
                if (!current) return;
                const ok = await respondToReview(current.id, "completed", { feedback: text, recommendation: rec });
                if (!ok) return;
                setText("");
                setReviewing(null);
                toast("Feedback sent");
              }}
            >
              Send feedback
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextArea label="Your feedback" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} hint="Be specific: the riskiest assumption, a test to run, and who to talk to. At least 20 characters." />
          <SelectField
            label="Recommendation"
            value={rec}
            onChange={(e) => setRec(e.target.value as typeof rec)}
            options={[
              { value: "proceed", label: "Proceed — the evidence supports the next step" },
              { value: "revise", label: "Revise — test key assumptions first" },
              { value: "reconsider", label: "Reconsider — significant concerns" },
            ]}
          />
        </div>
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
