"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Handshake, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChoiceChip, InlineSelect, SelectField, TextArea, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Badge, EmptyState, PageHeader, SearchInput, SectionHeading, SectionLink, Toolbar, ToolbarFilters } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { NetworkArt } from "@/components/illustrations/art";
import { industryLabel, INDUSTRIES, POST_KIND_LABEL, ROLES, SKILLS, stageLabel } from "@/config/taxonomy";
import { createPost } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/store";
import { allPeople, feedPosts, personById, publicIdeas } from "@/lib/store/selectors";
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
  const [compose, setCompose] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("compose") === "1");
  const [form, setForm] = useState<{ kind: PostKind; title: string; body: string; industries: IndustryId[] }>(() => {
    // ?kind= preselects the post type when arriving from a shortcut (e.g. "Ask" on Discover).
    const k = typeof window === "undefined" ? null : (new URLSearchParams(window.location.search).get("kind") as PostKind | null);
    return { kind: k && COMMUNITY_KINDS.includes(k) ? k : "question", title: "", body: "", industries: [] };
  });
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
        (p) => (role === "all" || p.role === role) && (skill === "all" || p.skills.includes(skill)) && matches(q, p.name, p.headline, p.organisation, p.skills.join(" ")),
      ),
    [s, role, skill, q],
  );

  // Projects with stated collaboration needs; ones needing the person's skills first.
  const collabProjects = publicIdeas(s)
    .filter((i) => i.ownerId !== "me" && i.collaborationNeeds)
    .sort((a, b) => Number(b.requiredSkills.some((k) => s.user?.skills.includes(k))) - Number(a.requiredSkills.some((k) => s.user?.skills.includes(k))))
    .slice(0, 4);

  const publish = () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 8) e.title = "Write a title of at least 8 characters.";
    if (form.body.trim().length < 20) e.body = "Add at least 20 characters of context.";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!s.platform.config.features.communityPosting) {
      toast("Posting is paused", { body: "Platform administrators have paused new community posts for now. Try again later." });
      return;
    }
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
          <Button variant="accent" size="lg" onClick={() => setCompose(true)}>
            <PenLine size={16} aria-hidden /> Start a discussion
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
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
      <Toolbar className="mt-5">
        <SearchInput value={q} onChange={setQ} placeholder={tab === "people" ? "Search by name, skill or organisation" : "Search discussions"} label="Search community" />
        {tab === "people" && (
          <ToolbarFilters>
            <InlineSelect aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: "all", label: "All roles" }, ...ROLES.filter((r) => r.id !== "platform_admin").map((r) => ({ value: r.id, label: r.short }))]} />
            <InlineSelect aria-label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} options={[{ value: "all", label: "Any skill" }, ...SKILLS.map((k) => ({ value: k, label: k }))]} />
          </ToolbarFilters>
        )}
      </Toolbar>

      <div className="mt-2">
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
      </div>

      <aside aria-labelledby="collab-title" className="flex flex-col gap-4 xl:pt-5">
        <SectionHeading title="Projects looking for people" id="collab-title" action={<SectionLink href="/ideas">All ideas</SectionLink>} />
        <ul className="flex flex-col gap-2">
          {collabProjects.map((i) => {
            const owner = personById(s, i.ownerId);
            return (
              <li key={i.id} className="rounded-md border border-line p-4 transition-colors hover:border-ink">
                <p className="text-micro text-sub">
                  {stageLabel(i.stage)} · {industryLabel(i.industry)}
                </p>
                <Link href={`/ideas/${i.id}`} className="mt-1 block text-ui font-semibold leading-snug hover:underline">
                  {i.title.split(":")[0]}
                </Link>
                <p className="mt-1 line-clamp-2 text-meta text-sub">{i.collaborationNeeds}</p>
                {i.requiredSkills.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-1">
                    {i.requiredSkills.slice(0, 3).map((k) => (
                      <Badge key={k} tone={s.user?.skills.includes(k) ? "accent" : "outline"}>
                        {k}
                      </Badge>
                    ))}
                  </p>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-micro text-mute">
                  <Handshake size={13} aria-hidden /> {owner?.name}
                </p>
              </li>
            );
          })}
        </ul>
      </aside>
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
