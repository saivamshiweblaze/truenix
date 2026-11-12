"use client";

import { useMemo, useState } from "react";
import { PenLine, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { NetworkArt } from "@/components/illustrations/art";
import { INDUSTRIES, POST_KIND_LABEL, ROLES, SKILLS } from "@/config/taxonomy";
import { createPost } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts } from "@/lib/store/selectors";
import type { IndustryId, PostKind } from "@/lib/types";
import { matches } from "@/lib/utils";
import { PostCard } from "@/features/shared/post-card";
import { PersonRow } from "@/features/shared/rows";

type Tab = "discussions" | "questions" | "collaboration" | "people";
const COMMUNITY_KINDS: PostKind[] = ["discussion", "question", "collaboration", "founder_update", "research", "problem"];

export default function CommunityPage() {
  const s = useAppState();
  const [tab, setTab] = useState<Tab>(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return t === "people" || t === "questions" || t === "collaboration" ? t : "discussions";
  });
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [skill, setSkill] = useState("all");
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState<{ kind: PostKind; title: string; body: string; industries: IndustryId[] }>({ kind: "question", title: "", body: "", industries: [] });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const posts = useMemo(() => {
    let l = feedPosts(s).filter((p) => COMMUNITY_KINDS.includes(p.kind));
    if (tab === "questions") l = l.filter((p) => p.kind === "question");
    if (tab === "collaboration") l = l.filter((p) => p.kind === "collaboration");
    if (q) l = l.filter((p) => matches(q, p.title, p.body));
    return l;
  }, [s, tab, q]);

  const people = useMemo(
    () =>
      allPeople(s).filter(
        (p) => (role === "all" || p.role === role) && (skill === "all" || p.skills.includes(skill)) && matches(q, p.name, p.headline, p.organisation, p.skills.join(" ")) && s.admin.userStatus[p.id] !== "suspended",
      ),
    [s, role, skill, q],
  );

  const publish = () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 8) e.title = "Write a title of at least 8 characters.";
    if (form.body.trim().length < 20) e.body = "Add at least 20 characters of context.";
    setErrors(e);
    if (Object.keys(e).length) return;
    createPost(form);
    setCompose(false);
    setForm({ kind: "question", title: "", body: "", industries: [] });
    setTab(form.kind === "question" ? "questions" : form.kind === "collaboration" ? "collaboration" : "discussions");
    toast("Posted to the community");
  };

  return (
    <>
      <PageHeader
        title="Community"
        description="Questions, discussions and collaboration requests from founders, students, experts and mentors."
        actions={
          <Button variant="primary" onClick={() => setCompose(true)}>
            <PenLine size={15} aria-hidden /> Start a discussion
          </Button>
        }
      />
      <Tabs
        label="Community sections"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setQ("");
        }}
        items={[
          { value: "discussions", label: "All discussions" },
          { value: "questions", label: "Questions" },
          { value: "collaboration", label: "Collaboration requests" },
          { value: "people", label: "People" },
        ]}
      />
      <div className="mt-5 flex flex-col gap-2 md:flex-row">
        <div className="flex h-9 flex-1 items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-ink">
          <Search size={15} className="text-sub" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "people" ? "Search by name, skill or organisation" : "Search discussions"} aria-label="Search community" className="h-full flex-1 bg-transparent text-ui focus:outline-none" />
        </div>
        {tab === "people" && (
          <div className="flex gap-2">
            <InlineSelect aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: "all", label: "All roles" }, ...ROLES.filter((r) => r.id !== "platform_admin").map((r) => ({ value: r.id, label: r.short }))]} />
            <InlineSelect aria-label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} options={[{ value: "all", label: "Any skill" }, ...SKILLS.map((k) => ({ value: k, label: k }))]} />
          </div>
        )}
      </div>

      <div className="mt-2 max-w-3xl">
        {tab === "people" ? (
          people.length ? (
            <ul>
              {people.map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <EmptyState art={<NetworkArt size={52} />} title="No one matches" body="Try a different role or skill." />
            </div>
          )
        ) : posts.length ? (
          posts.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <div className="mt-6">
            <EmptyState art={<NetworkArt size={52} />} title="Nothing here yet" body="Start the first discussion." action={<Button onClick={() => setCompose(true)}>Start a discussion</Button>} />
          </div>
        )}
      </div>

      <Dialog
        open={compose}
        onClose={() => setCompose(false)}
        title="Start a discussion"
        description="Posts are visible to signed-in members. Be specific — the best questions get the best answers."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCompose(false)}>
              Cancel
            </Button>
            <Button onClick={publish}>Post</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <SelectField label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PostKind })} options={COMMUNITY_KINDS.map((k) => ({ value: k, label: POST_KIND_LABEL[k] }))} />
          <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} maxLength={160} />
          <TextArea label="Details" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} error={errors.body} maxLength={3000} />
          <fieldset>
            <legend className="mb-2 text-ui font-medium text-charcoal">Industries</legend>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => (
                <ChoiceChip key={i.id} selected={form.industries.includes(i.id)} onToggle={() => setForm({ ...form, industries: form.industries.includes(i.id) ? form.industries.filter((x) => x !== i.id) : [...form.industries, i.id] })}>
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
