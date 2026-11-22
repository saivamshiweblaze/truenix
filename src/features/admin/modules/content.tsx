"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup, SelectField, TextArea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { INDUSTRIES, industryLabel, POST_KIND_LABEL } from "@/config/taxonomy";
import { useAppState } from "@/lib/store/store";
import { adminModerateContent, adminRecategorisePost, adminSetPostFlags } from "@/lib/store/admin-actions";
import { allCommentsAdmin, allPostsAdmin, commentCount, personById } from "@/lib/store/selectors";
import type { Comment, ContentModeration, IndustryId, Post, PostKind } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { AdminHeader, Block, Details, Timeline } from "../kit/layout";
import { AdminStatus, Flag } from "../kit/status";
import { DataTable, type Column } from "../kit/data-table";
import { useCan } from "../kit/can";
import { useConfirm } from "../kit/confirm";

const statusOf = (m?: ContentModeration) => m?.status ?? "visible";

export function useModerate() {
  const confirm = useConfirm();
  const ask = (kind: "post" | "comment", ids: string[], label: string, status: ContentModeration["status"], done?: () => void) => {
    const t = {
      visible: { title: `Restore ${label}?`, c: "The content becomes visible to members again.", btn: "Restore" },
      pending_review: { title: `Hold ${label} for review?`, c: "Hidden from other members until approved. The author still sees it.", btn: "Hold for review" },
      hidden: { title: `Hide ${label}?`, c: "Hidden from other members. The author still sees it, and it can be restored.", btn: "Hide" },
      removed: { title: `Remove ${label}?`, c: "Removed from Discover and Community for everyone except the author. It is kept for the retention period so the decision can be reviewed.", btn: "Remove" },
    }[status];
    confirm.ask({
      title: t.title,
      consequences: [t.c, "Member content is never rewritten. Your reason is stored with the decision."],
      confirmLabel: t.btn,
      danger: status === "removed",
      reason: status === "visible" ? "optional" : "required",
      onConfirm: (r) => {
        adminModerateContent(kind, ids, status, r);
        toast(`${t.btn === "Hold for review" ? "Held for review" : t.btn === "Hide" ? "Hidden" : t.btn === "Remove" ? "Removed" : "Restored"}: ${label}`);
        done?.();
      },
    });
  };
  return { ask, dialog: confirm.dialog };
}

