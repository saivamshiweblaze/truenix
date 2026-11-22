"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextArea, TextField } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { useAppState } from "@/lib/store/store";
import { adminCreateCmsEntry, adminPublishCms, adminRestoreCmsVersion, adminSaveCmsDraft, adminUnpublishCms } from "@/lib/store/admin-actions";
import { allIdeasAdmin } from "@/lib/store/selectors";
import type { CmsEntry, CmsKind } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, FormActions } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";

/** Field definitions per content kind. All fields are plain text; nothing is rendered as HTML. */
const FIELDS: Record<CmsKind, { id: string; label: string; long?: boolean; max: number; required?: boolean; hint?: string }[]> = {
  hero: [
    { id: "eyebrow", label: "Line above the headline", max: 80 },
    { id: "headline", label: "Headline", max: 90, required: true },
    { id: "subheading", label: "Supporting paragraph", long: true, max: 320, required: true },
    { id: "footnote", label: "Small note under the buttons", max: 120 },
  ],
  banner: [
    { id: "text", label: "Banner text", max: 160, hint: "Leave empty to hide the banner." },
    { id: "linkLabel", label: "Link label", max: 40 },
    { id: "linkHref", label: "Link", max: 200, hint: "A TRUEVIX path such as /opportunities, or a full https:// address." },
  ],
  about_intro: [{ id: "lead", label: "Introduction", long: true, max: 300, required: true }],
  footer_links: [{ id: "links", label: "Links", long: true, max: 800, hint: "One per line, as “Label | /path” or “Label | https://…”. Up to 6 links." }],
  faq: [
    { id: "question", label: "Question", max: 160, required: true },
    { id: "answer", label: "Answer", long: true, max: 1200, required: true },
  ],
  help: [
    { id: "title", label: "Article title", max: 120, required: true },
    { id: "body", label: "Article", long: true, max: 4000, required: true },
  ],
};

const WHERE: Record<CmsKind, { label: string; href: string }> = {
  hero: { label: "Homepage", href: "/" },
  banner: { label: "Every public and member page", href: "/" },
  about_intro: { label: "About page", href: "/about" },
  footer_links: { label: "Public footer", href: "/" },
  faq: { label: "Help and FAQs page", href: "/help" },
  help: { label: "Help and FAQs page", href: "/help" },
};

const safeLink = (v: string) => (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v);

function validate(kind: CmsKind, f: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const d of FIELDS[kind]) if (d.required && (f[d.id] ?? "").trim().length < 3) e[d.id] = `${d.label} is required.`;
  if (kind === "banner" && f.linkHref?.trim() && !safeLink(f.linkHref.trim())) e.linkHref = "Use a path starting with / or a full https:// address.";
  if (kind === "banner" && f.linkHref?.trim() && !f.linkLabel?.trim()) e.linkLabel = "Add a label for the link.";
  if (kind === "footer_links") {
    const lines = (f.links ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 6) e.links = "Up to 6 links.";
    const bad = lines.find((l) => {
      const [label, href] = l.split("|").map((x) => x?.trim());
      return !label || !href || !safeLink(href);
    });
    if (bad) e.links = `This line isn’t valid: “${bad}”. Use “Label | /path”.`;
  }
  return e;
}

