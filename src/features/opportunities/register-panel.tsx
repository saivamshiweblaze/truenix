"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { registerForOpportunity, withdrawRegistration } from "@/lib/store/admin-actions";
import { registrationOpen, statusMeta } from "@/lib/admin/lifecycle";
import type { Opportunity } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * Registration for opportunities run on TRUEVIX. The record goes to the shared platform data,
 * so organisers see it immediately in Admin › Opportunities › Applications.
 */
export function RegisterPanel({ o }: { o: Opportunity }) {
  const s = useAppState();
  const mine = s.platform.registrations.find((r) => r.opportunityId === o.id && r.applicantId === "me" && r.status !== "withdrawn");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ mode: (o.teamMax ?? 1) > 1 ? "team" : "individual", teamName: "", members: "", statement: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const enabled = s.platform.config.features.opportunityRegistration;

  if (mine) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-ui">
          You registered {mine.mode === "team" ? `as ${mine.teamName}` : "individually"} on {formatDate(mine.createdAt)}.
        </p>
        <p className="text-meta text-sub">Status: {statusMeta(mine.status).label}</p>
        <div>
          <Button size="sm" variant="ghost" onClick={() => (withdrawRegistration(mine.id), toast("Registration withdrawn"))}>
            Withdraw registration
          </Button>
        </div>
      </div>
    );
  }
  if (!registrationOpen(o)) return <p className="text-meta text-sub">Registration is not open right now.</p>;
  if (!enabled) return <p className="text-meta text-sub">Registration on TRUEVIX is paused by the platform team.</p>;
  if (!open)
    return (
      <Button variant="accent" onClick={() => setOpen(true)}>
        Register
      </Button>
    );

  const submit = () => {
    const e: Record<string, string> = {};
    const extra = f.members
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, role] = l.split(/\s+[-–—]\s+/);
        return { name, role: role ?? "Member" };
      });
    if (f.mode === "team" && f.teamName.trim().length < 2) e.teamName = "Enter a team name.";
    const size = 1 + (f.mode === "team" ? extra.length : 0);
    if (f.mode === "team" && o.teamMin && size < o.teamMin) e.members = `Teams need at least ${o.teamMin} people including you.`;
    if (o.teamMax && size > o.teamMax) e.members = `Teams can have at most ${o.teamMax} people including you.`;
    if (f.statement.trim().length < 20) e.statement = "Say what you plan to work on (at least 20 characters).";
    setErrors(e);
    if (Object.keys(e).length) return;
    registerForOpportunity({ opportunityId: o.id, mode: f.mode as "team" | "individual", teamName: f.mode === "team" ? f.teamName : undefined, members: f.mode === "team" ? extra : [], statement: f.statement });
    toast("You’re registered", { body: "The organiser can now see your registration." });
    setOpen(false);
  };
  return (
    <div className="flex flex-col gap-3">
      {(o.teamMax ?? 1) > 1 && <SelectField label="Register as" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={[{ value: "individual", label: "An individual" }, { value: "team", label: "A team" }]} />}
      {f.mode === "team" && (
        <>
          <TextField label="Team name" value={f.teamName} onChange={(e) => setF({ ...f, teamName: e.target.value })} error={errors.teamName} maxLength={80} />
          <TextArea label="Teammates" rows={3} value={f.members} onChange={(e) => setF({ ...f, members: e.target.value })} error={errors.members} hint="One per line, as “Name — role”." />
        </>
      )}
      <TextArea label="What you plan to work on" rows={3} value={f.statement} onChange={(e) => setF({ ...f, statement: e.target.value })} error={errors.statement} maxLength={1200} />
      <div className="flex gap-2">
        <Button variant="accent" onClick={submit}>
          Submit registration
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