function PostDialog({ post, onClose, onModerate }: { post: Post; onClose: () => void; onModerate: (status: ContentModeration["status"]) => void }) {
  const s = useAppState();
  const can = useCan();
  const [kind, setKind] = useState<PostKind>(post.kind);
  const [industries, setIndustries] = useState<string[]>(post.industries);
  const [reason, setReason] = useState("");
  const history = s.admin.audit.filter((e) => e.targetId === post.id);
  const st = statusOf(post.moderation);
  const changed = kind !== post.kind || JSON.stringify(industries) !== JSON.stringify(post.industries);
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={post.title}
      description={`${POST_KIND_LABEL[post.kind]} by ${personById(s, post.authorId)?.name ?? "Unknown"} · ${formatDate(post.createdAt)}`}
      footer={
        can("content", "edit") ? (
          <>
            {st === "pending_review" && (
              <>
                <Button size="sm" onClick={() => onModerate("visible")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onModerate("removed")}>
                  Reject
                </Button>
              </>
            )}
            {st !== "visible" && st !== "pending_review" && (
              <Button size="sm" variant="secondary" onClick={() => onModerate("visible")}>
                Restore
              </Button>
            )}
            {st === "visible" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => onModerate("hidden")}>
                  Hide
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onModerate("removed")}>
                  Remove
                </Button>
              </>
            )}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatus value={st} />
          {post.moderation?.pinned && <Flag>Pinned</Flag>}
          {post.moderation?.featured && <Flag tone="accent">Featured</Flag>}
          {post.moderation?.reason && <span className="text-meta text-sub">Reason: {post.moderation.reason}</span>}
        </div>
        <p className="whitespace-pre-line text-body text-charcoal">{post.body}</p>
        <Details
          items={[
            { label: "Industries", value: post.industries.map(industryLabel).join(", ") },
            { label: "Appreciations", value: post.likes },
            { label: "Comments", value: commentCount(s, post.id) },
            { label: "Linked project", value: post.ideaId },
          ]}
        />
        {can("content", "publish") && st === "visible" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => (adminSetPostFlags(post.id, { pinned: !post.moderation?.pinned }), toast(post.moderation?.pinned ? "Unpinned" : "Pinned to the top of Discover"))}>
              <Pin size={14} aria-hidden /> {post.moderation?.pinned ? "Unpin" : "Pin to top"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => (adminSetPostFlags(post.id, { featured: !post.moderation?.featured }), toast(post.moderation?.featured ? "Removed from featured" : "Featured"))}>
              <Star size={14} aria-hidden /> {post.moderation?.featured ? "Unfeature" : "Feature"}
            </Button>
          </div>
        )}
        {can("content", "edit") && (
          <fieldset className="flex flex-col gap-3 rounded-md bg-surface p-4">
            <legend className="px-1 text-ui font-semibold">Correct the category</legend>
            <p className="text-meta text-sub">Administrators can correct how a post is classified. The author’s words can’t be edited.</p>
            <SelectField label="Post type" value={kind} onChange={(e) => setKind(e.target.value as PostKind)} options={Object.entries(POST_KIND_LABEL).map(([value, l]) => ({ value, label: l }))} />
            <ChipGroup legend="Industries" options={INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))} value={industries} onChange={setIndustries} />
            <TextArea label="Reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} hint="Recorded in the audit log." />
            <div>
              <Button
                size="sm"
                disabled={!changed || reason.trim().length < 5}
                onClick={() => {
                  adminRecategorisePost(post.id, { kind, industries: industries as IndustryId[] }, reason.trim());
                  toast("Category updated");
                  onClose();
                }}
              >
                Save category
              </Button>
            </div>
          </fieldset>
        )}
        <Block title="Moderation history">
          <Timeline events={history.map((e) => ({ id: e.id, at: e.createdAt, by: e.actor, text: `${e.action}${e.reason ? ` — ${e.reason}` : ""}` }))} empty="No moderation actions yet." />
        </Block>
      </div>
    </Dialog>
  );
}