export function CmsList() {
  const s = useAppState();
  const can = useCan();
  const router = useRouter();
  const groups: { title: string; kinds: CmsKind[] }[] = [
    { title: "Pages and site-wide", kinds: ["hero", "about_intro", "banner", "footer_links"] },
    { title: "FAQs", kinds: ["faq"] },
    { title: "Help articles", kinds: ["help"] },
  ];
  const featuredIdeas = allIdeasAdmin(s).filter((i) => i.featured);
  const featuredOpps = s.platform.opportunities.filter((o) => o.featured);
  return (
    <>
      <AdminHeader
        title="Site content"
        description="Public-facing text: the homepage, About, the site banner, footer links, FAQs and help articles. Edit a draft, preview it, then publish. Earlier published versions can be restored."
        actions={
          can("cms", "create") && (
            <>
              <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/cms/${adminCreateCmsEntry("faq")}`)}>
                <Plus size={15} aria-hidden /> FAQ
              </Button>
              <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/cms/${adminCreateCmsEntry("help")}`)}>
                <Plus size={15} aria-hidden /> Help article
              </Button>
            </>
          )
        }
      />
      <div className="flex flex-col gap-8">
        {groups.map((g) => {
          const entries = s.platform.cms.filter((c) => g.kinds.includes(c.kind)).sort((a, b) => a.order - b.order);
          return (
            <Block key={g.title} title={g.title}>
              <ul>
                {entries.map((c) => {
                  const unpublishedChanges = c.published && JSON.stringify(c.draft) !== JSON.stringify(c.published);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line py-2.5 last:border-b-0">
                      <Link href={`/admin/cms/${c.id}`} className="min-w-0 flex-1 text-ui font-medium hover:underline">
                        {c.label}
                      </Link>
                      <span className="text-meta text-sub">{WHERE[c.kind].label}</span>
                      {unpublishedChanges && <Flag tone="caution">Unpublished changes</Flag>}
                      <AdminStatus value={c.status} />
                      <span className="w-24 text-right text-micro text-mute">{timeAgo(c.updatedAt)}</span>
                    </li>
                  );
                })}
                {!entries.length && <li className="text-meta text-sub">None yet.</li>}
              </ul>
            </Block>
          );
        })}
        <Block title="Featured items" description="Featured projects and opportunities are set on their own records and shown first on public pages.">
          <ul>
            {featuredIdeas.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 border-b border-line py-2 text-ui last:border-b-0">
                <Link href={`/admin/ideas/${i.id}`} className="hover:underline">
                  {i.title.split(":")[0]}
                </Link>
                <span className="text-meta text-sub">Project</span>
              </li>
            ))}
            {featuredOpps.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 border-b border-line py-2 text-ui last:border-b-0">
                <Link href={`/admin/opportunities/${o.id}`} className="hover:underline">
                  {o.title}
                </Link>
                <span className="text-meta text-sub">Opportunity</span>
              </li>
            ))}
            {!featuredIdeas.length && !featuredOpps.length && <li className="text-meta text-sub">Nothing is featured.</li>}
          </ul>
        </Block>
      </div>
    </>
  );
}

function PreviewPane({ kind, f }: { kind: CmsKind; f: Record<string, string> }) {
  if (kind === "hero")
    return (
      <div className="rounded-md border border-line bg-paper p-6">
        {f.eyebrow && <p className="text-meta text-sub">{f.eyebrow}</p>}
        <p className="mt-3 max-w-[15ch] font-display text-display font-extrabold text-ink">{f.headline}</p>
        <p className="mt-4 max-w-[34rem] text-body text-sub">{f.subheading}</p>
        {f.footnote && <p className="mt-4 text-meta text-mute">{f.footnote}</p>}
      </div>
    );
  if (kind === "banner") return f.text ? <div className="rounded-sm bg-ink px-4 py-2 text-meta text-white">{f.text} {f.linkLabel && <span className="underline underline-offset-4">{f.linkLabel}</span>}</div> : <p className="text-meta text-sub">The banner is hidden while the text is empty.</p>;
  if (kind === "footer_links")
    return (
      <ul className="flex flex-col gap-2 rounded-md bg-surface p-4">
        {(f.links ?? "").split("\n").filter(Boolean).map((l) => (
          <li key={l} className="text-ui text-charcoal">
            {l.split("|")[0]?.trim()}
          </li>
        ))}
      </ul>
    );
  if (kind === "faq")
    return (
      <div className="rounded-md border border-line p-4">
        <p className="text-ui font-semibold">{f.question}</p>
        <p className="mt-1 whitespace-pre-line text-ui text-charcoal">{f.answer}</p>
      </div>
    );
  if (kind === "help")
    return (
      <article className="rounded-md border border-line p-4">
        <p className="text-section font-bold">{f.title}</p>
        <p className="mt-2 whitespace-pre-line text-body text-charcoal">{f.body}</p>
      </article>
    );
  return <p className="rounded-md border border-line p-4 text-body text-charcoal">{f.lead}</p>;
}