export function ContentPage() {
  const s = useAppState();
  const can = useCan();
  const params = useSearchParams();
  const [tab, setTab] = useState<"posts" | "comments">("posts");
  const [open, setOpen] = useState<string | null>(params.get("post"));
  const mod = useModerate();
  const posts = allPostsAdmin(s);
  const comments = allCommentsAdmin(s);
  const openPost = posts.find((p) => p.id === open);

  const postCols: Column<Post>[] = [
    {
      id: "title",
      header: "Post",
      primary: true,
      sort: (p) => p.title,
      csv: (p) => p.title,
      cell: (p) => (
        <button type="button" onClick={() => setOpen(p.id)} className="flex min-w-[14rem] items-start gap-1.5 text-left font-medium text-ink underline-offset-4 hover:underline">
          {p.moderation?.pinned && <Pin size={13} className="mt-1 shrink-0" aria-label="Pinned" />}
          <span className="line-clamp-2">{p.title}</span>
        </button>
      ),
    },
    { id: "kind", header: "Type", sort: (p) => POST_KIND_LABEL[p.kind], csv: (p) => POST_KIND_LABEL[p.kind], cell: (p) => <span className="text-meta text-sub">{POST_KIND_LABEL[p.kind]}</span> },
    { id: "author", header: "Author", sort: (p) => personById(s, p.authorId)?.name ?? "", csv: (p) => personById(s, p.authorId)?.name, cell: (p) => <span className="text-meta text-sub">{personById(s, p.authorId)?.name ?? "Unknown"}</span> },
    { id: "eng", header: "Engagement", sort: (p) => p.likes + commentCount(s, p.id), cell: (p) => <span className="text-meta tabular-nums text-sub">{p.likes} appreciations · {commentCount(s, p.id)} comments</span>, hideOnMobile: true },
    { id: "posted", header: "Posted", sort: (p) => p.createdAt, csv: (p) => p.createdAt.slice(0, 10), cell: (p) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(p.createdAt)}</span> },
    { id: "status", header: "Status", sort: (p) => statusOf(p.moderation), csv: (p) => statusOf(p.moderation), cell: (p) => <AdminStatus value={statusOf(p.moderation)} /> },
  ];
  const commentCols: Column<Comment>[] = [
    { id: "body", header: "Comment", primary: true, csv: (c) => c.body, cell: (c) => <span className="line-clamp-2 min-w-[14rem] font-normal text-charcoal">{c.body}</span> },
    { id: "author", header: "Author", sort: (c) => personById(s, c.authorId)?.name ?? "", csv: (c) => personById(s, c.authorId)?.name, cell: (c) => <span className="text-meta text-sub">{personById(s, c.authorId)?.name ?? "Unknown"}</span> },
    { id: "on", header: "On", csv: (c) => c.targetId, cell: (c) => <span className="line-clamp-1 text-meta text-sub">{posts.find((p) => p.id === c.targetId)?.title ?? c.targetId}</span> },
    { id: "posted", header: "Posted", sort: (c) => c.createdAt, csv: (c) => c.createdAt.slice(0, 10), cell: (c) => <span className="whitespace-nowrap text-meta text-sub">{timeAgo(c.createdAt)}</span> },
    { id: "status", header: "Status", sort: (c) => statusOf(c.moderation), csv: (c) => statusOf(c.moderation), cell: (c) => <AdminStatus value={statusOf(c.moderation)} /> },
    {
      id: "act",
      header: "",
      cell: (c) =>
        can("content", "edit") ? (
          statusOf(c.moderation) === "visible" ? (
            <Button size="sm" variant="ghost" onClick={() => mod.ask("comment", [c.id], "this comment", "hidden")}>
              Hide
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => mod.ask("comment", [c.id], "this comment", "visible")}>
              Restore
            </Button>
          )
        ) : null,
    },
  ];
  const statusFilter = { id: "status", label: "Status", options: ["visible", "pending_review", "hidden", "removed"].map((v) => ({ value: v, label: v === "pending_review" ? "Held for review" : v[0].toUpperCase() + v.slice(1) })) };

  return (
    <>
      <AdminHeader
        title="Community content"
        description="Posts, founder updates, problems, findings, questions and comments from Discover and Community. Hide, remove or restore with a recorded reason; members’ words are never rewritten."
        meta={
          <>
            <span>{posts.length} posts</span>
            <span>{comments.length} comments</span>
            <span>{posts.filter((p) => statusOf(p.moderation) !== "visible").length} posts not visible</span>
          </>
        }
      />
      <Tabs
        label="Content type"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: "posts", label: "Posts", count: posts.length },
          { value: "comments", label: "Comments", count: comments.length },
        ]}
      />
      {tab === "posts" ? (
        <DataTable
          key="posts"
          label="Posts"
          module="content"
          rows={posts}
          columns={postCols}
          getId={(p) => p.id}
          search={(p) => [p.title, p.body, personById(s, p.authorId)?.name]}
          searchPlaceholder="Search posts by title, text or author"
          filters={[
            { id: "kind", label: "Type", options: Object.entries(POST_KIND_LABEL).map(([value, label]) => ({ value, label })), test: (p, v) => p.kind === v },
            { ...statusFilter, test: (p, v) => statusOf(p.moderation) === v },
          ]}
          initialSort={{ id: "posted", dir: "desc" }}
          exportName="truevix-posts"
          bulk={(ids, clear) =>
            can("content", "edit") ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => mod.ask("post", ids, `${ids.length} posts`, "hidden", clear)}>
                  Hide
                </Button>
                <Button size="sm" variant="secondary" onClick={() => mod.ask("post", ids, `${ids.length} posts`, "visible", clear)}>
                  Restore
                </Button>
              </>
            ) : null
          }
        />
      ) : (
        <DataTable
          key="comments"
          label="Comments"
          module="content"
          rows={comments}
          columns={commentCols}
          getId={(c) => c.id}
          search={(c) => [c.body, personById(s, c.authorId)?.name]}
          searchPlaceholder="Search comments"
          filters={[{ ...statusFilter, test: (c, v) => statusOf(c.moderation) === v }]}
          initialSort={{ id: "posted", dir: "desc" }}
          exportName="truevix-comments"
        />
      )}
      {openPost && (
        <PostDialog
          key={openPost.id}
          post={openPost}
          onClose={() => setOpen(null)}
          onModerate={(status) => {
            setOpen(null);
            mod.ask("post", [openPost.id], `“${openPost.title.slice(0, 48)}”`, status);
          }}
        />
      )}
      {mod.dialog}
    </>
  );
}