export function CmsEditor({ id }: { id: string }) {
  const s = useAppState();
  const can = useCan();
  const confirm = useConfirm();
  const entry = s.platform.cms.find((c) => c.id === id);
  const [f, setF] = useState<Record<string, string>>(() => ({ ...(entry?.draft ?? {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prevDraft, setPrevDraft] = useState(entry?.draft);
  if (entry && prevDraft !== entry.draft) {
    // A version was restored: load it into the form.
    setPrevDraft(entry.draft);
    setF({ ...entry.draft });
  }
  if (!entry) return <EmptyState title="Content not found" body="It may have been removed." action={<ButtonLink href="/admin/cms">Site content</ButtonLink>} />;
  const e: CmsEntry = entry;
  const dirty = JSON.stringify(f) !== JSON.stringify(e.draft);
  const differs = !e.published || JSON.stringify(e.draft) !== JSON.stringify(e.published);
  const saveDraft = () => {
    const errs = validate(e.kind, f);
    setErrors(errs);
    if (Object.keys(errs).length) return false;
    adminSaveCmsDraft(e.id, f);
    return true;
  };
  return (
    <>
      <AdminHeader
        title={e.label}
        flags={
          <>
            <AdminStatus value={e.status} />
            {e.published && differs && <Flag tone="caution">Draft differs from live</Flag>}
          </>
        }
        meta={
          <>
            <span>Shown on: {WHERE[e.kind].label}</span>
            <span>Updated {timeAgo(e.updatedAt)}</span>
          </>
        }
        actions={
          <ButtonLink href={WHERE[e.kind].href} variant="ghost" size="sm" target="_blank">
            View live page
          </ButtonLink>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Block title="Draft">
          <form
            noValidate
            onSubmit={(ev) => {
              ev.preventDefault();
              if (saveDraft()) toast("Draft saved", { body: "Not live yet. Publish to update the public page." });
            }}
            className="flex flex-col gap-4"
          >
            {FIELDS[e.kind].map((d) =>
              d.long ? (
                <TextArea key={d.id} label={d.label} rows={d.id === "body" ? 8 : 4} value={f[d.id] ?? ""} onChange={(ev) => setF({ ...f, [d.id]: ev.target.value })} error={errors[d.id]} hint={d.hint} maxLength={d.max} optional={!d.required} disabled={!can("cms", "edit")} />
              ) : (
                <TextField key={d.id} label={d.label} value={f[d.id] ?? ""} onChange={(ev) => setF({ ...f, [d.id]: ev.target.value })} error={errors[d.id]} hint={d.hint} maxLength={d.max} optional={!d.required} disabled={!can("cms", "edit")} />
              ),
            )}
            <FormActions note={dirty ? "You have unsaved edits." : differs ? "The saved draft is not live." : "The draft matches the live version."}>
              {can("cms", "edit") && (
                <Button type="submit" variant="secondary" disabled={!dirty}>
                  Save draft
                </Button>
              )}
              {can("cms", "publish") && e.status === "published" && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    confirm.ask({
                      title: `Unpublish ${e.label}?`,
                      consequences: [e.kind === "hero" || e.kind === "about_intro" ? "The public page falls back to the built-in default text." : "It disappears from the public site. The draft and history are kept."],
                      confirmLabel: "Unpublish",
                      onConfirm: () => (adminUnpublishCms(e.id), toast("Unpublished")),
                    })
                  }
                >
                  Unpublish
                </Button>
              )}
              {can("cms", "publish") && (
                <Button
                  variant="accent"
                  disabled={!dirty && !differs && e.status === "published"}
                  onClick={() => {
                    if (dirty && !saveDraft()) return;
                    confirm.ask({
                      title: "Publish this content?",
                      consequences: [`The ${WHERE[e.kind].label.toLowerCase()} shows it immediately for every visitor in this browser’s data set.`, "A new version is added to the history."],
                      confirmLabel: "Publish",
                      onConfirm: () => (adminPublishCms(e.id), toast("Published", { body: "The public page now shows this version." })),
                    });
                  }}
                >
                  Publish
                </Button>
              )}
            </FormActions>
          </form>
        </Block>
        <div className="flex min-w-0 flex-col gap-8">
          <Block title="Preview" description="Updates as you type. Plain text only.">
            <PreviewPane kind={e.kind} f={f} />
          </Block>
          <Block title="Version history">
            {e.versions.length ? (
              <ul>
                {e.versions.map((v, i) => (
                  <li key={v.version} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="text-ui">
                      Version {v.version}
                      {i === 0 && e.status === "published" && <span className="ml-2 text-micro text-mute">live</span>}
                      <span className="block text-micro text-mute">
                        {formatDate(v.publishedAt)} · {v.by}
                      </span>
                    </span>
                    {can("cms", "edit") && (
                      <Button size="sm" variant="ghost" onClick={() => (adminRestoreCmsVersion(e.id, v.version), toast(`Version ${v.version} loaded into the draft`, { body: "Publish to make it live." }))}>
                        Restore to draft
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-sub">Never published.</p>
            )}
          </Block>
        </div>
      </div>
      {confirm.dialog}
    </>
  );
}
